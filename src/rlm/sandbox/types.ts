/**
 * RLM Sandbox Type Definitions
 *
 * Types for sandboxed execution that enables:
 * - Isolated reasoning step execution
 * - State change tracking
 * - Rollback capabilities
 */

/**
 * Status of a sandbox instance
 */
export type SandboxStatus = 'idle' | 'active' | 'paused' | 'completed' | 'rolled_back' | 'error';

/**
 * Type of state change
 */
export type StateChangeType = 'create' | 'update' | 'delete' | 'read';

/**
 * A single state change entry
 */
export interface StateChange {
  /** Unique change identifier */
  id: string;
  /** Timestamp of the change */
  timestamp: Date;
  /** Type of change */
  type: StateChangeType;
  /** Key/path that was changed */
  key: string;
  /** Value before change (undefined for create) */
  previousValue?: unknown;
  /** Value after change (undefined for delete) */
  newValue?: unknown;
  /** Metadata about the change */
  metadata?: Record<string, unknown>;
}

/**
 * A snapshot of state at a point in time
 */
export interface StateSnapshot {
  /** Unique snapshot identifier */
  id: string;
  /** Timestamp when snapshot was taken */
  timestamp: Date;
  /** Complete state at snapshot time */
  state: Map<string, unknown>;
  /** Description of why snapshot was taken */
  description?: string;
  /** Sandbox ID this snapshot belongs to */
  sandboxId: string;
  /** Parent snapshot ID (for incremental snapshots) */
  parentId?: string;
}

/**
 * Result of a rollback operation
 */
export interface RollbackResult {
  /** Whether rollback succeeded */
  success: boolean;
  /** Snapshot ID that was restored */
  restoredSnapshotId: string;
  /** Number of changes that were undone */
  changesUndone: number;
  /** Time taken for rollback in ms */
  duration: number;
  /** Any errors encountered */
  errors?: string[];
  /** State after rollback */
  resultingState: Map<string, unknown>;
}

/**
 * Configuration for sandbox execution
 */
export interface SandboxConfig {
  /** Maximum number of snapshots to keep (default: 10) */
  maxSnapshots: number;
  /** Whether to auto-snapshot on major operations (default: true) */
  autoSnapshot: boolean;
  /** Snapshot interval in ms (0 = disabled, default: 0) */
  snapshotInterval: number;
  /** Maximum state size in bytes (default: 10MB) */
  maxStateSize: number;
  /** Whether to track read operations (default: false) */
  trackReads: boolean;
  /** Maximum changes before forced snapshot (default: 100) */
  maxChangesBeforeSnapshot: number;
  /** Enable deep cloning for values (default: true) */
  deepClone: boolean;
  /** Isolation level for execution */
  isolationLevel: IsolationLevel;
}

/**
 * Level of isolation for sandbox execution
 */
export type IsolationLevel =
  | 'strict' // Complete isolation, no external access
  | 'permissive' // Allow read-only external access
  | 'shared'; // Allow controlled shared state

/**
 * Result of sandbox execution
 */
export interface SandboxExecutionResult<T> {
  /** Whether execution succeeded */
  success: boolean;
  /** Return value from execution */
  result?: T;
  /** Error if execution failed */
  error?: Error;
  /** All state changes made during execution */
  changes: StateChange[];
  /** Final state after execution */
  finalState: Map<string, unknown>;
  /** Duration of execution in ms */
  duration: number;
  /** Whether state was committed */
  committed: boolean;
  /** Metrics about execution */
  metrics: SandboxMetrics;
}

/**
 * Metrics from sandbox execution
 */
export interface SandboxMetrics {
  /** Number of state changes */
  changeCount: number;
  /** Number of snapshots taken */
  snapshotCount: number;
  /** Number of rollbacks performed */
  rollbackCount: number;
  /** Peak state size in bytes */
  peakStateSize: number;
  /** Total execution time in ms */
  executionTime: number;
  /** Time spent on state operations in ms */
  stateOperationTime: number;
}

/**
 * Events emitted by sandbox components
 */
export interface SandboxEvents {
  /** State changed */
  stateChanged: { change: StateChange };
  /** Snapshot created */
  snapshotCreated: { snapshot: StateSnapshot };
  /** Rollback performed */
  rollbackPerformed: { result: RollbackResult };
  /** Sandbox started */
  sandboxStarted: { sandboxId: string };
  /** Sandbox completed */
  sandboxCompleted: { sandboxId: string; success: boolean };
  /** Execution error */
  executionError: { sandboxId: string; error: Error };
  /** State size warning */
  stateSizeWarning: { currentSize: number; maxSize: number };
}

/**
 * Function type for sandbox execution
 */
export type SandboxExecutor<T> = (state: SandboxState) => T | Promise<T>;

/**
 * Interface for interacting with sandbox state
 */
export interface SandboxState {
  /** Get a value from state */
  get<T = unknown>(key: string): T | undefined;
  /** Set a value in state */
  set<T = unknown>(key: string, value: T): void;
  /** Delete a value from state */
  delete(key: string): boolean;
  /** Check if key exists */
  has(key: string): boolean;
  /** Get all keys */
  keys(): string[];
  /** Get all values */
  values(): unknown[];
  /** Get all entries */
  entries(): Array<[string, unknown]>;
  /** Get current state as plain object */
  toObject(): Record<string, unknown>;
  /** Create a snapshot */
  snapshot(description?: string): string;
  /** Get change history */
  getChanges(): StateChange[];
  /** Clear all state */
  clear(): void;
}

/**
 * Default sandbox configuration
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  maxSnapshots: 10,
  autoSnapshot: true,
  snapshotInterval: 0,
  maxStateSize: 10 * 1024 * 1024, // 10MB
  trackReads: false,
  maxChangesBeforeSnapshot: 100,
  deepClone: true,
  isolationLevel: 'strict',
};
