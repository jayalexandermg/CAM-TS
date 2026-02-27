/**
 * Sandbox - Isolated Execution Environment for RLM Reasoning Steps
 *
 * Provides:
 * - Isolated execution environment
 * - State management with change tracking
 * - Rollback capabilities
 * - Transaction-like commit/abort semantics
 */

import { EventEmitter } from 'events';
import {
  SandboxConfig,
  SandboxStatus,
  SandboxExecutionResult,
  SandboxMetrics,
  SandboxExecutor,
  SandboxState,
  StateChange,
  DEFAULT_SANDBOX_CONFIG,
} from './types';
import { StateManager } from './StateManager';
import { RollbackManager } from './RollbackManager';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Sandbox provides an isolated execution environment
 */
export class Sandbox extends EventEmitter {
  private id: string;
  private config: SandboxConfig;
  private status: SandboxStatus;
  private stateManager: StateManager;
  private rollbackManager: RollbackManager;
  private parentState?: Map<string, unknown>;
  private metrics: SandboxMetrics;
  private executionStartTime?: number;

  constructor(config?: Partial<SandboxConfig>, parentState?: Map<string, unknown>) {
    super();
    this.id = generateId('sandbox');
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    this.status = 'idle';
    this.parentState = parentState;

    // Initialize state with parent state if provided
    const initialState = parentState
      ? this.config.isolationLevel === 'strict'
        ? new Map() // Strict: no parent state
        : new Map(parentState) // Permissive/Shared: copy parent state
      : new Map();

    this.stateManager = new StateManager(this.id, this.config, initialState);
    this.rollbackManager = new RollbackManager(this.id, this.stateManager, this.config);

    // Connect snapshot callback
    this.stateManager.setSnapshotCallback((description) => {
      const snapshot = this.rollbackManager.createSnapshot(description);
      return snapshot.id;
    });

    // Initialize metrics
    this.metrics = this.createEmptyMetrics();

    // Forward events from state manager and rollback manager
    this.setupEventForwarding();
  }

  /**
   * Get sandbox ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get current status
   */
  getStatus(): SandboxStatus {
    return this.status;
  }

  /**
   * Get state interface
   */
  getState(): SandboxState {
    return this.stateManager;
  }

  /**
   * Get metrics
   */
  getMetrics(): SandboxMetrics {
    return { ...this.metrics };
  }

  /**
   * Execute code within the sandbox
   */
  async execute<T>(executor: SandboxExecutor<T>): Promise<SandboxExecutionResult<T>> {
    if (this.status !== 'idle') {
      throw new Error(`Cannot execute: sandbox is ${this.status}`);
    }

    this.status = 'active';
    this.executionStartTime = Date.now();
    this.emit('sandboxStarted', { sandboxId: this.id });

    // Create initial snapshot
    if (this.config.autoSnapshot) {
      this.rollbackManager.createSnapshot('Initial state');
    }

    try {
      // Execute the provided function
      const result = await Promise.resolve(executor(this.stateManager));

      this.status = 'completed';
      const duration = Date.now() - this.executionStartTime;

      // Update metrics
      this.updateMetrics(duration);

      const executionResult: SandboxExecutionResult<T> = {
        success: true,
        result,
        changes: this.stateManager.getChanges(),
        finalState: this.stateManager.getStateMap(),
        duration,
        committed: false,
        metrics: this.getMetrics(),
      };

      this.emit('sandboxCompleted', { sandboxId: this.id, success: true });
      return executionResult;
    } catch (error) {
      this.status = 'error';
      const duration = Date.now() - (this.executionStartTime || Date.now());

      // Update metrics
      this.updateMetrics(duration);

      const executionResult: SandboxExecutionResult<T> = {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        changes: this.stateManager.getChanges(),
        finalState: this.stateManager.getStateMap(),
        duration,
        committed: false,
        metrics: this.getMetrics(),
      };

      this.emit('executionError', { sandboxId: this.id, error: executionResult.error! });
      this.emit('sandboxCompleted', { sandboxId: this.id, success: false });

      return executionResult;
    }
  }

  /**
   * Execute with automatic rollback on failure
   */
  async executeWithRollback<T>(executor: SandboxExecutor<T>): Promise<SandboxExecutionResult<T>> {
    // Create a checkpoint before execution
    const checkpointSnapshot = this.rollbackManager.createSnapshot('Pre-execution checkpoint');

    const result = await this.execute(executor);

    if (!result.success) {
      // Rollback to checkpoint
      const rollbackResult = this.rollbackManager.rollback(checkpointSnapshot.id);
      this.status = 'rolled_back';
      this.metrics.rollbackCount++;

      return {
        ...result,
        finalState: rollbackResult.resultingState,
      };
    }

    return result;
  }

  /**
   * Create a snapshot manually
   */
  snapshot(description?: string): string {
    const snapshot = this.rollbackManager.createSnapshot(description);
    this.metrics.snapshotCount++;
    return snapshot.id;
  }

  /**
   * Rollback to a specific snapshot
   */
  rollback(snapshotId: string): boolean {
    const result = this.rollbackManager.rollback(snapshotId);
    if (result.success) {
      this.status = 'rolled_back';
      this.metrics.rollbackCount++;
    }
    return result.success;
  }

