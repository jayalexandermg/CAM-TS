/**
 * RLMEngine - Recursive Language Model Engine
 *
 * The main entry point for recursive reasoning that:
 * - Manages the complete reasoning lifecycle
 * - Provides problem submission and result retrieval
 * - Handles validation and error recovery
 * - Exposes events for monitoring
 */

import { EventEmitter } from 'events';
import { ReasoningLoop } from './ReasoningLoop';
import {
  Problem,
  Solution,
  ReasoningResult,
  ReasoningTrace,
  ReasoningContext,
  ReasoningMetrics,
  ValidationResult,
  ValidationIssue,
  RLMConfig,
  RLMEvents,
  DEFAULT_RLM_CONFIG,
} from './types';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * RLMEngine - Main interface for recursive reasoning
 */
export class RLMEngine extends EventEmitter {
  private config: RLMConfig;
  private reasoningLoop: ReasoningLoop;
  private activeTraces: Map<string, ReasoningContext>;
  private completedTraces: Map<string, ReasoningResult>;

  constructor(config?: Partial<RLMConfig>) {
    super();
    this.config = { ...DEFAULT_RLM_CONFIG, ...config };
    this.reasoningLoop = new ReasoningLoop(this.config);
    this.activeTraces = new Map();
    this.completedTraces = new Map();

    this.setupEventForwarding();
  }

  /**
   * Forward events from the reasoning loop
   */
  private setupEventForwarding(): void {
    const events: (keyof RLMEvents)[] = [
      'analysisComplete',
      'decomposed',
      'stepStarted',
      'stepCompleted',
      'solutionFound',
      'synthesisComplete',
      'depthLimitReached',
    ];

    for (const event of events) {
      this.reasoningLoop.on(event, (data) => {
        this.emit(event, data);
      });
    }
  }

