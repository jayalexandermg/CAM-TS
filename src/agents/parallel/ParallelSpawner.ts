import { EventEmitter } from 'events';
import { Agent } from '../Agent';
import { AgentSpawner } from '../AgentSpawner';
import { AgentConfig, AgentResult } from '../types';
import { SpotCheck } from './SpotCheck';
import {
  ParallelSpawnConfig,
  ParallelSpawnResult,
  AgentExecutionResult,
  AggregationStrategy,
  SpotCheckResult,
} from './types';

export class ParallelSpawner extends EventEmitter {
  private spawner: AgentSpawner;
  private activeAgents: Map<string, Agent>;
  private defaultConcurrencyLimit: number;
  private defaultTimeout: number;

  constructor(spawner?: AgentSpawner, options?: { concurrencyLimit?: number; timeout?: number }) {
    super();
    this.spawner = spawner ?? new AgentSpawner();
    this.activeAgents = new Map();
    this.defaultConcurrencyLimit = options?.concurrencyLimit ?? 5;
    this.defaultTimeout = options?.timeout ?? 30000;
  }

  getSpawner(): AgentSpawner {
    return this.spawner;
  }

  getActiveAgents(): Agent[] {
    return Array.from(this.activeAgents.values());
  }

  getActiveAgentCount(): number {
    return this.activeAgents.size;
  }

  async spawnParallel(config: ParallelSpawnConfig): Promise<ParallelSpawnResult> {
    const {
      configs,
      concurrencyLimit = this.defaultConcurrencyLimit,
      aggregationStrategy = 'merge',
      timeout = this.defaultTimeout,
      stopOnFirstSuccess = false,
      spotCheck: spotCheckConfig,
    } = config;

    if (configs.length === 0) {
      return this.createEmptyResult(concurrencyLimit, aggregationStrategy);
    }

    const startTime = Date.now();
    const results: AgentExecutionResult[] = [];
    const spotCheck = spotCheckConfig ? new SpotCheck(spotCheckConfig) : null;
    let stopped = false;

    // Process in batches based on concurrency limit
    const batches = this.createBatches(configs, concurrencyLimit);

    for (let batchIndex = 0; batchIndex < batches.length && !stopped; batchIndex++) {
      const batch = batches[batchIndex];

      this.emit('batchStarted', {
        batchIndex,
        batchSize: batch.length,
      });

      const batchResults = await this.executeBatch(
        batch,
        timeout,
        batchIndex * concurrencyLimit,
        configs.length
      );

      results.push(...batchResults);

      this.emit('batchCompleted', {
        batchIndex,
        results: batchResults,
      });

      // Check for early termination
      if (stopOnFirstSuccess && batchResults.some((r) => r.result.success)) {
        stopped = true;
      }
    }

    // Perform spot checks
    let spotCheckResults: SpotCheckResult[] | undefined;
    if (spotCheck?.isEnabled()) {
      const checkResultsMap = spotCheck.validateAll(results, this.activeAgents);
      spotCheckResults = [];

      for (const [agentId, agentResults] of checkResultsMap) {
        spotCheckResults.push(...agentResults);

        if (!spotCheck.allPassed(agentResults)) {
          this.emit('spotCheckFailed', { agentId, results: agentResults });
        }
      }
    }

    // Clean up active agents
    this.activeAgents.clear();

    // Aggregate results
    const aggregatedResult = this.aggregateResults(results, aggregationStrategy);

    const totalDuration = Date.now() - startTime;
    const successfulAgents = results.filter((r) => r.result.success).length;
    const failedAgents = results.filter((r) => !r.result.success).length;

    const finalResult: ParallelSpawnResult = {
      success: successfulAgents > 0,
      results,
      aggregatedResult,
      spotCheckResults,
      metadata: {
        totalAgents: configs.length,
        successfulAgents,
        failedAgents,
        totalDuration,
        concurrencyLimit,
        aggregationStrategy,
      },
    };

    this.emit('allCompleted', { result: finalResult });

    return finalResult;
  }

  private createBatches(configs: AgentConfig[], batchSize: number): AgentConfig[][] {
    const batches: AgentConfig[][] = [];
    for (let i = 0; i < configs.length; i += batchSize) {
      batches.push(configs.slice(i, i + batchSize));
    }
    return batches;
  }

  private async executeBatch(
    configs: AgentConfig[],
    timeout: number,
    startIndex: number,
    total: number
  ): Promise<AgentExecutionResult[]> {
    const promises = configs.map((config, index) =>
      this.executeAgent(config, timeout, startIndex + index, total)
    );

    return Promise.all(promises);
  }

