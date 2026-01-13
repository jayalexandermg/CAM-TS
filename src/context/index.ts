/**
 * Infinite Aura - Context Module
 *
 * Dynamic 4-layer context loading system for CAM.
 * Layers: User → Project → Session → Agent
 *
 * Also includes two-layer preprompt hydration system:
 * Layer 1 (Global): CORE context loaded at session start
 * Layer 2 (Agent-Specific): Skill context loaded on demand
 */

// Types and interfaces
export {
  ContextLayer,
  ALL_CONTEXT_LAYERS,
  ContextRequest,
  UserContext,
  ProjectContext,
  SessionContext,
  AgentContext,
  RelevanceScores,
  LoadedContext,
  ContextConfig,
  CachedContext,
  DEFAULT_CONTEXT_CONFIG,
  DEFAULT_USER_CONTEXT,
  DEFAULT_RELEVANCE_SCORES,
  USER_CONTEXT_FILES,
  PROJECT_CONTEXT_FILES,
  AGENT_CONTEXT_FILES,
} from './types';

// Preprompt hydrator types
export {
  SkillAgentContext,
  ScoredContext,
  CachedLayer,
  PrepromptHydratorConfig,
  DEFAULT_PREPROMPT_HYDRATOR_CONFIG,
  LAYER_1_PRIORITIES,
  LAYER_2_PRIORITIES,
  LAYER_1_MARKERS,
  LAYER_2_MARKERS,
  LAYER_NAMES,
} from './preprompt-hydrator-types';

// Base context loader
export { ContextLoader } from './context-loader';

// Layer-specific loaders
export { UserContextLoader } from './user-context-loader';
export { ProjectContextLoader } from './project-context-loader';
export { SessionContextLoader } from './session-context-loader';
export { AgentContextLoader } from './agent-context-loader';

// Relevance scoring
export {
  RelevanceScorer,
  RelevanceScorerConfig,
  DEFAULT_RELEVANCE_SCORER_CONFIG,
} from './relevance-scorer';

// Context cache
export { ContextCache, ContextCacheConfig, DEFAULT_CONTEXT_CACHE_CONFIG } from './context-cache';

// Main orchestrator
export {
  DynamicContextLoader,
  DynamicContextLoaderConfig,
  DEFAULT_DYNAMIC_CONTEXT_LOADER_CONFIG,
} from './dynamic-context-loader';

// Preprompt injection
export {
  PrepromptInjector,
  PrepromptInjectorOptions,
  PrepromptLayer,
} from './PrepromptInjector';

// Token management
export {
  TokenManager,
  TokenManagerConfig,
  DEFAULT_TOKEN_MANAGER_CONFIG,
} from './TokenManager';

// Two-layer preprompt hydration
export { PrepromptHydrator } from './PrepromptHydrator';
