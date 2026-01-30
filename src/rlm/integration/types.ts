/**
 * RLM Integration Type Definitions
 *
 * Types for integrating RLM with agents and CLI.
 */

import { Solution, ReasoningResult, ReasoningMetrics } from '../types';
import { ContextItem } from '../context/types';

/**
 * Configuration for RLM orchestrator
 */
export interface RLMOrchestratorConfig {
  /** Maximum concurrent reasoning tasks (default: 3) */
  maxConcurrentTasks: number;
  /** Default timeout per task in ms (default: 60000) */
  defaultTimeout: number;
  /** Enable memory persistence (default: true) */
  enableMemory: boolean;
  /** Enable sandboxing (default: true) */
  enableSandbox: boolean;
  /** Maximum context tokens (default: 8000) */
  maxContextTokens: number;
  /** Auto-save reasoning results (default: true) */
  autoSave: boolean;
}

/**
 * Request to solve a problem via RLM
 */
export interface RLMSolveRequest {
  /** Problem query/description */
  query: string;
  /** Optional context */
  context?: string;
  /** Optional constraints */
  constraints?: string[];
  /** Session ID for tracking */
  sessionId?: string;
  /** Agent ID if from agent */
  agentId?: string;
  /** Additional options */
  options?: {
    maxDepth?: number;
    timeout?: number;
    enableValidation?: boolean;
  };
}

/**
 * Request to analyze a problem via RLM
 */
export interface RLMAnalyzeRequest {
  /** Problem to analyze */
  query: string;
  /** Optional context */
  context?: string;
  /** Analysis depth (shallow/medium/deep) */
  depth?: 'shallow' | 'medium' | 'deep';
  /** Session ID */
  sessionId?: string;
}

/**
 * Result of an RLM solve operation
 */
export interface RLMSolveResult {
  /** Whether solving succeeded */
  success: boolean;
  /** Solution if successful */
  solution?: Solution;
  /** Full reasoning result */
  reasoningResult: ReasoningResult;
  /** Formatted answer for display */
  formattedAnswer?: string;
  /** Error if failed */
  error?: Error;
  /** Execution metrics */
  metrics: RLMExecutionMetrics;
}

/**
 * Result of an RLM analyze operation
 */
export interface RLMAnalyzeResult {
  /** Whether analysis succeeded */
  success: boolean;
  /** Problem complexity assessment */
  complexity: 'simple' | 'moderate' | 'complex';
  /** Confidence in assessment */
  confidence: number;
  /** Key concepts identified */
  keyConcepts: string[];
  /** Suggested approach */
  suggestedApproach: string;
  /** Can solve directly? */
  canSolveDirectly: boolean;
  /** Suggested decomposition */
  suggestedDecomposition?: string[];
  /** Error if failed */
  error?: Error;
}

/**
 * Execution metrics for RLM operations
 */
export interface RLMExecutionMetrics {
  /** Total execution time in ms */
  totalTime: number;
  /** Reasoning metrics */
  reasoning: ReasoningMetrics;
  /** Context tokens used */
  contextTokens: number;
  /** Memory operations count */
  memoryOperations: number;
  /** Sandbox operations count */
  sandboxOperations: number;
  /** Cache hits */
  cacheHits: number;
}

/**
 * State of the RLM orchestrator
 */
export interface RLMOrchestratorState {
  /** Active reasoning tasks */
  activeTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** Failed tasks */
  failedTasks: number;
  /** Total problems solved */
  problemsSolved: number;
  /** Average solving time in ms */
  averageSolveTime: number;
  /** Uptime in ms */
  uptime: number;
}

/**
 * Agent-RLM bridge configuration
 */
export interface AgentRLMBridgeConfig {
  /** Auto-use RLM for complex problems */
  autoUseRLM: boolean;
  /** Complexity threshold for auto-use (0-1) */
  complexityThreshold: number;
  /** Cache agent results in RLM context */
  cacheAgentResults: boolean;
  /** Share context between agents */
  shareContext: boolean;
}

/**
 * Result of agent reasoning via RLM
 */
export interface AgentReasoningResult {
  /** Agent ID */
  agentId: string;
  /** Task that was reasoned about */
  task: string;
  /** RLM solve result */
  rlmResult: RLMSolveResult;
  /** Context items used */
  contextUsed: ContextItem[];
  /** Execution time */
  duration: number;
}

/**
 * Events emitted by RLM orchestrator
 */
export interface RLMOrchestratorEvents {
  /** Task started */
  taskStarted: { taskId: string; query: string };
  /** Task completed */
  taskCompleted: { taskId: string; result: RLMSolveResult };
  /** Task failed */
  taskFailed: { taskId: string; error: Error };
  /** Context updated */
  contextUpdated: { itemCount: number; tokens: number };
  /** Memory saved */
  memorySaved: { sessionId: string; itemCount: number };
}

/**
 * Default RLM orchestrator configuration
 */
export const DEFAULT_RLM_ORCHESTRATOR_CONFIG: RLMOrchestratorConfig = {
  maxConcurrentTasks: 3,
  defaultTimeout: 60000,
  enableMemory: true,
  enableSandbox: true,
  maxContextTokens: 8000,
  autoSave: true,
};

/**
 * Default agent-RLM bridge configuration
 */
export const DEFAULT_AGENT_RLM_BRIDGE_CONFIG: AgentRLMBridgeConfig = {
  autoUseRLM: true,
  complexityThreshold: 0.6,
  cacheAgentResults: true,
  shareContext: true,
};
