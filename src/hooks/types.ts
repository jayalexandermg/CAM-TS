/**
 * Infinite Aura - Hook System Types
 *
 * Event types and interfaces for the hook system that captures events
 * from CAM (the orchestrator) and sub-agents.
 *
 * Supports enforcement actions: hooks can ALLOW, BLOCK, or MODIFY operations.
 */

// ============================================================================
// Hook Action Enum (Enforcement)
// ============================================================================

/**
 * Actions that a hook can take to control execution flow
 */
export enum HookAction {
  /** Allow the operation to proceed normally */
  ALLOW = 'allow',
  /** Block the operation (throw error) */
  BLOCK = 'block',
  /** Modify data before the operation proceeds */
  MODIFY = 'modify',
}

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
  /** Pre-tool-use event - fires before tool execution for validation */
  PRE_TOOL_USE = 'pre_tool_use',
  /** Post-tool-use event - fires after tool execution for capturing outputs */
  POST_TOOL_USE = 'post_tool_use',
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
 *
 * Supports both legacy (success/error) and enforcement (action) patterns.
 * The enforcement pattern allows hooks to ALLOW, BLOCK, or MODIFY operations.
 */
export interface HookResult {
  /** Whether the hook executed successfully (legacy pattern) */
  success?: boolean;
  /** Error message if failed (legacy pattern) */
  error?: string;
  /** Any data returned by the hook */
  data?: Record<string, unknown>;
  /** Enforcement action (new pattern) - defaults to ALLOW if not specified */
  action?: HookAction;
  /** Reason for BLOCK or MODIFY action */
  reason?: string;
  /** Additional metadata about the hook execution */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Pre-Tool-Use Event
// ============================================================================

/**
 * Context information for pre-tool-use events
 */
export interface PreToolUseContext {
  /** Name of active skill if any */
  skillName?: string;
  /** Current session ID */
  sessionId?: string;
  /** Current user ID */
  userId?: string;
  /** Working directory for the tool */
  workingDirectory?: string;
}

/**
 * Metadata specific to pre-tool-use events
 */
export interface PreToolUseMetadata extends EventMetadata {
  /** Name of the tool being called */
  toolName: string;
  /** Arguments passed to the tool */
  args: unknown[];
  /** Additional context */
  context?: PreToolUseContext;
}

/**
 * Pre-tool-use event that fires before tool execution
 */
export interface PreToolUseEvent extends HookEvent {
  /** Event type is always PRE_TOOL_USE */
  type: EventType.PRE_TOOL_USE;
  /** Tool-specific metadata */
  metadata: PreToolUseMetadata;
}

/**
 * Result of tool validation
 */
export interface ToolValidationResult {
  /** Whether the tool is safe to execute */
  safe: boolean;
  /** Reason if unsafe */
  reason?: string;
  /** Matched dangerous pattern if any */
  matchedPattern?: string;
}

// ============================================================================
// Post-Tool-Use Event
// ============================================================================

/**
 * Context information for post-tool-use events
 */
export interface PostToolUseContext {
  /** Name of active skill if any */
  skillName?: string;
  /** Current session ID */
  sessionId?: string;
  /** Current user ID */
  userId?: string;
  /** Agent ID that executed the tool */
  agentId?: string;
  /** Working directory for the tool */
  workingDirectory?: string;
}

/**
 * Metadata specific to post-tool-use events
 */
export interface PostToolUseMetadata extends EventMetadata {
  /** Name of the tool that was called */
  toolName: string;
  /** Arguments passed to the tool */
  toolInput: unknown;
  /** Output returned by the tool */
  toolOutput: unknown;
  /** Duration of tool execution in milliseconds */
  duration: number;
  /** Whether the tool executed successfully */
  success: boolean;
  /** Error if tool execution failed */
  error?: Error;
  /** Additional context */
  context?: PostToolUseContext;
}

/**
 * Post-tool-use event that fires after tool execution
 */
export interface PostToolUseEvent extends HookEvent {
  /** Event type is always POST_TOOL_USE */
  type: EventType.POST_TOOL_USE;
  /** Tool execution metadata */
  metadata: PostToolUseMetadata;
}