  /**
   * Submit a problem for recursive reasoning
   */
  async reason(
    query: string,
    options?: {
      context?: string;
      constraints?: string[];
      sessionId?: string;
    }
  ): Promise<ReasoningResult> {
    const sessionId = options?.sessionId || generateId('session');
    const traceId = generateId('trace');

    // Create root problem
    const rootProblem: Problem = {
      id: generateId('problem'),
      description: query,
      depth: 0,
      context: options?.context,
      constraints: options?.constraints,
    };

    // Initialize trace
    const trace: ReasoningTrace = {
      id: traceId,
      rootProblem,
      steps: [],
      status: 'pending',
      maxDepthReached: 0,
      totalDuration: 0,
      startTime: new Date(),
    };

    // Initialize metrics
    const metrics: ReasoningMetrics = {
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

    // Initialize context
    const context: ReasoningContext = {
      sessionId,
      trace,
      problemStack: [rootProblem],
      solutionCache: new Map(),
      metrics,
      config: this.config,
      startTime: Date.now(),
    };

    this.activeTraces.set(traceId, context);
    this.emit('reasoningStarted', { traceId, problem: rootProblem });

    try {
      trace.status = 'analyzing';

      // Execute recursive reasoning
      const solution = await this.reasoningLoop.solve(rootProblem, context);

      trace.solution = solution;
      trace.status = 'completed';
      trace.endTime = new Date();
      trace.totalDuration = Date.now() - context.startTime;
      metrics.totalTime = trace.totalDuration;

      // Validate if enabled
      let validationResults: ValidationResult[] | undefined;
      if (this.config.enableValidation) {
        trace.status = 'validating';
        validationResults = await this.validate(trace, solution);
        this.emit('validationComplete', { result: validationResults[0] });
      }

      const result: ReasoningResult = {
        success: true,
        solution,
        trace,
        validationResults,
        metrics,
      };

      this.activeTraces.delete(traceId);
      this.completedTraces.set(traceId, result);
      this.emit('reasoningComplete', { result });

      return result;
    } catch (error) {
      trace.status = 'failed';
      trace.error = error as Error;
      trace.endTime = new Date();
      trace.totalDuration = Date.now() - context.startTime;
      metrics.totalTime = trace.totalDuration;

      const result: ReasoningResult = {
        success: false,
        trace,
        error: error as Error,
        metrics,
      };

      this.activeTraces.delete(traceId);
      this.completedTraces.set(traceId, result);
      this.emit('reasoningFailed', { traceId, error: error as Error });

      return result;
    }
  }

  /**
   * Solve a simple problem directly (no decomposition)
   */
  async solveSimple(query: string, context?: string): Promise<Solution> {
    const problem: Problem = {
      id: generateId('problem'),
      description: query,
      depth: 0,
      context,
    };

    const analysis = {
      problem,
      complexity: 'simple' as const,
      confidence: 0.9,
      canSolveDirectly: true,
      reasoning: 'Simple problem, solving directly',
      keyConcepts: this.extractBasicConcepts(query),
      dependencies: [],
    };

    const startTime = Date.now();
    const answer = this.generateSimpleSolution(query, context);

    return {
      problemId: problem.id,
      answer,
      confidence: 0.9,
      solvedDirectly: true,
      reasoning: 'Solved directly as simple problem',
      duration: Date.now() - startTime,
      depth: 0,
    };
  }

  /**
   * Check if a problem is simple enough for direct solving
   */
  isSimpleProblem(query: string): boolean {
    const wordCount = query.split(/\s+/).length;
    const hasComplexity = query.toLowerCase().includes(' and ') ||
                          query.toLowerCase().includes(' then ') ||
                          query.toLowerCase().includes(' if ');

    return wordCount < 15 && !hasComplexity;
  }

  /**
   * Decompose a problem without solving
   */
  async decompose(query: string, context?: string): Promise<Problem[]> {
    const problem: Problem = {
      id: generateId('problem'),
      description: query,
      depth: 0,
      context,
    };

    const concepts = this.extractBasicConcepts(query);
    const subProblems: Problem[] = concepts.map((concept, index) => ({
      id: generateId('subproblem'),
      description: `Analyze: ${concept} in context of "${query.substring(0, 50)}..."`,
      depth: 1,
      parentId: problem.id,
      context,
    }));

    return subProblems;
  }

  /**
   * Validate a reasoning trace and solution
   */
  async validate(trace: ReasoningTrace, solution: Solution): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate solution
    const solutionValidation = this.validateSolution(solution);
    results.push(solutionValidation);

    // Validate chain coherence
    const chainValidation = this.validateChain(trace);
    results.push(chainValidation);

    // Validate individual steps
    for (const step of trace.steps) {
      const stepValidation = this.validateStep(step);
      results.push(stepValidation);
    }

    return results;
  }

