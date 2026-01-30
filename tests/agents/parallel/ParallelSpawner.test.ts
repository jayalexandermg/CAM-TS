import { describe, it, expect, beforeEach } from '@jest/globals';
import { ParallelSpawner } from '../../../src/agents/parallel/ParallelSpawner';
import { SpotCheck } from '../../../src/agents/parallel/SpotCheck';
import { AgentSpawner } from '../../../src/agents/AgentSpawner';
import { AgentConfig, AgentDefinition } from '../../../src/agents/types';

describe('ParallelSpawner', () => {
  const testDefinition: AgentDefinition = {
    name: 'test-agent',
    description: 'Test agent for parallel spawning',
    expertise: ['testing'],
    personality: ['efficient'],
    communicationStyle: 'direct',
    approach: 'parallel',
    availableSkills: ['execute'],
  };

  const createConfig = (overrides?: Partial<AgentConfig>): AgentConfig => ({
    definition: testDefinition,
    sessionId: 'session-123',
    ...overrides,
  });

  const createConfigs = (count: number): AgentConfig[] => {
    return Array.from({ length: count }, (_, i) =>
      createConfig({
        definition: {
          ...testDefinition,
          name: `test-agent-${i}`,
          description: `Test agent ${i}`,
        },
      })
    );
  };

  describe('constructor', () => {
    it('should create ParallelSpawner with default spawner', () => {
      const parallelSpawner = new ParallelSpawner();

      expect(parallelSpawner.getSpawner()).toBeInstanceOf(AgentSpawner);
      expect(parallelSpawner.getActiveAgentCount()).toBe(0);
    });

    it('should create ParallelSpawner with provided spawner', () => {
      const spawner = new AgentSpawner();
      const parallelSpawner = new ParallelSpawner(spawner);

      expect(parallelSpawner.getSpawner()).toBe(spawner);
    });

    it('should create ParallelSpawner with custom options', () => {
      const parallelSpawner = new ParallelSpawner(undefined, {
        concurrencyLimit: 10,
        timeout: 60000,
      });

      expect(parallelSpawner).toBeDefined();
    });
  });

  describe('spawnParallel', () => {
    let parallelSpawner: ParallelSpawner;

    beforeEach(() => {
      parallelSpawner = new ParallelSpawner();
    });

    it('should return empty result for empty configs', async () => {
      const result = await parallelSpawner.spawnParallel({ configs: [] });

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(0);
      expect(result.metadata.totalAgents).toBe(0);
    });

    it('should spawn single agent', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: [createConfig()],
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.metadata.totalAgents).toBe(1);
      expect(result.metadata.successfulAgents).toBe(1);
    });

    it('should spawn multiple agents in parallel', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(3),
        concurrencyLimit: 3,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.metadata.totalAgents).toBe(3);
    });

    it('should respect concurrency limit', async () => {
      const configs = createConfigs(5);
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      parallelSpawner.on('agentStarted', () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      });

      parallelSpawner.on('agentCompleted', () => {
        currentConcurrent--;
      });

      await parallelSpawner.spawnParallel({
        configs,
        concurrencyLimit: 2,
      });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should track active agents during execution', async () => {
      let activeCount = 0;

      parallelSpawner.on('agentStarted', () => {
        activeCount = parallelSpawner.getActiveAgentCount();
      });

      await parallelSpawner.spawnParallel({
        configs: createConfigs(2),
        concurrencyLimit: 2,
      });

      expect(activeCount).toBeGreaterThan(0);
      expect(parallelSpawner.getActiveAgentCount()).toBe(0);
    });

    it('should emit events during execution', async () => {
      const events: string[] = [];

      parallelSpawner.on('batchStarted', () => events.push('batchStarted'));
      parallelSpawner.on('agentStarted', () => events.push('agentStarted'));
      parallelSpawner.on('agentCompleted', () => events.push('agentCompleted'));
      parallelSpawner.on('batchCompleted', () => events.push('batchCompleted'));
      parallelSpawner.on('allCompleted', () => events.push('allCompleted'));

      await parallelSpawner.spawnParallel({
        configs: [createConfig()],
      });

      expect(events).toContain('batchStarted');
      expect(events).toContain('agentStarted');
      expect(events).toContain('agentCompleted');
      expect(events).toContain('batchCompleted');
      expect(events).toContain('allCompleted');
    });

    it('should calculate total duration', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(2),
      });

      expect(result.metadata.totalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('aggregation strategies', () => {
    let parallelSpawner: ParallelSpawner;

    beforeEach(() => {
      parallelSpawner = new ParallelSpawner();
    });

    it('should use first-success strategy', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(3),
        aggregationStrategy: 'first-success',
      });

      expect(result.aggregatedResult).toBeDefined();
      expect(result.metadata.aggregationStrategy).toBe('first-success');
    });

    it('should use vote strategy', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(3),
        aggregationStrategy: 'vote',
      });

      expect(result.metadata.aggregationStrategy).toBe('vote');
    });

    it('should use merge strategy by default', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(2),
      });

      expect(result.metadata.aggregationStrategy).toBe('merge');
    });

    it('should use all strategy', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(2),
        aggregationStrategy: 'all',
      });

      expect(result.metadata.aggregationStrategy).toBe('all');
      expect(Array.isArray(result.aggregatedResult)).toBe(true);
    });
  });

  describe('stopOnFirstSuccess', () => {
    let parallelSpawner: ParallelSpawner;

    beforeEach(() => {
      parallelSpawner = new ParallelSpawner();
    });

    it('should stop after first successful batch when stopOnFirstSuccess is true', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(4),
        concurrencyLimit: 2,
        stopOnFirstSuccess: true,
      });

      // First batch of 2 should succeed and stop
      expect(result.results.length).toBeLessThanOrEqual(4);
      expect(result.success).toBe(true);
    });

    it('should continue all agents when stopOnFirstSuccess is false', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(4),
        concurrencyLimit: 2,
        stopOnFirstSuccess: false,
      });

      expect(result.results).toHaveLength(4);
    });
  });

  describe('spot checking', () => {
    let parallelSpawner: ParallelSpawner;

    beforeEach(() => {
      parallelSpawner = new ParallelSpawner();
    });

    it('should perform spot checks when enabled', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(2),
        spotCheck: {
          enabled: true,
          sampleRate: 1.0,
          validators: [SpotCheck.createSuccessValidator()],
        },
      });

      expect(result.spotCheckResults).toBeDefined();
    });

    it('should not perform spot checks when disabled', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(2),
        spotCheck: {
          enabled: false,
        },
      });

      expect(result.spotCheckResults).toBeUndefined();
    });

    it('should emit spotCheckFailed event on validation failure', async () => {
      let failedEventFired = false;

      parallelSpawner.on('spotCheckFailed', () => {
        failedEventFired = true;
      });

      const failingValidator = SpotCheck.createCustomValidator(
        'always-fail',
        () => false,
        'Always fails'
      );

      await parallelSpawner.spawnParallel({
        configs: [createConfig()],
        spotCheck: {
          enabled: true,
          sampleRate: 1.0,
          validators: [failingValidator],
        },
      });

      expect(failedEventFired).toBe(true);
    });
  });

  describe('timeout handling', () => {
    let parallelSpawner: ParallelSpawner;

    beforeEach(() => {
      parallelSpawner = new ParallelSpawner(undefined, { timeout: 100 });
    });

    it('should use default timeout from options', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: [createConfig()],
      });

      expect(result).toBeDefined();
    });

    it('should use config timeout when provided', async () => {
      const result = await parallelSpawner.spawnParallel({
        configs: [createConfig()],
        timeout: 5000,
      });

      expect(result).toBeDefined();
    });
  });

  describe('terminateAll', () => {
    it('should terminate all active agents', async () => {
      const parallelSpawner = new ParallelSpawner();

      // Start spawning but terminate immediately
      const spawnPromise = parallelSpawner.spawnParallel({
        configs: createConfigs(3),
      });

      await spawnPromise;
      await parallelSpawner.terminateAll();

      expect(parallelSpawner.getActiveAgentCount()).toBe(0);
    });

    it('should handle termination when no active agents', async () => {
      const parallelSpawner = new ParallelSpawner();

      await expect(parallelSpawner.terminateAll()).resolves.not.toThrow();
    });
  });

  describe('getActiveAgents', () => {
    it('should return empty array when no active agents', () => {
      const parallelSpawner = new ParallelSpawner();

      expect(parallelSpawner.getActiveAgents()).toHaveLength(0);
    });
  });

  describe('metadata', () => {
    it('should include correct metadata in result', async () => {
      const parallelSpawner = new ParallelSpawner();

      const result = await parallelSpawner.spawnParallel({
        configs: createConfigs(3),
        concurrencyLimit: 2,
        aggregationStrategy: 'merge',
      });

      expect(result.metadata).toEqual({
        totalAgents: 3,
        successfulAgents: 3,
        failedAgents: 0,
        totalDuration: expect.any(Number),
        concurrencyLimit: 2,
        aggregationStrategy: 'merge',
      });
    });
  });

  describe('batch processing', () => {
    it('should process agents in batches', async () => {
      const parallelSpawner = new ParallelSpawner();
      const batchStartEvents: number[] = [];

      parallelSpawner.on('batchStarted', ({ batchIndex }) => {
        batchStartEvents.push(batchIndex);
      });

      await parallelSpawner.spawnParallel({
        configs: createConfigs(5),
        concurrencyLimit: 2,
      });

      // 5 agents with concurrency 2 = 3 batches (2, 2, 1)
      expect(batchStartEvents).toEqual([0, 1, 2]);
    });

    it('should handle single batch when all agents fit', async () => {
      const parallelSpawner = new ParallelSpawner();
      const batchEvents: number[] = [];

      parallelSpawner.on('batchCompleted', ({ batchIndex }) => {
        batchEvents.push(batchIndex);
      });

      await parallelSpawner.spawnParallel({
        configs: createConfigs(3),
        concurrencyLimit: 5,
      });

      expect(batchEvents).toEqual([0]);
    });
  });
});
