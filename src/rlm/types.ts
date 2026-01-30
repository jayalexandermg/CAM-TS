/**
 * RLM (Recursive Language Model) Type Definitions
 *
 * Types for the recursive reasoning engine that enables:
 * - Direct solving of simple problems
 * - Decomposition of complex problems into sub-problems
 * - Recursive depth management
 * - Synthesis of sub-results into final answers
 */

/**
 * Configuration for the RLM engine
 */
export interface RLMConfig {
  /** Maximum recursion depth (default: 5) */
  maxDepth: number;
  /** Timeout per reasoning step in ms (default: 30000) */
  stepTimeout: number;
  /** Maximum sub-problems per decomposition (default: 4) */
  maxSubProblems: number;
  /** Confidence threshold for direct solving (default: 0.7) */
  confidenceThreshold: number;
  /** Enable validation of reasoning chains (default: true) */
  enableValidation: boolean;
  /** Enable caching of sub-problem results (default: true) */
  enableCaching: boolean;
  /** Maximum total reasoning time in ms (default: 300000 = 5 min) */
  maxTotalTime: number;
}

/**
 * Problem complexity classification
 */
export type ProblemComplexity = 'simple' | 'moderate' | 'complex';

/**
 * Status of a reasoning task
 */
export type ReasoningStatus =
  | 'pending'
  | 'analyzing'
  | 'decomposing'
  | 'solving'
  | 'synthesizing'
  | 'validating'
  | 'completed'
  | 'failed';

/**
 * Type of reasoning step
 */
export type ReasoningStepType =
  | 'analysis'
  | 'decomposition'
  | 'direct_solve'
  | 'recursive_solve'
  | 'synthesis'
  | 'validation';

/**
 * A problem to be solved by the RLM
 */
