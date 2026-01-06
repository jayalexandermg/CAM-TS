/**
 * Infinite Aura - Guardrails Types
 *
 * Type definitions for the guardrails/safety policy layer.
 * Provides centralized constraint definitions for the memory system.
 */

// ============================================================================
// Severity and Action Types
// ============================================================================

export type PolicySeverity = 'low' | 'medium' | 'high' | 'critical';

export type PolicyAction = 'warn' | 'block' | 'log';

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Defines a guardrail policy that enforces constraints
 */
export interface GuardrailPolicy {
  /** Unique identifier for the policy */
  id: string;

  /** Human-readable name */
  name: string;

  /** Detailed description of what the policy enforces */
  description: string;

  /** Whether the policy is currently active */
  enabled: boolean;

  /** Severity level when violated */
  severity: PolicySeverity;

  /** Action to take when policy is violated */
  action: PolicyAction;

  /** Optional: Paths or patterns this policy applies to */
  appliesTo?: string[];

  /** Optional: Paths or patterns excluded from this policy */
  excludes?: string[];
}

/**
 * Represents a single policy violation
 */
export interface GuardrailViolation {
  /** ID of the policy that was violated */
  policyId: string;

  /** Human-readable description of the violation */
  message: string;

  /** Severity of this specific violation */
  severity: PolicySeverity;

  /** When the violation occurred */
  timestamp: Date;

  /** Additional context about the violation */
  context: ViolationContext;
}

/**
 * Context information for a violation
 */
export interface ViolationContext {
  /** The path or resource that triggered the violation */
  path?: string;

  /** The operation that was attempted */
  operation?: string;

  /** The value that caused the violation */
  value?: string;

  /** Pattern that matched (for pattern-based checks) */
  matchedPattern?: string;

  /** Additional details */
  [key: string]: unknown;
}

/**
 * Result of a guardrail check
 */
export interface GuardrailResult {
  /** Whether the action is allowed to proceed */
  allowed: boolean;

  /** List of policy violations that occurred */
  violations: GuardrailViolation[];

  /** Non-blocking warnings */
  warnings: string[];

  /** Time taken for the check in milliseconds */
  checkDurationMs?: number;
}

// ============================================================================
// Policy Configuration Types
// ============================================================================

/**
 * Configuration for the guardrails system
 */
export interface GuardrailsConfig {
  /** List of active policies */
  policies: GuardrailPolicy[];

  /** Global enable/disable switch */
  enabled: boolean;

  /** Default action when no specific policy matches */
  defaultAction: PolicyAction;

  /** Whether to log all checks (not just violations) */
  verboseLogging: boolean;

  /** Base path for filesystem boundary checks */
  basePath: string;

  /** Allowed file extensions (for text-only enforcement) */
  allowedExtensions: string[];
}

/**
 * Input for a guardrail check
 */
export interface GuardrailCheckInput {
  /** The operation being performed */
  operation: string;

  /** Target path (if applicable) */
  path?: string;

  /** Content being written (if applicable) */
  content?: string;

  /** Tool name (if applicable) */
  tool?: string;

  /** Additional context */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Policy Rule Types
// ============================================================================

/**
 * A rule within a policy
 */
export interface PolicyRule {
  /** Rule identifier */
  id: string;

  /** What the rule checks */
  check: 'path' | 'content' | 'operation' | 'extension' | 'pattern';

  /** The pattern or value to match */
  pattern: string | RegExp;

  /** Whether matching is a violation (true) or requirement (false) */
  isViolation: boolean;

  /** Message when rule triggers */
  message: string;
}

/**
 * Extended policy with rules
 */
export interface GuardrailPolicyWithRules extends GuardrailPolicy {
  /** List of rules that make up this policy */
  rules: PolicyRule[];
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /** Maximum number of operations */
  limit: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Operation type this limit applies to */
  operation: string;
}

/**
 * Rate limit state tracking
 */
export interface RateLimitState {
  /** Number of operations in current window */
  count: number;

  /** Window start timestamp */
  windowStart: Date;

  /** Operation type */
  operation: string;
}

// ============================================================================
// Audit Types
// ============================================================================

/**
 * Audit log entry for guardrail checks
 */
export interface GuardrailAuditEntry {
  /** Unique ID for this entry */
  id: string;

  /** Timestamp of the check */
  timestamp: Date;

  /** Input that was checked */
  input: GuardrailCheckInput;

  /** Result of the check */
  result: GuardrailResult;

  /** Policies that were evaluated */
  policiesChecked: string[];
}
