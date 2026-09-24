export type SandboxJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "timeout"
  | "cancelled";

export type SandboxLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "bash"
  | "go"
  | "rust";

export interface SandboxJob {
  id: string;
  userId?: string;
  code?: string;
  language: SandboxLanguage;
  command?: string;
  args?: string[];
  timeout: number;
  memoryLimit: string;
  status: SandboxJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SandboxResult {
  jobId: string;
  status: SandboxJobStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SandboxStatus {
  enabled: boolean;
  dockerAvailable: boolean;
  activeJobs: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
}