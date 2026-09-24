import { Router } from "express";
import { voicePipeline } from "../voice/pipeline";
import { logger } from "../utils/logger";
import type { VoiceSession } from "../voice/types";

const router = Router();

interface CreateSessionRequest {
  userId?: string;
  options?: Partial<VoiceSession["options"]>;
}

router.post("/session", async (req, res) => {
  const { userId, options }: CreateSessionRequest = req.body;

  try {
    const session = await voicePipeline.createSession(userId, options);
    res.json({
      sessionId: session.id,
      status: session.status,
      options: session.options,
      createdAt: session.createdAt,
    });
  } catch (error) {
    logger.error("Create session failed", error as Error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = voicePipeline.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({
    sessionId: session.id,
    status: session.status,
    options: session.options,
    transcript: session.transcript,
    createdAt: session.createdAt,
  });
});

router.delete("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const deleted = await voicePipeline.deleteSession(sessionId);
    res.json({ success: deleted, sessionId });
  } catch (error) {
    logger.error("Delete session failed", error as Error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

router.post("/session/:sessionId/stop", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await voicePipeline.stopSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ success: true, sessionId, status: session.status });
  } catch (error) {
    logger.error("Stop session failed", error as Error);
    res.status(500).json({ error: "Failed to stop session" });
  }
});

router.get("/sessions", (req, res) => {
  const userId = req.query.userId as string;
  const sessions = voicePipeline.listSessions(userId);
  res.json({
    sessions: sessions.map((s) => ({
      sessionId: s.id,
      status: s.status,
      createdAt: s.createdAt,
    })),
    count: sessions.length,
  });
});

router.post("/session/:sessionId/transcript", async (req, res) => {
  const { sessionId } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const session = voicePipeline.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    session.transcript.push(text);
    session.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      sessionId,
      transcript: session.transcript,
    });
  } catch (error) {
    logger.error("Add transcript failed", error as Error);
    res.status(500).json({ error: "Failed to add transcript" });
  }
});

router.get("/session/:sessionId/transcript", (req, res) => {
  const { sessionId } = req.params;
  const session = voicePipeline.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({
    sessionId,
    transcript: session.transcript,
  });
});

router.get("/status", (_req, res) => {
  res.json({
    status: "ok",
    pipelineActive: voicePipeline.isActive(),
    activeSessions: voicePipeline.listSessions().length,
    sttAvailable: true,
    ttsAvailable: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;