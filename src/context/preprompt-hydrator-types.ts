/**
 * Infinite Aura - Preprompt Hydrator Types
 *
 * Types and interfaces for the two-layer preprompt hydration system.
 * Layer 1 (Global): CORE context loaded at session start
 * Layer 2 (Agent-Specific): Skill context loaded on demand
 */

// ============================================================================
// Agent Context for Layer 2
// ============================================================================

/**
 * Agent-specific context for Layer 2 hydration
 */
export interface SkillAgentContext {
  /** Skill name */
  skillName: string;
  /** Agent personality description */
  agentPersonality?: string;
  /** Current task context */
  taskContext?: string;
  /** Relevant memory snippets */
  relevantMemory?: string[];
}

// ============================================================================
// Scored Context
// ============================================================================

/**
 * Context with relevance score for ranking
 */
export interface ScoredContext {
  /** Context content */
  context: string;
  /** Relevance score (0-1) */
  score: number;
}

// ============================================================================
// Cached Layer
// ============================================================================

/**
 * Cached layer content with metadata
 */
export interface CachedLayer {
  /** Layer content */
  content: string;
  /** When cached (ISO timestamp) */
  cachedAt: string;
  /** Cache key for invalidation */
  key: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for PrepromptHydrator
 */
export interface PrepromptHydratorConfig {
  /** Max tokens for Layer 1 (default: 2000) */
  maxLayer1Tokens: number;
  /** Max tokens for Layer 2 (default: 2000) */
  maxLayer2Tokens: number;
  /** Max total tokens (default: 4000) */
  maxTotalTokens: number;
  /** Cache expiry in ms (default: 5 minutes) */
  cacheExpiryMs: number;
  /** Minimum relevance score to include (default: 0.3) */
  minRelevanceScore: number;
}

/**
 * Default configuration for PrepromptHydrator
 */
export const DEFAULT_PREPROMPT_HYDRATOR_CONFIG: PrepromptHydratorConfig = {
  maxLayer1Tokens: 2000,
  maxLayer2Tokens: 2000,
  maxTotalTokens: 4000,
  cacheExpiryMs: 5 * 60 * 1000, // 5 minutes
  minRelevanceScore: 0.3,
};

// ============================================================================
// Layer Priorities
// ============================================================================

/**
 * Layer 1 priority constants (Global context: 0-9)
 * Lower numbers = higher priority (appear first in prompt)
 */
export const LAYER_1_PRIORITIES = {
  /** User identity (USER.md) */
  USER_IDENTITY: 0,
  /** User preferences (PREFERENCES.md) */
  USER_PREFERENCES: 1,
  /** Active projects (ACTIVE_PROJECTS.md) */
  ACTIVE_PROJECTS: 2,
} as const;

/**
 * Layer 2 priority constants (Agent-specific: 10+)
 * These appear after Layer 1 in the prompt
 */
export const LAYER_2_PRIORITIES = {
  /** Active skill info */
  ACTIVE_SKILL: 10,
  /** Skill-specific context */
  SKILL_CONTEXT: 11,
  /** Agent personality */
  AGENT_PERSONALITY: 12,
  /** Task context */
  TASK_CONTEXT: 13,
  /** Relevant memory */
  RELEVANT_MEMORY: 14,
} as const;

// ============================================================================
// Layer Markers
// ============================================================================

/**
 * Markers for Layer 1 (Global context)
 */
export const LAYER_1_MARKERS = {
  START: '--- LAYER 1: GLOBAL CONTEXT ---',
  END: '--- END LAYER 1 ---',
} as const;

/**
 * Markers for Layer 2 (Agent context)
 */
export const LAYER_2_MARKERS = {
  START: '--- LAYER 2: AGENT CONTEXT ---',
  END: '--- END LAYER 2 ---',
} as const;

// ============================================================================
// Layer Names (for PrepromptInjector)
// ============================================================================

/**
 * Layer names used with PrepromptInjector
 */
export const LAYER_NAMES = {
  // Layer 1
  LAYER1_USER: 'layer1-user',
  LAYER1_PREFERENCES: 'layer1-preferences',
  LAYER1_PROJECTS: 'layer1-projects',
  // Layer 2
  LAYER2_SKILL: 'layer2-skill',
  LAYER2_CONTEXT: 'layer2-context',
  LAYER2_PERSONALITY: 'layer2-personality',
  LAYER2_TASK: 'layer2-task',
  LAYER2_MEMORY: 'layer2-memory',
} as const;
