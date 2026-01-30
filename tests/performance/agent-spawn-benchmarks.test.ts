/**
 * Performance Benchmarks: Agent Spawn Operations
 *
 * Benchmarks for agent creation, parallel spawning, and execution.
 */

import { BenchmarkRunner } from '../../src/benchmarks/BenchmarkRunner';
import { ParallelSpawner } from '../../src/agents/parallel/ParallelSpawner';
import { AgentSpawner } from '../../src/agents/AgentSpawner';
import { AgentConfig, AgentDefinition } from '../../src/agents/types';

describe('Performance: Agent Spawn Benchmarks', () => {
  jest.setTimeout(60000);

  let runner: BenchmarkRunner;
  let spawner: AgentSpawner;
  let parallelSpawner: ParallelSpawner;

  const createTestDefinition = (name: string): AgentDefinition => ({
    name,
    description: `Test agent ${name}`,
    expertise: ['technical'],
    personality: ['analytical'],
    communicationStyle: 'concise',
    approach: 'systematic',
    availableSkills: ['test-skill'],
  });

  const createTestConfig = (index: number): AgentConfig => ({
    definition: createTestDefinition(`test-agent-${index}`),
    sessionId: `session-${Date.now()}`,
    maxRetries: 1,
    timeout: 1000,
  });

  beforeAll(() => {
    runner = new BenchmarkRunner();
    spawner = new AgentSpawner();
    parallelSpawner = new ParallelSpawner(spawner, {
      concurrencyLimit: 10,
      timeout: 5000,
    });
  });

  afterEach(async () => {
    await parallelSpawner.terminateAll();
  });

  describe('Single Agent Spawn', () => {
    it('should spawn a single agent within target time', async () => {
      const result = await runner.run(
        {
          name: 'Single Agent Spawn',
          category: 'agent-spawn',
          operation: 'Spawn one agent with definition',
          iterations: 100,
          warmup: 5,
          targetMs: 50,
          trackMemory: true,
        },
        () => {
          const config = createTestConfig(Date.now());
          return spawner.spawn(config);
        }
      );

      console.log(`  Single agent spawn: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should spawn agent with complex definition', async () => {
      const complexDefinition: AgentDefinition = {
        name: 'complex-test-agent',
        description: 'A complex test agent with multiple traits and skills',
        expertise: ['security', 'technical', 'data'],
        personality: ['analytical', 'meticulous', 'cautious'],
        communicationStyle: 'detailed and thorough',
        approach: 'systematic',
        availableSkills: ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5'],
        constraints: ['constraint-1', 'constraint-2'],
      };

      const result = await runner.run(
        {
          name: 'Complex Agent Spawn',
          category: 'agent-spawn',
          operation: 'Spawn agent with complex definition',
          iterations: 50,
          warmup: 3,
          targetMs: 75,
          trackMemory: true,
        },
        () => {
          return spawner.spawn({
            definition: complexDefinition,
            sessionId: `session-${Date.now()}`,
          });
        }
      );

      console.log(`  Complex agent spawn: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Parallel Agent Spawn', () => {
    it('should spawn 5 agents in parallel within target time', async () => {
      const result = await runner.run(
        {
          name: 'Parallel Spawn (5 agents)',
          category: 'parallel-execution',
          operation: 'Spawn 5 agents in parallel',
          iterations: 20,
          warmup: 2,
          targetMs: 200,
          trackMemory: true,
        },
        async () => {
          const configs = Array(5)
            .fill(0)
            .map((_, i) => createTestConfig(i));

          await parallelSpawner.spawnParallel({
            configs,
            concurrencyLimit: 5,
            aggregationStrategy: 'all',
            timeout: 5000,
          });
        }
      );

      console.log(`  Parallel spawn (5): ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should spawn 10 agents in parallel within target time', async () => {
      const result = await runner.run(
        {
          name: 'Parallel Spawn (10 agents)',
          category: 'parallel-execution',
          operation: 'Spawn 10 agents in parallel',
          iterations: 10,
          warmup: 2,
          targetMs: 400,
          trackMemory: true,
        },
        async () => {
          const configs = Array(10)
            .fill(0)
            .map((_, i) => createTestConfig(i));

          await parallelSpawner.spawnParallel({
            configs,
            concurrencyLimit: 10,
            aggregationStrategy: 'all',
            timeout: 5000,
          });
        }
      );

      console.log(`  Parallel spawn (10): ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should handle batched parallel spawn', async () => {
      const result = await runner.run(
        {
          name: 'Batched Parallel Spawn',
          category: 'parallel-execution',
          operation: 'Spawn 20 agents with concurrency limit of 5',
          iterations: 5,
          warmup: 1,
          targetMs: 800,
          trackMemory: true,
        },
        async () => {
          const configs = Array(20)
            .fill(0)
            .map((_, i) => createTestConfig(i));

          await parallelSpawner.spawnParallel({
            configs,
            concurrencyLimit: 5,
            aggregationStrategy: 'all',
            timeout: 5000,
          });
        }
      );

      console.log(`  Batched parallel spawn: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Agent Lifecycle', () => {
    it('should complete agent lifecycle efficiently', async () => {
      const result = await runner.run(
        {
          name: 'Agent Lifecycle',
          category: 'agent-spawn',
          operation: 'Spawn, get status, terminate agent',
          iterations: 50,
          warmup: 3,
          targetMs: 100,
        },
        async () => {
          const config = createTestConfig(Date.now());
          const agent = spawner.spawn(config);
          agent.getStatus();
          await spawner.terminateAgent(agent.getId());
        }
      );

      console.log(`  Agent lifecycle: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Benchmark Report', () => {
    it('should generate JSON benchmark report', () => {
      const report = runner.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.environment.nodeVersion).toBeDefined();
      expect(report.summary.totalBenchmarks).toBeGreaterThan(0);
      expect(report.results.length).toBeGreaterThan(0);

      // Output JSON report
      const json = runner.toJSON();
      console.log('\n  Agent Spawn Benchmark Report (JSON):');
      console.log('  ' + json.split('\n').slice(0, 10).join('\n  ') + '\n  ...');
    });
  });
});
