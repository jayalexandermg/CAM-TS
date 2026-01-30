/**
 * Performance Benchmarks: Memory Pipeline Operations
 *
 * Benchmarks for memory scaffold, pipeline tiers, and content promotion.
 */

import { BenchmarkRunner } from '../../src/benchmarks/BenchmarkRunner';
import { MemoryScaffold } from '../../src/memory/scaffold';
import { MemoryPipeline, MemoryTier } from '../../src/memory/pipeline/MemoryPipeline';
import {
  createTempMemoryScaffold,
  cleanupTempScaffold,
} from '../utils/test-helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Performance: Memory Pipeline Benchmarks', () => {
  jest.setTimeout(60000);

  let runner: BenchmarkRunner;
  let tempDirs: string[] = [];

  beforeAll(() => {
    runner = new BenchmarkRunner();
  });

  afterEach(async () => {
    for (const dir of tempDirs) {
      await cleanupTempScaffold(dir);
    }
    tempDirs = [];
  });

  describe('Scaffold Initialization', () => {
    it('should initialize memory scaffold efficiently', async () => {
      const result = await runner.run(
        {
          name: 'Scaffold Initialization',
          category: 'memory-ops',
          operation: 'Create and initialize memory scaffold (18 dirs)',
          iterations: 20,
          warmup: 2,
          targetMs: 500,
          trackMemory: true,
        },
        async () => {
          const { scaffold, tempDir } = await createTempMemoryScaffold();
          tempDirs.push(tempDir);
          return scaffold;
        }
      );

      console.log(`  Scaffold init: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should validate scaffold structure efficiently', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold();
      tempDirs.push(tempDir);

      const result = await runner.run(
        {
          name: 'Scaffold Validation',
          category: 'memory-ops',
          operation: 'Validate entire scaffold structure',
          iterations: 50,
          warmup: 5,
          targetMs: 100,
        },
        async () => scaffold.validate()
      );

      console.log(`  Scaffold validation: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Pipeline Initialization', () => {
    it('should initialize memory pipeline efficiently', async () => {
      const result = await runner.run(
        {
          name: 'Pipeline Initialization',
          category: 'pipeline',
          operation: 'Create and initialize 3-tier pipeline',
          iterations: 20,
          warmup: 2,
          targetMs: 300,
          trackMemory: true,
        },
        async () => {
          const tempDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'pipeline-bench-')
          );
          tempDirs.push(tempDir);
          const pipeline = new MemoryPipeline(tempDir);
          await pipeline.initialize();
          return pipeline;
        }
      );

      console.log(`  Pipeline init: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should validate tier structure efficiently', async () => {
      const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'pipeline-bench-')
      );
      tempDirs.push(tempDir);
      const pipeline = new MemoryPipeline(tempDir);
      await pipeline.initialize();

      const result = await runner.run(
        {
          name: 'Tier Validation',
          category: 'pipeline',
          operation: 'Validate all pipeline tiers',
          iterations: 100,
          warmup: 5,
          targetMs: 50,
        },
        async () => pipeline.validateTiers()
      );

      console.log(`  Tier validation: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('File Operations', () => {
    it('should write files to tiers efficiently', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold();
      tempDirs.push(tempDir);
      const fileOps = scaffold.getFileOps();

      const result = await runner.run(
        {
          name: 'File Write to Tier',
          category: 'memory-ops',
          operation: 'Write files to memory tiers',
          iterations: 100,
          warmup: 5,
          targetMs: 100,
        },
        async () => {
          const content = 'Test content for benchmarking file writes';
          await fileOps.writeFile(`work/INBOX/test-${Date.now()}.md`, content);
        }
      );

      console.log(`  File write: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should read files from tiers efficiently', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold();
      tempDirs.push(tempDir);
      const fileOps = scaffold.getFileOps();

      // Pre-create files
      for (let i = 0; i < 50; i++) {
        await fileOps.writeFile(`work/INBOX/read-test-${i}.md`, `Content ${i}`);
      }

      const result = await runner.run(
        {
          name: 'File Read from Tier',
          category: 'memory-ops',
          operation: 'Read files from memory tiers',
          iterations: 100,
          warmup: 5,
          targetMs: 50,
        },
        async () => {
          const index = Math.floor(Math.random() * 50);
          return fileOps.readFile(`work/INBOX/read-test-${index}.md`);
        }
      );

      console.log(`  File read: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should append JSONL efficiently', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold();
      tempDirs.push(tempDir);
      const fileOps = scaffold.getFileOps();

      const result = await runner.run(
        {
          name: 'JSONL Append',
          category: 'memory-ops',
          operation: 'Append JSON lines to log file',
          iterations: 100,
          warmup: 5,
          targetMs: 20,
        },
        async () => {
          await fileOps.appendJsonLine('work/INBOX/events.jsonl', {
            timestamp: new Date().toISOString(),
            event: 'benchmark-test',
            data: { index: Date.now() },
          });
        }
      );

      console.log(`  JSONL append: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Content Promotion', () => {
    it('should promote content between tiers efficiently', async () => {
      const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'promote-bench-')
      );
      tempDirs.push(tempDir);
      const pipeline = new MemoryPipeline(tempDir);
      await pipeline.initialize();

      let counter = 0;

      const result = await runner.run(
        {
          name: 'Content Promotion',
          category: 'pipeline',
          operation: 'Promote content from CAPTURE to SYNTHESIS tier',
          iterations: 50,
          warmup: 3,
          targetMs: 200,
        },
        async () => {
          counter++;
          const content = `Promoted content ${counter}`;
          const sourcePath = `work/INBOX/item-${counter}.md`;
          const targetPath = `learning/PATTERNS/promoted-${counter}.md`;

          return pipeline.promote(sourcePath, targetPath, content);
        }
      );

      console.log(`  Content promotion: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should retrieve tier content efficiently', async () => {
      const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'tier-content-bench-')
      );
      tempDirs.push(tempDir);
      const pipeline = new MemoryPipeline(tempDir);
      await pipeline.initialize();

      // Pre-create files in tier
      const basePath = path.join(tempDir, 'work', 'INBOX');
      for (let i = 0; i < 50; i++) {
        await fs.promises.writeFile(
          path.join(basePath, `file-${i}.md`),
          `Content ${i}`
        );
      }

      const result = await runner.run(
        {
          name: 'Get Tier Content',
          category: 'pipeline',
          operation: 'Retrieve all file paths in a tier',
          iterations: 50,
          warmup: 3,
          targetMs: 100,
        },
        async () => pipeline.getTierContent(MemoryTier.CAPTURE)
      );

      console.log(`  Get tier content: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Tier Navigation', () => {
    it('should resolve tier lookups efficiently', async () => {
      const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'tier-nav-bench-')
      );
      tempDirs.push(tempDir);
      const pipeline = new MemoryPipeline(tempDir);
      await pipeline.initialize();

      const testPaths = [
        'work/INBOX/test.md',
        'work/SCRATCHPAD/draft.txt',
        'learning/PATTERNS/pattern.md',
        'learning/INSIGHTS/insight.md',
        'archive/KNOWLEDGE/doc.md',
        'archive/PROCEDURES/proc.md',
      ];

      const result = runner.runSync(
        {
          name: 'Tier Lookup',
          category: 'pipeline',
          operation: 'Resolve directory paths to tiers',
          iterations: 1000,
          warmup: 50,
          targetMs: 10,
        },
        () => {
          for (const p of testPaths) {
            pipeline.getTier(p);
          }
        }
      );

      console.log(`  Tier lookup (6 paths): ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should navigate tier hierarchy efficiently', () => {
      const tempDir = path.join(os.tmpdir(), 'tier-hier-bench');
      const pipeline = new MemoryPipeline(tempDir);

      const tiers = [MemoryTier.CAPTURE, MemoryTier.SYNTHESIS, MemoryTier.APPLICATION];

      const result = runner.runSync(
        {
          name: 'Tier Navigation',
          category: 'pipeline',
          operation: 'Navigate next/previous tiers',
          iterations: 1000,
          warmup: 50,
          targetMs: 5,
        },
        () => {
          for (const tier of tiers) {
            pipeline.getNextTier(tier);
            pipeline.getPreviousTier(tier);
            pipeline.getTierConfig(tier);
            pipeline.getTierPath(tier);
            pipeline.getTierSubdirectories(tier);
          }
        }
      );

      console.log(`  Tier navigation: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Security Audit', () => {
    it('should run security audit efficiently', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold({ enableSecurityAudit: true });
      tempDirs.push(tempDir);

      const result = await runner.run(
        {
          name: 'Security Audit',
          category: 'memory-ops',
          operation: 'Full security audit of memory scaffold',
          iterations: 20,
          warmup: 2,
          targetMs: 500,
        },
        async () => scaffold.runSecurityAudit()
      );

      console.log(`  Security audit: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent file writes', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold();
      tempDirs.push(tempDir);
      const fileOps = scaffold.getFileOps();

      const result = await runner.run(
        {
          name: 'Concurrent File Writes',
          category: 'memory-ops',
          operation: 'Write 20 files concurrently',
          iterations: 20,
          warmup: 2,
          targetMs: 500,
        },
        async () => {
          const writes = Array(20)
            .fill(0)
            .map((_, i) =>
              fileOps.writeFile(
                `work/INBOX/concurrent-${Date.now()}-${i}.md`,
                `Concurrent content ${i}`
              )
            );
          return Promise.all(writes);
        }
      );

      console.log(`  Concurrent writes (20): ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should handle concurrent file reads', async () => {
      const { scaffold, tempDir } = await createTempMemoryScaffold();
      tempDirs.push(tempDir);
      const fileOps = scaffold.getFileOps();

      // Pre-create files
      for (let i = 0; i < 50; i++) {
        await fileOps.writeFile(`work/INBOX/read-${i}.md`, `Content ${i}`);
      }

      const result = await runner.run(
        {
          name: 'Concurrent File Reads',
          category: 'memory-ops',
          operation: 'Read 50 files concurrently',
          iterations: 20,
          warmup: 2,
          targetMs: 200,
        },
        async () => {
          const reads = Array(50)
            .fill(0)
            .map((_, i) => fileOps.readFile(`work/INBOX/read-${i}.md`));
          return Promise.all(reads);
        }
      );

      console.log(`  Concurrent reads (50): ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Benchmark Report', () => {
    it('should generate JSON benchmark report', () => {
      const report = runner.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.summary.totalBenchmarks).toBeGreaterThan(0);

      const memoryResults = report.results.filter(
        (r) => r.category === 'memory-ops' || r.category === 'pipeline'
      );
      expect(memoryResults.length).toBeGreaterThan(0);

      const json = runner.toJSON();
      console.log('\n  Memory Pipeline Benchmark Report (JSON):');
      console.log('  ' + json.split('\n').slice(0, 10).join('\n  ') + '\n  ...');
    });
  });
});
