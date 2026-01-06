/**
 * Infinite Aura - Default Guardrail Policies
 *
 * Pre-configured policies aligned with Operating Contract constraints:
 * - C1: Text-only (MD/YAML/JSON)
 * - C2: No embeddings/vectors
 * - C3: Append-only history
 */

import { GuardrailPolicy, GuardrailsConfig, RateLimitConfig } from './types';

// ============================================================================
// Default Policy IDs
// ============================================================================

export const PolicyIds = {
  FILE_SYSTEM_BOUNDARY: 'file-system-boundary',
  PATH_TRAVERSAL_PREVENTION: 'path-traversal-prevention',
  DESTRUCTIVE_OPERATIONS: 'destructive-operations',
  APPEND_ONLY_HISTORY: 'append-only-history',
  TEXT_ONLY_ENFORCEMENT: 'text-only-enforcement',
  COMMAND_INJECTION_PREVENTION: 'command-injection-prevention',
  RATE_LIMITING: 'rate-limiting',
} as const;

export type PolicyId = (typeof PolicyIds)[keyof typeof PolicyIds];

// ============================================================================
// Default Policies
// ============================================================================

/**
 * FILE_SYSTEM_BOUNDARY
 * Blocks access outside ~/.infinite-aura-ts/
 */
export const FILE_SYSTEM_BOUNDARY: GuardrailPolicy = {
  id: PolicyIds.FILE_SYSTEM_BOUNDARY,
  name: 'File System Boundary',
  description:
    'Restricts all file operations to the ~/.infinite-aura-ts/ directory tree. ' +
    'Prevents access to system files, user home directory, or other sensitive locations.',
  enabled: true,
  severity: 'critical',
  action: 'block',
  appliesTo: ['*'],
  excludes: [],
};

/**
 * PATH_TRAVERSAL_PREVENTION
 * Blocks ../, absolute paths, and other traversal attempts
 */
export const PATH_TRAVERSAL_PREVENTION: GuardrailPolicy = {
  id: PolicyIds.PATH_TRAVERSAL_PREVENTION,
  name: 'Path Traversal Prevention',
  description:
    'Detects and blocks path traversal attempts including ../, URL-encoded variants, ' +
    'and absolute paths that could escape the sandbox.',
  enabled: true,
  severity: 'critical',
  action: 'block',
  appliesTo: ['*'],
  excludes: [],
};

/**
 * DESTRUCTIVE_OPERATIONS
 * Blocks delete, truncate without explicit confirmation
 */
export const DESTRUCTIVE_OPERATIONS: GuardrailPolicy = {
  id: PolicyIds.DESTRUCTIVE_OPERATIONS,
  name: 'Destructive Operations Guard',
  description:
    'Prevents destructive file operations (delete, truncate, overwrite) without ' +
    'explicit confirmation. Protects against accidental data loss.',
  enabled: true,
  severity: 'high',
  action: 'block',
  appliesTo: ['delete', 'truncate', 'overwrite', 'rmdir'],
  excludes: ['temp/', 'cache/'],
};

/**
 * APPEND_ONLY_HISTORY
 * Enforces append-only for history/ directory (C3 constraint)
 */
export const APPEND_ONLY_HISTORY: GuardrailPolicy = {
  id: PolicyIds.APPEND_ONLY_HISTORY,
  name: 'Append-Only History',
  description:
    'Enforces append-only semantics for the history/ directory. ' +
    'Modifications and deletions to existing history entries are blocked.',
  enabled: true,
  severity: 'critical',
  action: 'block',
  appliesTo: ['history/*'],
  excludes: [],
};

/**
 * TEXT_ONLY_ENFORCEMENT
 * Blocks binary file operations (C1 constraint)
 */
export const TEXT_ONLY_ENFORCEMENT: GuardrailPolicy = {
  id: PolicyIds.TEXT_ONLY_ENFORCEMENT,
  name: 'Text-Only Enforcement',
  description:
    'Restricts file operations to text-based formats only (MD, YAML, JSON, TXT). ' +
    'Binary files, executables, and non-text formats are blocked.',
  enabled: true,
  severity: 'high',
  action: 'block',
  appliesTo: ['*'],
  excludes: [],
};

/**
 * COMMAND_INJECTION_PREVENTION
 * Blocks shell metacharacters and injection attempts
 */
