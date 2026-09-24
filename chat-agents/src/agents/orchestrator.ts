import { llmClient } from "../llm/client";
import { agentRegistry } from "./registry";
import type { AgentConfig, AgentContext, AgentResponse, AgentTool } from "./types";
import { logger } from "../utils/logger";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

class AgentOrchestrator {
  async route(input: string, context: Partial<AgentContext>): Promise<AgentResponse> {
    const routingPrompt = this.buildRoutingPrompt(input, context);
    const messages = [
      {
        role: "system" as const,
        content: routingPrompt,
      },
      {
        role: "user" as const,
        content: input,
      },
    ];

    try {
      const completion = await llmClient.chat({
        messages,
        temperature: 0.1,
        maxTokens: 256,
        conversationId: context.conversationId,
      });

      const routedAgentId = this.parseRoutingResponse(completion.choices[0]?.message?.content);
      const agent = agentRegistry.get(routedAgentId) || agentRegistry.getDefault();
      if (!agent) {
        throw new Error("No agent available");
      }

      logger.info("Routed to agent", {
        conversationId: context.conversationId,
        routedTo: routedAgentId,
        fallback: routedAgentId !== (agentRegistry.getDefault()?.id),
      });

      return this.executeAgent(agent, input, context);
    } catch (error) {
      logger.error("Routing failed, using default agent", error as Error);
      const defaultAgent = agentRegistry.getDefault();
      if (!defaultAgent) {
        throw new Error("No default agent available");
      }
      return this.executeAgent(defaultAgent, input, context);
    }
  }

  async executeAgent(
    agent: AgentConfig,
    input: string,
    context: Partial<AgentContext>
  ): Promise<AgentResponse> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system" as const,
        content: agent.systemPrompt,
      },
    ];

    if (context.messages && context.messages.length > 0) {
      messages.push(...context.messages);
    }

    messages.push({ role: "user" as const, content: input });

    try {
      const completion = await llmClient.chat({
        messages,
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        tools: agent.tools,
        conversationId: context.conversationId,
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error("No message in completion");
      }
      const toolCalls = message.tool_calls?.map((tc) => ({
        tool: tc.function.name,
        input: JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>,
        output: "",
      }));

      return {
        agentId: agent.id,
        content: message.content || "",
        toolCalls,
        tokensUsed: completion.usage
          ? {
              prompt: completion.usage.prompt_tokens,
              completion: completion.usage.completion_tokens,
              total: completion.usage.total_tokens,
            }
          : undefined,
        model: completion.model,
        finishReason: completion.choices[0]?.finish_reason,
      };
    } catch (error) {
      logger.error("Agent execution failed", error as Error, {
        agentId: agent.id,
        conversationId: context.conversationId,
      });
      throw error;
    }
  }

  async executeAgentWithTools(
    agent: AgentConfig,
    input: string,
    context: Partial<AgentContext>,
    toolExecutor: (toolName: string, input: Record<string, unknown>) => Promise<string>
  ): Promise<AgentResponse> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system" as const,
        content: agent.systemPrompt,
      },
    ];

    if (context.messages && context.messages.length > 0) {
      messages.push(...context.messages);
    }

    messages.push({ role: "user" as const, content: input });

    let maxRounds = 5;
    let currentMessages = [...messages];

    while (maxRounds > 0) {
      maxRounds--;

      const completion = await llmClient.chat({
        messages: currentMessages,
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        tools: agent.tools,
        conversationId: context.conversationId,
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error("No message in completion");
      }

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return {
          agentId: agent.id,
          content: message.content || "",
          tokensUsed: completion.usage
            ? {
                prompt: completion.usage.prompt_tokens,
                completion: completion.usage.completion_tokens,
                total: completion.usage.total_tokens,
              }
            : undefined,
          model: completion.model,
          finishReason: completion.choices[0]?.finish_reason,
        };
      }

      currentMessages.push({
        role: "assistant" as const,
        content: message.content,
        tool_calls: message.tool_calls,
      });

      for (const tc of message.tool_calls) {
        let toolInput: Record<string, unknown> = {};
        try {
          toolInput = JSON.parse(tc.function.arguments || "{}");
        } catch {
          toolInput = {};
        }

        const toolOutput = await toolExecutor(tc.function.name, toolInput);
        currentMessages.push({
          role: "tool" as const,
          tool_call_id: tc.id,
          content: toolOutput,
        });
      }
    }

    return {
      agentId: agent.id,
      content: "I've reached the maximum number of tool calls. Here's what I could determine.",
      model: "unknown",
    };
  }

  private buildRoutingPrompt(_input: string, _context: Partial<AgentContext>): string {
    const availableAgents = agentRegistry.getAll().map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      description: a.description,
      capabilities: a.capabilities,
    }));

    return `You are a routing specialist for an AI agent system. Your job is to analyze the user's
request and determine which specialized agent should handle it.

Available agents:
${JSON.stringify(availableAgents, null, 2)}

Routing rules:
- "general": For everyday questions, casual conversation, and general knowledge
- "code": For programming questions, code writing, debugging, architecture
- "research": For research, data analysis, fact-finding, web searches
- "support": For customer support, troubleshooting, issue resolution

Respond with ONLY the agent ID (e.g., "code"). No explanation, no markdown, just the ID.
If unsure, respond with "general".`;
  }

  private parseRoutingResponse(response: string | null | undefined): string {
    if (!response) return "general";
    const cleaned = response.trim().toLowerCase().replace(/['"]/g, "");
    const validIds = agentRegistry.list();
    return validIds.includes(cleaned) ? cleaned : "general";
  }

  listAgents(): AgentConfig[] {
    return agentRegistry.getAll();
  }
}

export const agentOrchestrator = new AgentOrchestrator();
export default agentOrchestrator;