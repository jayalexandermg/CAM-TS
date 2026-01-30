import { Agent } from '../Agent';
import { AgentConfig, AgentResult } from '../types';

export type AggregationStrategy = 'merge' | 'vote' | 'first-success' | 'all';

export interface ParallelSpawnConfig {
  configs: AgentConfig[];
  concurrencyLimit?: number;
  aggregationStrategy?: AggregationStrategy;
  timeout?: number;
  stopOnFirstSuccess?: boolean;
  spotCheck?: SpotCheckConfig;
}

export interface SpotCheckConfig {
  enabled: boolean;
  sampleRate?: number;
  validators?: SpotCheckValidator[];
  failOnError?: boolean;
}

export interface SpotCheckValidator {
  name: string;
  validate: (result: AgentResult, agent: Agent) => SpotCheckResult;
}

export interface SpotCheckResult {
  valid: boolean;
  validatorName: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface ParallelSpawnResult {
  success: boolean;
  results: AgentExecutionResult[];
  aggregatedResult?: unknown;
  spotCheckResults?: SpotCheckResult[];
  metadata: ParallelSpawnMetadata;
}

export interface AgentExecutionResult {
  agentId: string;
  result: AgentResult;
  duration: number;
  spotCheckPassed?: boolean;
}

export interface ParallelSpawnMetadata {
  totalAgents: number;
  successfulAgents: number;
  failedAgents: number;
  totalDuration: number;
  concurrencyLimit: number;
  aggregationStrategy: AggregationStrategy;
}

export interface ParallelSpawnerEvents {
  agentStarted: { agentId: string; index: number; total: number };
  agentCompleted: { agentId: string; result: AgentResult; duration: number };
  agentFailed: { agentId: string; error: Error; duration: number };
  batchStarted: { batchIndex: number; batchSize: number };
  batchCompleted: { batchIndex: number; results: AgentExecutionResult[] };
  allCompleted: { result: ParallelSpawnResult };
  spotCheckFailed: { agentId: string; results: SpotCheckResult[] };
}
