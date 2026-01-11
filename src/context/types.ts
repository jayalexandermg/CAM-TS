/**
 * Infinite Aura - Context Types
 *
 * Types and interfaces for the 4-layer dynamic context loading system.
 * Layers: User → Project → Session → Agent
 */

import { HookEvent } from '../hooks/types';
import { TaskType } from '../routing/types';

// ============================================================================
// Context Layer Enum
// ============================================================================

/**
 * The 4 context layers in the hydration system
 */
export enum ContextLayer {
  USER = 'user',
  PROJECT = 'project',
  SESSION = 'session',
  AGENT = 'agent',
}

/**
 * All context layers in loading order
 */
export const ALL_CONTEXT_LAYERS: ContextLayer[] = [
  ContextLayer.USER,
  ContextLayer.PROJECT,
  ContextLayer.SESSION,
  ContextLayer.AGENT,
];

// ============================================================================
// Context Request
// ============================================================================

/**
 * Request for loading context
 */
export interface ContextRequest {
  /** Which project (if any) */
  projectId?: string;
  /** Which session (if any) */
  sessionId?: string;
  /** Which agent (if any) */
  agentId?: string;
  /** What kind of task */
  taskType?: TaskType;
  /** Optional query for relevance scoring */
  query?: string;
  /** Max tokens to load (default: 4000) */
  maxTokens?: number;
  /** Which layers to load (default: all) */
  layers?: ContextLayer[];
}

// ============================================================================
// Layer-Specific Context Types
// ============================================================================

/**
 * User context from user/ directory
 * Layer 1 - Always loaded (foundational)
 */
export interface UserContext {
  /** User preferences (language, style, etc.) */
  preferences: Record<string, unknown>;
  /** User goals */
  goals: string[];
  /** User constraints */
  constraints: string[];
  /** User working style description */
  workingStyle: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Project context from projects/{projectId}/ directory
 * Layer 2 - Loaded if projectId present
 */
export interface ProjectContext {
  /** Project identifier */
  projectId: string;
  /** Project description */
  description: string;
  /** Recent project events */
  history: HookEvent[];
  /** Learned patterns for this project */
  patterns: string[];
  /** Key files in the project */
  files: string[];
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Session context from history/sessions/ directory
 * Layer 3 - Loaded if sessionId present
 */
export interface SessionContext {
  /** Session identifier */
  sessionId: string;
  /** When session started */
  startedAt: string;
  /** Recent session events */
  recentEvents: HookEvent[];
  /** Session summary */
  summary: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Agent context from agents/{agentId}/ directory
 * Layer 4 - Loaded if agentId present
 */
export interface AgentContext {
  /** Agent identifier */
  agentId: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Recent agent events */
  history: HookEvent[];
  /** Agent performance metrics */
  performance: Record<string, number>;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Loaded Context
// ============================================================================

/**
 * Relevance scores for each context layer
 */
export interface RelevanceScores {
  /** User context relevance (always 1.0 - foundational) */
  user: number;
  /** Project context relevance (0-1) */
  project: number;
  /** Session context relevance (0-1) */
  session: number;
  /** Agent context relevance (0-1) */
  agent: number;
}

/**
 * Fully loaded context with all layers
 */
export interface LoadedContext {
  /** User context (Layer 1) */
  userContext?: UserContext;
  /** Project context (Layer 2) */
  projectContext?: ProjectContext;
  /** Session context (Layer 3) */
  sessionContext?: SessionContext;
  /** Agent context (Layer 4) */
  agentContext?: AgentContext;
  /** Relevance scores for each layer */
  relevanceScores: RelevanceScores;
  /** Total tokens loaded */
  totalTokens: number;
  /** When context was loaded */
  loadedAt: string;
}

// ============================================================================
// Context Configuration
// ============================================================================

/**
 * Configuration for context loading
 */
export interface ContextConfig {
  /** Max tokens per layer (default: 1000) */
  maxTokensPerLayer: number;
  /** Max total tokens (default: 4000) */
  maxTotalTokens: number;
  /** Enable caching? (default: true) */
  enableCaching: boolean;
  /** Cache expiry in milliseconds (default: 5 minutes) */
  cacheExpiryMs: number;
  /** Default layers to load */
  defaultLayers: ContextLayer[];
  /** Min relevance to include (default: 0.3) */
  relevanceThreshold: number;
  /** Max events to load per layer (default: 50) */
  maxEventsPerLayer: number;
}

/**
 * Default context configuration
 */
export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxTokensPerLayer: 1000,
  maxTotalTokens: 4000,
  enableCaching: true,
  cacheExpiryMs: 5 * 60 * 1000, // 5 minutes
  defaultLayers: ALL_CONTEXT_LAYERS,
  relevanceThreshold: 0.3,
  maxEventsPerLayer: 50,
};

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cached context entry
 */
export interface CachedContext {
  /** The loaded context */
  context: LoadedContext;
  /** When it was cached */
  cachedAt: string;
  /** Cache key */
  key: string;
}

// ============================================================================
// Default Context Values
// ============================================================================

/**
 * Default user context when no user data exists
 */
export const DEFAULT_USER_CONTEXT: UserContext = {
  preferences: {},
  goals: [],
  constraints: [],
  workingStyle: '',
  metadata: {},
};

/**
 * Default relevance scores
 */
export const DEFAULT_RELEVANCE_SCORES: RelevanceScores = {
  user: 0,
  project: 0,
  session: 0,
  agent: 0,
};

// ============================================================================
// File Path Constants
// ============================================================================

/**
 * User context file paths (relative to memory root)
 */
export const USER_CONTEXT_FILES = {
  preferences: 'user/preferences.json',
  goals: 'user/goals.json',
  constraints: 'user/constraints.json',
  workingStyle: 'user/working-style.json',
} as const;

/**
 * Project context file paths (relative to project directory)
 */
export const PROJECT_CONTEXT_FILES = {
  description: 'description.json',
  patterns: 'patterns.json',
  files: 'files.json',
} as const;

/**
 * Agent context file paths (relative to agent directory)
 */
export const AGENT_CONTEXT_FILES = {
  capabilities: 'capabilities.json',
  performance: 'performance.json',
} as const;
