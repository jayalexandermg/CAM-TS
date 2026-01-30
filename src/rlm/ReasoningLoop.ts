/**
 * ReasoningLoop - Recursive Reasoning Engine
 *
 * Implements the core recursive reasoning loop that:
 * - Analyzes problem complexity
 * - Decides between direct solving and decomposition
 * - Manages recursion depth
 * - Synthesizes sub-results
 */

import { EventEmitter } from 'events';
import {
  Problem,
  SubProblem,
  ProblemAnalysis,
  DecompositionResult,
  Solution,
  SynthesisResult,
  ReasoningStep,
  ReasoningContext,
  ReasoningStepType,
  DecompositionStrategy,
  SynthesisApproach,
  RLMConfig,
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
 * ReasoningLoop handles the recursive problem-solving process
 */
export class ReasoningLoop extends EventEmitter {
  private config: RLMConfig;
  private stepIndex: number = 0;

  constructor(config?: Partial<RLMConfig>) {
    super();
    this.config = { ...DEFAULT_RLM_CONFIG, ...config };
  }

  /**
   * Main entry point - solve a problem recursively
   */
  async solve(problem: Problem, context: ReasoningContext): Promise<Solution> {
    // Check depth limit
    if (problem.depth >= this.config.maxDepth) {
      this.emit('depthLimitReached', { problemId: problem.id, depth: problem.depth });
      return this.forceSolve(problem, context);
    }

    // Check timeout
    if (this.isTimedOut(context)) {
      throw new Error(`Reasoning timeout after ${Date.now() - context.startTime}ms`);
    }

    // Check cache first
    if (this.config.enableCaching) {
      const cached = context.solutionCache.get(this.getCacheKey(problem));
      if (cached) {
        context.metrics.cacheHits++;
        return cached;
      }
      context.metrics.cacheMisses++;
    }

    const startTime = Date.now();

    // Step 1: Analyze the problem
    const analysis = await this.analyzeProblem(problem, context);
    this.emit('analysisComplete', { problemId: problem.id, analysis });

    let solution: Solution;

    // Step 2: Decide and execute solving strategy
    if (analysis.canSolveDirectly) {
      // Direct solve
      solution = await this.solveDirect(problem, analysis, context);
      context.metrics.directSolves++;
    } else {
      // Decompose and recurse
      const decomposition = await this.decompose(problem, analysis, context);
      this.emit('decomposed', { problemId: problem.id, result: decomposition });

      // Solve sub-problems recursively
      const subSolutions = await this.solveSubProblems(decomposition, context);
      context.metrics.recursiveSolves++;

      // Synthesize results
      const synthesis = await this.synthesize(problem, subSolutions, decomposition, context);
      this.emit('synthesisComplete', { result: synthesis });

      solution = synthesis.solution;
    }

    solution.duration = Date.now() - startTime;
    context.metrics.problemsProcessed++;

    // Cache the solution
    if (this.config.enableCaching) {
      context.solutionCache.set(this.getCacheKey(problem), solution);
    }

    this.emit('solutionFound', { problemId: problem.id, solution });
    return solution;
  }

  /**
   * Analyze a problem to determine complexity and solvability
   */
  async analyzeProblem(problem: Problem, context: ReasoningContext): Promise<ProblemAnalysis> {
    const stepStart = Date.now();
    const step = this.createStep('analysis', problem.id, problem.depth, problem.description, context);
    this.emit('stepStarted', { step });

    // Determine complexity based on problem characteristics
    const complexity = this.assessComplexity(problem);
    const confidence = this.calculateConfidence(problem, complexity);
    const canSolveDirectly = confidence >= this.config.confidenceThreshold ||
                             problem.depth >= this.config.maxDepth - 1;

    const keyConcepts = this.extractKeyConcepts(problem);
    const dependencies = this.identifyDependencies(keyConcepts);

    const analysis: ProblemAnalysis = {
      problem,
      complexity,
      confidence,
      canSolveDirectly,
      reasoning: this.generateAnalysisReasoning(problem, complexity, confidence),
      suggestedDecomposition: canSolveDirectly ? undefined : this.suggestDecomposition(problem, keyConcepts),
      keyConcepts,
      dependencies,
    };

    step.output = JSON.stringify({ complexity, confidence, canSolveDirectly });
    step.duration = Date.now() - stepStart;
    step.confidence = confidence;
    context.trace.steps.push(step);
    context.metrics.analysisTime += step.duration;

    this.emit('stepCompleted', { step });
    return analysis;
  }

  /**
   * Solve a problem directly without decomposition
   */
  async solveDirect(
    problem: Problem,
    analysis: ProblemAnalysis,
    context: ReasoningContext
  ): Promise<Solution> {
    const stepStart = Date.now();
    const step = this.createStep('direct_solve', problem.id, problem.depth, problem.description, context);
    this.emit('stepStarted', { step });

    // Generate direct solution
    const answer = this.generateDirectSolution(problem, analysis);
    const confidence = this.evaluateSolutionConfidence(problem, answer, analysis);

    const solution: Solution = {
      problemId: problem.id,
      answer,
      confidence,
      solvedDirectly: true,
      reasoning: `Solved directly based on ${analysis.keyConcepts.join(', ')}`,
      duration: Date.now() - stepStart,
      depth: problem.depth,
    };

    step.output = answer;
    step.duration = Date.now() - stepStart;
    step.confidence = confidence;
    context.trace.steps.push(step);
    context.metrics.solvingTime += step.duration;

    this.emit('stepCompleted', { step });
    return solution;
  }

  /**
   * Decompose a problem into sub-problems
   */
  async decompose(
    problem: Problem,
    analysis: ProblemAnalysis,
    context: ReasoningContext
  ): Promise<DecompositionResult> {
    const stepStart = Date.now();
    const step = this.createStep('decomposition', problem.id, problem.depth, problem.description, context);
    this.emit('stepStarted', { step });

    const strategy = this.selectDecompositionStrategy(problem, analysis);
    const synthesisApproach = this.selectSynthesisApproach(problem, analysis, strategy);

    // Generate sub-problems
    const subProblems = this.generateSubProblems(problem, analysis, strategy);

    const result: DecompositionResult = {
      originalProblem: problem,
      subProblems,
      strategy,
      synthesisApproach,
      reasoning: `Decomposed using ${strategy} strategy into ${subProblems.length} sub-problems`,
    };

    step.output = JSON.stringify({
      strategy,
      subProblemCount: subProblems.length,
      subProblemIds: subProblems.map(sp => sp.id)
    });
    step.duration = Date.now() - stepStart;
    step.childSteps = subProblems.map(sp => sp.id);
    context.trace.steps.push(step);
    context.metrics.decompositionTime += step.duration;

    this.emit('stepCompleted', { step });
    return result;
  }

  /**
   * Solve all sub-problems (recursively)
   */
  async solveSubProblems(
    decomposition: DecompositionResult,
    context: ReasoningContext
  ): Promise<Solution[]> {
    const { subProblems, strategy } = decomposition;
    const solutions: Solution[] = [];

    // Track max depth
    const maxSubDepth = Math.max(...subProblems.map(sp => sp.depth));
    if (maxSubDepth > context.trace.maxDepthReached) {
      context.trace.maxDepthReached = maxSubDepth;
    }
    if (maxSubDepth > context.metrics.maxDepth) {
      context.metrics.maxDepth = maxSubDepth;
    }

    if (strategy === 'parallel') {
      // Solve independent problems in parallel
      const independentProblems = subProblems.filter(sp => sp.dependsOn.length === 0);
      const parallelSolutions = await Promise.all(
        independentProblems.map(sp => this.solve(sp, context))
      );
      solutions.push(...parallelSolutions);

      // Solve dependent problems sequentially
      const dependentProblems = subProblems.filter(sp => sp.dependsOn.length > 0);
      for (const sp of dependentProblems) {
        const solution = await this.solve(sp, context);
        solutions.push(solution);
      }
    } else {
      // Sequential solving (respects dependencies)
      const sorted = this.topologicalSort(subProblems);
      for (const sp of sorted) {
        const solution = await this.solve(sp, context);
        solutions.push(solution);
      }
    }

    return solutions;
  }

  /**
   * Synthesize sub-solutions into a final solution
   */
  async synthesize(
    originalProblem: Problem,
    subSolutions: Solution[],
    decomposition: DecompositionResult,
    context: ReasoningContext
  ): Promise<SynthesisResult> {
    const stepStart = Date.now();
    const step = this.createStep('synthesis', originalProblem.id, originalProblem.depth,
      `Synthesizing ${subSolutions.length} sub-solutions`, context);
    this.emit('stepStarted', { step });

    const { synthesisApproach } = decomposition;
    let synthesizedAnswer: string;
    let quality: number;

    switch (synthesisApproach) {
      case 'aggregate':
        synthesizedAnswer = this.aggregateSolutions(subSolutions);
        quality = this.calculateAverageConfidence(subSolutions);
        break;
      case 'select_best':
        const best = this.selectBestSolution(subSolutions);
        synthesizedAnswer = best.answer;
        quality = best.confidence;
        break;
      case 'chain':
        synthesizedAnswer = this.chainSolutions(subSolutions);
        quality = this.calculateChainQuality(subSolutions);
        break;
      case 'merge':
        synthesizedAnswer = this.mergeSolutions(subSolutions, originalProblem);
        quality = this.calculateMergeQuality(subSolutions);
        break;
      default:
        synthesizedAnswer = this.aggregateSolutions(subSolutions);
        quality = this.calculateAverageConfidence(subSolutions);
    }

    const solution: Solution = {
      problemId: originalProblem.id,
      answer: synthesizedAnswer,
      confidence: quality,
      solvedDirectly: false,
      reasoning: `Synthesized from ${subSolutions.length} sub-solutions using ${synthesisApproach}`,
      subSolutions,
      duration: Date.now() - stepStart,
      depth: originalProblem.depth,
    };

    const result: SynthesisResult = {
      problemId: originalProblem.id,
      solution,
      subSolutions,
      approach: synthesisApproach,
      quality,
      explanation: `Applied ${synthesisApproach} synthesis to combine results`,
    };

    step.output = synthesizedAnswer;
    step.duration = Date.now() - stepStart;
    step.confidence = quality;
    context.trace.steps.push(step);
    context.metrics.synthesisTime += step.duration;

    this.emit('stepCompleted', { step });
    return result;
  }

  /**
   * Force solve when depth limit reached
   */
  private forceSolve(problem: Problem, context: ReasoningContext): Solution {
    const stepStart = Date.now();
    const answer = this.generateForcedSolution(problem);

    return {
      problemId: problem.id,
      answer,
      confidence: 0.5, // Lower confidence for forced solutions
      solvedDirectly: true,
      reasoning: `Forced solution at max depth ${problem.depth}`,
      duration: Date.now() - stepStart,
      depth: problem.depth,
    };
  }

  // === Helper Methods ===

  private createStep(
    type: ReasoningStepType,
    problemId: string,
    depth: number,
    input: string,
    context: ReasoningContext
  ): ReasoningStep {
    return {
      id: generateId('step'),
      type,
      index: this.stepIndex++,
      depth,
      timestamp: new Date(),
      problemId,
      input,
      output: '',
      duration: 0,
      confidence: 0,
    };
  }

  private isTimedOut(context: ReasoningContext): boolean {
    return Date.now() - context.startTime >= this.config.maxTotalTime;
  }

  private getCacheKey(problem: Problem): string {
    return `${problem.description}::${problem.context || ''}`;
  }

  private assessComplexity(problem: Problem): 'simple' | 'moderate' | 'complex' {
    const description = problem.description.toLowerCase();
    const wordCount = description.split(/\s+/).length;
    const hasMultipleParts = description.includes(' and ') ||
                             description.includes(' then ') ||
                             description.includes(' also ');
    const hasConditionals = description.includes(' if ') ||
                            description.includes(' when ') ||
                            description.includes(' unless ');

    if (wordCount < 10 && !hasMultipleParts && !hasConditionals) {
      return 'simple';
    }
    if (wordCount < 30 && (!hasMultipleParts || !hasConditionals)) {
      return 'moderate';
    }
    return 'complex';
  }

  private calculateConfidence(problem: Problem, complexity: 'simple' | 'moderate' | 'complex'): number {
    const baseConfidence = {
      simple: 0.9,
      moderate: 0.6,
      complex: 0.3,
    };

    let confidence = baseConfidence[complexity];

    // Adjust based on context availability
    if (problem.context) {
      confidence += 0.1;
    }

    // Adjust based on constraints
    if (problem.constraints && problem.constraints.length > 0) {
      confidence -= problem.constraints.length * 0.05;
    }

    // Adjust based on depth (deeper = less confident)
    confidence -= problem.depth * 0.05;

    return Math.max(0, Math.min(1, confidence));
  }

  private extractKeyConcepts(problem: Problem): string[] {
    const description = problem.description.toLowerCase();
    const words = description.split(/\s+/);

    // Simple keyword extraction (in production, use NLP)
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for', 'with']);
    const concepts = words
      .filter(w => w.length > 3 && !stopWords.has(w))
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .slice(0, 5);

    return concepts.length > 0 ? concepts : ['general'];
  }

  private identifyDependencies(concepts: string[]): string[] {
    // Simple dependency identification
    const dependencies: string[] = [];
    for (let i = 0; i < concepts.length - 1; i++) {
      dependencies.push(`${concepts[i]} -> ${concepts[i + 1]}`);
    }
    return dependencies;
  }

  private generateAnalysisReasoning(
    problem: Problem,
    complexity: 'simple' | 'moderate' | 'complex',
    confidence: number
  ): string {
    return `Problem analyzed as ${complexity} with ${(confidence * 100).toFixed(0)}% confidence. ` +
           `Depth: ${problem.depth}/${this.config.maxDepth}.`;
  }

  private suggestDecomposition(problem: Problem, keyConcepts: string[]): string[] {
    // Generate sub-problem suggestions based on concepts
    return keyConcepts.map(concept =>
      `Sub-problem: Analyze and resolve "${concept}" aspect`
    );
  }

  private selectDecompositionStrategy(
    problem: Problem,
    analysis: ProblemAnalysis
  ): DecompositionStrategy {
    if (analysis.dependencies.length === 0) {
      return 'parallel';
    }
    if (analysis.complexity === 'complex') {
      return 'hierarchical';
    }
    return 'sequential';
  }

  private selectSynthesisApproach(
    problem: Problem,
    analysis: ProblemAnalysis,
    strategy: DecompositionStrategy
  ): SynthesisApproach {
    if (strategy === 'parallel') {
      return 'aggregate';
    }
    if (strategy === 'sequential') {
      return 'chain';
    }
    if (analysis.keyConcepts.length > 3) {
      return 'merge';
    }
    return 'aggregate';
  }

  private generateSubProblems(
    problem: Problem,
    analysis: ProblemAnalysis,
    strategy: DecompositionStrategy
  ): SubProblem[] {
    const subProblemCount = Math.min(
      analysis.keyConcepts.length,
      this.config.maxSubProblems
    );

    const subProblems: SubProblem[] = [];

    for (let i = 0; i < subProblemCount; i++) {
      const concept = analysis.keyConcepts[i] || `aspect_${i}`;
      const dependsOn: string[] = strategy === 'sequential' && i > 0
        ? [subProblems[i - 1].id]
        : [];

      subProblems.push({
        id: generateId('subproblem'),
        description: `Resolve: ${concept} in context of "${problem.description.substring(0, 50)}..."`,
        depth: problem.depth + 1,
        parentId: problem.id,
        context: problem.context,
        constraints: problem.constraints,
        index: i,
        dependsOn,
        priority: subProblemCount - i,
        expectedContribution: `Provides solution for ${concept} aspect`,
      });
    }

    return subProblems;
  }

  private topologicalSort(subProblems: SubProblem[]): SubProblem[] {
    const visited = new Set<string>();
    const result: SubProblem[] = [];
    const problemMap = new Map(subProblems.map(sp => [sp.id, sp]));

    const visit = (sp: SubProblem): void => {
      if (visited.has(sp.id)) return;
      visited.add(sp.id);

      for (const depId of sp.dependsOn) {
        const dep = problemMap.get(depId);
        if (dep) visit(dep);
      }
      result.push(sp);
    };

    // Sort by priority first
    const sorted = [...subProblems].sort((a, b) => b.priority - a.priority);
    for (const sp of sorted) {
      visit(sp);
    }

    return result;
  }

  private generateDirectSolution(problem: Problem, analysis: ProblemAnalysis): string {
    // In production, this would call an LLM
    // For now, generate a structured response
    const concepts = analysis.keyConcepts.join(', ');
    return `Solution for "${problem.description}": Based on analysis of ${concepts}, ` +
           `the approach involves addressing each aspect systematically. ` +
           `${analysis.reasoning}`;
  }

  private evaluateSolutionConfidence(
    problem: Problem,
    answer: string,
    analysis: ProblemAnalysis
  ): number {
    let confidence = analysis.confidence;

    // Boost confidence if answer addresses all key concepts
    const conceptsCovered = analysis.keyConcepts.filter(c =>
      answer.toLowerCase().includes(c.toLowerCase())
    ).length;

    confidence += (conceptsCovered / analysis.keyConcepts.length) * 0.1;

    return Math.min(1, confidence);
  }

  private generateForcedSolution(problem: Problem): string {
    return `Approximate solution for "${problem.description}": ` +
           `Due to complexity constraints, providing best-effort response. ` +
           `Further decomposition may be needed for complete resolution.`;
  }

  private aggregateSolutions(solutions: Solution[]): string {
    const parts = solutions.map((s, i) => `${i + 1}. ${s.answer}`);
    return `Combined solution:\n${parts.join('\n\n')}`;
  }

  private selectBestSolution(solutions: Solution[]): Solution {
    return solutions.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  private chainSolutions(solutions: Solution[]): string {
    let chained = 'Sequential solution:\n';
    for (let i = 0; i < solutions.length; i++) {
      const step = i + 1;
      chained += `Step ${step}: ${solutions[i].answer}\n`;
      if (i < solutions.length - 1) {
        chained += `→ Leading to next step...\n`;
      }
    }
    return chained;
  }

  private mergeSolutions(solutions: Solution[], problem: Problem): string {
    const uniqueInsights = new Set<string>();
    for (const sol of solutions) {
      const sentences = sol.answer.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sentences.forEach(s => uniqueInsights.add(s.trim()));
    }

    return `Merged solution for "${problem.description}":\n` +
           Array.from(uniqueInsights).join('. ') + '.';
  }

  private calculateAverageConfidence(solutions: Solution[]): number {
    if (solutions.length === 0) return 0;
    const sum = solutions.reduce((acc, s) => acc + s.confidence, 0);
    return sum / solutions.length;
  }

  private calculateChainQuality(solutions: Solution[]): number {
    // Quality degrades slightly with each chain link
    let quality = 1.0;
    for (const sol of solutions) {
      quality *= sol.confidence;
    }
    return Math.pow(quality, 1 / solutions.length); // Geometric mean
  }

  private calculateMergeQuality(solutions: Solution[]): number {
    // Merge quality is max of individual confidences minus small penalty
    const maxConfidence = Math.max(...solutions.map(s => s.confidence));
    return maxConfidence * 0.95; // 5% penalty for merging
  }
}
