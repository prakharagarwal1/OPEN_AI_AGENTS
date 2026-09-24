import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { agentOrchestrator } from "../agents/orchestrator";
import { toolRegistry } from "../tools";
import { redisClient } from "../memory/redis";
import { logger } from "../utils/logger";
import type { AgentResponse } from "../agents/types";

const router = Router();

interface ChatRequest {
  message: string;
  conversationId?: string;
  userId?: string;
  stream?: boolean;
  agentId?: string;
}

interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  agentId?: string;
  timestamp: string;
}

router.post("/", async (req, res) => {
  const { message, conversationId, userId, stream, agentId }: ChatRequest = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  const convId = conversationId || uuidv4();
  const messages: ConversationMessage[] = [];

  try {
    const historyKey = `chat:history:${convId}`;
    const historyJson = await redisClient.get(historyKey);
    if (historyJson) {
      messages.push(...JSON.parse(historyJson));
    }

    messages.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    const agentMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const agentContext = {
      conversationId: convId,
      userId,
      messages: agentMessages,
    };

    let response: AgentResponse;

    if (agentId) {
      const agent = agentOrchestrator.listAgents().find((a) => a.id === agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      response = await agentOrchestrator.executeAgentWithTools(
        agent,
        message,
        agentContext,
        async (toolName, toolInput) => {
          const executor = toolRegistry[toolName];
          if (!executor) return `Tool ${toolName} not found`;
          return executor(toolInput);
        }
      );
    } else {
      response = await agentOrchestrator.route(message, agentContext);
    }

    messages.push({
      role: "assistant",
      content: response.content,
      agentId: response.agentId,
      timestamp: new Date().toISOString(),
    });

    await redisClient.set(
      historyKey,
      JSON.stringify(messages),
      3600
    );
    await redisClient.expire(historyKey, 3600);

    const result = {
      conversationId: convId,
      response: response.content,
      agentId: response.agentId,
      agentName: agentOrchestrator.listAgents().find((a) => a.id === response.agentId)?.name,
      toolCalls: response.toolCalls,
      tokensUsed: response.tokensUsed,
      model: response.model,
    };

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const words = response.content.split(/(\s+)/);
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ token: word })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
      res.end();
    } else {
      res.json(result);
    }
  } catch (error) {
    logger.error("Chat request failed", error as Error, { conversationId: convId });
    res.status(500).json({
      error: "Internal server error",
      message: (error as Error).message,
    });
  }
});

router.get("/history/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  try {
    const historyJson = await redisClient.get(`chat:history:${conversationId}`);
    if (!historyJson) {
      return res.json({ conversationId, messages: [] });
    }
    res.json({ conversationId, messages: JSON.parse(historyJson) });
  } catch (error) {
    logger.error("History fetch failed", error as Error, { conversationId });
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.delete("/history/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  try {
    await redisClient.del(`chat:history:${conversationId}`);
    res.json({ success: true, conversationId });
  } catch (error) {
    logger.error("History delete failed", error as Error, { conversationId });
    res.status(500).json({ error: "Failed to delete history" });
  }
});

router.get("/agents", (_req, res) => {
  const agents = agentOrchestrator.listAgents().map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    type: a.type,
    capabilities: a.capabilities,
  }));
  res.json({ agents });
});

export default router;