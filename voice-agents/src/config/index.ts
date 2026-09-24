import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4o-realtime-preview"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  DEEPGRAM_API_KEY: z.string().optional(),
  DEEPGRAM_MODEL: z.string().default("deepgram nova-2"),
  DEEPGRAM_LANGUAGE: z.string().default("en-US"),
  DEEPGRAM_ENCODING: z.string().default("linear16"),
  DEEPGRAM_SAMPLE_RATE: z.coerce.number().default(16000),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default("21m004T2pkTYMVuFMvJy7K"),
  ELEVENLABS_MODEL_ID: z.string().default("eleven_multilingual_v2"),
  ELEVENLABS_OPTIMIZE_FOR_LATENCY: z.coerce.number().default(0),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_PASSWORD: z.string().optional(),
  VOICE_SAMPLE_RATE: z.coerce.number().default(16000),
  VOICE_CHANNELS: z.coerce.number().default(1),
  VOICE_BITS_PER_SAMPLE: z.coerce.number().default(16),
  VOICE_SILENCE_THRESHOLD: z.coerce.number().default(500),
  VOICE_SILENCE_DURATION: z.coerce.number().default(1000),
  VOICE_MAX_CHUNK_SIZE: z.coerce.number().default(4096),
  VAD_THRESHOLD: z.coerce.number().default(0.5),
  VAD_MIN_SILENCE: z.coerce.number().default(500),
  VAD_MIN_SPEECH: z.coerce.number().default(250),
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

export const config: EnvConfig = loadConfig();