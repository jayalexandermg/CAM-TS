/**
 * RLM Context Module
 *
 * Provides context management for the Recursive Language Model:
 * - Context management with token limits
 * - Relevance scoring for reasoning tasks
 * - Context compression while preserving meaning
 */

export { ContextManager } from './ContextManager';
export { RLMRelevanceScorer } from './RelevanceScorer';
export { ContextCompressor } from './ContextCompressor';

// Export all types
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
} from './types';

export {
  DEFAULT_CONTEXT_MANAGER_CONFIG,
  DEFAULT_RELEVANCE_SCORER_CONFIG,
  DEFAULT_COMPRESSOR_CONFIG,
  PRIORITY_WEIGHTS,
  TYPE_WEIGHTS,
} from './types';
