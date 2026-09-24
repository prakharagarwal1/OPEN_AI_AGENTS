import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3003),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_PASSWORD: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  API_KEY: z.string().min(1, "API_KEY is required"),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Sandbox configuration
  SANDBOX_TIMEOUT_MS: z.coerce.number().default(30000),
  SANDBOX_MAX_MEMORY_MB: z.coerce.number().default(512),
  SANDBOX_MAX_CPU: z.coerce.number().default(1),
  SANDBOX_MAX_PROCESSES: z.coerce.number().default(10),
  SANDBOX_ALLOWED_COMMANDS: z.string().default("node,python3,python,go,make,gcc,g++,rustc,cargo"),
  SANDBOX_ALLOW_NETWORK: z.coerce.boolean().default(false),
  SANDBOX_ALLOW_FILESYSTEM: z.coerce.boolean().default(true),
  SANDBOX_SANDBOX_DIR: z.string().default("/app/sandbox"),
  SANDBOX_MAX_OUTPUT_SIZE: z.coerce.number().default(10485760),
  SANDBOX_DOCKER_ENABLED: z.coerce.boolean().default(false),
  SANDBOX_DOCKER_IMAGE: z.string().default("node:20-alpine"),
  SANDBOX_DOCKER_NETWORK_MODE: z.string().default("none"),
  SANDBOX_DOCKER_MEMORY_LIMIT: z.string().default("512m"),
  SANDBOX_DOCKER_CPU_LIMIT: z.coerce.number().default(1),
});

type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config: EnvConfig = loadConfig();