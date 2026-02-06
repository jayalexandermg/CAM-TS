import { EventEmitter } from 'events';
import {
  AgentConfig,
  AgentState,
  AgentStatus,
  AgentResult,
  AgentDefinition,
  ExecutionContext,
} from './types';

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
      maxRetries: config.maxRetries ?? 3,
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
      throw new Error(
        `Agent ${this.state.id} is not idle (current status: ${this.state.status})`
      );
    }

    this.state.status = 'active';
    this.state.startedAt = new Date();
    this.state.currentTask = task;

    this.emit('started', {
      agentId: this.state.id,
      task,
      timestamp: this.state.startedAt,
    });
  }

  /**
   * Execute a task with the provided context
   *
   * Runs an agentic tool loop: repeatedly calls the LLM and executes
   * tools until the task is complete or max iterations is reached.
   *
   * @param task - The task description/user message
   * @param context - Execution context with tools, LLM client, and system prompt
   * @returns AgentResult with execution details
   */
  async execute(task: string, context?: ExecutionContext): Promise<AgentResult> {
    await this.start(task);

    try {
      // If no context provided, return simple placeholder (for backward compatibility)
      if (!context) {
        const result: AgentResult = {
          success: true,
          data: { message: 'No execution context provided' },
          metadata: {
            duration: this.getDuration() || 0,
            retries: this.state.retryCount,
            skillsUsed: [],
          },
        };
        await this.complete(result);
        return result;
      }

      // Build agent-specific system prompt
      const agentSystemPrompt = this.buildAgentPrompt(context.systemPrompt);

      // Check if we have tools available
      if (context.toolDefinitions.length > 0) {
        // Execute with tool loop
        const loopResult = await context.llmClient.executeToolLoop(
          agentSystemPrompt,
          task,
          context.toolDefinitions,
          context.toolExecutor,
          { maxIterations: 10 }
        );

        // Extract skills used from tool calls
        const skillsUsed: string[] = loopResult.toolUses.map(
          (tu: { request: { name: string } }) => tu.request.name
        );
        const uniqueSkills: string[] = Array.from(new Set(skillsUsed));

        const result: AgentResult = {
          success: loopResult.success,
          data: {
            response: loopResult.finalResponse,
            toolUses: loopResult.toolUses,
            iterations: loopResult.iterations,
          },
          error: loopResult.error ? new Error(loopResult.error) : undefined,
          metadata: {
            duration: this.getDuration() || 0,
            retries: this.state.retryCount,
            skillsUsed: uniqueSkills,
            toolUses: loopResult.toolUses.length,
            totalTokens: loopResult.totalTokens.total,
          },
        };

        await this.complete(result);
        return result;
      } else {
        // No tools - simple chat completion
        const response = await context.llmClient.chat(agentSystemPrompt, task, []);

        const result: AgentResult = {
          success: true,
          data: { response },
          metadata: {
            duration: this.getDuration() || 0,
            retries: this.state.retryCount,
            skillsUsed: [],
          },
        };

        await this.complete(result);
        return result;
      }
    } catch (error) {
      await this.fail(error as Error);
      throw error;
    }
  }

  /**
   * Build agent-specific system prompt
   */
  private buildAgentPrompt(basePrompt: string): string {
    const definition = this.state.definition;

    return `${basePrompt}

## Agent Profile
Name: ${definition.name}
Description: ${definition.description}
Expertise: ${definition.expertise.join(', ')}
Communication Style: ${definition.communicationStyle}
Approach: ${definition.approach}

You have access to skills: ${definition.availableSkills.join(', ') || 'none'}
${definition.constraints?.length ? `Constraints: ${definition.constraints.join(', ')}` : ''}`;
  }

  async complete(result: AgentResult): Promise<void> {
    if (this.state.status !== 'active' && this.state.status !== 'waiting') {
      throw new Error(
        `Agent ${this.state.id} is not active (current status: ${this.state.status})`
      );
    }

    this.state.status = 'completed';
    this.state.completedAt = new Date();
    this.state.result = result;

    this.emit('completed', {
      agentId: this.state.id,
      result,
      timestamp: this.state.completedAt,
    });
  }

  async fail(error: Error): Promise<void> {
    this.state.status = 'failed';
    this.state.failedAt = new Date();
    this.state.error = error;

    this.emit('failed', {
      agentId: this.state.id,
      error,
      timestamp: this.state.failedAt,
    });
  }

  async retry(): Promise<void> {
    if (this.state.retryCount >= this.state.maxRetries) {
      throw new Error(
        `Agent ${this.state.id} has exceeded max retries (${this.state.maxRetries})`
      );
    }

    this.state.retryCount++;
    this.state.status = 'idle';
    this.state.error = undefined;

    this.emit('retry', {
      agentId: this.state.id,
      retryCount: this.state.retryCount,
      timestamp: new Date(),
    });
  }

  setStatus(status: AgentStatus): void {
    const oldStatus = this.state.status;
    this.state.status = status;

    this.emit('statusChanged', {
      agentId: this.state.id,
      oldStatus,
      newStatus: status,
      timestamp: new Date(),
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
}
