/**
 * Observability Event Types
 *
 * Defines the foundational types for the observability system's event tracking.
 * Events capture all significant actions within the system for auditing,
 * debugging, and analytics purposes.
 */

export type ObservabilityEventType =
  | 'agent:spawn'
  | 'agent:complete'
  | 'agent:error'
  | 'agent:terminate'
  | 'skill:invoke'
  | 'skill:complete'
  | 'skill:error'
  | 'memory:write'
  | 'memory:read'
  | 'memory:consolidate'
  | 'user:rating'
  | 'user:feedback'
  | 'session:start'
  | 'session:end'
  | 'rlm:step'
  | 'rlm:complete'
  | 'system:error'
  | 'system:warning';

/**
 * Metadata attached to every observability event for tracing and context.
 */
export interface EventMetadata {
  /** Component that emitted the event */
  source: string;
  /** CAM version */
  version: string;
  /** Environment: dev/staging/prod */
  environment: string;
  /** For tracing related events */
  correlationId?: string;
  /** Parent event for hierarchies */
  parentId?: string;
  /** Custom tags */
  tags?: string[];
}

/**
 * Core observability event structure.
 * All events in the system conform to this interface.
 */
export interface ObservabilityEvent {
  /** UUID */
  id: string;
  /** Event type */
  type: ObservabilityEventType;
  /** When the event occurred */
  timestamp: Date;
  /** Associated session ID */
  sessionId: string;
  /** Associated user ID (if applicable) */
  userId?: string;
  /** Event-specific payload */
  data: Record<string, unknown>;
  /** Event metadata for tracing */
  metadata: EventMetadata;
  /** Duration in milliseconds (for timed events) */
  duration?: number;
  /** Success status (for completion events) */
  success?: boolean;
  /** Error information (for error events) */
  error?: ErrorInfo;
}

/**
 * Structured error information for error events.
 */
export interface ErrorInfo {
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Stack trace */
  stack?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Event data for agent spawn events.
 */
export interface AgentSpawnEventData {
  /** Unique agent identifier */
  agentId: string;
  /** Name of the agent */
  agentName: string;
  /** Agent traits/capabilities */
  traits?: string[];
  /** Task being performed */
  task?: string;
}

/**
 * Event data for skill invocation events.
 */
export interface SkillInvokeEventData {
  /** Name of the skill being invoked */
  skillName: string;
  /** Input parameters passed to the skill */
  inputs: Record<string, unknown>;
  /** Confidence score from routing (0-1) */
  matchConfidence?: number;
}

/**
 * Event data for memory operations.
 */
export interface MemoryEventData {
  /** Memory tier */
  tier: 'immediate' | 'short-term' | 'long-term';
  /** Type of operation */
  operation: 'read' | 'write' | 'delete' | 'consolidate';
  /** Key being accessed (if applicable) */
  key?: string;
  /** Size of data in bytes (if applicable) */
  size?: number;
}

/**
 * Event data for user rating events.
 */
export interface RatingEventData {
  /** Rating value (1-10) */
  rating: number;
  /** Whether rating was explicit or implicit */
  ratingType: 'explicit' | 'implicit';
  /** What is being rated */
  targetType: 'agent' | 'skill' | 'response' | 'session';
  /** Identifier of the rated item */
  targetId?: string;
  /** Optional user comment */
  comment?: string;
}
