/**
 * Infinite Aura - Hook System Types
 *
 * Event types and interfaces for the hook system that captures events
 * from CAM (the orchestrator) and sub-agents.
 */

// ============================================================================
// Event Types Enum
// ============================================================================

/**
 * Types of events that can be captured by the hook system
 */
export enum EventType {
  /** Captures all events for comprehensive logging */
  CAPTURE_ALL = 'capture_all',
  /** Stop events when CAM or an agent stops */
  STOP = 'stop',
  /** Sub-agent completion events */
  SUBAGENT_STOP = 'subagent_stop',
  /** End-of-session reflections and summaries */
  SESSION_SUMMARY = 'session_summary',
  /** Session start event - fires when a new session begins */
  SESSION_START = 'session_start',
}

// ============================================================================
// Event Metadata Interface
// ============================================================================

/**
 * Metadata associated with an event
 */
export interface EventMetadata {
  /** Which agent generated this event */
  agentId?: string;
  /** Which project this relates to */
  projectId?: string;
  /** Which session this is part of */
  sessionId?: string;
  /** Tags for classification */
  tags?: string[];
  /** Interestingness score 0-1 (added in PROMPT 10) */
  interestingness?: number;
  /** Reason for event (e.g., why stop occurred) */
  reason?: string;
  /** Duration in milliseconds (for session summaries) */
  durationMs?: number;
  /** Tasks completed (for session summaries) */
  tasksCompleted?: string[];
  /** Allow additional metadata fields */
  [key: string]: unknown;
}

// ============================================================================
// Event Interface
// ============================================================================

/**
 * Core event structure for the hook system
 */
export interface HookEvent {
  /** ISO 8601 timestamp of when the event occurred */
  timestamp: string;
  /** Type of event */
  type: EventType;
  /** Event content/message */
  content: string;
  /** Associated metadata */
  metadata: EventMetadata;
}

// ============================================================================
// Hook Handler Interface
// ============================================================================

/**
 * Interface for hook handlers that process events
 */
export interface HookHandler {
  /** Unique name identifying this handler */
  readonly name: string;
  /** The type of event this handler processes */
  readonly eventType: EventType;
  /**
   * Handle an incoming event
   * @param event The event to handle
   */
  handle(event: HookEvent): Promise<void>;
}

// ============================================================================
// Event Emitter Options
// ============================================================================

/**
 * Options for the event emitter
 */
export interface EventEmitterOptions {
  /** Whether to throw aggregate errors after all handlers complete */
  throwOnErrors?: boolean;
  /** Maximum number of handlers per event type */
  maxHandlersPerType?: number;
}

// ============================================================================
// Handler Error Details
// ============================================================================

/**
 * Details about a handler error during event emission
 */
export interface HandlerError {
  /** Name of the handler that failed */
  handlerName: string;
  /** The error that occurred */
  error: Error;
  /** The event that was being processed */
  event: HookEvent;
}

// ============================================================================
// Session Start Event
// ============================================================================

/**
 * Metadata specific to session start events
 */
export interface SessionStartMetadata extends EventMetadata {
  /** Whether this is resuming an existing session */
  resuming?: boolean;
  /** Previous session ID if resuming */
  previousSessionId?: string;
}

/**
 * Session start event that fires when a new session begins
 */
export interface SessionStartEvent extends HookEvent {
  /** Event type is always SESSION_START */
  type: EventType.SESSION_START;
  /** Session-specific metadata */
  metadata: SessionStartMetadata;
}

/**
 * Result from executing a hook
 */
export interface HookResult {
  /** Whether the hook executed successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Any data returned by the hook */
  data?: Record<string, unknown>;
}
