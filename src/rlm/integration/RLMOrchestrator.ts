/**
 * RLM Orchestrator
 *
 * Connects the Recursive Language Model to the agent system and memory.
 * Manages reasoning tasks, context, and sandboxed execution.
 */

import { EventEmitter } from 'events';
import {
  RLMOrchestratorConfig,
  RLMSolveRequest,
  RLMAnalyzeRequest,
  RLMSolveResult,
  RLMAnalyzeResult,
  RLMOrchestratorState,
  DEFAULT_RLM_ORCHESTRATOR_CONFIG,
} from './types';
import { RLMEngine } from '../RLMEngine';
import { ContextManager } from '../context/ContextManager';
import { Sandbox } from '../sandbox/Sandbox';
import { ReasoningResult, ReasoningMetrics } from '../types';
import { LLMClient } from '../../llm/LLMClient';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Active reasoning task
 */
interface ActiveTask {
  id: string;
  request: RLMSolveRequest;
  startTime: number;
  sandbox?: Sandbox;
  promise: Promise<RLMSolveResult>;
}

/**
 * RLMOrchestrator - Central coordinator for RLM reasoning
 */
export class RLMOrchestrator extends EventEmitter {
  private config: RLMOrchestratorConfig;
  private engine: RLMEngine;
  private contextManager: ContextManager;
  private activeTasks: Map<string, ActiveTask>;
  private completedTasks: number = 0;
  private failedTasks: number = 0;
  private totalSolveTime: number = 0;
  private startTime: number;
  private resultsCache: Map<string, RLMSolveResult>;
  private llmClient?: LLMClient;

  constructor(config?: Partial<RLMOrchestratorConfig>, llmClient?: LLMClient) {
    super();
    this.config = { ...DEFAULT_RLM_ORCHESTRATOR_CONFIG, ...config };
    this.llmClient = llmClient;

    // Create LLM client if not provided (uses env vars)
    if (!this.llmClient) {
      try {
        this.llmClient = new LLMClient({
          provider: 'anthropic',
          model: 'claude-opus-4-5-20251101',
        });
      } catch {
        // No API key available, will use mock
      }
    }

    this.engine = new RLMEngine(
      {
        maxDepth: 5,
        enableValidation: true,
        enableCaching: true,
      },
      this.llmClient
    );
    this.contextManager = new ContextManager({
      maxTokens: this.config.maxContextTokens,
    });
    this.activeTasks = new Map();
    this.resultsCache = new Map();
    this.startTime = Date.now();

    this.setupEventForwarding();
  }

  /**
   * Set or update the LLM client
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
    this.engine.setLLMClient(client);
  }

  /**
   * Check if using real LLM
   */
  isUsingRealLLM(): boolean {
    return this.llmClient?.isRealProvider() ?? false;
  }

  /**
   * Solve a problem using RLM
   */
  async solve(request: RLMSolveRequest): Promise<RLMSolveResult> {
    // Check concurrency limit
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      throw new Error(
        `Maximum concurrent tasks reached (${this.config.maxConcurrentTasks})`
      );
    }

    const taskId = generateId('rlm_task');
    const startTime = Date.now();

    this.emit('taskStarted', { taskId, query: request.query });

    // Create sandbox if enabled
    let sandbox: Sandbox | undefined;
    if (this.config.enableSandbox) {
      sandbox = new Sandbox({
        maxSnapshots: 5,
        autoSnapshot: true,
      });
    }

    // Create task promise
    const taskPromise = this.executeSolve(taskId, request, sandbox, startTime);

    // Track active task
    const task: ActiveTask = {
      id: taskId,
      request,
      startTime,
      sandbox,
      promise: taskPromise,
    };

    this.activeTasks.set(taskId, task);

