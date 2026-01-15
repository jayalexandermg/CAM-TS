PROMPT 14A: Agent Definition & Spawning
Phase: 4 (Orchestrator)
Status: 🆕 NEW - Agent infrastructure
Time Estimate: 6-8 hours
Priority: CRITICAL
Dependencies: Phase 3 complete
Parallel: ✅ Can run with 14B, 14C

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Implement agent definition, spawning, and lifecycle management.

After this prompt:

✅ Agent class (state, lifecycle)
✅ AgentSpawner class (creation, management)
✅ Agent types (base agents)
✅ Agent state management
✅ 30-40 new tests
📦 REQUIREMENTS

1. Agent Types
   Create src/agents/types.ts:

typescript
Copy
export type AgentStatus = 'idle' | 'active' | 'waiting' | 'completed' | 'failed';

export interface AgentDefinition {
name: string;
description: string;
expertise: string[];
personality: string[];
communicationStyle: string;
approach: string;
availableSkills: string[];
constraints?: string[];
}

export interface AgentConfig {
id?: string;
definition: AgentDefinition;
sessionId: string;
parentAgentId?: string;
maxRetries?: number;
timeout?: number;
}

export interface AgentState {
id: string;
status: AgentStatus;
definition: AgentDefinition;
sessionId: string;
parentAgentId?: string;
createdAt: Date;
startedAt?: Date;
completedAt?: Date;
failedAt?: Date;
currentTask?: string;
result?: any;
error?: Error;
retryCount: number;
maxRetries: number;
}

export interface AgentResult {
success: boolean;
data?: any;
error?: Error;
metadata?: {
duration: number;
retries: number;
skillsUsed: string[];
};
} 2. Agent Class
Create src/agents/Agent.ts:

typescript
Copy
import { AgentConfig, AgentState, AgentStatus, AgentResult, AgentDefinition } from './types';
import { EventEmitter } from 'events';

export class Agent extends EventEmitter {
private state: AgentState;

constructor(config: AgentConfig) {
super();

    this.state = {
      id: config.id || this.generateId(),
      status: 'idle',
      definition: config.definition,
      sessionId: config.sessionId,
      parentAgentId: config.parentAgentId,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: config.maxRetries || 3
    };

}

private generateId(): string {
const timestamp = Date.now();
const random = Math.random().toString(36).substring(2, 9);
return `agent_${timestamp}_${random}`;
}

getId(): string {
return this.state.id;
}

getStatus(): AgentStatus {
return this.state.status;
}

getState(): AgentState {
return { ...this.state };
}

getDefinition(): AgentDefinition {
return { ...this.state.definition };
}

getSessionId(): string {
return this.state.sessionId;
}

getParentAgentId(): string | undefined {
return this.state.parentAgentId;
}

async start(task: string): Promise<void> {
if (this.state.status !== 'idle') {
throw new Error(`Agent ${this.state.id} is not idle (current status: ${this.state.status})`);
}

    this.state.status = 'active';
    this.state.startedAt = new Date();
    this.state.currentTask = task;

    this.emit('started', {
      agentId: this.state.id,
      task,
      timestamp: this.state.startedAt
    });

}

async execute(task: string): Promise<AgentResult> {
await this.start(task);

    try {
      // This will be implemented by orchestrator
      // For now, just return a placeholder
      const result: AgentResult = {
        success: true,
        data: { message: 'Agent execution placeholder' },
        metadata: {
          duration: 0,
          retries: this.state.retryCount,
          skillsUsed: []
        }
      };

      await this.complete(result);
      return result;
    } catch (error) {
      await this.fail(error as Error);
      throw error;
    }

}

async complete(result: AgentResult): Promise<void> {
if (this.state.status !== 'active' && this.state.status !== 'waiting') {
throw new Error(`Agent ${this.state.id} is not active (current status: ${this.state.status})`);
}

    this.state.status = 'completed';
    this.state.completedAt = new Date();
    this.state.result = result;

    this.emit('completed', {
      agentId: this.state.id,
      result,
      timestamp: this.state.completedAt
    });

}

async fail(error: Error): Promise<void> {
this.state.status = 'failed';
this.state.failedAt = new Date();
this.state.error = error;

    this.emit('failed', {
      agentId: this.state.id,
      error,
      timestamp: this.state.failedAt
    });

}

async retry(): Promise<void> {
if (this.state.retryCount >= this.state.maxRetries) {
throw new Error(`Agent ${this.state.id} has exceeded max retries (${this.state.maxRetries})`);
}

    this.state.retryCount++;
    this.state.status = 'idle';
    this.state.error = undefined;

    this.emit('retry', {
      agentId: this.state.id,
      retryCount: this.state.retryCount,
      timestamp: new Date()
    });

}

setStatus(status: AgentStatus): void {
const oldStatus = this.state.status;
this.state.status = status;

    this.emit('statusChanged', {
      agentId: this.state.id,
      oldStatus,
      newStatus: status,
      timestamp: new Date()
    });

}

canRetry(): boolean {
return this.state.retryCount < this.state.maxRetries;
}

getDuration(): number | undefined {
if (!this.state.startedAt) {
return undefined;
}

    const endTime = this.state.completedAt || this.state.failedAt || new Date();
    return endTime.getTime() - this.state.startedAt.getTime();

}
} 3. AgentSpawner Class
Create src/agents/AgentSpawner.ts:

