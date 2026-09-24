import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type AgentType = "general" | "code" | "research" | "support" | "custom";

export interface AgentTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: AgentTool[];
  isDefault?: boolean;
  capabilities?: string[];
}

export interface AgentContext {
  conversationId: string;
  userId?: string;
  messages: ChatCompletionMessageParam[];
  metadata?: Record<string, unknown>;
}

export interface AgentResponse {
  agentId: string;
  content: string;
  toolCalls?: Array<{
    tool: string;
    input: Record<string, unknown>;
    output: string;
  }>;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  finishReason?: string;
}