  /**
   * Rollback to the most recent snapshot
   */
  rollbackToLatest(): boolean {
    const result = this.rollbackManager.rollbackToLatest();
    if (result.success) {
      this.status = 'rolled_back';
      this.metrics.rollbackCount++;
    }
    return result.success;
  }

  /**
   * Rollback by a number of steps
   */
  rollbackSteps(steps: number): boolean {
    const result = this.rollbackManager.rollbackSteps(steps);
    if (result.success) {
      this.status = 'rolled_back';
      this.metrics.rollbackCount++;
    }
    return result.success;
  }

  /**
   * Check if rollback is possible
   */
  canRollback(): boolean {
    return this.rollbackManager.canRollback();
  }

  /**
   * Get all changes made in sandbox
   */
  getChanges(): StateChange[] {
    return this.stateManager.getChanges();
  }

  /**
   * Commit changes to parent state (if any)
   */
  commit(): Map<string, unknown> {
    if (this.config.isolationLevel === 'strict') {
      // Strict isolation: changes are not reflected back
      return this.stateManager.getStateMap();
    }

    // For permissive/shared: return final state
    return this.stateManager.getStateMap();
  }

  /**
   * Abort and discard all changes
   */
  abort(): void {
    if (this.rollbackManager.canRollback()) {
      // Rollback to initial snapshot
      const snapshots = this.rollbackManager.getSnapshots();
      if (snapshots.length > 0) {
        this.rollbackManager.rollback(snapshots[0].id);
      }
    }
    this.status = 'rolled_back';
    this.metrics.rollbackCount++;
  }

  /**
   * Reset sandbox to initial state
   */
  reset(): void {
    this.stateManager.clear();
    this.rollbackManager.clearSnapshots();
    this.status = 'idle';
    this.metrics = this.createEmptyMetrics();

    // Reinitialize with parent state if in permissive/shared mode
    if (this.parentState && this.config.isolationLevel !== 'strict') {
      this.parentState.forEach((value, key) => {
        this.stateManager.set(key, value);
      });
    }

    // Clear changes after reinitializing
    this.stateManager.clearChanges();
  }

  /**
   * Pause sandbox execution (for long-running operations)
   */
  pause(): void {
    if (this.status === 'active') {
      this.status = 'paused';
      this.snapshot('Pause checkpoint');
    }
  }

  /**
   * Resume paused sandbox
   */
  resume(): void {
    if (this.status === 'paused') {
      this.status = 'active';
    }
  }

  /**
   * Fork sandbox into a new independent sandbox
   * Note: Fork uses 'shared' isolation by default to copy state
   */
  fork(config?: Partial<SandboxConfig>): Sandbox {
    const forkedState = this.stateManager.getStateMap();
    return new Sandbox({ ...this.config, isolationLevel: 'shared', ...config }, forkedState);
  }

  /**
   * Merge changes from another sandbox
   */
  merge(other: Sandbox): { conflicts: string[]; merged: string[] } {
    const otherState = other.getState();
    const conflicts: string[] = [];
    const merged: string[] = [];

    const otherKeys = otherState.keys();

    for (const key of otherKeys) {
      const otherValue = otherState.get(key);
      const thisValue = this.stateManager.get(key);

      if (this.stateManager.has(key)) {
        // Check for conflict
        const thisJson = JSON.stringify(thisValue);
        const otherJson = JSON.stringify(otherValue);

        if (thisJson !== otherJson) {
          conflicts.push(key);
        }
      } else {
        // New key from other sandbox
        this.stateManager.set(key, otherValue);
        merged.push(key);
      }
    }

    return { conflicts, merged };
  }

  /**
   * Get snapshot count
   */
  getSnapshotCount(): number {
    return this.rollbackManager.getSnapshotCount();
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): import('./types').StateSnapshot[] {
    return this.rollbackManager.getSnapshots();
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(
    snapshotId1: string,
    snapshotId2: string
  ): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    return this.rollbackManager.compareSnapshots(snapshotId1, snapshotId2);
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage(): number {
    return this.stateManager.getStateSize() + this.rollbackManager.estimateMemoryUsage();
  }

  // === Private Methods ===

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): SandboxMetrics {
    return {
      changeCount: 0,
      snapshotCount: 0,
      rollbackCount: 0,
      peakStateSize: 0,
      executionTime: 0,
      stateOperationTime: 0,
    };
  }

  /**
   * Update metrics after execution
   */
  private updateMetrics(duration: number): void {
    this.metrics.executionTime = duration;
    this.metrics.changeCount = this.stateManager
      .getChanges()
      .filter((c) => !c.metadata?.isMarker).length;
    this.metrics.snapshotCount = this.rollbackManager.getSnapshotCount();
    this.metrics.peakStateSize = Math.max(
      this.metrics.peakStateSize,
      this.stateManager.getStateSize()
    );
  }

  /**
   * Setup event forwarding from child components
   */
  private setupEventForwarding(): void {
    this.stateManager.on('stateChanged', (data) => {
      this.emit('stateChanged', data);
    });

    this.stateManager.on('stateSizeWarning', (data) => {
      this.emit('stateSizeWarning', data);
    });

    this.rollbackManager.on('snapshotCreated', (data) => {
      this.emit('snapshotCreated', data);
    });

    this.rollbackManager.on('rollbackPerformed', (data) => {
      this.emit('rollbackPerformed', data);
    });
  }
}
