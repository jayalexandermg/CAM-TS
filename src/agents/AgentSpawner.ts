import { Agent } from './Agent';
import { AgentConfig, AgentDefinition } from './types';

export class AgentSpawner {
  private agents: Map<string, Agent>;
  private agentDefinitions: Map<string, AgentDefinition>;

  constructor() {
    this.agents = new Map();
    this.agentDefinitions = new Map();
  }

  registerAgentDefinition(name: string, definition: AgentDefinition): void {
    this.agentDefinitions.set(name, definition);
  }

  getAgentDefinition(name: string): AgentDefinition | undefined {
    return this.agentDefinitions.get(name);
  }

  listAgentDefinitions(): string[] {
    return Array.from(this.agentDefinitions.keys());
  }

  spawn(config: AgentConfig): Agent {
    const agent = new Agent(config);
    this.agents.set(agent.getId(), agent);

    // Set up event listeners
    agent.on('completed', () => {
      // Agent completed, could clean up here
    });

    agent.on('failed', () => {
      // Agent failed, could handle here
    });

    return agent;
  }

  spawnByName(
    name: string,
    sessionId: string,
    parentAgentId?: string
  ): Agent {
    const definition = this.agentDefinitions.get(name);
    if (!definition) {
      throw new Error(`Agent definition not found: ${name}`);
    }

    return this.spawn({
      definition,
      sessionId,
      parentAgentId,
    });
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getActiveAgents(): Agent[] {
    return this.listAgents().filter((agent) => agent.getStatus() === 'active');
  }

  getAgentsBySession(sessionId: string): Agent[] {
    return this.listAgents().filter(
      (agent) => agent.getSessionId() === sessionId
    );
  }

  getChildAgents(parentAgentId: string): Agent[] {
    return this.listAgents().filter(
      (agent) => agent.getParentAgentId() === parentAgentId
    );
  }

  async terminateAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }

    // Terminate child agents first
    const children = this.getChildAgents(id);
    for (const child of children) {
      await this.terminateAgent(child.getId());
    }

    // Remove agent
    this.agents.delete(id);
  }

  async terminateSession(sessionId: string): Promise<void> {
    const agents = this.getAgentsBySession(sessionId);
    for (const agent of agents) {
      await this.terminateAgent(agent.getId());
    }
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  clear(): void {
    this.agents.clear();
  }
}
