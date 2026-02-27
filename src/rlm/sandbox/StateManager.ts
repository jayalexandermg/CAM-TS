/**
 * StateManager - Tracks State Changes During Sandbox Execution
 *
 * Provides:
 * - State change tracking (create, update, delete, read)
 * - Deep cloning for isolation
 * - Change history management
 * - State size monitoring
 */

import { EventEmitter } from 'events';
import {
  StateChange,
  StateChangeType,
  SandboxConfig,
  SandboxState,
  DEFAULT_SANDBOX_CONFIG,
} from './types';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Deep clone a value
 */
function deepClone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof Map) {
    const clonedMap = new Map();
    value.forEach((v, k) => {
      clonedMap.set(deepClone(k), deepClone(v));
    });
    return clonedMap as unknown as T;
  }

  if (value instanceof Set) {
    const clonedSet = new Set();
    value.forEach((v) => {
      clonedSet.add(deepClone(v));
    });
    return clonedSet as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }

  const clonedObj: Record<string, unknown> = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      clonedObj[key] = deepClone((value as Record<string, unknown>)[key]);
    }
  }
  return clonedObj as T;
}

/**
 * Estimate size of a value in bytes
 */
function estimateSize(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'boolean') {
    return 4;
  }

  if (typeof value === 'number') {
    return 8;
  }

  if (typeof value === 'string') {
    return value.length * 2;
  }

  if (value instanceof Date) {
    return 8;
  }

  if (value instanceof Map) {
    let size = 0;
    value.forEach((v, k) => {
      size += estimateSize(k) + estimateSize(v);
    });
    return size;
  }

  if (value instanceof Set) {
    let size = 0;
    value.forEach((v) => {
      size += estimateSize(v);
    });
    return size;
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc + estimateSize(item), 0);
  }

  if (typeof value === 'object') {
    let size = 0;
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        size += key.length * 2 + estimateSize((value as Record<string, unknown>)[key]);
      }
    }
    return size;
  }

  return 0;
}

/**
 * StateManager handles state tracking within a sandbox
 */
export class StateManager extends EventEmitter implements SandboxState {
  private state: Map<string, unknown>;
  private changes: StateChange[];
  private config: SandboxConfig;
  private currentSize: number;
  private sandboxId: string;
  private snapshotCallback?: (description?: string) => string;

  constructor(
    sandboxId: string,
    config?: Partial<SandboxConfig>,
    initialState?: Map<string, unknown>
  ) {
    super();
    this.sandboxId = sandboxId;
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    this.state = new Map();
    this.changes = [];
    this.currentSize = 0;

    // Initialize with provided state
    if (initialState) {
      initialState.forEach((value, key) => {
        const clonedValue = this.config.deepClone ? deepClone(value) : value;
        this.state.set(key, clonedValue);
        this.currentSize += estimateSize(clonedValue);
      });
    }
  }

  /**
   * Set snapshot callback for auto-snapshot functionality
   */
  setSnapshotCallback(callback: (description?: string) => string): void {
    this.snapshotCallback = callback;
  }

  /**
   * Get a value from state
   */
  get<T = unknown>(key: string): T | undefined {
    const value = this.state.get(key);

    // Track read if configured
    if (this.config.trackReads) {
      this.recordChange('read', key, value, value);
    }

    // Return cloned value to prevent external mutations
    return this.config.deepClone ? deepClone(value as T) : (value as T);
  }

  /**
   * Set a value in state
   */
  set<T = unknown>(key: string, value: T): void {
    const previousValue = this.state.get(key);
    const isUpdate = this.state.has(key);

    // Clone value if configured
    const clonedValue = this.config.deepClone ? deepClone(value) : value;

    // Check size limit
    const oldSize = previousValue !== undefined ? estimateSize(previousValue) : 0;
    const newSize = estimateSize(clonedValue);
    const projectedSize = this.currentSize - oldSize + newSize;

    if (projectedSize > this.config.maxStateSize) {
      this.emit('stateSizeWarning', {
        currentSize: projectedSize,
        maxSize: this.config.maxStateSize,
      });
      throw new Error(
        `State size limit exceeded: ${projectedSize} bytes > ${this.config.maxStateSize} bytes`
      );
    }

    // Update state
    this.state.set(key, clonedValue);
    this.currentSize = projectedSize;

    // Record change
    this.recordChange(isUpdate ? 'update' : 'create', key, previousValue, clonedValue);

    // Check if auto-snapshot needed
    this.checkAutoSnapshot();
  }

