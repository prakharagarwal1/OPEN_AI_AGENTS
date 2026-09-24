import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { logger } from "../utils/logger";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const publicPaths = ["/health"];
  const path = req.path;

  if (publicPaths.some((p) => path.startsWith(p))) {
    return next();
  }

  const apiKey = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");

  if (!apiKey) {
    res.status(401).json({ error: "API key required" });
    return;
  }

  if (apiKey !== config.API_KEY) {
    logger.warn("Invalid API key attempt", { ip: req.ip });
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}

export default apiKeyAuth;