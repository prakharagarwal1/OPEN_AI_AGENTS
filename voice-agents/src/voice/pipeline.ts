import { logger } from "../utils/logger";
import { sttProvider } from "./stt";
import { ttsProvider } from "./tts";
import { vadManager } from "./vad";
import { llmClient } from "./llm";
import type { VoiceSession } from "./types";

class VoicePipeline {
  private sessions: Map<string, VoiceSession> = new Map();
  private active: boolean = false;

  async initialize(): Promise<void> {
    this.active = true;
    logger.info("Voice pipeline initialized");
  }

  async createSession(userId?: string, options: Partial<VoiceSession["options"]> = {}): Promise<VoiceSession> {
    const { v4: uuidv4 } = await import("uuid");
    const session: VoiceSession = {
      id: uuidv4(),
      userId,
      status: "idle",
      options: {
        language: options.language || "en-US",
        sampleRate: options.sampleRate || 16000,
        encoding: options.encoding || "linear16",
        voiceId: options.voiceId || "21m004T2pkTYMVuFMvJy7K",
        model: options.model || "gpt-4o-realtime-preview",
        vadThreshold: options.vadThreshold || 0.5,
        ...options,
      },
      transcript: [],
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);
    logger.info("Voice session created", { sessionId: session.id });
    return session;
  }

  async processAudioChunk(
    sessionId: string,
    audioBuffer: Buffer
  ): Promise<{ text?: string; isFinal?: boolean; response?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = "listening";

    const isSpeech = vadManager.detectSpeech(audioBuffer, session.options);

    if (!isSpeech) {
      return { isFinal: false };
    }

    try {
      const text = await sttProvider.transcribe(audioBuffer, session.options);
      if (text) {
        session.transcript.push(text);
        session.status = "thinking";

        const response = await this.generateResponse(session, text);

        await ttsProvider.synthesize(response, session.options);

        return {
          text,
          isFinal: true,
          response,
        };
      }
    } catch (error) {
      logger.error("Audio processing failed", error as Error, { sessionId });
      session.status = "error";
      throw error;
    }

    return { isFinal: false };
  }

  private async generateResponse(
    session: VoiceSession,
    text: string
  ): Promise<string> {
    const messages = session.transcript.map((t, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: t,
    }));

    if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
      messages.push({ role: "user", content: text });
    }

    const completion = await llmClient.chat({
      messages,
      model: session.options.model,
      temperature: 0.7,
      maxTokens: 1024,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    session.transcript.push(responseText);
    return responseText;
  }

  async stopSession(sessionId: string): Promise<VoiceSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = "idle";
    logger.info("Voice session stopped", { sessionId });
    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);
    logger.info("Voice session deleted", { sessionId });
    return true;
  }

  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(userId?: string): VoiceSession[] {
    const sessions = Array.from(this.sessions.values());
    return userId ? sessions.filter((s) => s.userId === userId) : sessions;
  }

  isActive(): boolean {
    return this.active;
  }
}

export const voicePipeline = new VoicePipeline();

export async function initializeVoicePipeline(): Promise<void> {
  await voicePipeline.initialize();
}
export default voicePipeline;