/**
 * Orchestrator
 *
 * The central coordinator that brings together agents, skills, sessions,
 * and task management. This is the brain of CAM (Claude Agentic Memory).
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
import { OrchestratorConfig, TaskRequest, TaskResult, OrchestratorState } from './types';
import { TaskManager, Task } from './TaskManager';
import { ErrorHandler } from './errors/ErrorHandler';
import { SecurityManager } from './security/SecurityManager';
import { AgentSpawner } from '../agents/AgentSpawner';
import { Agent } from '../agents/Agent';
import { BASE_AGENTS } from '../agents/definitions/base-agents';
import { LLMClient } from './llm/LLMClient';
import { UOCS } from '../history/UOCS';
import { PostToolUseHook } from '../hooks/PostToolUseHook';
import { StopHook } from '../hooks/StopHook';
import { SubagentStopHook } from '../hooks/SubagentStopHook';

/**
 * Dependencies that can be injected into the Orchestrator
 */
export interface OrchestratorDependencies {
  taskManager?: TaskManager;
  errorHandler?: ErrorHandler;
  securityManager?: SecurityManager;
  agentSpawner?: AgentSpawner;
  llmClient?: LLMClient;
}

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private taskManager: TaskManager;
  private errorHandler: ErrorHandler;
  private securityManager: SecurityManager;
  private agentSpawner: AgentSpawner;
  private llmClient: LLMClient;
  private startTime: Date;
  private uocs: UOCS;
  private postToolUseHook: PostToolUseHook;
  private stopHook: StopHook;
  private subagentStopHook: SubagentStopHook;
  private initialized: boolean = false;

  constructor(config?: Partial<OrchestratorConfig>, dependencies?: OrchestratorDependencies) {
    super();

    this.config = {
      maxConcurrentTasks: config?.maxConcurrentTasks || 5,
      defaultTimeout: config?.defaultTimeout || 300000, // 5 minutes
      enableLogging: config?.enableLogging ?? true,
      llmProvider: config?.llmProvider || 'mock',
      llmModel: config?.llmModel || 'mock-model',
      memoryBasePath:
        config?.memoryBasePath || path.join(os.homedir(), '.infinite-aura-ts', 'memory'),
    };

    this.startTime = new Date();

    // Initialize components (use injected dependencies or create new ones)
    this.taskManager =
      dependencies?.taskManager || new TaskManager(this.config.maxConcurrentTasks);
    this.errorHandler = dependencies?.errorHandler || new ErrorHandler();
    this.securityManager = dependencies?.securityManager || new SecurityManager();
    this.agentSpawner = dependencies?.agentSpawner || new AgentSpawner();
    this.llmClient =
      dependencies?.llmClient ||
      new LLMClient({
        provider: this.config.llmProvider!,
        model: this.config.llmModel!,
      });

    // Initialize UOCS and hooks
    this.uocs = new UOCS();
    this.postToolUseHook = new PostToolUseHook({ uocs: this.uocs });
    this.stopHook = new StopHook(this.uocs);
    this.subagentStopHook = new SubagentStopHook(this.uocs);

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
          retries: 0,
        },
      };
    }

    // Sanitize input
    const sanitizedInput = this.securityManager.sanitizeInput(request.input);
    const sanitizedRequest = { ...request, input: sanitizedInput };

    // Auto-start session if not already active
    if (request.sessionId && !this.uocs.getActiveSessionIds().includes(request.sessionId)) {
      await this.startSession(request.sessionId);
    }

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
          timestamp: new Date(),
        }
      );

      // Complete task
      this.taskManager.completeTask(task.id, result);

      // Sanitize output
      const sanitizedResult: TaskResult = {
        ...result,
        taskId: task.id,
        success: true,
        output:
          typeof result.output === 'string'
            ? (this.securityManager.sanitizeOutput(result.output) as string)
            : result.output,
        data: this.securityManager.sanitizeOutput(result.data),
        metadata: result.metadata || task.metadata,
      };

      return sanitizedResult;
    } catch (error) {
      this.taskManager.failTask(task.id, error as Error);

      return {
        taskId: task.id,
        success: false,
        error: error as Error,
        metadata: task.metadata,
      };
    }
  }

  private async executeTask(task: Task): Promise<Partial<TaskResult>> {
    const { request } = task;

    // Check if we can create an agent
    if (!this.securityManager.canCreateAgent(request.sessionId)) {
      throw new Error('Agent limit reached for session');
    }

    // Determine agent type based on preferred agent or default
    const agentType = this.determineAgentType(request.options?.preferredSkill);

    // Spawn agent
    const agent = this.agentSpawner.spawnByName(agentType, request.sessionId);

    this.securityManager.trackAgentCreated();
    task.metadata.agentId = agent.getId();

    try {
      // Start the agent
      await agent.start(request.input);

      // Build context
      const context = this.buildContext(request, agent);

      // Execute via LLM
      const response = await this.llmClient.chat(context.systemPrompt, request.input, []);

      // Complete agent
      await agent.complete({
        success: true,
        data: { response },
      });

      this.securityManager.trackAgentCompleted();

      return {
        output: response,
        data: {
          agentId: agent.getId(),
          skillId: request.options?.preferredSkill,
        },
        metadata: {
          ...task.metadata,
          agentId: agent.getId(),
          skillId: request.options?.preferredSkill,
        },
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
      research: 'researcher',
      analysis: 'researcher',
      coding: 'coder',
      testing: 'coder',
      debugging: 'coder',
      coordination: 'coordinator',
    };

    return skillAgentMap[skillId] || 'default';
  }

  private buildContext(request: TaskRequest, agent: Agent): { systemPrompt: string } {
    // Get agent definition
    const definition = agent.getDefinition();

    // Build system prompt
    const systemPrompt = `
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
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  getAgentSpawner(): AgentSpawner {
    return this.agentSpawner;
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

  getUOCS(): UOCS {
    return this.uocs;
  }

  getPostToolUseHook(): PostToolUseHook {
    return this.postToolUseHook;
  }

  getStopHook(): StopHook {
    return this.stopHook;
  }

  getSubagentStopHook(): SubagentStopHook {
    return this.subagentStopHook;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.uocs.initialize();
    this.initialized = true;
  }

  async startSession(sessionId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    this.uocs.startSession(sessionId);
  }

  async shutdown(): Promise<void> {
    // End all active sessions via StopHook
    for (const sessionId of this.uocs.getActiveSessionIds()) {
      await this.stopHook.execute({
        sessionId,
        agentId: undefined,
        reason: 'complete',
      });
    }

    // Terminate all agents
    const agents = this.agentSpawner.listAgents();
    for (const agent of agents) {
      await this.agentSpawner.terminateAgent(agent.getId());
    }

    // Clear tasks
    this.taskManager.clear();

    this.emit('shutdown');
  }
}
