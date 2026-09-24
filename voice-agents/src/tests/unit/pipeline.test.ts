import { describe, it, expect } from "vitest";
import { voicePipeline } from "../../voice/pipeline";
import { vadManager } from "../../voice/vad";

describe("Voice Pipeline", () => {
  it("should create a session", async () => {
    const session = await voicePipeline.createSession("user-1", {
      language: "en-US",
    });
    expect(session.id).toBeDefined();
    expect(session.status).toBe("idle");
    expect(session.options.language).toBe("en-US");
  });

  it("should list sessions", async () => {
    await voicePipeline.createSession("user-1");
    await voicePipeline.createSession("user-2");
    const sessions = voicePipeline.listSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter sessions by userId", async () => {
    await voicePipeline.createSession("user-filter");
    const sessions = voicePipeline.listSessions("user-filter");
    expect(sessions.every((s) => s.userId === "user-filter")).toBe(true);
  });

  it("should delete a session", async () => {
    const session = await voicePipeline.createSession();
    const deleted = await voicePipeline.deleteSession(session.id);
    expect(deleted).toBe(true);
    expect(voicePipeline.getSession(session.id)).toBeUndefined();
  });

  it("should stop a session", async () => {
    const session = await voicePipeline.createSession();
    const stopped = await voicePipeline.stopSession(session.id);
    expect(stopped).not.toBeNull();
    expect(stopped!.status).toBe("idle");
  });
});

describe("VAD Manager", () => {
  it("should detect silence in empty buffer", () => {
    const buffer = Buffer.alloc(1024);
    const result = vadManager.detectSpeech(buffer, {
      language: "en-US",
      sampleRate: 16000,
      encoding: "linear16",
      voiceId: "test",
      model: "test",
      vadThreshold: 0.5,
    });
    expect(result).toBe(false);
  });

  it("should configure thresholds", () => {
    vadManager.configure({ threshold: 0.7 });
    // No assertion needed, just verify no error
  });
});