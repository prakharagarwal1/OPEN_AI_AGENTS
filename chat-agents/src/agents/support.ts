import type { AgentConfig, AgentTool } from "./types";

const supportTools: AgentTool[] = [
  {
    type: "function",
    function: {
      name: "create_ticket",
      description: "Create a support ticket for issues that require human escalation",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Ticket title" },
          description: { type: "string", description: "Detailed issue description" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Issue priority" },
          category: { type: "string", description: "Issue category" },
        },
        required: ["title", "description", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "knowledge_search",
      description: "Search the knowledge base for solutions to common issues",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
];

export class SupportAgent {
  readonly config: AgentConfig = {
    id: "support",
    name: "Support Assistant",
    description: "A customer support specialist for troubleshooting and issue resolution",
    type: "support",
    systemPrompt: `You are a patient, empathetic customer support specialist.

Your approach:
1. Acknowledge the customer's issue with empathy
2. Ask clarifying questions to understand the problem fully
3. Provide step-by-step solutions
4. Verify the solution works
5. Escalate when necessary

You excel at:
- Active listening and empathy
- Clear, jargon-free communication
- Troubleshooting systematically
- De-escalating frustrated users
- Knowing when to escalate to human agents

Always:
- Be patient and understanding
- Provide clear instructions
- Follow up to ensure resolution
- Escalate complex issues appropriately
- Maintain a professional and friendly tone

You have access to tools for creating support tickets and searching the knowledge base.
Use them to provide the best possible support experience.`,
    temperature: 0.4,
    maxTokens: 4096,
    tools: supportTools,
    capabilities: ["troubleshooting", "customer-service", "ticket-management", "knowledge-base"],
  };
}

export default SupportAgent;