  /**
   * Get current configuration
   */
  getConfig(): RLMConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RLMConfig>): void {
    this.config = { ...this.config, ...updates };
    this.reasoningLoop = new ReasoningLoop(this.config);
    this.setupEventForwarding();
  }

  /**
   * Get an active trace by ID
   */
  getActiveTrace(traceId: string): ReasoningContext | undefined {
    return this.activeTraces.get(traceId);
  }

  /**
   * Get a completed result by trace ID
   */
  getCompletedResult(traceId: string): ReasoningResult | undefined {
    return this.completedTraces.get(traceId);
  }

  /**
   * Get all active trace IDs
   */
  getActiveTraceIds(): string[] {
    return Array.from(this.activeTraces.keys());
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeTraces: number;
    completedTraces: number;
    config: RLMConfig;
  } {
    return {
      activeTraces: this.activeTraces.size,
      completedTraces: this.completedTraces.size,
      config: this.getConfig(),
    };
  }

  /**
   * Clear completed traces
   */
  clearCompleted(): void {
    this.completedTraces.clear();
  }

  // === Private Helper Methods ===

  private extractBasicConcepts(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of',
      'and', 'or', 'in', 'on', 'at', 'for', 'with', 'what', 'how',
      'why', 'when', 'where', 'which', 'that', 'this', 'these'
    ]);

    return words
      .filter(w => w.length > 3 && !stopWords.has(w))
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .slice(0, 4);
  }

  private generateSimpleSolution(query: string, context?: string): string {
    const concepts = this.extractBasicConcepts(query);
    const conceptList = concepts.join(', ');

    let response = `Answer to "${query}": `;

    if (context) {
      response += `Given the context, `;
    }

    response += `the solution addresses ${conceptList || 'the query'} directly. `;
    response += `This is a straightforward problem that can be resolved without decomposition.`;

    return response;
  }

  private validateSolution(solution: Solution): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check answer length
    if (solution.answer.length < 10) {
      issues.push({
        severity: 'warning',
        code: 'SHORT_ANSWER',
        message: 'Solution answer is very short',
        suggestion: 'Consider providing more detail',
      });
    }

    // Check confidence
    if (solution.confidence < 0.5) {
      issues.push({
        severity: 'warning',
        code: 'LOW_CONFIDENCE',
        message: `Solution confidence is low: ${(solution.confidence * 100).toFixed(0)}%`,
        suggestion: 'Consider additional reasoning or decomposition',
      });
    }

    // Check for reasoning
    if (!solution.reasoning || solution.reasoning.length < 5) {
      issues.push({
        severity: 'info',
        code: 'MISSING_REASONING',
        message: 'Solution lacks detailed reasoning',
      });
    }

    return {
      target: 'solution',
      targetId: solution.problemId,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      qualityScore: this.calculateQualityScore(solution, issues),
    };
  }

  private validateChain(trace: ReasoningTrace): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check step count
    if (trace.steps.length === 0) {
      issues.push({
        severity: 'error',
        code: 'NO_STEPS',
        message: 'Reasoning trace has no steps',
      });
    }

    // Check for analysis step
    const hasAnalysis = trace.steps.some(s => s.type === 'analysis');
    if (!hasAnalysis) {
      issues.push({
        severity: 'warning',
        code: 'NO_ANALYSIS',
        message: 'Reasoning trace lacks analysis step',
      });
    }

    // Check step ordering
    for (let i = 1; i < trace.steps.length; i++) {
      if (trace.steps[i].index <= trace.steps[i - 1].index) {
        issues.push({
          severity: 'warning',
          code: 'STEP_ORDER',
          message: `Steps ${i - 1} and ${i} may be out of order`,
          stepId: trace.steps[i].id,
        });
      }
    }

    // Check depth progression
    const maxDepth = Math.max(...trace.steps.map(s => s.depth));
    if (maxDepth > this.config.maxDepth) {
      issues.push({
        severity: 'error',
        code: 'DEPTH_EXCEEDED',
        message: `Max depth ${maxDepth} exceeds limit ${this.config.maxDepth}`,
      });
    }

    return {
      target: 'chain',
      targetId: trace.id,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      qualityScore: 1 - (issues.length * 0.1),
    };
  }

  private validateStep(step: ReasoningTrace['steps'][0]): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check output
    if (!step.output || step.output.length === 0) {
      issues.push({
        severity: 'warning',
        code: 'EMPTY_OUTPUT',
        message: 'Step has no output',
        stepId: step.id,
      });
    }

    // Check duration
    if (step.duration > this.config.stepTimeout) {
      issues.push({
        severity: 'warning',
        code: 'SLOW_STEP',
        message: `Step took ${step.duration}ms (limit: ${this.config.stepTimeout}ms)`,
        stepId: step.id,
      });
    }

    // Check confidence
    if (step.confidence < 0.3) {
      issues.push({
        severity: 'info',
        code: 'LOW_STEP_CONFIDENCE',
        message: `Step confidence is ${(step.confidence * 100).toFixed(0)}%`,
        stepId: step.id,
      });
    }

    return {
      target: 'step',
      targetId: step.id,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      qualityScore: step.confidence,
    };
  }

  private calculateQualityScore(solution: Solution, issues: ValidationIssue[]): number {
    let score = solution.confidence;

    // Deduct for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          score -= 0.3;
          break;
        case 'warning':
          score -= 0.1;
          break;
        case 'info':
          score -= 0.02;
          break;
      }
    }

    return Math.max(0, Math.min(1, score));
  }
}
