/**
 * RollbackManager - Manages State Snapshots and Rollback Operations
 *
 * Provides:
 * - Snapshot creation and storage
 * - Rollback to previous snapshots
 * - Snapshot pruning and lifecycle management
 * - Incremental snapshot support
 */

import { EventEmitter } from 'events';
import { StateSnapshot, RollbackResult, SandboxConfig, DEFAULT_SANDBOX_CONFIG } from './types';
import { StateManager, deepClone } from './StateManager';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * RollbackManager handles snapshots and state restoration
 */
export class RollbackManager extends EventEmitter {
  private snapshots: StateSnapshot[];
  private config: SandboxConfig;
  private stateManager: StateManager;
  private sandboxId: string;

  constructor(sandboxId: string, stateManager: StateManager, config?: Partial<SandboxConfig>) {
    super();
    this.sandboxId = sandboxId;
    this.stateManager = stateManager;
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    this.snapshots = [];
  }

  /**
   * Create a new snapshot of current state
   */
  createSnapshot(description?: string): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: generateId('snapshot'),
      timestamp: new Date(),
      state: this.stateManager.getStateMap(),
      description,
      sandboxId: this.sandboxId,
      parentId:
        this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].id : undefined,
    };

    this.snapshots.push(snapshot);

    // Mark the snapshot point in state manager
    this.stateManager.markSnapshot(snapshot.id);

    // Prune old snapshots if needed
    this.pruneSnapshots();

    this.emit('snapshotCreated', { snapshot });
    return snapshot;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get a specific snapshot by ID
   */
  getSnapshot(snapshotId: string): StateSnapshot | undefined {
    return this.snapshots.find((s) => s.id === snapshotId);
  }

  /**
   * Get the most recent snapshot
   */
  getLatestSnapshot(): StateSnapshot | undefined {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : undefined;
  }

  /**
   * Rollback to a specific snapshot
   */
  rollback(snapshotId: string): RollbackResult {
    const startTime = Date.now();
    const errors: string[] = [];

    // Find the snapshot
    const snapshotIndex = this.snapshots.findIndex((s) => s.id === snapshotId);

    if (snapshotIndex === -1) {
      return {
        success: false,
        restoredSnapshotId: snapshotId,
        changesUndone: 0,
        duration: Date.now() - startTime,
        errors: [`Snapshot not found: ${snapshotId}`],
        resultingState: this.stateManager.getStateMap(),
      };
    }

    const snapshot = this.snapshots[snapshotIndex];

    try {
      // Get changes since the snapshot
      const changesSinceSnapshot = this.stateManager.getChangesSinceSnapshot(snapshotId);
      const changesUndone = changesSinceSnapshot.filter((c) => !c.metadata?.isMarker).length;

      // Restore state from snapshot
      this.stateManager.restoreState(deepClone(snapshot.state));

      // Remove snapshots after this one
      this.snapshots = this.snapshots.slice(0, snapshotIndex + 1);

      // Clear changes in state manager and re-mark the snapshot
      this.stateManager.clearChanges();
      this.stateManager.markSnapshot(snapshot.id);

      const result: RollbackResult = {
        success: true,
        restoredSnapshotId: snapshotId,
        changesUndone,
        duration: Date.now() - startTime,
        resultingState: this.stateManager.getStateMap(),
      };

      this.emit('rollbackPerformed', { result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      return {
        success: false,
        restoredSnapshotId: snapshotId,
        changesUndone: 0,
        duration: Date.now() - startTime,
        errors,
        resultingState: this.stateManager.getStateMap(),
      };
    }
  }

  /**
   * Rollback to the most recent snapshot
   */
  rollbackToLatest(): RollbackResult {
    const latest = this.getLatestSnapshot();

    if (!latest) {
      return {
        success: false,
        restoredSnapshotId: '',
        changesUndone: 0,
        duration: 0,
        errors: ['No snapshots available for rollback'],
        resultingState: this.stateManager.getStateMap(),
      };
    }

    return this.rollback(latest.id);
  }

  /**
   * Rollback by a number of steps
   */
  rollbackSteps(steps: number): RollbackResult {
    if (steps < 1) {
      return {
        success: false,
        restoredSnapshotId: '',
        changesUndone: 0,
        duration: 0,
        errors: ['Invalid step count: must be at least 1'],
        resultingState: this.stateManager.getStateMap(),
      };
    }

    const targetIndex = this.snapshots.length - steps;

    if (targetIndex < 0) {
      return {
        success: false,
        restoredSnapshotId: '',
        changesUndone: 0,
        duration: 0,
        errors: [
          `Cannot rollback ${steps} steps: only ${this.snapshots.length} snapshots available`,
        ],
        resultingState: this.stateManager.getStateMap(),
      };
    }

    const targetSnapshot = this.snapshots[targetIndex];
    return this.rollback(targetSnapshot.id);
  }

  /**
   * Check if rollback is possible
   */
  canRollback(): boolean {
    return this.snapshots.length > 0;
  }

  /**
   * Get number of available snapshots
   */
  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  /**
   * Delete a specific snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    const index = this.snapshots.findIndex((s) => s.id === snapshotId);

    if (index === -1) {
      return false;
    }

    // Update parent references for subsequent snapshots
    if (index < this.snapshots.length - 1 && index > 0) {
      this.snapshots[index + 1].parentId = this.snapshots[index - 1].id;
    } else if (index < this.snapshots.length - 1) {
      this.snapshots[index + 1].parentId = undefined;
    }

    this.snapshots.splice(index, 1);
    return true;
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Compare two snapshots and return differences
   */
  compareSnapshots(
    snapshotId1: string,
    snapshotId2: string
  ): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const snapshot1 = this.getSnapshot(snapshotId1);
    const snapshot2 = this.getSnapshot(snapshotId2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    const keys1 = new Set(snapshot1.state.keys());
    const keys2 = new Set(snapshot2.state.keys());

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Find added keys (in snapshot2 but not snapshot1)
    keys2.forEach((key) => {
      if (!keys1.has(key)) {
        added.push(key);
      }
    });

    // Find removed keys (in snapshot1 but not snapshot2)
    keys1.forEach((key) => {
      if (!keys2.has(key)) {
        removed.push(key);
      }
    });

    // Find modified keys (in both but different values)
    keys1.forEach((key) => {
      if (keys2.has(key)) {
        const value1 = JSON.stringify(snapshot1.state.get(key));
        const value2 = JSON.stringify(snapshot2.state.get(key));
        if (value1 !== value2) {
          modified.push(key);
        }
      }
    });

    return { added, removed, modified };
  }

  /**
   * Get snapshot chain (path from initial to specified snapshot)
   */
  getSnapshotChain(snapshotId: string): StateSnapshot[] {
    const chain: StateSnapshot[] = [];
    let currentId: string | undefined = snapshotId;

    while (currentId) {
      const snapshot = this.getSnapshot(currentId);
      if (!snapshot) break;

      chain.unshift(snapshot);
      currentId = snapshot.parentId;
    }

    return chain;
  }

  /**
   * Estimate total memory usage of snapshots
   */
  estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const snapshot of this.snapshots) {
      totalSize += this.estimateSnapshotSize(snapshot);
    }

    return totalSize;
  }

  // === Private Methods ===

  /**
   * Prune old snapshots to stay within limit
   */
  private pruneSnapshots(): void {
    while (this.snapshots.length > this.config.maxSnapshots) {
      // Remove oldest snapshot (except the first one for full state reference)
      if (this.snapshots.length > 1) {
        this.snapshots.splice(1, 1);
      } else {
        break;
      }
    }
  }

  /**
   * Estimate size of a single snapshot in bytes
   */
  private estimateSnapshotSize(snapshot: StateSnapshot): number {
    let size = 0;

    // Base object overhead
    size += 100;

    // ID and description strings
    size += (snapshot.id.length + (snapshot.description?.length || 0)) * 2;

    // State map
    snapshot.state.forEach((value, key) => {
      size += key.length * 2;
      size += this.estimateValueSize(value);
    });

    return size;
  }

  /**
   * Estimate size of a value in bytes
   */
  private estimateValueSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'boolean') return 4;
    if (typeof value === 'number') return 8;
    if (typeof value === 'string') return value.length * 2;

    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 100; // Default estimate for non-serializable
    }
  }
}
