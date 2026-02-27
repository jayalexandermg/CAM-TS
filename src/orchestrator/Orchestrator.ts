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
import { ExecutionContext } from '../agents/types';
import { BASE_AGENTS } from '../agents/definitions/base-agents';
import { LLMClient } from './llm/LLMClient';
import { ToolDefinition } from './llm/ToolSchema';
import { UOCS } from '../history/UOCS';
import { PostToolUseHook } from '../hooks/PostToolUseHook';
import { StopHook } from '../hooks/StopHook';
import { SubagentStopHook } from '../hooks/SubagentStopHook';
import { SkillManager } from '../skills/SkillManager';
import { SkillRouter } from '../skills/SkillRouter';
import { SkillActivator } from '../skills/SkillActivator';
import { SkillExecutor } from '../skills/SkillExecutor';
import { IntentMatcher } from '../skills/IntentMatcher';
import { CoreManager } from '../memory/core/CoreManager';
import { PrepromptInjector } from '../context/PrepromptInjector';
import { PrepromptHydrator } from '../context/PrepromptHydrator';

/**
 * Dependencies that can be injected into the Orchestrator
 */
export interface OrchestratorDependencies {
  taskManager?: TaskManager;
  errorHandler?: ErrorHandler;
  securityManager?: SecurityManager;
  agentSpawner?: AgentSpawner;
  llmClient?: LLMClient;
  skillActivator?: SkillActivator;
  skillExecutor?: SkillExecutor;
}

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private taskManager: TaskManager;
  private errorHandler: ErrorHandler;
  private securityManager: SecurityManager;
  private agentSpawner: AgentSpawner;
  private llmClient: LLMClient;
  private skillActivator: SkillActivator | null;
  private skillExecutor: SkillExecutor | null;
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
      llmProvider: config?.llmProvider || 'anthropic',
      llmModel: config?.llmModel || 'claude-opus-4-5-20251101',
      memoryBasePath:
        config?.memoryBasePath || path.join(os.homedir(), '.infinite-aura-ts', 'memory'),
    };

    this.startTime = new Date();

    // Initialize components (use injected dependencies or create new ones)
    this.taskManager = dependencies?.taskManager || new TaskManager(this.config.maxConcurrentTasks);
    this.errorHandler = dependencies?.errorHandler || new ErrorHandler();
    this.securityManager = dependencies?.securityManager || new SecurityManager();
    this.agentSpawner = dependencies?.agentSpawner || new AgentSpawner();
    this.llmClient =
      dependencies?.llmClient ||
      new LLMClient({
        provider: this.config.llmProvider!,
        model: this.config.llmModel!,
      });

    // Initialize skill system (use injected or build from config)
    if (dependencies?.skillActivator && dependencies?.skillExecutor) {
      this.skillActivator = dependencies.skillActivator;
      this.skillExecutor = dependencies.skillExecutor;
    } else {
      // Build the skill chain from config
      const { activator, executor } = this.buildSkillChain(this.config.memoryBasePath!);
      this.skillActivator = activator;
      this.skillExecutor = executor;
    }

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
      const result = await this.errorHandler.handle(() => this.executeTask(task), {
        taskId: task.id,
        sessionId: request.sessionId,
        timestamp: new Date(),
      });

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
      // Activate relevant skill based on request content
      await this.activateSkillForRequest(request);

      // Build execution context with tools and LLM client
      const executionContext = this.buildExecutionContext(request, agent);

      // Execute via agent's tool loop
      const agentResult = await agent.execute(request.input, executionContext);

      this.securityManager.trackAgentCompleted();

      // Extract response from agent result
      const response =
        typeof agentResult.data === 'object' && agentResult.data !== null
          ? (agentResult.data as { response?: string }).response || JSON.stringify(agentResult.data)
          : String(agentResult.data || '');

      return {
        output: response,
        data: {
          agentId: agent.getId(),
          skillId: request.options?.preferredSkill,
          toolUses: agentResult.metadata?.toolUses,
          skillsUsed: agentResult.metadata?.skillsUsed,
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

  /**
   * Build execution context for agent
   *
   * Creates the full ExecutionContext with system prompt, tools,
   * tool executor, and LLM client for the agent to use.
   */
  private buildExecutionContext(request: TaskRequest, _agent: Agent): ExecutionContext {
    // Build base system prompt
    const systemPrompt = this.buildSystemPrompt(request);

    // Get available tools (currently empty - will be populated when SkillActivator is wired)
    const toolDefinitions = this.getAvailableTools(request);

    // Create tool executor
    const toolExecutor = this.createToolExecutor();

    return {
      systemPrompt,
      toolDefinitions,
      toolExecutor,
      // Cast LLMClient to LLMClientRef (interface is compatible)
      llmClient: this.llmClient as unknown as ExecutionContext['llmClient'],
      sessionId: request.sessionId,
      contextData: request.context,
    };
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(request: TaskRequest): string {
    const basePrompt = `You are CAM, an AI orchestrator and personal assistant.

## Task Context
Session: ${request.sessionId}
${request.context ? `Additional Context: ${JSON.stringify(request.context)}` : ''}

When you need to perform actions, use the available tools. Think step by step about what needs to be done.`;

    return basePrompt;
  }

  /**
   * Get available tool definitions from active skills
   *
   * Pulls tool definitions from SkillExecutor which combines
   * registered tools with tools from active skills via SkillActivator.
   */
  private getAvailableTools(_request: TaskRequest): ToolDefinition[] {
    if (!this.skillExecutor) {
      return [];
    }
    return this.skillExecutor.getAvailableToolDefinitions();
  }

  /**
   * Create tool executor function using SkillExecutor
   *
   * Returns a function that routes tool calls through the SkillExecutor,
   * which handles both registered custom tools and skill-provided tools.
   */
  private createToolExecutor(): ExecutionContext['toolExecutor'] {
    if (!this.skillExecutor) {
      return async (name: string) => ({
        success: false,
        result: `Skill system not initialized, cannot execute tool: ${name}`,
        error: 'Skill system not initialized',
      });
    }
    return this.skillExecutor.createToolExecutor();
  }

  /**
   * Build the skill system dependency chain
   *
   * SkillManager → IntentMatcher → SkillRouter
   * CoreManager + PrepromptInjector → PrepromptHydrator
   * All of the above → SkillActivator → SkillExecutor
   */
  private buildSkillChain(memoryBasePath: string): {
    activator: SkillActivator | null;
    executor: SkillExecutor | null;
  } {
    try {
      const skillManager = new SkillManager(memoryBasePath);
      const coreManager = new CoreManager(memoryBasePath);
      const prepromptInjector = new PrepromptInjector();
      const prepromptHydrator = new PrepromptHydrator(coreManager, skillManager, prepromptInjector);
      const intentMatcher = new IntentMatcher(skillManager);
      const skillRouter = new SkillRouter(intentMatcher);
      const activator = new SkillActivator(skillManager, skillRouter, prepromptHydrator);
      const executor = new SkillExecutor(activator);
      return { activator, executor };
    } catch {
      // Skill system initialization failed - non-fatal, orchestrator can still work
      return { activator: null, executor: null };
    }
  }

  /**
   * Activate a skill based on the task request
   *
   * Uses SkillActivator to route the request to the most relevant skill
   * and activate it, making its tools available for the agent.
   */
  private async activateSkillForRequest(request: TaskRequest): Promise<void> {
    if (!this.skillActivator) {
      return;
    }

    try {
      await this.skillActivator.activateFromRequest(request.input, {
        preferredSkill: request.options?.preferredSkill,
        minConfidence: 0.3,
      });
    } catch {
      // Skill activation failure is non-fatal - agent can still work without tools
    }
  }

  getSkillActivator(): SkillActivator | null {
    return this.skillActivator;
  }

  getSkillExecutor(): SkillExecutor | null {
    return this.skillExecutor;
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
