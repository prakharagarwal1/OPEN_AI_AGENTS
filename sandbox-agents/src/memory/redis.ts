import Redis, { type RedisOptions } from "ioredis";
import { config } from "../config";
import { logger } from "../utils/logger";

class RedisClient {
  private client: Redis;
  private connected: boolean = false;

  constructor() {
    this.client = new Redis(config.REDIS_URL, {
      password: config.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keepAlive: 30000,
    } as RedisOptions);

    this.client.on("connect", () => {
      this.connected = true;
      logger.info("Redis connected");
    });

    this.client.on("error", (error: Error) => {
      this.connected = false;
      logger.error("Redis connection error", error);
    });

    this.client.on("close", () => {
      this.connected = false;
      logger.warn("Redis connection closed");
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.warn("Redis connection failed (continuing without cache)", error as Error);
    }
  }

  async quit(): Promise<void> {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error("Redis get failed", error as Error, { key });
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.connected) return;
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error("Redis set failed", error as Error, { key });
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error("Redis del failed", error as Error, { key });
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.connected) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error("Redis keys failed", error as Error, { pattern });
      return [];
    }
  }

  get clientInstance(): Redis {
    return this.client;
  }
}

export const redisClient = new RedisClient();
export default redisClient;