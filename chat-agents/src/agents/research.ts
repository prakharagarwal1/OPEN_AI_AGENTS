import type { AgentConfig, AgentTool } from "./types";

const researchTools: AgentTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information on a topic",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          numResults: { type: "number", description: "Number of results to return", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform mathematical calculations",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Mathematical expression to evaluate" },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize",
      description: "Summarize a long text into key points",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to summarize" },
          maxLength: { type: "number", description: "Maximum summary length in words", default: 200 },
        },
        required: ["text"],
      },
    },
  },
];

export class ResearchAgent {
  readonly config: AgentConfig = {
    id: "research",
    name: "Research Assistant",
    description: "A research specialist for finding, analyzing, and synthesizing information",
    type: "research",
    systemPrompt: `You are a research specialist with expertise in finding, analyzing, and synthesizing
information from multiple sources.

Your approach:
1. Clarify the research question
2. Identify key sub-topics to investigate
3. Search for authoritative sources
4. Cross-reference information across sources
5. Identify trends, patterns, and contradictions
6. Present findings in a structured, well-cited format

You excel at:
- Finding reliable information quickly
- Comparing and contrasting different perspectives
- Identifying gaps in existing knowledge
- Providing balanced, objective analysis
- Citing sources for factual claims

Always distinguish between facts, opinions, and inferences.
Flag when information is uncertain or conflicting.

You have access to tools for web search, calculations, and text summarization.
Use them to provide comprehensive, accurate research assistance.`,
    temperature: 0.5,
    maxTokens: 8192,
    tools: researchTools,
    capabilities: ["web-search", "data-analysis", "summarization", "fact-checking"],
  };
}

export default ResearchAgent;