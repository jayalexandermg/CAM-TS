PROMPT 15: Orchestrator Core
Phase: 4 (Orchestrator)
Status: 🆕 NEW - The brain of CAM
Time Estimate: 6-8 hours
Priority: CRITICAL
Dependencies: PROMPT 14A, 14B, 14C complete
Sequential: ✅ Must run after Wave 1

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Implement the Orchestrator - the central coordinator that brings everything together.

After this prompt:

✅ Orchestrator class (coordinates agents, skills, sessions)
✅ TaskManager class (manages task execution)
✅ LLM integration (connects to AI models)
✅ Agent coordination (spawns and manages agents)
✅ Full request/response cycle
✅ 40-50 new tests
📦 REQUIREMENTS

1. Orchestrator Types
   Create src/orchestrator/types.ts:

typescript
Copy
import { AgentResult } from '../agents/types';
import { SkillDefinition } from '../skills/types';

export interface OrchestratorConfig {
maxConcurrentTasks: number;
defaultTimeout: number;
enableLogging: boolean;
llmProvider?: string;
llmModel?: string;
}

export interface TaskRequest {
id?: string;
input: string;
sessionId: string;
userId?: string;
context?: Record<string, any>;
options?: TaskOptions;
}

export interface TaskOptions {
timeout?: number;
maxRetries?: number;
preferredSkill?: string;
preferredAgent?: string;
}

export interface TaskResult {
taskId: string;
success: boolean;
output?: string;
data?: any;
error?: Error;
metadata: TaskMetadata;
}

export interface TaskMetadata {
startTime: Date;
endTime?: Date;
duration?: number;
agentId?: string;
skillId?: string;
retries: number;
tokensUsed?: number;
}

export interface OrchestratorState {
activeTasks: number;
completedTasks: number;
failedTasks: number;
activeAgents: number;
uptime: number;
} 2. Task Manager
Create src/orchestrator/TaskManager.ts:

typescript
Copy
import { TaskRequest, TaskResult, TaskMetadata, TaskOptions } from './types';
import { EventEmitter } from 'events';

export interface Task {
id: string;
request: TaskRequest;
status: 'pending' | 'running' | 'completed' | 'failed';
metadata: TaskMetadata;
result?: TaskResult;
}

