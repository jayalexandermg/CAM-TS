import { EventEmitter } from 'events';
import {
  AgentConfig,
  AgentState,
  AgentStatus,
  AgentResult,
  AgentDefinition,
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
          skillsUsed: [],
        },
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
