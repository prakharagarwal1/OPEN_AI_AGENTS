import { describe, it, expect, beforeEach } from "vitest";
import { agentRegistry } from "../../agents/registry";
import { GeneralAgent } from "../../agents/general";
import { CodeAgent } from "../../agents/code";
import { ResearchAgent } from "../../agents/research";
import { SupportAgent } from "../../agents/support";

describe("Agent Registry", () => {
  beforeEach(() => {
    agentRegistry["agents"].clear();
  });

  it("should register agents", () => {
    agentRegistry.register(new GeneralAgent().config);
    expect(agentRegistry.get("general")).toBeDefined();
  });

  it("should return default agent", () => {
    agentRegistry.register(new GeneralAgent().config);
    expect(agentRegistry.getDefault()?.id).toBe("general");
  });

  it("should get agents by type", () => {
    agentRegistry.register(new GeneralAgent().config);
    agentRegistry.register(new CodeAgent().config);
    const codeAgents = agentRegistry.getByType("code");
    expect(codeAgents).toHaveLength(1);
    expect(codeAgents[0]?.id).toBe("code");
  });

  it("should list all agents", () => {
    agentRegistry.register(new GeneralAgent().config);
    agentRegistry.register(new CodeAgent().config);
    agentRegistry.register(new ResearchAgent().config);
    agentRegistry.register(new SupportAgent().config);
    expect(agentRegistry.list()).toHaveLength(4);
  });
});

describe("Agent Configs", () => {
  it("GeneralAgent should have correct config", () => {
    const agent = new GeneralAgent();
    expect(agent.config.id).toBe("general");
    expect(agent.config.type).toBe("general");
    expect(agent.config.isDefault).toBe(true);
  });

  it("CodeAgent should have tools", () => {
    const agent = new CodeAgent();
    expect(agent.config.tools).toBeDefined();
    expect(agent.config.tools!.length).toBeGreaterThan(0);
  });

  it("ResearchAgent should have tools", () => {
    const agent = new ResearchAgent();
    expect(agent.config.tools).toBeDefined();
    expect(agent.config.tools!.length).toBeGreaterThan(0);
  });

  it("SupportAgent should have tools", () => {
    const agent = new SupportAgent();
    expect(agent.config.tools).toBeDefined();
    expect(agent.config.tools!.length).toBeGreaterThan(0);
  });
});