export class TaskManager extends EventEmitter {
private tasks: Map<string, Task>;
private taskQueue: string[];
private maxConcurrent: number;
private runningCount: number;

constructor(maxConcurrent: number = 5) {
super();
this.tasks = new Map();
this.taskQueue = [];
this.maxConcurrent = maxConcurrent;
this.runningCount = 0;
}

createTask(request: TaskRequest): Task {
const id = request.id || this.generateId();

    const task: Task = {
      id,
      request: { ...request, id },
      status: 'pending',
      metadata: {
        startTime: new Date(),
        retries: 0
      }
    };

    this.tasks.set(id, task);
    this.taskQueue.push(id);

    this.emit('taskCreated', { taskId: id });

    return task;

}

private generateId(): string {
const timestamp = Date.now();
const random = Math.random().toString(36).substring(2, 9);
return `task_${timestamp}_${random}`;
}

getTask(id: string): Task | undefined {
return this.tasks.get(id);
}

async startTask(id: string): Promise<void> {
const task = this.tasks.get(id);
if (!task) {
throw new Error(`Task not found: ${id}`);
}

    if (task.status !== 'pending') {
      throw new Error(`Task ${id} is not pending (status: ${task.status})`);
    }

    if (this.runningCount >= this.maxConcurrent) {
      throw new Error('Maximum concurrent tasks reached');
    }

    task.status = 'running';
    task.metadata.startTime = new Date();
    this.runningCount++;

    // Remove from queue
    const queueIndex = this.taskQueue.indexOf(id);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.emit('taskStarted', { taskId: id });

}

completeTask(id: string, result: Partial<TaskResult>): void {
const task = this.tasks.get(id);
if (!task) {
throw new Error(`Task not found: ${id}`);
}

    task.status = 'completed';
    task.metadata.endTime = new Date();
    task.metadata.duration = task.metadata.endTime.getTime() - task.metadata.startTime.getTime();

    task.result = {
      taskId: id,
      success: true,
      ...result,
      metadata: { ...task.metadata, ...result.metadata }
    };

    this.runningCount--;

    this.emit('taskCompleted', { taskId: id, result: task.result });

}

failTask(id: string, error: Error): void {
const task = this.tasks.get(id);
if (!task) {
throw new Error(`Task not found: ${id}`);
}

    task.status = 'failed';
    task.metadata.endTime = new Date();
    task.metadata.duration = task.metadata.endTime.getTime() - task.metadata.startTime.getTime();

    task.result = {
      taskId: id,
      success: false,
      error,
      metadata: task.metadata
    };

    this.runningCount--;

    this.emit('taskFailed', { taskId: id, error });

}

retryTask(id: string): void {
const task = this.tasks.get(id);
if (!task) {
throw new Error(`Task not found: ${id}`);
}

    task.status = 'pending';
    task.metadata.retries++;
    task.result = undefined;

    this.taskQueue.push(id);

    this.emit('taskRetried', { taskId: id, retries: task.metadata.retries });

}

getNextTask(): Task | undefined {
if (this.taskQueue.length === 0) {
return undefined;
}

    const nextId = this.taskQueue[0];
    return this.tasks.get(nextId);

}

getPendingTasks(): Task[] {
return Array.from(this.tasks.values()).filter(t => t.status === 'pending');
}

getRunningTasks(): Task[] {
return Array.from(this.tasks.values()).filter(t => t.status === 'running');
}

getCompletedTasks(): Task[] {
return Array.from(this.tasks.values()).filter(t => t.status === 'completed');
}

getFailedTasks(): Task[] {
return Array.from(this.tasks.values()).filter(t => t.status === 'failed');
}

getTasksBySession(sessionId: string): Task[] {
return Array.from(this.tasks.values()).filter(t => t.request.sessionId === sessionId);
}

getStats(): { pending: number; running: number; completed: number; failed: number } {
return {
pending: this.getPendingTasks().length,
running: this.getRunningTasks().length,
completed: this.getCompletedTasks().length,
failed: this.getFailedTasks().length
};
}

canAcceptTask(): boolean {
return this.runningCount < this.maxConcurrent;
}

clear(): void {
this.tasks.clear();
this.taskQueue = [];
this.runningCount = 0;
}
} 3. LLM Client Interface
Create src/orchestrator/llm/types.ts:

typescript
Copy
export interface LLMConfig {
provider: string;
model: string;
apiKey?: string;
baseUrl?: string;
maxTokens?: number;
temperature?: number;
}

export interface LLMMessage {
role: 'system' | 'user' | 'assistant';
content: string;
}

export interface LLMRequest {
messages: LLMMessage[];
maxTokens?: number;
temperature?: number;
stopSequences?: string[];
}

export interface LLMResponse {
content: string;
tokensUsed: {
prompt: number;
completion: number;
total: number;
};
finishReason: 'stop' | 'length' | 'error';
model: string;
}
Create src/orchestrator/llm/LLMClient.ts:

typescript
Copy
import { LLMConfig, LLMRequest, LLMResponse, LLMMessage } from './types';
import { EventEmitter } from 'events';

