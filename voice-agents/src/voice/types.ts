export interface VoiceSessionOptions {
  language: string;
  sampleRate: number;
  encoding: "linear16" | "mulaw" | "alaw";
  voiceId: string;
  model: string;
  vadThreshold: number;
}

export interface VoiceSession {
  id: string;
  userId?: string;
  status: "idle" | "listening" | "thinking" | "speaking" | "error";
  options: VoiceSessionOptions;
  transcript: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface VoiceMessage {
  type: "audio" | "text" | "transcript" | "response" | "error" | "control";
  sessionId: string;
  data?: string;
  text?: string;
  isFinal?: boolean;
  timestamp: string;
}

export interface VoiceConfig {
  stt: {
    provider: "deepgram";
    model: string;
    language: string;
    encoding: string;
    sampleRate: number;
  };
  tts: {
    provider: "elevenlabs";
    voiceId: string;
    modelId: string;
  };
  vad: {
    threshold: number;
    minSilence: number;
    minSpeech: number;
  };
  llm: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}