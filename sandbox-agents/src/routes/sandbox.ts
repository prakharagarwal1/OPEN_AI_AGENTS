import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { sandboxManager } from "../sandbox/manager";
import { redisClient } from "../memory/redis";
import { logger } from "../utils/logger";
import { config } from "../config";
import type { SandboxJob, SandboxResult, SandboxLanguage } from "../sandbox/types";

const router = Router();

interface CreateJobRequest {
  code?: string;
  language?: string;
  command?: string;
  args?: string[];
  timeout?: number;
  memoryLimit?: string;
  userId?: string;
}

router.post("/jobs", async (req, res) => {
  const { code, language, command, args, timeout, memoryLimit, userId }: CreateJobRequest = req.body;

  if (!code && !command) {
    return res.status(400).json({ error: "Either code or command is required" });
  }

  try {
    const job = await sandboxManager.createJob({
      code,
      language: (language || "javascript") as SandboxLanguage,
      command,
      args,
      timeout: timeout || 30000,
      memoryLimit: memoryLimit || "256m",
      userId,
    });

    res.json({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  } catch (error) {
    logger.error("Failed to create sandbox job", error as Error);
    res.status(500).json({ error: "Failed to create sandbox job" });
  }
});

router.get("/jobs/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const result = sandboxManager.getResult(jobId);

  if (!result) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json({
    jobId: result.jobId,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    duration: result.duration,
    error: result.error,
    createdAt: result.createdAt,
    completedAt: result.completedAt,
  });
});

router.delete("/jobs/:jobId", async (req, res) => {
  const { jobId } = req.params;
  try {
    const deleted = await sandboxManager.deleteJob(jobId);
    res.json({ success: deleted, jobId });
  } catch (error) {
    logger.error("Failed to delete sandbox job", error as Error);
    res.status(500).json({ error: "Failed to delete sandbox job" });
  }
});

router.get("/jobs", async (_req, res) => {
  const jobs = sandboxManager.listJobs();
  res.json({ jobs, count: jobs.length });
});

router.post("/jobs/:jobId/cancel", async (req, res) => {
  const { jobId } = req.params;
  try {
    const cancelled = await sandboxManager.cancelJob(jobId);
    res.json({ success: cancelled, jobId });
  } catch (error) {
    logger.error("Failed to cancel sandbox job", error as Error);
    res.status(500).json({ error: "Failed to cancel sandbox job" });
  }
});

router.get("/commands/allowed", (_req, res) => {
  const allowed = config.SANDBOX_ALLOWED_COMMANDS.split(",").map((c: string) => c.trim());
  res.json({ allowed });
});

router.get("/status", async (_req, res) => {
  const status = await sandboxManager.getStatus();
  res.json(status);
});

export default router;