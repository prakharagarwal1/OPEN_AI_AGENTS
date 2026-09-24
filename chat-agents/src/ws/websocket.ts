import { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { agentOrchestrator } from "../agents/orchestrator";
import { toolRegistry } from "../tools";
import { redisClient } from "../memory/redis";
import { logger } from "../utils/logger";
import { config } from "../config";

interface WebSocketMessage {
  type: "chat" | "ping" | "pong" | "error" | "history" | "delete_history";
  conversationId?: string;
  message?: string;
  agentId?: string;
  userId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();

  initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      verifyClient: (info, done) => {
        const apiKey = info.req.headers["x-api-key"];
        if (apiKey !== config.API_KEY) {
          done(false, 401, "Unauthorized");
          return;
        }
        done(true);
      },
    });

    this.wss.on("connection", (ws, req) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      logger.info("WebSocket client connected", { clientId, ip: req.socket.remoteAddress });

      ws.send(JSON.stringify({
        type: "connected",
        clientId,
        timestamp: new Date().toISOString(),
      }));

      ws.on("message", async (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(clientId, ws, message);
        } catch (error) {
          logger.error("WebSocket message handling failed", error as Error);
          ws.send(JSON.stringify({
            type: "error",
            error: "Failed to process message",
          }));
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        logger.info("WebSocket client disconnected", { clientId });
      });

      ws.on("error", (error) => {
        logger.error("WebSocket client error", error);
      });
    });
  }

  private async handleMessage(
    clientId: string,
    ws: WebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    switch (message.type) {
      case "chat":
        await this.handleChat(clientId, ws, message);
        break;
      case "ping":
        ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        break;
      case "history":
        await this.handleHistory(ws, message);
        break;
      case "delete_history":
        await this.handleDeleteHistory(ws, message);
        break;
      default:
        ws.send(JSON.stringify({
          type: "error",
          error: `Unknown message type: ${message.type}`,
        }));
    }
  }

  private async handleChat(
    clientId: string,
    ws: WebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    const { message: userMessage, conversationId, userId, agentId } = message;

    if (!userMessage) {
      ws.send(JSON.stringify({ type: "error", error: "Message is required" }));
      return;
    }

    const convId = conversationId || uuidv4();

    try {
      const historyKey = `chat:history:${convId}`;
      const historyJson = await redisClient.get(historyKey);
      const history: ChatCompletionMessageParam[] = historyJson ? JSON.parse(historyJson) : [];

      const agentContext = {
        conversationId: convId,
        userId,
        messages: history,
      };

      let response;
      if (agentId) {
        const agent = agentOrchestrator.listAgents().find((a) => a.id === agentId);
        if (!agent) {
          ws.send(JSON.stringify({ type: "error", error: "Agent not found" }));
          return;
        }
        response = await agentOrchestrator.executeAgentWithTools(
          agent,
          userMessage,
          agentContext,
          async (toolName, toolInput) => {
            const executor = toolRegistry[toolName];
            if (!executor) return `Tool ${toolName} not found`;
            return executor(toolInput);
          }
        );
      } else {
        response = await agentOrchestrator.route(userMessage, agentContext);
      }

      history.push({ role: "user", content: userMessage, timestamp: new Date().toISOString() });
      history.push({
        role: "assistant",
        content: response.content,
        agentId: response.agentId,
        timestamp: new Date().toISOString(),
      });

      await redisClient.set(historyKey, JSON.stringify(history), 3600);

      ws.send(JSON.stringify({
        type: "chat",
        conversationId: convId,
        response: response.content,
        agentId: response.agentId,
        agentName: agentOrchestrator.listAgents().find((a) => a.id === response.agentId)?.name,
        toolCalls: response.toolCalls,
        tokensUsed: response.tokensUsed,
        model: response.model,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error("WebSocket chat failed", error as Error, { conversationId: convId });
      ws.send(JSON.stringify({
        type: "error",
        error: "Failed to process chat message",
        conversationId: convId,
      }));
    }
  }

  private async handleHistory(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const { conversationId } = message;
    if (!conversationId) {
      ws.send(JSON.stringify({ type: "error", error: "Conversation ID required" }));
      return;
    }

    try {
      const historyJson = await redisClient.get(`chat:history:${conversationId}`);
      const history = historyJson ? JSON.parse(historyJson) : [];
      ws.send(JSON.stringify({
        type: "history",
        conversationId,
        messages: history,
      }));
    } catch (error) {
      logger.error("WebSocket history fetch failed", error as Error);
      ws.send(JSON.stringify({ type: "error", error: "Failed to fetch history" }));
    }
  }

  private async handleDeleteHistory(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const { conversationId } = message;
    if (!conversationId) {
      ws.send(JSON.stringify({ type: "error", error: "Conversation ID required" }));
      return;
    }

    try {
      await redisClient.del(`chat:history:${conversationId}`);
      ws.send(JSON.stringify({
        type: "delete_history",
        success: true,
        conversationId,
      }));
    } catch (error) {
      logger.error("WebSocket history delete failed", error as Error);
      ws.send(JSON.stringify({ type: "error", error: "Failed to delete history" }));
    }
  }

  broadcast(event: string, data: unknown): void {
    const payload = JSON.stringify({ type: event, ...data as object });
    for (const client of this.clients.values()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  getConnectedClients(): number {
    return this.clients.size;
  }
}

export const websocketManager = new WebSocketManager();

export function initializeWebSocket(server: ReturnType<typeof import("http").createServer>): void {
  websocketManager.initialize(server);
}

export default websocketManager;