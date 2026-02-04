/**
 * Orchestrator Types
 *
 * Type definitions for the orchestrator system.
 */

import { LLMProvider, LLMModel } from './llm/types';

export interface OrchestratorConfig {
  maxConcurrentTasks: number;
  defaultTimeout: number;
  enableLogging: boolean;
  llmProvider?: LLMProvider;
  llmModel?: LLMModel;
  memoryBasePath?: string;
}

export interface TaskRequest {
  id?: string;
  input: string;
  sessionId: string;
  userId?: string;
  context?: Record<string, unknown>;
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
  data?: unknown;
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
}
