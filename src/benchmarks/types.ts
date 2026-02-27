/**
 * Performance Benchmark Types
 *
 * Type definitions for the benchmark system.
 */

/**
 * Individual benchmark result
 */
export interface BenchmarkResult {
  /** Name of the benchmark */
  name: string;
  /** Category of the benchmark */
  category: BenchmarkCategory;
  /** Operation being benchmarked */
  operation: string;
  /** Number of iterations */
  iterations: number;
  /** Timing metrics in milliseconds */
  timing: {
    totalMs: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  /** Target timing (threshold) */
  targetMs: number;
  /** Whether the benchmark passed the target */
  passed: boolean;
  /** Operations per second */
  opsPerSecond: number;
  /** Memory usage if available */
  memory?: {
    heapUsedBefore: number;
    heapUsedAfter: number;
    heapDelta: number;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Benchmark category
 */
export type BenchmarkCategory =
  | 'agent-spawn'
  | 'memory-ops'
  | 'skill-routing'
  | 'trait-inference'
  | 'pipeline'
  | 'parallel-execution';

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  /** Benchmark name */
  name: string;
  /** Category */
  category: BenchmarkCategory;
  /** Operation description */
  operation: string;
  /** Number of iterations to run */
  iterations: number;
  /** Number of warmup iterations */
  warmup?: number;
  /** Target time in ms (benchmark fails if avgMs > targetMs) */
  targetMs: number;
  /** Whether to track memory */
  trackMemory?: boolean;
}

/**
 * Benchmark suite configuration
 */
export interface BenchmarkSuiteConfig {
  /** Suite name */
  name: string;
  /** Suite description */
  description: string;
  /** Benchmarks in this suite */
  benchmarks: BenchmarkConfig[];
}

/**
 * Complete benchmark report
 */
export interface BenchmarkReport {
  /** Timestamp when report was generated */
  timestamp: string;
  /** Environment information */
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuCount: number;
    totalMemory: number;
  };
  /** Summary statistics */
  summary: {
    totalBenchmarks: number;
    passed: number;
    failed: number;
    categories: Record<
      BenchmarkCategory,
      {
        total: number;
        passed: number;
        failed: number;
      }
    >;
  };
  /** All benchmark results */
  results: BenchmarkResult[];
  /** Performance targets */
  targets: PerformanceTargets;
}

/**
 * Performance targets for critical operations
 */
export interface PerformanceTargets {
  agentSpawn: {
    singleSpawnMs: number;
    parallelSpawn5Ms: number;
    parallelSpawn10Ms: number;
  };
  memoryOps: {
    scaffoldInitMs: number;
    fileWriteMs: number;
    fileReadMs: number;
    pipelinePromoteMs: number;
  };
  skillRouting: {
    singleRouteMs: number;
    multiRouteMs: number;
    registryLookupMs: number;
  };
  traitInference: {
    simpleInferenceMs: number;
    complexInferenceMs: number;
    clarificationGenerationMs: number;
  };
}

/**
 * Default performance targets
 * These serve as baseline measurements for the system
 */
export const DEFAULT_PERFORMANCE_TARGETS: PerformanceTargets = {
  agentSpawn: {
    singleSpawnMs: 50,
    parallelSpawn5Ms: 200,
    parallelSpawn10Ms: 400,
  },
  memoryOps: {
    scaffoldInitMs: 500,
    fileWriteMs: 100,
    fileReadMs: 50,
    pipelinePromoteMs: 200,
  },
  skillRouting: {
    singleRouteMs: 10,
    multiRouteMs: 50,
    registryLookupMs: 5,
  },
  traitInference: {
    simpleInferenceMs: 20,
    complexInferenceMs: 50,
    clarificationGenerationMs: 30,
  },
};
