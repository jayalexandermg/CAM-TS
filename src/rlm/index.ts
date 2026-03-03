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
 * - Sandboxed execution with rollback support
 */

export { RLMEngine } from './RLMEngine';
export { ReasoningLoop } from './ReasoningLoop';

// Sandbox exports
export {
  Sandbox,
  StateManager,
  RollbackManager,
  deepClone,
  estimateSize,
  DEFAULT_SANDBOX_CONFIG,
} from './sandbox';

export type {
  SandboxStatus,
  StateChangeType,
  StateChange,
  StateSnapshot,
  RollbackResult,
  SandboxConfig,
  IsolationLevel,
  SandboxExecutionResult,
  SandboxMetrics,
  SandboxEvents,
  SandboxExecutor,
  SandboxState,
} from './sandbox';

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

// Context management exports
export {
  ContextManager,
  RLMRelevanceScorer,
  ContextCompressor,
  DEFAULT_CONTEXT_MANAGER_CONFIG,
  DEFAULT_RELEVANCE_SCORER_CONFIG,
  DEFAULT_COMPRESSOR_CONFIG,
  PRIORITY_WEIGHTS,
  TYPE_WEIGHTS,
} from './context';

export type {
  ContextPriority,
  ContextType,
  ContextItem,
  ContextManagerConfig,
  RelevanceScorerConfig,
  CompressorConfig,
  CompressionResult,
  RelevanceResult,
  ContextWindow,
  FitResult,
  ContextManagerEvents,
} from './context';

// Integration exports
export {
  RLMOrchestrator,
  AgentRLMBridge,
  DEFAULT_RLM_ORCHESTRATOR_CONFIG,
  DEFAULT_AGENT_RLM_BRIDGE_CONFIG,
} from './integration';

export type {
  RLMOrchestratorConfig,
  RLMSolveRequest,
  RLMAnalyzeRequest,
  RLMSolveResult,
  RLMAnalyzeResult,
  RLMExecutionMetrics,
  RLMOrchestratorState,
  AgentRLMBridgeConfig,
  AgentReasoningResult,
  RLMOrchestratorEvents,
} from './integration';

// Reasoning threads
export * from './threads';
