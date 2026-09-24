import { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { sandboxManager } from "../sandbox/manager";
import { logger } from "../utils/logger";
import { config } from "../config";

interface WebSocketMessage {
  type: "execute" | "ping" | "pong" | "error" | "job_status";
  jobId?: string;
  code?: string;
  language?: string;
  command?: string;
  args?: string[];
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
      case "execute":
        await this.handleExecute(clientId, ws, message);
        break;
      case "ping":
        ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        break;
      default:
        ws.send(JSON.stringify({ type: "error", error: `Unknown message type: ${message.type}` }));
    }
  }

  private async handleExecute(
    clientId: string,
    ws: WebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const job = await sandboxManager.createJob({
        code: message.code,
        language: (message.language || "javascript") as "javascript" | "typescript" | "python" | "bash" | "go" | "rust",
        command: message.command,
        args: message.args,
        timeout: 30000,
      });

      ws.send(JSON.stringify({
        type: "job_status",
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
      }));

      // Poll for completion
      const pollInterval = setInterval(async () => {
        const result = sandboxManager.getResult(job.id);
        if (!result) return;

        ws.send(JSON.stringify({
          type: "job_status",
          jobId: result.jobId,
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          duration: result.duration,
        }));

        if (result.status === "completed" || result.status === "failed" || result.status === "timeout") {
          clearInterval(pollInterval);
        }
      }, 500);

      // Auto-cleanup after 60 seconds
      setTimeout(() => clearInterval(pollInterval), 60000);
    } catch (error) {
      logger.error("WebSocket execution failed", error as Error);
      ws.send(JSON.stringify({
        type: "error",
        error: "Failed to execute job",
      }));
    }
  }

  public broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

export const websocketManager = new WebSocketManager();
export function initializeWebSocket(server: HttpServer): void {
  websocketManager.initialize(server);
}
export default websocketManager;