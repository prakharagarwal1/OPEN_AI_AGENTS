import { Router } from "express";
import { agentOrchestrator } from "../agents/orchestrator";
import { agentRegistry } from "../agents/registry";
import { logger } from "../utils/logger";

const router = Router();

router.get("/", (_req, res) => {
  const agents = agentOrchestrator.listAgents().map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    type: a.type,
    capabilities: a.capabilities,
    isDefault: a.isDefault,
  }));
  res.json({ agents, count: agents.length });
});

router.get("/:agentId", (req, res) => {
  const { agentId } = req.params;
  const agent = agentRegistry.get(agentId);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }
  res.json({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    type: agent.type,
    capabilities: agent.capabilities,
    tools: agent.tools?.map((t) => t.function.name),
  });
});

router.post("/:agentId/test", async (req, res) => {
  const { agentId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const agent = agentRegistry.get(agentId);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }

  try {
    const response = await agentOrchestrator.executeAgent(agent, message, {
      conversationId: `test-${Date.now()}`,
      messages: [],
    });
    res.json({
      agentId: response.agentId,
      response: response.content,
      tokensUsed: response.tokensUsed,
    });
  } catch (error) {
    logger.error("Agent test failed", error as Error, { agentId });
    res.status(500).json({ error: "Agent test failed" });
  }
});

export default router;