export class LLMClient extends EventEmitter {
private config: LLMConfig;

constructor(config: LLMConfig) {
super();
this.config = {
maxTokens: 4096,
temperature: 0.7,
...config
};
}

async complete(request: LLMRequest): Promise<LLMResponse> {
this.emit('requestStarted', { messages: request.messages.length });

    try {
      // This is a placeholder implementation
      // In production, this would call the actual LLM API
      const response = await this.mockComplete(request);

      this.emit('requestCompleted', {
        tokensUsed: response.tokensUsed,
        finishReason: response.finishReason
      });

      return response;
    } catch (error) {
      this.emit('requestFailed', { error });
      throw error;
    }

}

private async mockComplete(request: LLMRequest): Promise<LLMResponse> {
// Simulate API delay
await new Promise(resolve => setTimeout(resolve, 100));

    // Get the last user message
    const lastUserMessage = request.messages
      .filter(m => m.role === 'user')
      .pop();

    const content = lastUserMessage
      ? `Response to: ${lastUserMessage.content.substring(0, 50)}...`
      : 'No user message provided';

    return {
      content,
      tokensUsed: {
        prompt: this.estimateTokens(request.messages),
        completion: this.estimateTokens([{ role: 'assistant', content }]),
        total: 0 // Will be calculated
      },
      finishReason: 'stop',
      model: this.config.model
    };

}

private estimateTokens(messages: LLMMessage[]): number {
// Rough estimate: ~4 characters per token
const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
return Math.ceil(totalChars / 4);
}

async chat(
systemPrompt: string,
userMessage: string,
history: LLMMessage[] = []
): Promise<string> {
const messages: LLMMessage[] = [
{ role: 'system', content: systemPrompt },
...history,
{ role: 'user', content: userMessage }
];

    const response = await this.complete({ messages });
    return response.content;

}

getConfig(): LLMConfig {
return { ...this.config };
}

updateConfig(config: Partial<LLMConfig>): void {
this.config = { ...this.config, ...config };
}
}
Create src/orchestrator/llm/index.ts:

typescript
Copy
export _ from './types';
export _ from './LLMClient'; 4. Orchestrator Class
Create src/orchestrator/Orchestrator.ts:

typescript
Copy
import { OrchestratorConfig, TaskRequest, TaskResult, OrchestratorState } from './types';
import { TaskManager, Task } from './TaskManager';
import { ErrorHandler } from './errors/ErrorHandler';
import { SecurityManager } from './security/SecurityManager';
import { AgentSpawner } from '../agents/AgentSpawner';
import { Agent } from '../agents/Agent';
import { BASE_AGENTS } from '../agents/definitions/base-agents';
import { SkillManager } from '../skills/SkillManager';
import { SkillRouter } from '../skills/SkillRouter';
import { SkillActivator } from '../skills/SkillActivator';
import { LLMClient } from './llm/LLMClient';
import { PrepromptHydrator } from '../preprompt/PrepromptHydrator';
import { EventEmitter } from 'events';