typescript
Copy
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
      parentAgentId
    });

}

getAgent(id: string): Agent | undefined {
return this.agents.get(id);
}

listAgents(): Agent[] {
return Array.from(this.agents.values());
}

getActiveAgents(): Agent[] {
return this.listAgents().filter(agent => agent.getStatus() === 'active');
}

getAgentsBySession(sessionId: string): Agent[] {
return this.listAgents().filter(agent => agent.getSessionId() === sessionId);
}

getChildAgents(parentAgentId: string): Agent[] {
return this.listAgents().filter(agent => agent.getParentAgentId() === parentAgentId);
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
} 4. Base Agent Definitions
Create src/agents/definitions/base-agents.ts:

typescript
Copy
import { AgentDefinition } from '../types';

export const BASE_AGENTS: Record<string, AgentDefinition> = {
default: {
name: 'default',
description: 'Default general-purpose agent',
expertise: ['General assistance', 'Task coordination'],
personality: ['Helpful', 'Clear', 'Concise', 'Professional'],
communicationStyle: 'Direct and informative',
approach: 'Systematic and thorough',
availableSkills: []
},

researcher: {
name: 'researcher',
description: 'Research specialist agent',
expertise: ['Research methodology', 'Data analysis', 'Source evaluation', 'Information synthesis'],
personality: ['Curious', 'Analytical', 'Detail-oriented', 'Evidence-based'],
communicationStyle: 'Inquisitive and thorough',
approach: 'Break problems into searchable questions, validate sources, synthesize findings',
availableSkills: ['research', 'analysis', 'synthesis']
},

coder: {
name: 'coder',
description: 'Coding specialist agent',
expertise: ['Software development', 'Code review', 'Architecture design', 'Testing', 'Debugging'],
personality: ['Pragmatic', 'Precise', 'Quality-focused', 'Best-practices oriented'],
communicationStyle: 'Technical and direct',
approach: 'Write clean, tested, maintainable code following best practices',
availableSkills: ['coding', 'testing', 'debugging', 'code_review']
},

coordinator: {
name: 'coordinator',
description: 'Task coordination and delegation agent',
expertise: ['Task breakdown', 'Agent coordination', 'Workflow management', 'Result synthesis'],
personality: ['Organized', 'Strategic', 'Collaborative', 'Results-oriented'],
communicationStyle: 'Clear and directive',
approach: 'Break complex tasks into subtasks, delegate to specialized agents, synthesize results',
availableSkills: ['coordination', 'delegation', 'synthesis']
}
}; 5. Index Exports
Create src/agents/index.ts:

typescript
Copy
export _ from './types';
export _ from './Agent';
export _ from './AgentSpawner';
export _ from './definitions/base-agents';
📁 FILES TO CREATE
src/agents/types.ts
src/agents/Agent.ts
src/agents/AgentSpawner.ts
src/agents/definitions/base-agents.ts
src/agents/index.ts
tests/agents/Agent.test.ts (15-20 tests)
tests/agents/AgentSpawner.test.ts (15-20 tests)
Total: 7 files, 30-40 tests

✅ SUCCESS CRITERIA
✅ Agent class working
✅ Agent lifecycle (idle → active → completed/failed)
✅ Agent state management
✅ AgentSpawner working
✅ Agent spawning by name
✅ Agent hierarchy (parent/child)
✅ Base agent definitions loaded
✅ 30-40 tests passing
✅ No TypeScript errors
END OF PROMPT 14A
