/**
 * RLM (Recursive Language Model) Module
 *
 * Provides recursive reasoning capabilities for complex problem solving.
 *
 * Key features:
 * - Direct solving for simple problems
 * - Automatic decomposition of complex problems
 * - Recursive depth management
 * - Result synthesis from sub-solutions
 * - Validation of reasoning chains
 */

export { RLMEngine } from './RLMEngine';
export { ReasoningLoop } from './ReasoningLoop';

// Export all types
export type {
  RLMConfig,
  ProblemComplexity,
  ReasoningStatus,
  ReasoningStepType,
  Problem,
  SubProblem,
  ProblemAnalysis,
  DecompositionResult,
  DecompositionStrategy,
  SynthesisApproach,
  Solution,
  SynthesisResult,
  ReasoningStep,
  ReasoningTrace,
  ReasoningResult,
  ValidationResult,
  ValidationIssue,
  ReasoningMetrics,
  ReasoningContext,
  RLMEvents,
} from './types';

export { DEFAULT_RLM_CONFIG } from './types';
