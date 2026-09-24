import { v4 as uuidv4 } from "uuid";
import { config } from "../config";
import { redisClient } from "../memory/redis";
import { logger } from "../utils/logger";
import type { SandboxJob, SandboxJobStatus, SandboxLanguage, SandboxResult, SandboxStatus } from "./types";
import { codeExecutor } from "./executor";
import { commandRunner } from "./runner";

class SandboxManager {
  private jobs: Map<string, SandboxJob> = new Map();
  private results: Map<string, SandboxResult> = new Map();
  private activeExecutions: Map<string, NodeJS.Timeout> = new Map();
  private dockerEnabled: boolean = false;

  async initialize(): Promise<void> {
    if (config.SANDBOX_DOCKER_ENABLED) {
      try {
        const Dockerode = (await import("dockerode")).default;
        const docker = new Dockerode({ socketPath: "/var/run/docker.sock" });
        await docker.ping();
        this.dockerEnabled = true;
        logger.info("Docker sandbox initialized");
      } catch (error) {
        logger.warn("Docker not available, using local sandbox", error as Error);
        this.dockerEnabled = false;
      }
    } else {
      this.dockerEnabled = false;
      logger.info("Sandbox initialized (local mode)");
    }
  }

  async createJob(params: {
    code?: string;
    language: SandboxLanguage;
    command?: string;
    args?: string[];
    timeout: number;
    memoryLimit?: string;
    userId?: string;
  }): Promise<SandboxJob> {
    const job: SandboxJob = {
      id: uuidv4(),
      userId: params.userId,
      code: params.code,
      language: params.language,
      command: params.command,
      args: params.args,
      timeout: params.timeout,
      memoryLimit: params.memoryLimit || "256m",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);

    // Persist to Redis
    try {
      await redisClient.set(
        `sandbox:job:${job.id}`,
        JSON.stringify(job),
        Math.floor(params.timeout / 1000) + 300
      );
    } catch (error) {
      logger.warn("Failed to persist job to Redis", error as Error);
    }

    // Execute asynchronously
    this.executeJob(job);

    logger.info("Sandbox job created", { jobId: job.id, language: job.language });
    return job;
  }

  private async executeJob(job: SandboxJob): Promise<void> {
    job.status = "running";
    job.startedAt = new Date().toISOString();
    const startTime = Date.now();

    const timeoutHandle = setTimeout(() => {
      this.timeoutJob(job.id);
    }, job.timeout);
    this.activeExecutions.set(job.id, timeoutHandle);

    try {
      let result: SandboxResult;

      if (job.code) {
        result = await codeExecutor.execute(job);
      } else if (job.command) {
        result = await commandRunner.execute(job);
      } else {
        throw new Error("No code or command provided");
      }

      result.duration = Date.now() - startTime;
      this.results.set(job.id, result);

      // Persist result
      try {
        await redisClient.set(
          `sandbox:result:${job.id}`,
          JSON.stringify(result),
          Math.floor(job.timeout / 1000) + 300
        );
      } catch (error) {
        logger.warn("Failed to persist result to Redis", error as Error);
      }

      logger.info("Sandbox job completed", {
        jobId: job.id,
        status: result.status,
        duration: result.duration,
      });
    } catch (error) {
      const result: SandboxResult = {
        jobId: job.id,
        status: "failed",
        stdout: "",
        stderr: "",
        exitCode: null,
        duration: Date.now() - startTime,
        error: (error as Error).message,
        createdAt: job.createdAt,
        completedAt: new Date().toISOString(),
      };
      this.results.set(job.id, result);

      logger.error("Sandbox job failed", error as Error, { jobId: job.id });
    } finally {
      this.activeExecutions.delete(job.id);
    }
  }

  private timeoutJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "running") return;

    const result: SandboxResult = {
      jobId,
      status: "timeout",
      stdout: "",
      stderr: "Job timed out",
      exitCode: null,
      duration: job.timeout,
      createdAt: job.createdAt,
      completedAt: new Date().toISOString(),
    };
    this.results.set(jobId, result);

    logger.warn("Sandbox job timed out", { jobId });
  }

  getResult(jobId: string): SandboxResult | null {
    return this.results.get(jobId) || null;
  }

  getJob(jobId: string): SandboxJob | null {
    return this.jobs.get(jobId) || null;
  }

  listJobs(): SandboxJob[] {
    return Array.from(this.jobs.values());
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const timeoutHandle = this.activeExecutions.get(jobId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.activeExecutions.delete(jobId);
    }

    this.jobs.delete(jobId);
    this.results.delete(jobId);

    try {
      await redisClient.del(`sandbox:job:${jobId}`);
      await redisClient.del(`sandbox:result:${jobId}`);
    } catch (error) {
      logger.warn("Failed to delete job from Redis", error as Error);
    }

    return true;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "running") {
      return false;
    }

    const timeoutHandle = this.activeExecutions.get(jobId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.activeExecutions.delete(jobId);
    }

    const result: SandboxResult = {
      jobId,
      status: "cancelled",
      stdout: "",
      stderr: "Job cancelled by user",
      exitCode: null,
      duration: 0,
      createdAt: job.createdAt,
      completedAt: new Date().toISOString(),
    };
    this.results.set(jobId, result);

    job.status = "cancelled";
    return true;
  }

  async getStatus(): Promise<SandboxStatus> {
    const jobs = Array.from(this.jobs.values());
    return {
      enabled: this.dockerEnabled,
      dockerAvailable: this.dockerEnabled,
      activeJobs: jobs.filter((j) => j.status === "running").length,
      totalJobs: jobs.length,
      completedJobs: jobs.filter((j) => j.status === "completed").length,
      failedJobs: jobs.filter((j) => j.status === "failed").length,
    };
  }

  async shutdown(): Promise<void> {
    logger.info("Shutting down sandbox manager...");
    for (const timeoutHandle of this.activeExecutions.values()) {
      clearTimeout(timeoutHandle);
    }
    this.activeExecutions.clear();
    logger.info("Sandbox manager shut down");
  }
}

export const sandboxManager = new SandboxManager();
export default sandboxManager;