    try {
      const result = await taskPromise;
      this.completedTasks++;
      this.totalSolveTime += Date.now() - startTime;
      this.emit('taskCompleted', { taskId, result });

      // Cache result
      const cacheKey = this.getCacheKey(request);
      this.resultsCache.set(cacheKey, result);

      return result;
    } catch (error) {
      this.failedTasks++;
      this.emit('taskFailed', { taskId, error: error as Error });
      throw error;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Analyze a problem without solving
   */
  async analyze(request: RLMAnalyzeRequest): Promise<RLMAnalyzeResult> {
    try {
      // Set query for relevance
      this.contextManager.setQuery(request.query);

      // Add any provided context
      if (request.context) {
        this.contextManager.addKnowledge(request.context, 'user_provided');
      }

      // Use RLM engine to analyze
      const subProblems = await this.engine.decompose(request.query, request.context);
      const isSimple = this.engine.isSimpleProblem(request.query);

      // Determine complexity
      let complexity: 'simple' | 'moderate' | 'complex';
      let confidence: number;

      if (isSimple) {
        complexity = 'simple';
        confidence = 0.9;
      } else if (subProblems.length <= 2) {
        complexity = 'moderate';
        confidence = 0.7;
      } else {
        complexity = 'complex';
        confidence = 0.8;
      }

      // Extract key concepts from the query
      const keyConcepts = this.extractConcepts(request.query);

      // Generate suggested approach
      const suggestedApproach = this.generateApproach(complexity, keyConcepts);

      return {
        success: true,
        complexity,
        confidence,
        keyConcepts,
        suggestedApproach,
        canSolveDirectly: isSimple,
        suggestedDecomposition: isSimple
          ? undefined
          : subProblems.map((p) => p.description),
      };
    } catch (error) {
      return {
        success: false,
        complexity: 'complex',
        confidence: 0,
        keyConcepts: [],
        suggestedApproach: 'Unable to analyze',
        canSolveDirectly: false,
        error: error as Error,
      };
    }
  }

  /**
   * Solve with sandbox protection and rollback on failure
   */
  async solveWithRollback(request: RLMSolveRequest): Promise<RLMSolveResult> {
    const sandbox = new Sandbox({
      autoSnapshot: true,
      isolationLevel: 'strict',
    });

    const result = await sandbox.executeWithRollback(async (state) => {
      // Store request in sandbox state
      state.set('request', request);
      state.set('startTime', Date.now());

      // Execute solve
      const solveResult = await this.solve(request);

      // Store result
      state.set('result', solveResult);

      return solveResult;
    });

    if (result.success && result.result) {
      return result.result;
    }

    return {
      success: false,
      reasoningResult: {
        success: false,
        trace: {
          id: generateId('trace'),
          rootProblem: {
            id: generateId('problem'),
            description: request.query,
            depth: 0,
          },
          steps: [],
          status: 'failed',
          maxDepthReached: 0,
          totalDuration: 0,
          startTime: new Date(),
          error: result.error,
        },
        metrics: this.createEmptyMetrics(),
      },
      error: result.error,
      metrics: {
        totalTime: result.duration,
        reasoning: this.createEmptyMetrics(),
        contextTokens: 0,
        memoryOperations: 0,
        sandboxOperations: 1,
        cacheHits: 0,
      },
    };
  }

  /**
   * Add context for reasoning
   */
  addContext(
    content: string,
    type: 'knowledge' | 'constraint' | 'history' = 'knowledge',
    source?: string
  ): string {
    const item = this.contextManager.add(content, type, 'medium', { source });
    this.emit('contextUpdated', {
      itemCount: this.contextManager.getStats().itemCount,
      tokens: this.contextManager.getStats().totalTokens,
    });
    return item.id;
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.contextManager.clear();
  }

  /**
   * Get orchestrator state
   */
  getState(): RLMOrchestratorState {
    return {
      activeTasks: this.activeTasks.size,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      problemsSolved: this.completedTasks,
      averageSolveTime:
        this.completedTasks > 0
          ? this.totalSolveTime / this.completedTasks
          : 0,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get context manager
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * Get RLM engine
   */
  getEngine(): RLMEngine {
    return this.engine;
  }

  /**
   * Check if a result is cached
   */
  hasCachedResult(request: RLMSolveRequest): boolean {
    const cacheKey = this.getCacheKey(request);
    return this.resultsCache.has(cacheKey);
  }

  /**
   * Get cached result
   */
  getCachedResult(request: RLMSolveRequest): RLMSolveResult | undefined {
    const cacheKey = this.getCacheKey(request);
    return this.resultsCache.get(cacheKey);
  }

  /**
   * Clear results cache
   */
  clearCache(): void {
    this.resultsCache.clear();
  }

  /**
   * Get active task IDs
   */
  getActiveTaskIds(): string[] {
    return Array.from(this.activeTasks.keys());
  }

  /**
   * Cancel an active task (if possible)
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;

    // Rollback sandbox if available
    if (task.sandbox) {
      task.sandbox.abort();
    }

    this.activeTasks.delete(taskId);
    this.failedTasks++;
    return true;
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    // Cancel all active tasks
    for (const taskId of this.activeTasks.keys()) {
      await this.cancelTask(taskId);
    }

    this.clearCache();
    this.clearContext();
    this.emit('shutdown');
  }

  // === Private Methods ===

  /**
   * Execute solve operation
   */
  private async executeSolve(
    taskId: string,
    request: RLMSolveRequest,
    sandbox: Sandbox | undefined,
    startTime: number
  ): Promise<RLMSolveResult> {
    try {
      // Check cache first
      const cached = this.getCachedResult(request);
      if (cached) {
        return {
          ...cached,
          metrics: {
            ...cached.metrics,
            cacheHits: cached.metrics.cacheHits + 1,
          },
        };
      }

      // Update context with query
      this.contextManager.setQuery(request.query);

      // Add request context if provided
      if (request.context) {
        this.contextManager.addKnowledge(request.context, 'request_context');
      }

      // Add constraints
      if (request.constraints) {
        for (const constraint of request.constraints) {
          this.contextManager.addConstraint(constraint);
        }
      }

      // Build context string
      const contextString = this.contextManager.buildContextString();

      // Execute reasoning
      const reasoningResult = await this.engine.reason(request.query, {
        context: contextString,
        constraints: request.constraints,
        sessionId: request.sessionId,
      });

      // Build result
      const result: RLMSolveResult = {
        success: reasoningResult.success,
        solution: reasoningResult.solution,
        reasoningResult,
        formattedAnswer: this.formatAnswer(reasoningResult),
        metrics: {
          totalTime: Date.now() - startTime,
          reasoning: reasoningResult.metrics,
          contextTokens: this.contextManager.getStats().totalTokens,
          memoryOperations: 0,
          sandboxOperations: sandbox ? 1 : 0,
          cacheHits: 0,
        },
      };

      // Add solution to context for future reference
      if (reasoningResult.solution) {
        this.contextManager.addSolution(
          reasoningResult.solution.answer,
          reasoningResult.trace.rootProblem.id
        );
      }

      return result;
    } catch (error) {
      return {
        success: false,
        reasoningResult: {
          success: false,
          trace: {
            id: taskId,
            rootProblem: {
              id: generateId('problem'),
              description: request.query,
              depth: 0,
            },
            steps: [],
            status: 'failed',
            maxDepthReached: 0,
            totalDuration: Date.now() - startTime,
            startTime: new Date(startTime),
            endTime: new Date(),
            error: error as Error,
          },
          error: error as Error,
          metrics: this.createEmptyMetrics(),
        },
        error: error as Error,
        metrics: {
          totalTime: Date.now() - startTime,
          reasoning: this.createEmptyMetrics(),
          contextTokens: this.contextManager.getStats().totalTokens,
          memoryOperations: 0,
          sandboxOperations: sandbox ? 1 : 0,
          cacheHits: 0,
        },
      };
    }
  }

  /**
   * Format answer for display
   */
  private formatAnswer(result: ReasoningResult): string {
    if (!result.solution) {
      return 'Unable to find a solution.';
    }

    const parts: string[] = [];

    parts.push(`## Answer\n${result.solution.answer}`);

    if (result.solution.confidence < 0.7) {
      parts.push(
        `\n*Note: Confidence level is ${(result.solution.confidence * 100).toFixed(0)}%*`
      );
    }

    if (result.solution.reasoning) {
      parts.push(`\n## Reasoning\n${result.solution.reasoning}`);
    }

    if (result.solution.subSolutions && result.solution.subSolutions.length > 0) {
      parts.push('\n## Sub-solutions');
      for (let i = 0; i < result.solution.subSolutions.length; i++) {
        const sub = result.solution.subSolutions[i];
        parts.push(`\n${i + 1}. ${sub.answer}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Extract concepts from query
   */
  private extractConcepts(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'and', 'or',
      'in', 'on', 'at', 'for', 'with', 'what', 'how', 'why', 'when', 'where',
      'which', 'that', 'this', 'these', 'those',
    ]);

    const words = query.toLowerCase().split(/\s+/);
    const concepts = words
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .slice(0, 5);

    return concepts;
  }

  /**
   * Generate suggested approach
   */
  private generateApproach(
    complexity: 'simple' | 'moderate' | 'complex',
    concepts: string[]
  ): string {
    const conceptList = concepts.join(', ');

    switch (complexity) {
      case 'simple':
        return `Direct solution focusing on: ${conceptList}`;
      case 'moderate':
        return `Step-by-step approach analyzing: ${conceptList}`;
      case 'complex':
        return `Decompose into sub-problems covering: ${conceptList}`;
    }
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(request: RLMSolveRequest): string {
    return `${request.query}::${request.context || ''}::${request.constraints?.join(',') || ''}`;
  }

  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): ReasoningMetrics {
    return {
      totalTime: 0,
      analysisTime: 0,
      decompositionTime: 0,
      solvingTime: 0,
      synthesisTime: 0,
      problemsProcessed: 0,
      directSolves: 0,
      recursiveSolves: 0,
      maxDepth: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Setup event forwarding from engine
   */
  private setupEventForwarding(): void {
    this.engine.on('reasoningStarted', (data) => {
      this.emit('reasoningStarted', data);
    });

    this.engine.on('reasoningComplete', (data) => {
      this.emit('reasoningComplete', data);
    });

    this.engine.on('reasoningFailed', (data) => {
      this.emit('reasoningFailed', data);
    });
  }
}
