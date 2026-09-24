import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  ANTHROPIC_API_KEY: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_PASSWORD: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  API_KEY: z.string().min(1, "API_KEY is required"),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
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

const rawConfig = loadConfig();

export const config = {
  ...rawConfig,
  port: rawConfig.PORT,
  host: rawConfig.HOST,
  nodeEnv: rawConfig.NODE_ENV,
  corsOrigin: rawConfig.CORS_ORIGIN,
  redisPassword: rawConfig.REDIS_PASSWORD || undefined,
  logLevel: rawConfig.LOG_LEVEL,
  apiKey: rawConfig.API_KEY,
  jwtSecret: rawConfig.JWT_SECRET,
  openaiApiKey: rawConfig.OPENAI_API_KEY,
  openaiModel: rawConfig.OPENAI_MODEL,
  openaiBaseUrl: rawConfig.OPENAI_BASE_URL,
  redisUrl: rawConfig.REDIS_URL,
  rateLimitWindowMs: rawConfig.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: rawConfig.RATE_LIMIT_MAX_REQUESTS,
};

export default config;