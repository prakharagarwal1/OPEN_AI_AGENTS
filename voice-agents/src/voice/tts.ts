import { logger } from "../utils/logger";
import type { VoiceSession } from "./types";

class TTSProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || "";
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async synthesize(
    text: string,
    options: VoiceSession["options"]
  ): Promise<Buffer | null> {
    if (!this.isAvailable()) {
      logger.warn("ElevenLabs TTS not configured, skipping synthesis");
      return null;
    }

    try {
      const voiceId = options.voiceId || "21m004T2pkTYMVuFMvJy7K";
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              optimize_for_latency: process.env.ELEVENLABS_OPTIMIZE_FOR_LATENCY === "1" ? 1 : 0,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      logger.error("TTS synthesis failed", error as Error);
      return null;
    }
  }

  async streamSynthesize(
    text: string,
    options: VoiceSession["options"],
    onChunk: (chunk: Buffer) => void
  ): Promise<void> {
    if (!this.isAvailable()) {
      logger.warn("ElevenLabs TTS not configured, skipping streaming synthesis");
      return;
    }

    try {
      const voiceId = options.voiceId || "21m004T2pkTYMVuFMvJy7K";
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              optimize_for_latency: 1,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs stream API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(Buffer.from(value));
      }
    } catch (error) {
      logger.error("TTS streaming synthesis failed", error as Error);
    }
  }
}

export const ttsProvider = new TTSProvider();
export default ttsProvider;