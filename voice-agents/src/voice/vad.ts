import { logger } from "../utils/logger";
import type { VoiceSession } from "./types";

class VADManager {
  private silenceThreshold: number;
  private minSilence: number;
  private minSpeech: number;
  private silenceStart: number | null = null;
  private speechStart: number | null = null;
  private isSpeechActive: boolean = false;

  constructor() {
    this.silenceThreshold = parseFloat(process.env.VAD_THRESHOLD || "0.5");
    this.minSilence = parseInt(process.env.VAD_MIN_SILENCE || "500");
    this.minSpeech = parseInt(process.env.VAD_MIN_SPEECH || "250");
  }

  detectSpeech(audioBuffer: Buffer, _options: VoiceSession["options"]): boolean {
    const energy = this.calculateEnergy(audioBuffer);
    const threshold = this.silenceThreshold * 1000;

    const now = Date.now();

    if (energy > threshold) {
      if (!this.isSpeechActive) {
        this.speechStart = now;
        this.isSpeechActive = true;
        logger.debug("Speech started", { energy, threshold });
      }
      this.silenceStart = null;
      return true;
    } else {
      if (this.isSpeechActive) {
        if (this.silenceStart === null) {
          this.silenceStart = now;
        } else if (now - this.silenceStart > this.minSilence) {
          const speechDuration = this.speechStart ? now - this.speechStart : 0;
          if (speechDuration > this.minSpeech) {
            this.reset();
            return true;
          }
          this.reset();
        }
      }
      return false;
    }
  }

  private calculateEnergy(buffer: Buffer): number {
    let sum = 0;
    const samples = Math.min(buffer.length / 2, 1024);

    for (let i = 0; i < samples; i++) {
      const sample = buffer.readInt16LE(i * 2);
      sum += Math.abs(sample);
    }

    return sum / samples;
  }

  private reset(): void {
    this.silenceStart = null;
    this.speechStart = null;
    this.isSpeechActive = false;
  }

  isSpeech(): boolean {
    return this.isSpeechActive;
  }

  configure(options: Partial<{
    threshold: number;
    minSilence: number;
    minSpeech: number;
  }>): void {
    if (options.threshold !== undefined) this.silenceThreshold = options.threshold;
    if (options.minSilence !== undefined) this.minSilence = options.minSilence;
    if (options.minSpeech !== undefined) this.minSpeech = options.minSpeech;
  }

  getThreshold(): number { return this.silenceThreshold; }
  getMinSilence(): number { return this.minSilence; }
  getMinSpeech(): number { return this.minSpeech; }
}

export const vadManager = new VADManager();
export default vadManager;