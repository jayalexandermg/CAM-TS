/**
 * Infinite Aura - Content Routing Types
 *
 * Types and interfaces for content-based event routing.
 * Routes events to multiple UFC directories based on content and metadata.
 */

import { HookEvent } from '../hooks/types';
import { InterestingnessScore, PromotionResult } from '../learning/types';

// ============================================================================
// Task Type Enum
// ============================================================================

/**
 * Types of tasks that events can be classified into
 */
export enum TaskType {
  RESEARCH = 'research',
  CODING = 'coding',
  ANALYSIS = 'analysis',
  WRITING = 'writing',
  PLANNING = 'planning',
  DEBUGGING = 'debugging',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  OTHER = 'other',
}

// ============================================================================
// Classification Interface
// ============================================================================

/**
 * Classification result for an event
 */
export interface Classification {
  /** Which project this event relates to (if any) */
  projectId?: string;
  /** Which agent generated this event (if any) */
  agentId?: string;
  /** What kind of task this is */
  taskType?: TaskType;
  /** Classification tags */
  tags: string[];
  /** Confidence score 0-1 */
  confidence: number;
}

// ============================================================================
// Routing Destination Interface
// ============================================================================

/**
 * A destination where an event should be routed
 */
export interface RoutingDestination {
  /** UFC directory path (relative to memory root) */
  directory: string;
  /** Filename for the event log */
  filename: string;
  /** Reason why this destination was chosen */
  reason: string;
}

// ============================================================================
// Routing Result Interface
// ============================================================================

/**
 * Result of routing an event
 */
export interface RoutingResult {
  /** The original event that was routed */
  event: HookEvent;
  /** All destinations the event was routed to */
  destinations: RoutingDestination[];
  /** Classification used for routing */
  classification: Classification;
  /** Whether routing was successful */
  success: boolean;
  /** Any errors that occurred during routing */
  errors?: string[];
  /** Interestingness score (if scoring was enabled) */
  interestingnessScore?: InterestingnessScore;
  /** Promotion result (if promotion was attempted) */
  promotionResult?: PromotionResult;
}

// ============================================================================
// Routing Config Interface
// ============================================================================

/**
 * Configuration for the content router
 */
export interface RoutingConfig {
  /** Enable routing to projects/{projectId}/ directory */
  enableProjectRouting: boolean;
  /** Enable routing to agents/{agentId}/ directory */
  enableAgentRouting: boolean;
  /** Enable routing to tasks/{taskType}/ directory */
  enableTaskTypeRouting: boolean;
  /** Enable routing based on tags */
  enableTagRouting: boolean;
  /** Minimum confidence score required for routing (0-1) */
  minConfidence: number;
  /** Always route to history/execution/ regardless of classification */
  alwaysRouteToHistory: boolean;
}

/**
 * Default routing configuration
 */
export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  enableProjectRouting: true,
  enableAgentRouting: true,
  enableTaskTypeRouting: true,
  enableTagRouting: false, // Tags routing is more experimental
  minConfidence: 0.3,
  alwaysRouteToHistory: true,
};

// ============================================================================
// Classifier Options Interface
// ============================================================================

/**
 * Options for the content classifier
 */
export interface ClassifierOptions {
  /** Custom project patterns to look for in content */
  projectPatterns?: RegExp[];
  /** Custom agent patterns to look for in content */
  agentPatterns?: RegExp[];
  /** Custom task type keywords */
  taskTypeKeywords?: Partial<Record<TaskType, string[]>>;
  /** Default confidence when metadata is present */
  metadataConfidence?: number;
  /** Default confidence when inferred from content */
  inferredConfidence?: number;
}

/**
 * Default classifier options
 */
export const DEFAULT_CLASSIFIER_OPTIONS: Required<ClassifierOptions> = {
  projectPatterns: [
    /project[:\s]+["']?([a-z0-9-_]+)["']?/i,
    /for\s+["']?([a-z0-9-_]+)["']?\s+project/i,
    /in\s+["']?([a-z0-9-_]+)["']?\s+project/i,
    /\bproject\s+["']?([a-z0-9-_]+)["']?/i,
  ],
  agentPatterns: [
    /agent[:\s]+["']?([a-z0-9-_]+)["']?/i,
    /by\s+["']?([a-z0-9-_]+)["']?\s+agent/i,
    /\bagent\s+["']?([a-z0-9-_]+)["']?/i,
  ],
  taskTypeKeywords: {
    [TaskType.RESEARCH]: [
      'research',
      'investigate',
      'explore',
      'study',
      'learn',
      'discover',
      'find out',
    ],
    [TaskType.CODING]: ['code', 'implement', 'build', 'develop', 'program', 'create', 'write code'],
    [TaskType.ANALYSIS]: ['analyze', 'review', 'examine', 'evaluate', 'assess', 'inspect'],
    [TaskType.WRITING]: ['write', 'compose', 'draft', 'author', 'create content'],
    [TaskType.PLANNING]: ['plan', 'design', 'architect', 'outline', 'strategy', 'roadmap'],
    [TaskType.DEBUGGING]: ['debug', 'fix', 'troubleshoot', 'resolve', 'patch', 'repair'],
    [TaskType.TESTING]: ['test', 'verify', 'validate', 'check', 'qa', 'quality'],
    [TaskType.DOCUMENTATION]: ['document', 'readme', 'docs', 'documentation', 'guide', 'manual'],
  },
  metadataConfidence: 0.9,
  inferredConfidence: 0.6,
};
