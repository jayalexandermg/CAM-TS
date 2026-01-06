/**
 * Performance Tests - Basic Benchmarks
 *
 * Basic performance benchmarks for the memory system.
 * These are not comprehensive performance tests, just basic sanity checks.
 */

import { MemoryScaffold } from '../../src/memory/scaffold';
import { PathValidator } from '../../src/memory/path-validator';
import { FileOperations } from '../../src/memory/file-operations';
import { SecurityPatterns } from '../../src/exceptions/security-patterns';
import {
  createTempMemoryScaffold,
  cleanupTempScaffold,
  measureTime,
  benchmark,
} from '../utils/test-helpers';

describe('Performance: Basic Benchmarks', () => {
  // Increase timeout for performance tests
  jest.setTimeout(30000);

  describe('Directory Creation Speed', () => {
    let tempDir: string;

    afterEach(async () => {
      if (tempDir) {
        await cleanupTempScaffold(tempDir);
      }
    });

    it('should create scaffold (18 directories) in <500ms', async () => {
      const { timeMs } = await measureTime(async () => {
        const result = await createTempMemoryScaffold();
        tempDir = result.tempDir;
      });

      console.log(`  Scaffold creation: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(500);
    });

    it('should create 50 directories in <200ms', async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      const dirOps = result.scaffold.getDirectoryOps();

      const { timeMs } = await measureTime(async () => {
        for (let i = 0; i < 50; i++) {
          await dirOps.createDirectory(`perf-test/dir${i}`);
        }
      });

      console.log(`  50 directories created: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(200);
    });
  });

  describe('File Write Speed', () => {
    let tempDir: string;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      fileOps = result.scaffold.getFileOps();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should write 100 small files in <1000ms', async () => {
      const { timeMs } = await measureTime(async () => {
        for (let i = 0; i < 100; i++) {
          await fileOps.writeFile(`perf-test/file${i}.txt`, `Content for file ${i}`);
        }
      });

      console.log(`  100 small files written: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(1000);
    });

    it('should write 10 medium files (10KB each) in <500ms', async () => {
      const content = 'x'.repeat(10 * 1024); // 10KB

      const { timeMs } = await measureTime(async () => {
        for (let i = 0; i < 10; i++) {
          await fileOps.writeFile(`perf-test/medium${i}.txt`, content);
        }
      });

      console.log(`  10 medium files (10KB each) written: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(500);
    });
  });

  describe('File Read Speed', () => {
    let tempDir: string;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      fileOps = result.scaffold.getFileOps();

      // Pre-create files for reading
      for (let i = 0; i < 100; i++) {
        await fileOps.writeFile(`perf-test/read${i}.txt`, `Content for file ${i}`);
      }
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should read 100 small files in <500ms', async () => {
      const { timeMs } = await measureTime(async () => {
        for (let i = 0; i < 100; i++) {
          await fileOps.readFile(`perf-test/read${i}.txt`);
        }
      });

      console.log(`  100 small files read: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(500);
    });

    it('should handle concurrent reads without errors', async () => {
      // Sequential reads
      const { timeMs: sequentialTime } = await measureTime(async () => {
        for (let i = 0; i < 50; i++) {
          await fileOps.readFile(`perf-test/read${i}.txt`);
        }
      });

      // Concurrent reads
      const { timeMs: concurrentTime } = await measureTime(async () => {
        await Promise.all(
          Array(50)
            .fill(0)
            .map((_, i) => fileOps.readFile(`perf-test/read${i}.txt`))
        );
      });

      console.log(`  Sequential 50 reads: ${sequentialTime}ms`);
      console.log(`  Concurrent 50 reads: ${concurrentTime}ms`);

      // Both should complete within reasonable time (not comparing relative speed
      // since this is system-dependent and can vary)
      expect(sequentialTime).toBeLessThan(2000);
      expect(concurrentTime).toBeLessThan(2000);
    });
  });

  describe('JSONL Append Speed', () => {
    let tempDir: string;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      fileOps = result.scaffold.getFileOps();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should append 500 JSONL lines in <2000ms', async () => {
      const { timeMs } = await measureTime(async () => {
        for (let i = 0; i < 500; i++) {
          await fileOps.appendJsonLine('perf-test/data.jsonl', {
            index: i,
            timestamp: new Date().toISOString(),
            data: `Entry ${i}`,
          });
        }
      });

      console.log(`  500 JSONL lines appended: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(2000);
    });

    it('should read 500 JSONL lines in <200ms', async () => {
      // Pre-create JSONL file
      for (let i = 0; i < 500; i++) {
        await fileOps.appendJsonLine('perf-test/read-data.jsonl', { index: i });
      }

      const { timeMs } = await measureTime(async () => {
        await fileOps.readJsonLines('perf-test/read-data.jsonl');
      });

      console.log(`  500 JSONL lines read: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(200);
    });
  });

  describe('Path Validation Speed', () => {
    let pathValidator: PathValidator;
    let tempDir: string;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      pathValidator = result.scaffold.getPathValidator();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should validate 1000 paths in <100ms', async () => {
      const paths = Array(1000)
        .fill(0)
        .map((_, i) => `test/path${i}/file.txt`);

      const { timeMs } = await measureTime(async () => {
        for (const p of paths) {
          pathValidator.validate(p);
        }
      });

      console.log(`  1000 path validations: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(100);
    });

    it('should sanitize 1000 paths in <50ms', async () => {
      const paths = Array(1000)
        .fill(0)
        .map((_, i) => `test/../path${i}/<file>.txt`);

      const { timeMs } = await measureTime(async () => {
        for (const p of paths) {
          pathValidator.sanitizePath(p);
        }
      });

      console.log(`  1000 path sanitizations: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(50);
    });
  });

  describe('Security Pattern Detection Speed', () => {
    it('should check 1000 strings for path traversal in <50ms', () => {
      const strings = Array(1000)
        .fill(0)
        .map((_, i) => `test/path${i}/file.txt`);

      const start = Date.now();
      for (const s of strings) {
        SecurityPatterns.detectPathTraversal(s);
      }
      const timeMs = Date.now() - start;

      console.log(`  1000 path traversal checks: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(50);
    });

    it('should run all security checks on 500 strings in <100ms', () => {
      const strings = Array(500)
        .fill(0)
        .map((_, i) => `test/path${i}/file.txt`);

      const start = Date.now();
      for (const s of strings) {
        SecurityPatterns.checkAll(s);
      }
      const timeMs = Date.now() - start;

      console.log(`  500 full security checks: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(100);
    });
  });

  describe('Security Audit Speed', () => {
    let scaffold: MemoryScaffold;
    let tempDir: string;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold({ enableSecurityAudit: true });
      scaffold = result.scaffold;
      tempDir = result.tempDir;
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should run security audit in <500ms', async () => {
      const { timeMs } = await measureTime(async () => {
        await scaffold.runSecurityAudit();
      });

      console.log(`  Security audit: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(500);
    });
  });

  describe('File Locking Speed', () => {
    let tempDir: string;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      fileOps = result.scaffold.getFileOps();

      await fileOps.writeFile('perf-test/lockable.txt', 'content');
    });

    afterEach(async () => {
      await fileOps.releaseAllLocks();
      await cleanupTempScaffold(tempDir);
    });

    it('should acquire and release 100 locks in <500ms', async () => {
      const { timeMs } = await measureTime(async () => {
        for (let i = 0; i < 100; i++) {
          await fileOps.lockFile('perf-test/lockable.txt');
          await fileOps.unlockFile('perf-test/lockable.txt');
        }
      });

      console.log(`  100 lock/unlock cycles: ${timeMs}ms`);
      expect(timeMs).toBeLessThan(500);
    });
  });

  describe('Benchmark Utilities', () => {
    it('should measure time accurately', async () => {
      const { timeMs } = await measureTime(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(timeMs).toBeGreaterThanOrEqual(45);
      expect(timeMs).toBeLessThan(150);
    });

    it('should run benchmark with multiple iterations', async () => {
      let counter = 0;
      const results = await benchmark(
        async () => {
          counter++;
          await new Promise((resolve) => setTimeout(resolve, 10));
        },
        5
      );

      expect(counter).toBe(5);
      expect(results.avgMs).toBeGreaterThanOrEqual(8);
      expect(results.minMs).toBeLessThanOrEqual(results.avgMs);
      expect(results.maxMs).toBeGreaterThanOrEqual(results.avgMs);
    });
  });
});
