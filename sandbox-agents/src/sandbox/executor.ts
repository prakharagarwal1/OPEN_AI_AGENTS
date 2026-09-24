import { createRequire } from "module";
import { logger } from "../utils/logger";
import type { SandboxJob, SandboxResult } from "./types";

const require = createRequire(import.meta.url);

class CodeExecutor {
  private readonly maxOutputSize: number;

  constructor() {
    this.maxOutputSize = parseInt(process.env.SANDBOX_MAX_OUTPUT_SIZE || "10485760");
  }

  async execute(job: SandboxJob): Promise<SandboxResult> {
    const { code, language } = job;

    if (!code) {
      throw new Error("No code provided");
    }

    logger.info("Executing code", { jobId: job.id, language });

    switch (language) {
      case "javascript":
      case "typescript":
        return this.executeJavaScript(job, code);
      case "python":
        return this.executePython(job, code);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  private async executeJavaScript(job: SandboxJob, code: string): Promise<SandboxResult> {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const sandbox = {
      console: {
        log: (...args: unknown[]) => stdout.push(args.map(String).join(" ")),
        error: (...args: unknown[]) => stderr.push(args.map(String).join(" ")),
        warn: (...args: unknown[]) => stdout.push(args.map(String).join(" ")),
        info: (...args: unknown[]) => stdout.push(args.map(String).join(" ")),
      },
      Math,
      JSON,
      parseInt,
      parseFloat,
      setTimeout,
      setInterval,
      Buffer,
      Date,
      RegExp,
      Error,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Map,
      Set,
      Promise,
      fetch: undefined,
    };

    try {
      const vm = require("vm");
      const context = vm.createContext(sandbox);
      const script = new vm.Script(`
        (async () => {
          ${code}
        })()
      `);

      const result = await script.runInContext(context, {
        timeout: job.timeout,
        displayErrors: true,
      });

      const output = stdout.join("\n");
      const errorOutput = stderr.join("\n");

      return {
        jobId: job.id,
        status: errorOutput ? "completed" : "completed",
        stdout: output.slice(0, this.maxOutputSize),
        stderr: errorOutput.slice(0, this.maxOutputSize),
        exitCode: errorOutput ? 1 : 0,
        duration: 0,
        createdAt: job.createdAt,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      return {
        jobId: job.id,
        status: "failed",
        stdout: stdout.join("\n").slice(0, this.maxOutputSize),
        stderr: (stderr.join("\n") + "\n" + errorMessage).slice(0, this.maxOutputSize),
        exitCode: 1,
        duration: 0,
        error: errorMessage,
        createdAt: job.createdAt,
        completedAt: new Date().toISOString(),
      };
    }
  }

  private async executePython(job: SandboxJob, code: string): Promise<SandboxResult> {
    const { execFile } = require("child_process");

    return new Promise<SandboxResult>((resolve) => {
      const stdout: string[] = [];
      const stderr: string[] = [];

      const pythonProcess = execFile(
        "python3",
        ["-c", code],
        {
          timeout: job.timeout,
          maxBuffer: this.maxOutputSize,
          env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        },
        (error: Error | null, stdoutBuf: Buffer, stderrBuf: Buffer) => {
          const stdoutStr = stdoutBuf.toString();
          const stderrStr = stderrBuf.toString();
          const execError = error as Error & { killed?: boolean; code?: number | string | null };

          if (error) {
            resolve({
              jobId: job.id,
              status: execError.killed ? "timeout" : "failed",
              stdout: stdoutStr.slice(0, this.maxOutputSize),
              stderr: stderrStr.slice(0, this.maxOutputSize),
              exitCode: (typeof execError.code === "number" ? execError.code : null) || 1,
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

      pythonProcess.stdout.on("data", (data: Buffer) => {
        stdout.push(data.toString());
      });

      pythonProcess.stderr.on("data", (data: Buffer) => {
        stderr.push(data.toString());
      });
    });
  }
}

export const codeExecutor = new CodeExecutor();
export default codeExecutor;