export const COMMAND_INJECTION_PREVENTION: GuardrailPolicy = {
  id: PolicyIds.COMMAND_INJECTION_PREVENTION,
  name: 'Command Injection Prevention',
  description:
    'Detects and blocks command injection attempts including shell metacharacters, ' +
    'pipe operators, and command substitution patterns.',
  enabled: true,
  severity: 'critical',
  action: 'block',
  appliesTo: ['*'],
  excludes: [],
};

/**
 * RATE_LIMITING
 * Prevents excessive operations
 */
export const RATE_LIMITING: GuardrailPolicy = {
  id: PolicyIds.RATE_LIMITING,
  name: 'Rate Limiting',
  description:
    'Limits the rate of file operations to prevent runaway processes ' +
    'and potential denial-of-service scenarios.',
  enabled: true,
  severity: 'medium',
  action: 'block',
  appliesTo: ['*'],
  excludes: [],
};

// ============================================================================
// Policy Collections
// ============================================================================

/**
 * All default policies
 */
export const DEFAULT_POLICIES: GuardrailPolicy[] = [
  FILE_SYSTEM_BOUNDARY,
  PATH_TRAVERSAL_PREVENTION,
  DESTRUCTIVE_OPERATIONS,
  APPEND_ONLY_HISTORY,
  TEXT_ONLY_ENFORCEMENT,
  COMMAND_INJECTION_PREVENTION,
  RATE_LIMITING,
];

/**
 * Critical policies that should never be disabled
 */
export const CRITICAL_POLICIES: GuardrailPolicy[] = [
  FILE_SYSTEM_BOUNDARY,
  PATH_TRAVERSAL_PREVENTION,
  APPEND_ONLY_HISTORY,
  COMMAND_INJECTION_PREVENTION,
];

/**
 * Policies that can be optionally relaxed
 */
export const OPTIONAL_POLICIES: GuardrailPolicy[] = [
  DESTRUCTIVE_OPERATIONS,
  TEXT_ONLY_ENFORCEMENT,
  RATE_LIMITING,
];

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Allowed text file extensions (C1: Text-only constraint)
 */
export const ALLOWED_TEXT_EXTENSIONS: string[] = [
  '.md',
  '.markdown',
  '.yaml',
  '.yml',
  '.json',
  '.txt',
  '.log',
  '.csv',
  '.tsv',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.ts',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.gitignore',
  '.dockerignore',
  '.editorconfig',
];

/**
 * Default rate limit configurations
 */
export const DEFAULT_RATE_LIMITS: RateLimitConfig[] = [
  { operation: 'read', limit: 100, windowMs: 60000 }, // 100 reads per minute
  { operation: 'write', limit: 50, windowMs: 60000 }, // 50 writes per minute
  { operation: 'append', limit: 200, windowMs: 60000 }, // 200 appends per minute
  { operation: 'delete', limit: 10, windowMs: 60000 }, // 10 deletes per minute
  { operation: 'list', limit: 50, windowMs: 60000 }, // 50 directory listings per minute
];

/**
 * Default guardrails configuration
 */
export const DEFAULT_GUARDRAILS_CONFIG: GuardrailsConfig = {
  policies: DEFAULT_POLICIES,
  enabled: true,
  defaultAction: 'block',
  verboseLogging: false,
  basePath: '~/.infinite-aura-ts',
  allowedExtensions: ALLOWED_TEXT_EXTENSIONS,
};

// ============================================================================
// Policy Lookup Helpers
// ============================================================================

/**
 * Get a policy by ID
 */
export function getPolicyById(id: string): GuardrailPolicy | undefined {
  return DEFAULT_POLICIES.find((policy) => policy.id === id);
}

/**
 * Get policies by severity
 */
export function getPoliciesBySeverity(
  severity: 'low' | 'medium' | 'high' | 'critical'
): GuardrailPolicy[] {
  return DEFAULT_POLICIES.filter((policy) => policy.severity === severity);
}

/**
 * Get enabled policies only
 */
export function getEnabledPolicies(): GuardrailPolicy[] {
  return DEFAULT_POLICIES.filter((policy) => policy.enabled);
}

/**
 * Check if a policy is critical (should never be disabled)
 */
export function isCriticalPolicy(id: string): boolean {
  return CRITICAL_POLICIES.some((policy) => policy.id === id);
}
