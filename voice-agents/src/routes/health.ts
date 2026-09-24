import { Router } from "express";
import { config } from "../config";
import { redisClient } from "../memory/redis";
import { logger } from "../utils/logger";

const router = Router();

router.get("/", async (_req, res) => {
  const checks: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: "1.0.0",
    uptime: `${Math.floor(process.uptime())}s`,
    redis: redisClient ? "connected" : "disconnected",
    stt: process.env.DEEPLEGRAM_API_KEY ? "configured" : "not-configured",
    tts: process.env.ELEVENLABS_API_KEY ? "configured" : "not-configured",
  };

  const allHealthy = checks.redis === "connected";
  res.status(allHealthy ? 200 : 503).json(checks);
});

router.get("/ready", async (_req, res) => {
  try {
    const redisOk = redisClient ? true : false;
    if (!redisOk) {
      return res.status(503).json({ ready: false, reason: "Redis not connected" });
    }
    res.json({ ready: true });
  } catch (error) {
    logger.error("Readiness check failed", error as Error);
    res.status(503).json({ ready: false });
  }
});

router.get("/live", (_req, res) => {
  res.json({ live: true });
});

export default router;