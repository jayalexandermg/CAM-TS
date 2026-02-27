/**
 * BenchmarkRunner - Performance benchmark execution engine
 *
 * Runs benchmarks, collects metrics, and generates reports.
 */

import * as os from 'os';
import {
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkReport,
  BenchmarkCategory,
  PerformanceTargets,
  DEFAULT_PERFORMANCE_TARGETS,
} from './types';

/**
 * Timing statistics from a benchmark run
 */
interface TimingStats {
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  times: number[];
}

/**
 * BenchmarkRunner - Executes performance benchmarks
 */
export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];
  private targets: PerformanceTargets;

  constructor(targets?: Partial<PerformanceTargets>) {
    this.targets = {
      ...DEFAULT_PERFORMANCE_TARGETS,
      ...targets,
    };
  }

  /**
   * Run a single benchmark
   */
  async run<T>(config: BenchmarkConfig, fn: () => Promise<T> | T): Promise<BenchmarkResult> {
    const { name, category, operation, iterations, warmup = 3, targetMs, trackMemory } = config;

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Memory before
    let memoryBefore: number | undefined;
    if (trackMemory) {
      memoryBefore = process.memoryUsage().heapUsed;
    }

    // Run benchmark iterations
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    // Memory after
    let memoryAfter: number | undefined;
    if (trackMemory) {
      memoryAfter = process.memoryUsage().heapUsed;
    }

    // Calculate statistics
    const timing = this.calculateStats(times);

    const result: BenchmarkResult = {
      name,
      category,
      operation,
      iterations,
      timing,
      targetMs,
      passed: timing.avgMs <= targetMs,
      opsPerSecond: 1000 / timing.avgMs,
      memory:
        trackMemory && memoryBefore !== undefined && memoryAfter !== undefined
          ? {
              heapUsedBefore: memoryBefore,
              heapUsedAfter: memoryAfter,
              heapDelta: memoryAfter - memoryBefore,
            }
          : undefined,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run a synchronous benchmark
   */
  runSync<T>(config: BenchmarkConfig, fn: () => T): BenchmarkResult {
    const { name, category, operation, iterations, warmup = 3, targetMs, trackMemory } = config;

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      fn();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Memory before
    let memoryBefore: number | undefined;
    if (trackMemory) {
      memoryBefore = process.memoryUsage().heapUsed;
    }

    // Run benchmark iterations
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      times.push(end - start);
    }

    // Memory after
    let memoryAfter: number | undefined;
    if (trackMemory) {
      memoryAfter = process.memoryUsage().heapUsed;
    }

    // Calculate statistics
    const timing = this.calculateStats(times);

    const result: BenchmarkResult = {
      name,
      category,
      operation,
      iterations,
      timing,
      targetMs,
      passed: timing.avgMs <= targetMs,
      opsPerSecond: 1000 / timing.avgMs,
      memory:
        trackMemory && memoryBefore !== undefined && memoryAfter !== undefined
          ? {
              heapUsedBefore: memoryBefore,
              heapUsedAfter: memoryAfter,
              heapDelta: memoryAfter - memoryBefore,
            }
          : undefined,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Calculate timing statistics
   */
  private calculateStats(times: number[]): TimingStats {
    const sorted = [...times].sort((a, b) => a - b);
    const total = sorted.reduce((sum, t) => sum + t, 0);

    return {
      totalMs: total,
      avgMs: total / times.length,
      minMs: sorted[0],
      maxMs: sorted[sorted.length - 1],
      p50Ms: this.percentile(sorted, 50),
      p95Ms: this.percentile(sorted, 95),
      p99Ms: this.percentile(sorted, 99),
      times: sorted,
    };
  }

  /**
   * Calculate percentile value
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Get all results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Get results by category
   */
  getResultsByCategory(category: BenchmarkCategory): BenchmarkResult[] {
    return this.results.filter((r) => r.category === category);
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results = [];
  }

  /**
   * Generate a complete benchmark report
   */
  generateReport(): BenchmarkReport {
    const categories: Record<BenchmarkCategory, { total: number; passed: number; failed: number }> =
      {
        'agent-spawn': { total: 0, passed: 0, failed: 0 },
        'memory-ops': { total: 0, passed: 0, failed: 0 },
        'skill-routing': { total: 0, passed: 0, failed: 0 },
        'trait-inference': { total: 0, passed: 0, failed: 0 },
        pipeline: { total: 0, passed: 0, failed: 0 },
        'parallel-execution': { total: 0, passed: 0, failed: 0 },
      };

    let passed = 0;
    let failed = 0;

    for (const result of this.results) {
      categories[result.category].total++;
      if (result.passed) {
        categories[result.category].passed++;
        passed++;
      } else {
        categories[result.category].failed++;
        failed++;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
      },
      summary: {
        totalBenchmarks: this.results.length,
        passed,
        failed,
        categories,
      },
      results: this.results,
      targets: this.targets,
    };
  }

  /**
   * Export report as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  /**
   * Get performance targets
   */
  getTargets(): PerformanceTargets {
    return { ...this.targets };
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    const report = this.generateReport();

    console.log('\n========================================');
    console.log('   PERFORMANCE BENCHMARK SUMMARY');
    console.log('========================================\n');

    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Node: ${report.environment.nodeVersion}`);
    console.log(`Platform: ${report.environment.platform} (${report.environment.arch})`);
    console.log(`CPUs: ${report.environment.cpuCount}`);
    console.log(`Memory: ${(report.environment.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB\n`);

    console.log('--- Results by Category ---\n');

    for (const [category, stats] of Object.entries(report.summary.categories)) {
      if (stats.total > 0) {
        const status = stats.failed === 0 ? '✅' : '❌';
        console.log(`${status} ${category}: ${stats.passed}/${stats.total} passed`);
      }
    }

    console.log('\n--- Individual Results ---\n');

    for (const result of report.results) {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
      console.log(`   Operation: ${result.operation}`);
      console.log(`   Avg: ${result.timing.avgMs.toFixed(2)}ms (target: ${result.targetMs}ms)`);
      console.log(
        `   Min: ${result.timing.minMs.toFixed(2)}ms | Max: ${result.timing.maxMs.toFixed(2)}ms`
      );
      console.log(
        `   P50: ${result.timing.p50Ms.toFixed(2)}ms | P95: ${result.timing.p95Ms.toFixed(2)}ms | P99: ${result.timing.p99Ms.toFixed(2)}ms`
      );
      console.log(`   Ops/sec: ${result.opsPerSecond.toFixed(2)}`);
      console.log('');
    }

    console.log('========================================');
    console.log(`Total: ${report.summary.passed}/${report.summary.totalBenchmarks} passed`);
    console.log('========================================\n');
  }
}
