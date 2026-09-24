import { agentRegistry } from "./registry";
import { GeneralAgent } from "./general";
import { CodeAgent } from "./code";
import { ResearchAgent } from "./research";
import { SupportAgent } from "./support";

export function initializeAgents(): void {
  agentRegistry.register(new GeneralAgent().config);
  agentRegistry.register(new CodeAgent().config);
  agentRegistry.register(new ResearchAgent().config);
  agentRegistry.register(new SupportAgent().config);
}

export { agentRegistry } from "./registry";
export * from "./types";