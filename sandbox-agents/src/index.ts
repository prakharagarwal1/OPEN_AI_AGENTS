import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import { config } from "./config";
import { logger } from "./utils/logger";
import { redisClient } from "./memory/redis";
import sandboxRoutes from "./routes/sandbox";
import healthRoutes from "./routes/health";
import { initializeWebSocket } from "./ws/websocket";
import { rateLimiter } from "./middleware/rateLimit";
import { apiKeyAuth } from "./middleware/auth";
import { sandboxManager } from "./sandbox/manager";

export class SandboxAgentsServer {
  public app: Application;
  public server: ReturnType<typeof createServer>;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.middleware();
    this.routes();
    this.setupGracefulShutdown();
  }

  private middleware(): void {
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    }));
    this.app.use(compression());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(rateLimiter.middleware());
    this.app.use(apiKeyAuth);
  }

  private routes(): void {
    this.app.use("/health", healthRoutes);
    this.app.use("/api/v1/sandbox", sandboxRoutes);
  }

  private setupGracefulShutdown(): void {
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      this.server.close(async () => {
        await redisClient.quit();
        await sandboxManager.shutdown();
        logger.info("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully...");
      this.server.close(async () => {
        await redisClient.quit();
        await sandboxManager.shutdown();
        logger.info("Voice server closed");
        process.exit(0);
      });
    });
  }

  public async start(): Promise<void> {
    try {
      await redisClient.connect();
      await sandboxManager.initialize();
      await this.server.listen(config.PORT, config.HOST, () => {
        logger.info(`Sandbox Agents server running on http://${config.HOST}:${config.PORT}`);
        logger.info(`Environment: ${config.NODE_ENV}`);
      });
      initializeWebSocket(this.server);
    } catch (error) {
      logger.error("Failed to start sandbox server", error as Error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const server = new SandboxAgentsServer();
  server.start();
}

export default SandboxAgentsServer;