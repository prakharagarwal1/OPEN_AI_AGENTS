import { logger } from "../utils/logger";
import type { AgentConfig, AgentType } from "./types";

class AgentRegistry {
  private agents: Map<string, AgentConfig> = new Map();
  private defaultAgent: string = "general";

  register(config: AgentConfig): void {
    this.agents.set(config.id, config);
    if (config.isDefault) {
      this.defaultAgent = config.id;
    }
    logger.info("Agent registered", { agentId: config.id, type: config.type });
  }

  get(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  getAll(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getByType(type: AgentType): AgentConfig[] {
    return Array.from(this.agents.values()).filter((a) => a.type === type);
  }

  getDefault(): AgentConfig | undefined {
    return this.agents.get(this.defaultAgent);
  }

  list(): string[] {
    return Array.from(this.agents.keys());
  }
}

export const agentRegistry = new AgentRegistry();
export default agentRegistry;