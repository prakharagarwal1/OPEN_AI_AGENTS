import { execFile } from "child_process";
import { logger } from "../utils/logger";
import type { SandboxJob, SandboxResult } from "./types";

class CommandRunner {
  private readonly maxOutputSize: number;
  private readonly allowedCommands: string[];
  private readonly blockedCommands: string[];

  constructor() {
    this.maxOutputSize = parseInt(process.env.SANDBOX_MAX_OUTPUT_SIZE || "10485760");
    this.allowedCommands = (process.env.SANDBOX_ALLOWED_COMMANDS || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    this.blockedCommands = (process.env.SANDBOX_BLOCKED_COMMANDS || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }

  async execute(job: SandboxJob): Promise<SandboxResult> {
    const { command, args } = job;

    if (!command) {
      throw new Error("No command provided");
    }

    if (!this.isCommandAllowed(command)) {
      logger.warn("Blocked command attempt", { jobId: job.id, command });
      return {
        jobId: job.id,
        status: "failed",
        stdout: "",
        stderr: `Command not allowed: ${command}`,
        exitCode: 126,
        duration: 0,
        error: `Command not allowed: ${command}`,
        createdAt: job.createdAt,
        completedAt: new Date().toISOString(),
      };
    }

    logger.info("Executing command", { jobId: job.id, command, args });

    return new Promise<SandboxResult>((resolve) => {
      const fullArgs = args || [];

      const childProcess = execFile(
        command,
        fullArgs,
        {
          timeout: job.timeout,
          maxBuffer: this.maxOutputSize,
          cwd: process.env.SANDBOX_SANDBOX_DIR ?? "/app/sandbox",
          env: {
            ...process.env,
            PATH: process.env.PATH ?? "",
          },
        },
        (error, stdoutBuf, stderrBuf) => {
          const stdoutStr = stdoutBuf.toString();
          const stderrStr = stderrBuf.toString();

          if (error) {
            resolve({
              jobId: job.id,
              status: error.killed ? "timeout" : "failed",
              stdout: stdoutStr.slice(0, this.maxOutputSize),
              stderr: stderrStr.slice(0, this.maxOutputSize),
              exitCode: (error.code as number | null) || 1,
              duration: 0,
              error: error.message,
              createdAt: job.createdAt,
              completedAt: new Date().toISOString(),
            });
          } else {
            resolve({
              jobId: job.id,
              status: "completed",
              stdout: stdoutStr.slice(0, this.maxOutputSize),
              stderr: stderrStr.slice(0, this.maxOutputSize),
              exitCode: 0,
              duration: 0,
              createdAt: job.createdAt,
              completedAt: new Date().toISOString(),
            });
          }
        }
      );

      childProcess.stdout?.on("data", (data: Buffer) => {
        // Data is captured in the callback
      });
    });
  }

  private isCommandAllowed(command: string): boolean {
    const cmd = command.trim().split(/\s+/)[0] ?? "";

    if (this.blockedCommands.includes(cmd)) {
      return false;
    }

    if (this.allowedCommands.length === 0) {
      return true;
    }

    return this.allowedCommands.includes(cmd);
  }
}

export const commandRunner = new CommandRunner();
export default commandRunner;