  private async executeAgent(
    config: AgentConfig,
    timeout: number,
    index: number,
    total: number
  ): Promise<AgentExecutionResult> {
    const agent = this.spawner.spawn(config);
    this.activeAgents.set(agent.getId(), agent);

    this.emit('agentStarted', {
      agentId: agent.getId(),
      index,
      total,
    });

    const startTime = Date.now();

    try {
      const result = await this.executeWithTimeout(agent, config, timeout);
      const duration = Date.now() - startTime;

      this.emit('agentCompleted', {
        agentId: agent.getId(),
        result,
        duration,
      });

      return {
        agentId: agent.getId(),
        result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResult: AgentResult = {
        success: false,
        error: error as Error,
        metadata: {
          duration,
          retries: 0,
          skillsUsed: [],
        },
      };

      this.emit('agentFailed', {
        agentId: agent.getId(),
        error: error as Error,
        duration,
      });

      return {
        agentId: agent.getId(),
        result: errorResult,
        duration,
      };
    }
  }

  private async executeWithTimeout(
    agent: Agent,
    config: AgentConfig,
    timeout: number
  ): Promise<AgentResult> {
    const task = config.definition.description || 'Parallel task execution';

    return new Promise<AgentResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Agent execution timed out after ${timeout}ms`));
      }, timeout);

      agent
        .execute(task)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private aggregateResults(
    results: AgentExecutionResult[],
    strategy: AggregationStrategy
  ): unknown {
    const successfulResults = results.filter((r) => r.result.success);

    switch (strategy) {
      case 'first-success':
        return this.aggregateFirstSuccess(successfulResults);

      case 'vote':
        return this.aggregateVote(successfulResults);

      case 'merge':
        return this.aggregateMerge(successfulResults);

      case 'all':
        return this.aggregateAll(results);

      default:
        return this.aggregateMerge(successfulResults);
    }
  }

  private aggregateFirstSuccess(results: AgentExecutionResult[]): unknown {
    if (results.length === 0) {
      return null;
    }
    return results[0].result.data;
  }

  private aggregateVote(results: AgentExecutionResult[]): unknown {
    if (results.length === 0) {
      return null;
    }

    // Count occurrences of each result (serialized for comparison)
    const votes = new Map<string, { count: number; data: unknown }>();

    for (const result of results) {
      const key = JSON.stringify(result.result.data);
      const existing = votes.get(key);
      if (existing) {
        existing.count++;
      } else {
        votes.set(key, { count: 1, data: result.result.data });
      }
    }

    // Find the most common result
    let maxVotes = 0;
    let winner: unknown = null;

    for (const entry of votes.values()) {
      if (entry.count > maxVotes) {
        maxVotes = entry.count;
        winner = entry.data;
      }
    }

    return winner;
  }

  private aggregateMerge(results: AgentExecutionResult[]): unknown {
    if (results.length === 0) {
      return null;
    }

    if (results.length === 1) {
      return results[0].result.data;
    }

    // Attempt to merge objects, or return array if not mergeable
    const allObjects = results.every(
      (r) =>
        typeof r.result.data === 'object' && r.result.data !== null && !Array.isArray(r.result.data)
    );

    if (allObjects) {
      return results.reduce(
        (merged, r) => ({
          ...merged,
          ...(r.result.data as Record<string, unknown>),
        }),
        {}
      );
    }

    // Return as array if can't merge
    return results.map((r) => r.result.data);
  }

  private aggregateAll(results: AgentExecutionResult[]): unknown {
    return results.map((r) => ({
      agentId: r.agentId,
      success: r.result.success,
      data: r.result.data,
      duration: r.duration,
    }));
  }

  private createEmptyResult(
    concurrencyLimit: number,
    aggregationStrategy: AggregationStrategy
  ): ParallelSpawnResult {
    return {
      success: false,
      results: [],
      aggregatedResult: null,
      metadata: {
        totalAgents: 0,
        successfulAgents: 0,
        failedAgents: 0,
        totalDuration: 0,
        concurrencyLimit,
        aggregationStrategy,
      },
    };
  }

  async terminateAll(): Promise<void> {
    for (const agent of this.activeAgents.values()) {
      try {
        await this.spawner.terminateAgent(agent.getId());
      } catch {
        // Agent may already be terminated
      }
    }
    this.activeAgents.clear();
  }
}
