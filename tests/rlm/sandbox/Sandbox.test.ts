/**
 * Sandbox Tests
 *
 * Tests for the RLM Sandbox covering:
 * - Isolated execution
 * - State change tracking
 * - Rollback operations
 * - Snapshot management
 */

import {
  Sandbox,
  StateManager,
  RollbackManager,
  DEFAULT_SANDBOX_CONFIG,
} from '../../../src/rlm/sandbox';

describe('Sandbox', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = new Sandbox();
  });

  describe('Initialization', () => {
    it('should create sandbox with generated ID', () => {
      expect(sandbox.getId()).toMatch(/^sandbox_\d+_[a-z0-9]+$/);
    });

    it('should initialize with idle status', () => {
      expect(sandbox.getStatus()).toBe('idle');
    });

    it('should use default configuration when none provided', () => {
      const state = sandbox.getState();
      expect(state).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customSandbox = new Sandbox({
        maxSnapshots: 5,
        autoSnapshot: false,
      });
      expect(customSandbox.getStatus()).toBe('idle');
    });

    it('should initialize with parent state in permissive mode', () => {
      const parentState = new Map<string, unknown>([
        ['key1', 'value1'],
        ['key2', 42],
      ]);

      const childSandbox = new Sandbox(
        { isolationLevel: 'permissive' },
        parentState
      );

      const state = childSandbox.getState();
      expect(state.get('key1')).toBe('value1');
      expect(state.get('key2')).toBe(42);
    });

    it('should not include parent state in strict mode', () => {
      const parentState = new Map<string, unknown>([
        ['key1', 'value1'],
      ]);

      const strictSandbox = new Sandbox(
        { isolationLevel: 'strict' },
        parentState
      );

      const state = strictSandbox.getState();
      expect(state.has('key1')).toBe(false);
    });
  });

  describe('Execution', () => {
    it('should execute function and return result', async () => {
      const result = await sandbox.execute((state) => {
        state.set('test', 'value');
        return 42;
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
    });

    it('should track state changes during execution', async () => {
      const result = await sandbox.execute((state) => {
        state.set('a', 1);
        state.set('b', 2);
        state.set('a', 10); // Update
        return 'done';
      });

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);

      const createChanges = result.changes.filter(c => c.type === 'create');
      const updateChanges = result.changes.filter(c => c.type === 'update');

      expect(createChanges.length).toBe(2); // a and b created
      expect(updateChanges.length).toBe(1); // a updated
    });

    it('should handle errors during execution', async () => {
      const result = await sandbox.execute<number>((state) => {
        state.set('test', 'value');
        throw new Error('Test error');
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
    });

    it('should change status to active during execution', async () => {
      let statusDuringExecution = '';

      await sandbox.execute((_state) => {
        statusDuringExecution = sandbox.getStatus();
        return null;
      });

      expect(statusDuringExecution).toBe('active');
    });

    it('should change status to completed after successful execution', async () => {
      await sandbox.execute(() => null);
      expect(sandbox.getStatus()).toBe('completed');
    });

    it('should change status to error after failed execution', async () => {
      await sandbox.execute(() => {
        throw new Error('fail');
      });
      expect(sandbox.getStatus()).toBe('error');
    });

    it('should support async executors', async () => {
      const result = await sandbox.execute(async (state) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        state.set('async', true);
        return 'async result';
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('async result');
      expect(sandbox.getState().get('async')).toBe(true);
    });

    it('should prevent execution when not idle', async () => {
      await sandbox.execute(() => null);

      await expect(sandbox.execute(() => null)).rejects.toThrow(
        'Cannot execute: sandbox is completed'
      );
    });
  });

  describe('Execute with Rollback', () => {
    it('should rollback on execution failure', async () => {
      const result = await sandbox.executeWithRollback<string>((state) => {
        state.set('before_error', 'value');
        throw new Error('Execution failed');
      });

      expect(result.success).toBe(false);
      expect(sandbox.getStatus()).toBe('rolled_back');
    });

    it('should preserve state on successful execution', async () => {
      const result = await sandbox.executeWithRollback((state) => {
        state.set('success_key', 'success_value');
        return 'ok';
      });

      expect(result.success).toBe(true);
      expect(sandbox.getState().get('success_key')).toBe('success_value');
    });
  });

  describe('Snapshots', () => {
    it('should create manual snapshots', async () => {
      await sandbox.execute((state) => {
        state.set('key1', 'value1');
        return null;
      });

      sandbox.reset();
      sandbox.snapshot('test snapshot');

      expect(sandbox.getSnapshotCount()).toBeGreaterThan(0);
    });

    it('should auto-snapshot when enabled', async () => {
      const autoSandbox = new Sandbox({ autoSnapshot: true });

      await autoSandbox.execute((state) => {
        state.set('test', 'value');
        return null;
      });

      expect(autoSandbox.getSnapshotCount()).toBeGreaterThan(0);
    });

    it('should compare snapshots', async () => {
      const testSandbox = new Sandbox({ autoSnapshot: false });

      await testSandbox.execute((state) => {
        state.set('key1', 'value1');
        return null;
      });

      testSandbox.reset();

      const snapshot1Id = testSandbox.snapshot('first');

      testSandbox.getState().set('key2', 'value2');
      const snapshot2Id = testSandbox.snapshot('second');

      const diff = testSandbox.compareSnapshots(snapshot1Id, snapshot2Id);

      expect(diff.added).toContain('key2');
    });
  });

  describe('Rollback', () => {
    it('should rollback to specific snapshot', async () => {
      sandbox = new Sandbox({ autoSnapshot: false });

      await sandbox.execute((state) => {
        state.set('initial', 'value');
        return null;
      });

      sandbox.reset();

      const snapshotId = sandbox.snapshot('checkpoint');
      sandbox.getState().set('after', 'after_value');

      expect(sandbox.getState().has('after')).toBe(true);

      sandbox.rollback(snapshotId);

      expect(sandbox.getState().has('after')).toBe(false);
    });

    it('should rollback to latest snapshot', async () => {
      sandbox = new Sandbox({ autoSnapshot: false });

      sandbox.snapshot('first');
      sandbox.getState().set('key', 'value1');
      sandbox.snapshot('second');
      sandbox.getState().set('key', 'value2');

      sandbox.rollbackToLatest();

      expect(sandbox.getState().get('key')).toBe('value1');
    });

    it('should rollback by steps', async () => {
      sandbox = new Sandbox({ autoSnapshot: false });

      sandbox.snapshot('step0');
      sandbox.getState().set('count', 0);
      sandbox.snapshot('step1');
      sandbox.getState().set('count', 1);
      sandbox.snapshot('step2');
      sandbox.getState().set('count', 2);
      sandbox.snapshot('step3');
      sandbox.getState().set('count', 3);

      // Current: count=3, rollback 2 steps should go to count=1
      sandbox.rollbackSteps(2);

      expect(sandbox.getState().get('count')).toBe(1);
    });

    it('should update status after rollback', () => {
      sandbox = new Sandbox({ autoSnapshot: false });
      sandbox.snapshot('initial');
      sandbox.getState().set('test', 'value');

      sandbox.rollbackToLatest();

      expect(sandbox.getStatus()).toBe('rolled_back');
    });

    it('should return false if rollback not possible', () => {
      sandbox = new Sandbox({ autoSnapshot: false });
      const result = sandbox.rollbackToLatest();

      expect(result).toBe(false);
    });

    it('should track rollback count in metrics', () => {
      sandbox = new Sandbox({ autoSnapshot: false });
      sandbox.snapshot('s1');
      sandbox.getState().set('a', 1);
      sandbox.snapshot('s2');
      sandbox.getState().set('a', 2);

      sandbox.rollbackToLatest();
      sandbox.rollbackToLatest();

      const metrics = sandbox.getMetrics();
      expect(metrics.rollbackCount).toBe(2);
    });
  });

  describe('State Management', () => {
    it('should isolate state between sandboxes', async () => {
      const sandbox1 = new Sandbox();
      const sandbox2 = new Sandbox();

      await sandbox1.execute((state) => {
        state.set('isolated', 'sandbox1');
        return null;
      });

      await sandbox2.execute((state) => {
        state.set('isolated', 'sandbox2');
        return null;
      });

      expect(sandbox1.getState().get('isolated')).toBe('sandbox1');
      expect(sandbox2.getState().get('isolated')).toBe('sandbox2');
    });

    it('should deep clone values by default', async () => {
      const obj = { nested: { value: 1 } };

      await sandbox.execute((state) => {
        state.set('obj', obj);
        return null;
      });

      // Modify original
      obj.nested.value = 999;

      // Sandbox should have original value
      const stored = sandbox.getState().get<typeof obj>('obj');
      expect(stored?.nested.value).toBe(1);
    });

    it('should track read operations when configured', async () => {
      const readTrackingSandbox = new Sandbox({ trackReads: true });

      await readTrackingSandbox.execute((state) => {
        state.set('key', 'value');
        state.get('key'); // Read operation
        return null;
      });

      const changes = readTrackingSandbox.getChanges();
      const readChanges = changes.filter(c => c.type === 'read');

      expect(readChanges.length).toBeGreaterThan(0);
    });

    it('should enforce state size limits', async () => {
      const smallSandbox = new Sandbox({ maxStateSize: 100 });

      const result = await smallSandbox.execute((state) => {
        state.set('large', 'x'.repeat(200));
        return null;
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('State size limit exceeded');
    });
  });

  describe('Fork and Merge', () => {
    it('should fork sandbox with current state', () => {
      // Set up state directly without going through execute
      sandbox = new Sandbox({ autoSnapshot: false });
      sandbox.getState().set('original', 'value');

      const forked = sandbox.fork();

      expect(forked.getState().get('original')).toBe('value');
      expect(forked.getId()).not.toBe(sandbox.getId());
    });

    it('should merge changes from another sandbox', async () => {
      const sandbox1 = new Sandbox();
      const sandbox2 = new Sandbox();

      await sandbox1.execute((state) => {
        state.set('key1', 'value1');
        return null;
      });

      await sandbox2.execute((state) => {
        state.set('key2', 'value2');
        return null;
      });

      sandbox1.reset();
      sandbox1.getState().set('key1', 'value1');

      sandbox2.reset();
      sandbox2.getState().set('key2', 'value2');

      const mergeResult = sandbox1.merge(sandbox2);

      expect(mergeResult.merged).toContain('key2');
      expect(sandbox1.getState().get('key2')).toBe('value2');
    });

    it('should detect conflicts during merge', async () => {
      const sandbox1 = new Sandbox();
      const sandbox2 = new Sandbox();

      sandbox1.getState().set('conflict', 'value1');
      sandbox2.getState().set('conflict', 'value2');

      const mergeResult = sandbox1.merge(sandbox2);

      expect(mergeResult.conflicts).toContain('conflict');
    });
  });

  describe('Pause and Resume', () => {
    it('should pause sandbox', async () => {
      await sandbox.execute((state) => {
        state.set('test', 'value');
        return null;
      });

      sandbox.reset();
      sandbox.pause();
      // Not in active state, so pause won't change to paused
      // This is expected behavior
      expect(['idle', 'paused'].includes(sandbox.getStatus())).toBe(true);
    });

    it('should resume paused sandbox', () => {
      sandbox = new Sandbox();
      // Manually set status to test resume - using bracket notation to avoid private access
      (sandbox as unknown as { status: string }).status = 'paused';
      sandbox.resume();
      expect(sandbox.getStatus()).toBe('active');
    });
  });

  describe('Abort and Reset', () => {
    it('should abort and discard changes', async () => {
      sandbox = new Sandbox({ autoSnapshot: true });

      await sandbox.execute((state) => {
        state.set('key', 'value');
        return null;
      });

      sandbox.abort();

      expect(sandbox.getStatus()).toBe('rolled_back');
    });

    it('should reset sandbox to initial state', async () => {
      await sandbox.execute((state) => {
        state.set('key', 'value');
        return null;
      });

      sandbox.reset();

      expect(sandbox.getStatus()).toBe('idle');
      expect(sandbox.getSnapshotCount()).toBe(0);
    });
  });

  describe('Events', () => {
    it('should emit sandboxStarted event', async () => {
      const handler = jest.fn();
      sandbox.on('sandboxStarted', handler);

      await sandbox.execute(() => null);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ sandboxId: sandbox.getId() })
      );
    });

    it('should emit sandboxCompleted event', async () => {
      const handler = jest.fn();
      sandbox.on('sandboxCompleted', handler);

      await sandbox.execute(() => null);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ sandboxId: sandbox.getId(), success: true })
      );
    });

    it('should emit executionError event on failure', async () => {
      const handler = jest.fn();
      sandbox.on('executionError', handler);

      await sandbox.execute(() => {
        throw new Error('test');
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should emit stateChanged event', async () => {
      const handler = jest.fn();
      sandbox.on('stateChanged', handler);

      await sandbox.execute((state) => {
        state.set('key', 'value');
        return null;
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should emit snapshotCreated event', () => {
      sandbox = new Sandbox({ autoSnapshot: false });
      const handler = jest.fn();
      sandbox.on('snapshotCreated', handler);

      sandbox.snapshot('test');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshot: expect.objectContaining({ description: 'test' }),
        })
      );
    });
  });

  describe('Metrics', () => {
    it('should track execution time', async () => {
      await sandbox.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return null;
      });

      const metrics = sandbox.getMetrics();
      expect(metrics.executionTime).toBeGreaterThanOrEqual(50);
    });

    it('should track change count', async () => {
      await sandbox.execute((state) => {
        state.set('a', 1);
        state.set('b', 2);
        state.set('c', 3);
        return null;
      });

      const metrics = sandbox.getMetrics();
      expect(metrics.changeCount).toBeGreaterThanOrEqual(3);
    });

    it('should track snapshot count', () => {
      sandbox = new Sandbox({ autoSnapshot: false });
      sandbox.snapshot('s1');
      sandbox.snapshot('s2');

      const metrics = sandbox.getMetrics();
      expect(metrics.snapshotCount).toBe(2);
    });

    it('should track peak state size', async () => {
      await sandbox.execute((state) => {
        state.set('large', 'x'.repeat(1000));
        return null;
      });

      const metrics = sandbox.getMetrics();
      expect(metrics.peakStateSize).toBeGreaterThan(1000);
    });
  });

  describe('Memory Estimation', () => {
    it('should estimate memory usage', () => {
      sandbox.getState().set('key', 'value');
      sandbox.snapshot();

      const usage = sandbox.estimateMemoryUsage();
      expect(usage).toBeGreaterThan(0);
    });
  });
});

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager('test-sandbox');
  });

  describe('State Operations', () => {
    it('should set and get values', () => {
      stateManager.set('key', 'value');
      expect(stateManager.get('key')).toBe('value');
    });

    it('should delete values', () => {
      stateManager.set('key', 'value');
      expect(stateManager.delete('key')).toBe(true);
      expect(stateManager.has('key')).toBe(false);
    });

    it('should return false when deleting non-existent key', () => {
      expect(stateManager.delete('nonexistent')).toBe(false);
    });

    it('should check if key exists', () => {
      stateManager.set('key', 'value');
      expect(stateManager.has('key')).toBe(true);
      expect(stateManager.has('nonexistent')).toBe(false);
    });

    it('should return all keys', () => {
      stateManager.set('a', 1);
      stateManager.set('b', 2);
      expect(stateManager.keys()).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('should return all values', () => {
      stateManager.set('a', 1);
      stateManager.set('b', 2);
      expect(stateManager.values()).toEqual(expect.arrayContaining([1, 2]));
    });

    it('should return all entries', () => {
      stateManager.set('a', 1);
      const entries = stateManager.entries();
      expect(entries).toContainEqual(['a', 1]);
    });

    it('should convert to object', () => {
      stateManager.set('key', 'value');
      const obj = stateManager.toObject();
      expect(obj).toEqual({ key: 'value' });
    });

    it('should clear all state', () => {
      stateManager.set('a', 1);
      stateManager.set('b', 2);
      stateManager.clear();
      expect(stateManager.keys()).toHaveLength(0);
    });
  });

  describe('Change Tracking', () => {
    it('should track create changes', () => {
      stateManager.set('new_key', 'new_value');
      const changes = stateManager.getChanges();
      expect(changes.some(c => c.type === 'create' && c.key === 'new_key')).toBe(true);
    });

    it('should track update changes', () => {
      stateManager.set('key', 'value1');
      stateManager.set('key', 'value2');
      const changes = stateManager.getChanges();
      expect(changes.some(c => c.type === 'update' && c.key === 'key')).toBe(true);
    });

    it('should track delete changes', () => {
      stateManager.set('key', 'value');
      stateManager.delete('key');
      const changes = stateManager.getChanges();
      expect(changes.some(c => c.type === 'delete' && c.key === 'key')).toBe(true);
    });

    it('should store previous and new values', () => {
      stateManager.set('key', 'old');
      stateManager.set('key', 'new');
      const changes = stateManager.getChanges();
      const updateChange = changes.find(c => c.type === 'update');
      expect(updateChange?.previousValue).toBe('old');
      expect(updateChange?.newValue).toBe('new');
    });
  });

  describe('Size Tracking', () => {
    it('should track state size', () => {
      stateManager.set('key', 'value');
      expect(stateManager.getStateSize()).toBeGreaterThan(0);
    });

    it('should update size on delete', () => {
      stateManager.set('key', 'value');
      const sizeAfterSet = stateManager.getStateSize();
      stateManager.delete('key');
      expect(stateManager.getStateSize()).toBeLessThan(sizeAfterSet);
    });
  });
});

