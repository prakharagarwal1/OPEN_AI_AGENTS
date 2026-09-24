import type { AgentConfig } from "./types";

export class GeneralAgent {
  readonly config: AgentConfig = {
    id: "general",
    name: "General Assistant",
    description: "A helpful general-purpose AI assistant for everyday tasks",
    type: "general",
    systemPrompt: `You are a helpful, friendly, and knowledgeable AI assistant.
You can help with a wide variety of tasks including answering questions, writing code, 
analyzing information, and providing guidance.

Key principles:
- Be concise but thorough in your responses
- Use markdown formatting for readability
- Ask clarifying questions when needed
- Provide accurate information and cite sources when possible
- Be respectful and professional at all times

You have access to tools for searching information, reading files, and performing calculations.
Use them when they will help provide a better answer.`,
    temperature: 0.7,
    maxTokens: 4096,
    isDefault: true,
    capabilities: ["conversation", "reasoning", "tool-use"],
  };
}

export default GeneralAgent;