import { logger } from "../utils/logger";
import type { VoiceSession } from "./types";

class STTProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.DEEPLEGRAM_API_KEY || "";
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async transcribe(
    audioBuffer: Buffer,
    options: VoiceSession["options"]
  ): Promise<string> {
    if (!this.isAvailable()) {
      logger.warn("DeepGram STT not configured, returning empty transcription");
      return "";
    }

    try {
      const params = new URLSearchParams({
        model: process.env.DEEPLEGRAM_MODEL || "deepgram nova-2",
        language: options.language || "en-US",
        encoding: options.encoding || "linear16",
        sample_rate: String(options.sampleRate || 16000),
      });

      const response = await fetch(
        `https://api.deepgram.com/v1/listen?${params}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${this.apiKey}`,
            "Content-Type": `audio/${options.encoding || "linear16"}`,
          },
          body: new Uint8Array(audioBuffer),
        }
      );

      if (!response.ok) {
        throw new Error(`DeepGram API error: ${response.status}`);
      }

      const result = await response.json() as { results?: { channels?: { alternatives?: { transcript?: string }[] }[] } };
      return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    } catch (error) {
      logger.error("STT transcription failed", error as Error);
      return "";
    }
  }
}

export const sttProvider = new STTProvider();
export default sttProvider;