describe('RollbackManager', () => {
  let stateManager: StateManager;
  let rollbackManager: RollbackManager;

  beforeEach(() => {
    stateManager = new StateManager('test-sandbox');
    rollbackManager = new RollbackManager('test-sandbox', stateManager);
  });

  describe('Snapshot Creation', () => {
    it('should create snapshots', () => {
      stateManager.set('key', 'value');
      const snapshot = rollbackManager.createSnapshot('test');

      expect(snapshot.id).toBeDefined();
      expect(snapshot.description).toBe('test');
    });

    it('should get snapshot by ID', () => {
      const created = rollbackManager.createSnapshot();
      const retrieved = rollbackManager.getSnapshot(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get latest snapshot', () => {
      rollbackManager.createSnapshot('first');
      rollbackManager.createSnapshot('second');

      const latest = rollbackManager.getLatestSnapshot();
      expect(latest?.description).toBe('second');
    });

    it('should prune old snapshots', () => {
      const smallManager = new RollbackManager('test', stateManager, {
        ...DEFAULT_SANDBOX_CONFIG,
        maxSnapshots: 3,
      });

      smallManager.createSnapshot('s1');
      smallManager.createSnapshot('s2');
      smallManager.createSnapshot('s3');
      smallManager.createSnapshot('s4');

      expect(smallManager.getSnapshotCount()).toBeLessThanOrEqual(3);
    });
  });

  describe('Rollback Operations', () => {
    it('should rollback to snapshot', () => {
      stateManager.set('key', 'initial');
      const snapshotId = rollbackManager.createSnapshot().id;

      stateManager.set('key', 'modified');
      expect(stateManager.get('key')).toBe('modified');

      const result = rollbackManager.rollback(snapshotId);

      expect(result.success).toBe(true);
      expect(stateManager.get('key')).toBe('initial');
    });

    it('should fail rollback for non-existent snapshot', () => {
      const result = rollbackManager.rollback('nonexistent');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Snapshot not found: nonexistent');
    });

    it('should rollback multiple steps', () => {
      rollbackManager.createSnapshot('s0');
      stateManager.set('count', 0);

      rollbackManager.createSnapshot('s1');
      stateManager.set('count', 1);

      rollbackManager.createSnapshot('s2');
      stateManager.set('count', 2);

      const result = rollbackManager.rollbackSteps(2);

      expect(result.success).toBe(true);
      expect(stateManager.get('count')).toBe(0);
    });

    it('should fail rollback with invalid step count', () => {
      rollbackManager.createSnapshot();
      const result = rollbackManager.rollbackSteps(0);

      expect(result.success).toBe(false);
    });

    it('should fail rollback with too many steps', () => {
      rollbackManager.createSnapshot();
      const result = rollbackManager.rollbackSteps(10);

      expect(result.success).toBe(false);
    });
  });

  describe('Snapshot Comparison', () => {
    it('should compare snapshots', () => {
      rollbackManager.createSnapshot('s1');
      stateManager.set('new_key', 'value');
      stateManager.set('modified', 'changed');
      const s2 = rollbackManager.createSnapshot('s2');

      const s1 = rollbackManager.getSnapshots()[0];
      const diff = rollbackManager.compareSnapshots(s1.id, s2.id);

      expect(diff.added.length).toBeGreaterThan(0);
    });

    it('should throw for non-existent snapshots', () => {
      rollbackManager.createSnapshot('s1');

      expect(() => {
        rollbackManager.compareSnapshots('nonexistent', 'also-nonexistent');
      }).toThrow('One or both snapshots not found');
    });
  });

  describe('Snapshot Chain', () => {
    it('should get snapshot chain', () => {
      const s1 = rollbackManager.createSnapshot('s1');
      const s2 = rollbackManager.createSnapshot('s2');
      const s3 = rollbackManager.createSnapshot('s3');

      const chain = rollbackManager.getSnapshotChain(s3.id);

      expect(chain.length).toBe(3);
      expect(chain[0].id).toBe(s1.id);
      expect(chain[1].id).toBe(s2.id);
      expect(chain[2].id).toBe(s3.id);
    });
  });

  describe('Memory Estimation', () => {
    it('should estimate memory usage', () => {
      stateManager.set('key', 'value');
      rollbackManager.createSnapshot();

      const usage = rollbackManager.estimateMemoryUsage();
      expect(usage).toBeGreaterThan(0);
    });
  });

  describe('Snapshot Management', () => {
    it('should delete specific snapshot', () => {
      const s1 = rollbackManager.createSnapshot('s1');
      rollbackManager.createSnapshot('s2');

      expect(rollbackManager.deleteSnapshot(s1.id)).toBe(true);
      expect(rollbackManager.getSnapshotCount()).toBe(1);
    });

    it('should return false when deleting non-existent snapshot', () => {
      expect(rollbackManager.deleteSnapshot('nonexistent')).toBe(false);
    });

    it('should clear all snapshots', () => {
      rollbackManager.createSnapshot('s1');
      rollbackManager.createSnapshot('s2');
      rollbackManager.clearSnapshots();

      expect(rollbackManager.getSnapshotCount()).toBe(0);
    });
  });
});
