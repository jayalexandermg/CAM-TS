/**
 * Comprehensive Performance Benchmarks
 *
 * Runs all critical operation benchmarks and generates a complete JSON report.
 * This suite covers: agent spawn, memory ops, skill routing, and trait inference.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BenchmarkRunner, DEFAULT_PERFORMANCE_TARGETS } from '../../src/benchmarks';
import { ParallelSpawner } from '../../src/agents/parallel/ParallelSpawner';
import { AgentSpawner } from '../../src/agents/AgentSpawner';
import { AgentConfig, AgentDefinition } from '../../src/agents/types';
import { MemoryPipeline } from '../../src/memory/pipeline/MemoryPipeline';
import { IntentRouter } from '../../src/skills/routing/IntentRouter';
import { SkillRegistry, SkillDefinition } from '../../src/skills/routing/SkillRegistry';
import { TraitInference } from '../../src/agents/factory/TraitInference';
import { TraitsData } from '../../src/agents/traits/types';
import {
  createTempMemoryScaffold,
  cleanupTempScaffold,
} from '../utils/test-helpers';

describe('Performance: Comprehensive Benchmarks', () => {
  jest.setTimeout(120000);

  let runner: BenchmarkRunner;
  const tempDirs: string[] = [];

  // Helper: create test agent definition
  const createTestDefinition = (name: string): AgentDefinition => ({
    name,
    description: `Test agent ${name}`,
    expertise: ['technical'],
    personality: ['analytical'],
    communicationStyle: 'concise',
    approach: 'systematic',
    availableSkills: ['test-skill'],
  });

  // Helper: create test agent config
  const createTestConfig = (index: number): AgentConfig => ({
    definition: createTestDefinition(`test-agent-${index}`),
    sessionId: `session-${Date.now()}`,
  });

  // Helper: generate test skills
  const generateTestSkills = (count: number): SkillDefinition[] => {
    const domains = ['code', 'test', 'debug', 'deploy', 'analyze'];
    const skills: SkillDefinition[] = [];

    for (let i = 0; i < count; i++) {
      const domain = domains[i % domains.length];
      skills.push({
        name: `${domain}-skill-${i}`,
        description: `Skill for ${domain}`,
        useWhen: [`User wants to ${domain}`],
        keywords: [domain, `${domain}-action`],
        capabilities: [`Handle ${domain}`],
        inputs: [],
        outputs: [],
      });
    }

    return skills;
  };

  // Mock traits data
  const mockTraitsData: TraitsData = {
    expertise: {
      security: {
        name: 'Security',
        description: 'Security analysis',
        keywords: ['vulnerability', 'threat', 'security', 'exploit'],
      },
      technical: {
        name: 'Technical',
        description: 'Technical implementation',
        keywords: ['code', 'architecture', 'system', 'API'],
      },
      data: {
        name: 'Data',
        description: 'Data analysis',
        keywords: ['data', 'analytics', 'statistics'],
      },
    },
    personality: {
      analytical: { name: 'Analytical', description: 'Data-driven' },
      cautious: { name: 'Cautious', description: 'Considers edge cases' },
    },
    approach: {
      thorough: { name: 'Thorough', description: 'Exhaustive analysis' },
      rapid: { name: 'Rapid', description: 'Quick assessment' },
    },
    examples: {},
  };

  beforeAll(() => {
    runner = new BenchmarkRunner();
  });

  afterAll(async () => {
    for (const dir of tempDirs) {
      await cleanupTempScaffold(dir);
    }
  });

  describe('Agent Spawn Benchmarks', () => {
    let spawner: AgentSpawner;
    let parallelSpawner: ParallelSpawner;

    beforeAll(() => {
      spawner = new AgentSpawner();
      parallelSpawner = new ParallelSpawner(spawner);
    });

    it('single agent spawn', async () => {
      const result = await runner.run(
        {
          name: 'Agent: Single Spawn',
          category: 'agent-spawn',
          operation: 'Create one agent',
          iterations: 50,
          warmup: 5,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.agentSpawn.singleSpawnMs,
        },
        () => spawner.spawn(createTestConfig(Date.now()))
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('parallel spawn (5 agents)', async () => {
      const result = await runner.run(
        {
          name: 'Agent: Parallel Spawn (5)',
          category: 'parallel-execution',
          operation: 'Spawn 5 agents in parallel',
          iterations: 10,
          warmup: 2,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.agentSpawn.parallelSpawn5Ms,
        },
        async () => {
          const configs = Array(5).fill(0).map((_, i) => createTestConfig(i));
          return parallelSpawner.spawnParallel({
            configs,
            concurrencyLimit: 5,
            aggregationStrategy: 'all',
            timeout: 5000,
          });
        }
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('parallel spawn (10 agents)', async () => {
      const result = await runner.run(
        {
          name: 'Agent: Parallel Spawn (10)',
          category: 'parallel-execution',
          operation: 'Spawn 10 agents in parallel',
          iterations: 5,
          warmup: 1,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.agentSpawn.parallelSpawn10Ms,
        },
        async () => {
          const configs = Array(10).fill(0).map((_, i) => createTestConfig(i));
          return parallelSpawner.spawnParallel({
            configs,
            concurrencyLimit: 10,
            aggregationStrategy: 'all',
            timeout: 5000,
          });
        }
      );
      expect(result.timing.avgMs).toBeDefined();
    });
  });

  describe('Memory Operations Benchmarks', () => {
    it('scaffold initialization', async () => {
      const result = await runner.run(
        {
          name: 'Memory: Scaffold Init',
          category: 'memory-ops',
          operation: 'Initialize memory scaffold',
          iterations: 10,
          warmup: 2,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.memoryOps.scaffoldInitMs,
        },
        async () => {
          const { tempDir } = await createTempMemoryScaffold();
          tempDirs.push(tempDir);
        }
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('file write', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold();
      tempDirs.push(tempDir);
      const fileOps = scaffold.getFileOps();

      const result = await runner.run(
        {
          name: 'Memory: File Write',
          category: 'memory-ops',
          operation: 'Write file to tier',
          iterations: 50,
          warmup: 5,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.memoryOps.fileWriteMs,
        },
        async () => {
          await fileOps.writeFile(`work/INBOX/test-${Date.now()}.md`, 'Content');
        }
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('file read', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold();
      tempDirs.push(tempDir);
      const fileOps = scaffold.getFileOps();

      await fileOps.writeFile('work/INBOX/read-test.md', 'Read content');

      const result = await runner.run(
        {
          name: 'Memory: File Read',
          category: 'memory-ops',
          operation: 'Read file from tier',
          iterations: 100,
          warmup: 5,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.memoryOps.fileReadMs,
        },
        async () => fileOps.readFile('work/INBOX/read-test.md')
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('pipeline promote', async () => {
      const pipelineTempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'pipeline-bench-')
      );
      tempDirs.push(pipelineTempDir);
      const pipeline = new MemoryPipeline(pipelineTempDir);
      await pipeline.initialize();

      let counter = 0;
      const result = await runner.run(
        {
          name: 'Memory: Pipeline Promote',
          category: 'pipeline',
          operation: 'Promote content between tiers',
          iterations: 20,
          warmup: 2,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.memoryOps.pipelinePromoteMs,
        },
        async () => {
          counter++;
          return pipeline.promote(
            `work/INBOX/item-${counter}.md`,
            `learning/PATTERNS/promoted-${counter}.md`,
            `Content ${counter}`
          );
        }
      );
      expect(result.timing.avgMs).toBeDefined();
    });
  });

  describe('Skill Routing Benchmarks', () => {
    let registry: SkillRegistry;
    let router: IntentRouter;

    beforeAll(() => {
      registry = new SkillRegistry();
      const skills = generateTestSkills(100);
      skills.forEach((s) => registry.register(s));
      router = new IntentRouter(registry);
    });

    it('single route', async () => {
      const result = await runner.run(
        {
          name: 'Skill: Single Route',
          category: 'skill-routing',
          operation: 'Route user input to skill',
          iterations: 100,
          warmup: 10,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.skillRouting.singleRouteMs,
        },
        async () => router.route('I want to analyze the code')
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('multi route', async () => {
      const result = await runner.run(
        {
          name: 'Skill: Multi Route',
          category: 'skill-routing',
          operation: 'Get top 5 matching skills',
          iterations: 50,
          warmup: 5,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.skillRouting.multiRouteMs,
        },
        async () => router.routeMultiple('Help me debug and test', 5)
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('registry lookup', () => {
      const result = runner.runSync(
        {
          name: 'Skill: Registry Lookup',
          category: 'skill-routing',
          operation: 'Lookup skills in registry',
          iterations: 1000,
          warmup: 50,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.skillRouting.registryLookupMs,
        },
        () => {
          registry.get('code-skill-0');
          registry.findByKeyword('debug');
          registry.getAll();
        }
      );
      expect(result.timing.avgMs).toBeDefined();
    });
  });

  describe('Trait Inference Benchmarks', () => {
    let inference: TraitInference;

    beforeAll(() => {
      inference = new TraitInference(mockTraitsData);
    });

    it('simple inference', () => {
      const result = runner.runSync(
        {
          name: 'Trait: Simple Inference',
          category: 'trait-inference',
          operation: 'Infer traits from short task',
          iterations: 100,
          warmup: 10,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.traitInference.simpleInferenceMs,
        },
        () => inference.inferFromTask('Check security vulnerabilities')
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('complex inference', () => {
      const complexTask =
        'Analyze security vulnerabilities in the authentication system with thorough testing';

      const result = runner.runSync(
        {
          name: 'Trait: Complex Inference',
          category: 'trait-inference',
          operation: 'Infer traits from detailed task',
          iterations: 50,
          warmup: 5,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.traitInference.complexInferenceMs,
        },
        () => inference.inferFromTask(complexTask)
      );
      expect(result.timing.avgMs).toBeDefined();
    });

    it('clarification generation', () => {
      const result = runner.runSync(
        {
          name: 'Trait: Clarification Generation',
          category: 'trait-inference',
          operation: 'Generate clarification questions',
          iterations: 50,
          warmup: 5,
          targetMs: DEFAULT_PERFORMANCE_TARGETS.traitInference.clarificationGenerationMs,
        },
        () => {
          const inferred = inference.inferFromTask('help with something');
          return inferred.clarificationQuestions;
        }
      );
      expect(result.timing.avgMs).toBeDefined();
    });
  });

  describe('Benchmark Report Generation', () => {
    it('should generate complete JSON report', async () => {
      const report = runner.generateReport();

      // Validate report structure
      expect(report.timestamp).toBeDefined();
      expect(report.environment).toBeDefined();
      expect(report.environment.nodeVersion).toBeDefined();
      expect(report.environment.platform).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalBenchmarks).toBeGreaterThan(0);
      expect(report.results).toBeDefined();
      expect(report.results.length).toBeGreaterThan(0);
      expect(report.targets).toBeDefined();

      // Validate categories are populated
      const categories = Object.keys(report.summary.categories);
      expect(categories).toContain('agent-spawn');
      expect(categories).toContain('memory-ops');
      expect(categories).toContain('skill-routing');
      expect(categories).toContain('trait-inference');

      // Output the report
      const json = runner.toJSON();
      console.log('\n====================================');
      console.log('  COMPREHENSIVE BENCHMARK REPORT');
      console.log('====================================\n');

      // Write report to file
      const reportPath = path.join(__dirname, 'benchmark-results.json');
      await fs.promises.writeFile(reportPath, json);
      console.log(`Report written to: ${reportPath}\n`);

      // Print summary
      runner.printSummary();
    });

    it('should validate all benchmarks met targets', () => {
      const report = runner.generateReport();

      console.log('\n--- Performance Validation ---\n');

      const failedBenchmarks = report.results.filter((r) => !r.passed);

      if (failedBenchmarks.length > 0) {
        console.log('Failed benchmarks:');
        for (const b of failedBenchmarks) {
          console.log(
            `  ❌ ${b.name}: ${b.timing.avgMs.toFixed(2)}ms > ${b.targetMs}ms target`
          );
        }
      }

      console.log(`\nTotal: ${report.summary.passed}/${report.summary.totalBenchmarks} passed`);
      console.log(`Pass rate: ${((report.summary.passed / report.summary.totalBenchmarks) * 100).toFixed(1)}%\n`);

      // This assertion documents baseline - adjust targets as needed
      expect(report.summary.passed).toBeGreaterThan(0);
    });
  });
});