export class Orchestrator extends EventEmitter {
private config: OrchestratorConfig;
private taskManager: TaskManager;
private errorHandler: ErrorHandler;
private securityManager: SecurityManager;
private agentSpawner: AgentSpawner;
private skillManager: SkillManager;
private skillRouter: SkillRouter;
private skillActivator: SkillActivator;
private llmClient: LLMClient;
private prepromptHydrator: PrepromptHydrator;
private startTime: Date;

constructor(config?: Partial<OrchestratorConfig>) {
super();

    this.config = {
      maxConcurrentTasks: config?.maxConcurrentTasks || 5,
      defaultTimeout: config?.defaultTimeout || 300000, // 5 minutes
      enableLogging: config?.enableLogging ?? true,
      llmProvider: config?.llmProvider || 'mock',
      llmModel: config?.llmModel || 'mock-model'
    };

    this.startTime = new Date();

    // Initialize components
    this.taskManager = new TaskManager(this.config.maxConcurrentTasks);
    this.errorHandler = new ErrorHandler();
    this.securityManager = new SecurityManager();
    this.agentSpawner = new AgentSpawner();
    this.skillManager = new SkillManager();
    this.skillRouter = new SkillRouter(this.skillManager);
    this.skillActivator = new SkillActivator(this.skillManager, this.skillRouter);
    this.llmClient = new LLMClient({
      provider: this.config.llmProvider!,
      model: this.config.llmModel!
    });
    this.prepromptHydrator = new PrepromptHydrator();

    // Register base agents
    this.registerBaseAgents();

    // Set up event forwarding
    this.setupEventForwarding();

}

private registerBaseAgents(): void {
for (const [name, definition] of Object.entries(BASE_AGENTS)) {
this.agentSpawner.registerAgentDefinition(name, definition);
}
}

private setupEventForwarding(): void {
this.taskManager.on('taskCompleted', (data) => {
this.emit('taskCompleted', data);
});

    this.taskManager.on('taskFailed', (data) => {
      this.emit('taskFailed', data);
    });

    this.errorHandler.on('errorOccurred', (data) => {
      this.emit('error', data);
    });

    this.errorHandler.on('recovered', (data) => {
      this.emit('recovered', data);
    });

}

async process(request: TaskRequest): Promise<TaskResult> {
// Validate input
const validation = this.securityManager.validateInput(request.input);
if (!validation.valid) {
return {
taskId: request.id || 'unknown',
success: false,
error: new Error(`Validation failed: ${validation.errors.join(', ')}`),
metadata: {
startTime: new Date(),
retries: 0
}
};
}

    // Sanitize input
    const sanitizedInput = this.securityManager.sanitizeInput(request.input);
    const sanitizedRequest = { ...request, input: sanitizedInput };

    // Create task
    const task = this.taskManager.createTask(sanitizedRequest);

    try {
      // Start task
      await this.taskManager.startTask(task.id);

      // Execute with error handling
      const result = await this.errorHandler.handle(
        () => this.executeTask(task),
        {
          taskId: task.id,
          sessionId: request.sessionId,
          timestamp: new Date()
        }
      );

      // Complete task
      this.taskManager.completeTask(task.id, result);

      // Sanitize output
      const sanitizedResult = {
        ...result,
        output: this.securityManager.sanitizeOutput(result.output),
        data: this.securityManager.sanitizeOutput(result.data)
      };

      return sanitizedResult;
    } catch (error) {
      this.taskManager.failTask(task.id, error as Error);

      return {
        taskId: task.id,
        success: false,
        error: error as Error,
        metadata: task.metadata
      };
    }

}

private async executeTask(task: Task): Promise<Partial<TaskResult>> {
const { request } = task;

    // Check if we can create an agent
    if (!this.securityManager.canCreateAgent(request.sessionId)) {
      throw new Error('Agent limit reached for session');
    }

    // Route to skill
    const routeResult = this.skillRouter.route(request.input);

    // Determine agent type based on skill
    const agentType = this.determineAgentType(routeResult.skillId);

    // Spawn agent
    const agent = this.agentSpawner.spawnByName(
      agentType,
      request.sessionId
    );

    this.securityManager.trackAgentCreated();
    task.metadata.agentId = agent.getId();

    try {
      // Activate skill if matched
      if (routeResult.skillId) {
        await this.skillActivator.activateSkill(routeResult.skillId, {
          task: request.input,
          relevantMemory: [],
          userContext: request.context
        });
        task.metadata.skillId = routeResult.skillId;
      }

      // Build context
      const context = await this.buildContext(request, agent);

      // Execute via LLM
      const response = await this.llmClient.chat(
        context.systemPrompt,
        request.input,
        []
      );

      // Complete agent
      await agent.complete({
        success: true,
        data: { response }
      });

      this.securityManager.trackAgentCompleted();

      // Deactivate skill
      if (routeResult.skillId) {
        await this.skillActivator.deactivateSkill(routeResult.skillId);
      }

      return {
        output: response,
        data: { agentId: agent.getId(), skillId: routeResult.skillId },
        metadata: {
          ...task.metadata,
          agentId: agent.getId(),
          skillId: routeResult.skillId
        }
      };
    } catch (error) {
      await agent.fail(error as Error);
      this.securityManager.trackAgentCompleted();
      throw error;
    }

}

private determineAgentType(skillId?: string): string {
if (!skillId) {
return 'default';
}

    // Map skills to agent types
    const skillAgentMap: Record<string, string> = {
      'research': 'researcher',
      'analysis': 'researcher',
      'coding': 'coder',
      'testing': 'coder',
      'debugging': 'coder',
      'coordination': 'coordinator'
    };

    return skillAgentMap[skillId] || 'default';

}

private async buildContext(
request: TaskRequest,
agent: Agent
): Promise<{ systemPrompt: string }> {
// Hydrate preprompt
const hydratedContext = await this.prepromptHydrator.hydrate();

    // Get agent definition
    const definition = agent.getDefinition();

    // Build system prompt
    const systemPrompt = `

${hydratedContext}

## Agent Profile

Name: ${definition.name}
Description: ${definition.description}
Expertise: ${definition.expertise.join(', ')}
Communication Style: ${definition.communicationStyle}
Approach: ${definition.approach}

## Task Context

Session: ${request.sessionId}
${request.context ? `Additional Context: ${JSON.stringify(request.context)}` : ''}
`.trim();

    return { systemPrompt };

}

getState(): OrchestratorState {
const stats = this.taskManager.getStats();

    return {
      activeTasks: stats.running,
      completedTasks: stats.completed,
      failedTasks: stats.failed,
      activeAgents: this.agentSpawner.getActiveAgents().length,
      uptime: Date.now() - this.startTime.getTime()
    };

}

getTaskManager(): TaskManager {
return this.taskManager;
}

getAgentSpawner(): AgentSpawner {
return this.agentSpawner;
}

getSkillManager(): SkillManager {
return this.skillManager;
}

getSecurityManager(): SecurityManager {
return this.securityManager;
}

getErrorHandler(): ErrorHandler {
return this.errorHandler;
}

getLLMClient(): LLMClient {
return this.llmClient;
}

async shutdown(): Promise<void> {
// Terminate all agents
const agents = this.agentSpawner.listAgents();
for (const agent of agents) {
await this.agentSpawner.terminateAgent(agent.getId());
}

    // Clear tasks
    this.taskManager.clear();

    this.emit('shutdown');

}
} 5. Update Index Exports
Update src/orchestrator/index.ts:

typescript
Copy
export _ from './types';
export _ from './TaskManager';
export _ from './Orchestrator';
export _ from './errors';
export _ from './security';
export _ from './llm';
📁 FILES TO CREATE
src/orchestrator/types.ts
src/orchestrator/TaskManager.ts
src/orchestrator/llm/types.ts
src/orchestrator/llm/LLMClient.ts
src/orchestrator/llm/index.ts
src/orchestrator/Orchestrator.ts
Update src/orchestrator/index.ts
tests/orchestrator/TaskManager.test.ts (15-20 tests)
tests/orchestrator/llm/LLMClient.test.ts (10-15 tests)
tests/orchestrator/Orchestrator.test.ts (15-20 tests)
Total: 10 files, 40-50 tests

⚠️ IMPORTANT NOTES
Integration with Existing Code
The Orchestrator integrates with:

AgentSpawner from PROMPT 14A
ErrorHandler from PROMPT 14B
SecurityManager from PROMPT 14C
SkillManager, SkillRouter, SkillActivator from Phase 2
PrepromptHydrator from PROMPT 11A
If any imports fail, check the actual file paths in the codebase and adjust accordingly.

Mock LLM Implementation
The LLMClient uses a mock implementation for testing. In production:

Replace with actual API calls (OpenAI, Anthropic, etc.)
Add proper API key handling
Add rate limiting
Add token counting
✅ SUCCESS CRITERIA
✅ TaskManager working (create, start, complete, fail tasks)
✅ LLMClient working (mock implementation)
✅ Orchestrator coordinates all components
✅ Full request → response cycle working
✅ Agent spawning integrated
✅ Skill routing integrated
✅ Error handling integrated
✅ Security validation integrated
✅ 40-50 tests passing
✅ No TypeScript errors
END OF PROMPT 15