export interface Problem {
  /** Unique problem identifier */
  id: string;
  /** Problem description/query */
  description: string;
  /** Current recursion depth */
  depth: number;
  /** Parent problem ID (for sub-problems) */
  parentId?: string;
  /** Problem context/background */
  context?: string;
  /** Hints or constraints */
  constraints?: string[];
  /** Problem metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of analyzing a problem
 */
export interface ProblemAnalysis {
  /** Analyzed problem */
  problem: Problem;
  /** Determined complexity */
  complexity: ProblemComplexity;
  /** Confidence in complexity assessment (0-1) */
  confidence: number;
  /** Can be solved directly without decomposition */
  canSolveDirectly: boolean;
  /** Reasoning for the analysis */
  reasoning: string;
  /** Suggested decomposition if complex */
  suggestedDecomposition?: string[];
  /** Key concepts identified */
  keyConcepts: string[];
  /** Dependencies between concepts */
  dependencies: string[];
}

/**
 * A decomposed sub-problem
 */
export interface SubProblem extends Problem {
  /** Index in the decomposition */
  index: number;
  /** IDs of sub-problems this depends on */
  dependsOn: string[];
  /** Priority for solving order */
  priority: number;
  /** Expected contribution to solution */
  expectedContribution: string;
}

/**
 * Result of decomposing a problem
 */
export interface DecompositionResult {
  /** Original problem */
  originalProblem: Problem;
  /** Generated sub-problems */
  subProblems: SubProblem[];
  /** Strategy used for decomposition */
  strategy: DecompositionStrategy;
  /** How to synthesize results */
  synthesisApproach: SynthesisApproach;
  /** Reasoning for decomposition */
  reasoning: string;
}

/**
 * Strategy for decomposing problems
 */
export type DecompositionStrategy =
  | 'sequential'    // Solve in order
  | 'parallel'      // Solve independently
  | 'hierarchical'  // Tree structure
  | 'iterative';    // Refine progressively

/**
 * Approach for synthesizing results
 */
export type SynthesisApproach =
  | 'aggregate'     // Combine all results
  | 'select_best'   // Choose best result
  | 'chain'         // Each builds on previous
  | 'merge';        // Merge overlapping results

/**
 * Solution to a problem
 */
export interface Solution {
  /** Problem that was solved */
  problemId: string;
  /** The solution content */
  answer: string;
  /** Confidence in the solution (0-1) */
  confidence: number;
  /** Was solved directly or via recursion */
  solvedDirectly: boolean;
  /** Reasoning/explanation */
  reasoning: string;
  /** Sub-solutions if decomposed */
  subSolutions?: Solution[];
  /** Time taken to solve in ms */
  duration: number;
  /** Depth at which solved */
  depth: number;
}

/**
 * Result of synthesis
 */
export interface SynthesisResult {
  /** Original problem ID */
  problemId: string;
  /** Synthesized solution */
  solution: Solution;
  /** Sub-solutions that were combined */
  subSolutions: Solution[];
  /** Approach used */
  approach: SynthesisApproach;
  /** Quality of synthesis (0-1) */
  quality: number;
  /** Explanation of synthesis */
  explanation: string;
}

/**
 * Individual reasoning step in the trace
 */
export interface ReasoningStep {
  /** Step identifier */
  id: string;
  /** Step type */
  type: ReasoningStepType;
  /** Step index in trace */
  index: number;
  /** Recursion depth */
  depth: number;
  /** Step timestamp */
  timestamp: Date;
  /** Problem being processed */
  problemId: string;
  /** Step input/context */
  input: string;
  /** Step output/result */
  output: string;
  /** Step duration in ms */
  duration: number;
  /** Confidence in step result */
  confidence: number;
  /** Child step IDs (for decomposition) */
  childSteps?: string[];
  /** Parent step ID */
  parentStepId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete reasoning trace
 */
export interface ReasoningTrace {
  /** Trace identifier */
  id: string;
  /** Original problem */
  rootProblem: Problem;
  /** All reasoning steps */
  steps: ReasoningStep[];
  /** Final solution */
  solution?: Solution;
  /** Trace status */
  status: ReasoningStatus;
  /** Maximum depth reached */
  maxDepthReached: number;
  /** Total reasoning time in ms */
  totalDuration: number;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Error if failed */
  error?: Error;
  /** Trace metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of the complete reasoning process
 */
export interface ReasoningResult {
  /** Whether reasoning succeeded */
  success: boolean;
  /** Final solution if successful */
  solution?: Solution;
  /** Complete reasoning trace */
  trace: ReasoningTrace;
  /** Error if failed */
  error?: Error;
  /** Validation results */
  validationResults?: ValidationResult[];
  /** Performance metrics */
  metrics: ReasoningMetrics;
}

/**
 * Validation result for a reasoning chain
 */
export interface ValidationResult {
  /** What was validated */
  target: 'step' | 'chain' | 'solution';
  /** Target ID */
  targetId: string;
  /** Whether valid */
  valid: boolean;
  /** Validation issues */
  issues: ValidationIssue[];
  /** Overall quality score (0-1) */
  qualityScore: number;
}

/**
 * A validation issue
 */
export interface ValidationIssue {
  /** Issue severity */
  severity: 'info' | 'warning' | 'error';
  /** Issue code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Location in trace */
  stepId?: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Performance metrics for reasoning
 */
export interface ReasoningMetrics {
  /** Total time in ms */
  totalTime: number;
  /** Time in analysis */
  analysisTime: number;
  /** Time in decomposition */
  decompositionTime: number;
  /** Time in solving */
  solvingTime: number;
  /** Time in synthesis */
  synthesisTime: number;
  /** Number of problems processed */
  problemsProcessed: number;
  /** Number solved directly */
  directSolves: number;
  /** Number requiring recursion */
  recursiveSolves: number;
  /** Maximum depth reached */
  maxDepth: number;
  /** Cache hits (if caching enabled) */
  cacheHits: number;
  /** Cache misses */
  cacheMisses: number;
}

/**
 * Context for the reasoning loop
 */
export interface ReasoningContext {
  /** Session identifier */
  sessionId: string;
  /** Current trace */
  trace: ReasoningTrace;
  /** Problem stack (for recursion) */
  problemStack: Problem[];
  /** Solution cache */
  solutionCache: Map<string, Solution>;
  /** Current metrics */
  metrics: ReasoningMetrics;
  /** Configuration */
  config: RLMConfig;
  /** Start time */
  startTime: number;
}

/**
 * Events emitted by the RLM engine
 */
export interface RLMEvents {
  /** Reasoning started */
  reasoningStarted: { traceId: string; problem: Problem };
  /** Problem analysis complete */
  analysisComplete: { problemId: string; analysis: ProblemAnalysis };
  /** Problem decomposed */
  decomposed: { problemId: string; result: DecompositionResult };
  /** Step started */
  stepStarted: { step: ReasoningStep };
  /** Step completed */
  stepCompleted: { step: ReasoningStep };
  /** Solution found */
  solutionFound: { problemId: string; solution: Solution };
  /** Synthesis complete */
  synthesisComplete: { result: SynthesisResult };
  /** Validation complete */
  validationComplete: { result: ValidationResult };
  /** Reasoning complete */
  reasoningComplete: { result: ReasoningResult };
  /** Reasoning failed */
  reasoningFailed: { traceId: string; error: Error };
  /** Depth limit reached */
  depthLimitReached: { problemId: string; depth: number };
  /** Timeout occurred */
  timeout: { traceId: string; elapsed: number };
}

/**
 * Default RLM configuration
 */
export const DEFAULT_RLM_CONFIG: RLMConfig = {
  maxDepth: 5,
  stepTimeout: 30000,
  maxSubProblems: 4,
  confidenceThreshold: 0.7,
  enableValidation: true,
  enableCaching: true,
  maxTotalTime: 300000,
};
