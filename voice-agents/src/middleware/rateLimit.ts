import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redisClient } from "../memory/redis";
import { config } from "../config";
import { logger } from "../utils/logger";

class RateLimiter {
  private limiter: RateLimiterRedis | null = null;

  constructor() {
    if (redisClient) {
      try {
        this.limiter = new RateLimiterRedis({
          storeClient: (redisClient as any).client,
          keyPrefix: "voice-ratelimit:",
          points: config.RATE_LIMIT_MAX_REQUESTS,
          duration: Math.floor(config.RATE_LIMIT_WINDOW_MS / 1000),
          blockDuration: Math.floor(config.RATE_LIMIT_WINDOW_MS / 1000),
        });
      } catch (error) {
        logger.warn("Redis rate limiter unavailable, using in-memory fallback", error as Error);
      }
    }
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip || req.socket.remoteAddress || "unknown";

      if (!this.limiter) {
        return next();
      }

      try {
        await this.limiter.consume(key);
        next();
      } catch (rejRes) {
        res.set("Retry-After", String(Math.ceil((rejRes as any).msBeforeNext / 1000) || 60));
        res.status(429).json({
          error: "Too many requests",
          retryAfter: Math.ceil((rejRes as any).msBeforeNext / 1000) || 60,
        });
      }
    };
  }
}

export const rateLimiter = new RateLimiter();
export default rateLimiter;