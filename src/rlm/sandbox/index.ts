/**
 * RLM Sandbox Module
 *
 * Provides sandboxing capabilities for isolated reasoning step execution:
 * - Isolated execution environment
 * - State change tracking
 * - Rollback capabilities
 * - Transaction-like semantics
 */

export { Sandbox } from './Sandbox';
export { StateManager, deepClone, estimateSize } from './StateManager';
export { RollbackManager } from './RollbackManager';

// Export all types
export type {
  SandboxStatus,
  StateChangeType,
  StateChange,
  StateSnapshot,
  RollbackResult,
  SandboxConfig,
  IsolationLevel,
  SandboxExecutionResult,
  SandboxMetrics,
  SandboxEvents,
  SandboxExecutor,
  SandboxState,
} from './types';

export { DEFAULT_SANDBOX_CONFIG } from './types';