  /**
   * Delete a value from state
   */
  delete(key: string): boolean {
    if (!this.state.has(key)) {
      return false;
    }

    const previousValue = this.state.get(key);
    this.currentSize -= estimateSize(previousValue);
    this.state.delete(key);

    this.recordChange('delete', key, previousValue, undefined);
    this.checkAutoSnapshot();

    return true;
  }

  /**
   * Check if key exists in state
   */
  has(key: string): boolean {
    return this.state.has(key);
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.state.keys());
  }

  /**
   * Get all values
   */
  values(): unknown[] {
    const vals = Array.from(this.state.values());
    return this.config.deepClone ? deepClone(vals) : vals;
  }

  /**
   * Get all entries
   */
  entries(): Array<[string, unknown]> {
    const entries = Array.from(this.state.entries());
    return this.config.deepClone ? deepClone(entries) : entries;
  }

  /**
   * Get state as plain object
   */
  toObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    this.state.forEach((value, key) => {
      obj[key] = this.config.deepClone ? deepClone(value) : value;
    });
    return obj;
  }

  /**
   * Create a snapshot (delegates to snapshot callback)
   */
  snapshot(description?: string): string {
    if (this.snapshotCallback) {
      return this.snapshotCallback(description);
    }
    throw new Error('Snapshot callback not configured');
  }

  /**
   * Get change history
   */
  getChanges(): StateChange[] {
    return [...this.changes];
  }

  /**
   * Clear all state
   */
  clear(): void {
    const keys = Array.from(this.state.keys());
    for (const key of keys) {
      this.delete(key);
    }
  }

  /**
   * Get current state size in bytes
   */
  getStateSize(): number {
    return this.currentSize;
  }

  /**
   * Get internal state map (for snapshots)
   */
  getStateMap(): Map<string, unknown> {
    return this.config.deepClone ? deepClone(this.state) : new Map(this.state);
  }

  /**
   * Restore state from a map (for rollback)
   */
  restoreState(state: Map<string, unknown>): void {
    this.state.clear();
    this.currentSize = 0;

    state.forEach((value, key) => {
      const clonedValue = this.config.deepClone ? deepClone(value) : value;
      this.state.set(key, clonedValue);
      this.currentSize += estimateSize(clonedValue);
    });
  }

  /**
   * Get number of changes since last snapshot
   */
  getChangesSinceSnapshot(snapshotId?: string): StateChange[] {
    if (!snapshotId) {
      return [...this.changes];
    }

    // Find snapshot index in changes (if marked)
    const snapshotIndex = this.changes.findIndex((c) => c.metadata?.snapshotId === snapshotId);

    if (snapshotIndex === -1) {
      return [...this.changes];
    }

    return this.changes.slice(snapshotIndex + 1);
  }

  /**
   * Clear change history
   */
  clearChanges(): void {
    this.changes = [];
  }

  /**
   * Mark a point in change history (e.g., after snapshot)
   */
  markSnapshot(snapshotId: string): void {
    this.changes.push({
      id: generateId('marker'),
      timestamp: new Date(),
      type: 'read', // Marker type
      key: '__snapshot__',
      previousValue: undefined,
      newValue: undefined,
      metadata: {
        snapshotId,
        isMarker: true,
      },
    });
  }

  // === Private Methods ===

  /**
   * Record a state change
   */
  private recordChange(
    type: StateChangeType,
    key: string,
    previousValue: unknown,
    newValue: unknown,
    metadata?: Record<string, unknown>
  ): void {
    const change: StateChange = {
      id: generateId('change'),
      timestamp: new Date(),
      type,
      key,
      previousValue: this.config.deepClone ? deepClone(previousValue) : previousValue,
      newValue: this.config.deepClone ? deepClone(newValue) : newValue,
      metadata,
    };

    this.changes.push(change);
    this.emit('stateChanged', { change });
  }

  /**
   * Check if auto-snapshot should be triggered
   */
  private checkAutoSnapshot(): void {
    if (!this.config.autoSnapshot || !this.snapshotCallback) {
      return;
    }

    // Check if we've hit the change threshold
    const recentChanges = this.changes.filter((c) => !c.metadata?.isMarker).length;

    if (recentChanges >= this.config.maxChangesBeforeSnapshot) {
      const snapshotId = this.snapshotCallback('Auto-snapshot: change threshold');
      this.markSnapshot(snapshotId);
    }
  }
}

export { deepClone, estimateSize };
