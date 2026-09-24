import { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { voicePipeline } from "../voice/pipeline";
import { logger } from "../utils/logger";
import { config } from "../config";
import type { VoiceMessage } from "../voice/types";

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private sessionClients: Map<string, Set<WebSocket>> = new Map();

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
      logger.info("Voice WebSocket client connected", { clientId, ip: req.socket.remoteAddress });

      ws.send(JSON.stringify({
        type: "connected",
        clientId,
        timestamp: new Date().toISOString(),
      }));

      ws.on("message", async (data) => {
        try {
          if (data instanceof Buffer) {
            await this.handleBinaryMessage(clientId, ws, data);
          } else {
            const message: VoiceMessage = JSON.parse(data.toString());
            await this.handleTextMessage(clientId, ws, message);
          }
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
        for (const sessionWs of this.sessionClients.values()) {
          sessionWs.delete(ws);
        }
        logger.info("Voice WebSocket client disconnected", { clientId });
      });

      ws.on("error", (error) => {
        logger.error("Voice WebSocket client error", error);
      });
    });
  }

  private async handleBinaryMessage(
    clientId: string,
    ws: WebSocket,
    data: Buffer
  ): Promise<void> {
    const sessionId = this.getSessionIdForClient(ws);
    if (!sessionId) {
      ws.send(JSON.stringify({
        type: "error",
        error: "No active session. Create a session first.",
      }));
      return;
    }

    try {
      const result = await voicePipeline.processAudioChunk(sessionId, data);

      if (result.text) {
        ws.send(JSON.stringify({
          type: "transcript",
          sessionId,
          text: result.text,
          isFinal: result.isFinal,
          timestamp: new Date().toISOString(),
        }));
      }

      if (result.response) {
        ws.send(JSON.stringify({
          type: "response",
          sessionId,
          text: result.response,
          timestamp: new Date().toISOString(),
        }));
      }
    } catch (error) {
      logger.error("Binary audio processing failed", error as Error, { sessionId });
      ws.send(JSON.stringify({
        type: "error",
        error: "Failed to process audio",
        sessionId,
      }));
    }
  }

  private async handleTextMessage(
    clientId: string,
    ws: WebSocket,
    message: VoiceMessage
  ): Promise<void> {
    switch (message.type) {
      case "control":
        await this.handleControlMessage(ws, message);
        break;
      case "text":
        await this.handleTextInput(ws, message);
        break;
      case "transcript":
        await this.handleTranscript(ws, message);
        break;
      default:
        ws.send(JSON.stringify({
          type: "error",
          error: `Unknown message type: ${message.type}`,
        }));
    }
  }

  private async handleControlMessage(
    ws: WebSocket,
    message: VoiceMessage
  ): Promise<void> {
    const { sessionId, data } = message;

    switch (data) {
      case "start_session":
        try {
          const session = await voicePipeline.createSession();
          this.assignClientToSession(ws, session.id);
          ws.send(JSON.stringify({
            type: "control",
            action: "session_started",
            sessionId: session.id,
            timestamp: new Date().toISOString(),
          }));
        } catch (error) {
          ws.send(JSON.stringify({ type: "error", error: "Failed to start session" }));
        }
        break;

      case "stop_session":
        if (sessionId) {
          await voicePipeline.stopSession(sessionId);
          ws.send(JSON.stringify({
            type: "control",
            action: "session_stopped",
            sessionId,
            timestamp: new Date().toISOString(),
          }));
        }
        break;

      case "ping":
        ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        break;
    }
  }

  private async handleTextInput(
    ws: WebSocket,
    message: VoiceMessage
  ): Promise<void> {
    const { sessionId, text } = message;

    if (!sessionId || !text) {
      ws.send(JSON.stringify({ type: "error", error: "Session ID and text required" }));
      return;
    }

    try {
      const session = voicePipeline.getSession(sessionId);
      if (!session) {
        ws.send(JSON.stringify({ type: "error", error: "Session not found" }));
        return;
      }

      session.transcript.push(text);

      ws.send(JSON.stringify({
        type: "transcript",
        sessionId,
        text,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error("Text input handling failed", error as Error, { sessionId });
      ws.send(JSON.stringify({ type: "error", error: "Failed to process text" }));
    }
  }

  private async handleTranscript(
    ws: WebSocket,
    message: VoiceMessage
  ): Promise<void> {
    const { sessionId, text, isFinal } = message;

    if (!sessionId || !text) {
      ws.send(JSON.stringify({ type: "error", error: "Session ID and text required" }));
      return;
    }

    try {
      const session = voicePipeline.getSession(sessionId);
      if (!session) {
        ws.send(JSON.stringify({ type: "error", error: "Session not found" }));
        return;
      }

      if (isFinal) {
        session.transcript.push(text);
      }

      ws.send(JSON.stringify({
        type: "transcript",
        sessionId,
        text,
        isFinal,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error("Transcript handling failed", error as Error, { sessionId });
      ws.send(JSON.stringify({ type: "error", error: "Failed to process transcript" }));
    }
  }

  private assignClientToSession(ws: WebSocket, sessionId: string): void {
    if (!this.sessionClients.has(sessionId)) {
      this.sessionClients.set(sessionId, new Set());
    }
    this.sessionClients.get(sessionId)!.add(ws);
  }

  private getSessionIdForClient(ws: WebSocket): string | null {
    for (const [sessionId, clients] of this.sessionClients.entries()) {
      if (clients.has(ws)) return sessionId;
    }
    return null;
  }

  broadcastToSession(sessionId: string, message: VoiceMessage): void {
    const clients = this.sessionClients.get(sessionId);
    if (!clients) return;

    const payload = JSON.stringify(message);
    for (const client of clients) {
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