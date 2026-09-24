import Redis, { type Redis as RedisClientType } from "ioredis";
import { config } from "../config";
import { logger } from "../utils/logger";

class RedisClient {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = new Redis(config.REDIS_URL, {
      password: config.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
    });

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
      logger.error("Redis GET error", error as Error, { key });
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
      logger.error("Redis SET error", error as Error, { key });
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error("Redis DEL error", error as Error, { key });
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected) return false;
    try {
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      logger.error("Redis EXISTS error", error as Error, { key });
      return false;
    }
  }

  async lpush(key: string, value: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.lpush(key, value);
    } catch (error) {
      logger.error("Redis LPUSH error", error as Error, { key });
    }
  }

  async lrange(key: string, start: number, end: number): Promise<string[]> {
    if (!this.connected) return [];
    try {
      return await this.client.lrange(key, start, end);
    } catch (error) {
      logger.error("Redis LRANGE error", error as Error, { key });
      return [];
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error("Redis EXPIRE error", error as Error, { key });
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.connected) return 0;
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error("Redis INCR error", error as Error, { key });
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.connected) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error("Redis KEYS error", error as Error, { pattern });
      return [];
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.hset(key, field, value);
    } catch (error) {
      logger.error("Redis HSET error", error as Error, { key });
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.connected) return null;
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error("Redis HGET error", error as Error, { key });
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.connected) return {};
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error("Redis HGETALL error", error as Error, { key });
      return {};
    }
  }
}

export const redisClient = new RedisClient();
export default redisClient;