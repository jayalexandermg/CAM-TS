/**
 * Infinite Aura - Exception Hierarchy
 *
 * Custom exception classes for the KAI-baseline personal AI memory system.
 * Designed for library use with comprehensive error details and serialization.
 */

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Base
  UNKNOWN: 'UNKNOWN',

  // Path validation
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  INVALID_PATH: 'INVALID_PATH',
  PATH_TOO_LONG: 'PATH_TOO_LONG',

  // File operations
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  FILE_APPEND_ERROR: 'FILE_APPEND_ERROR',
  FILE_EXISTS: 'FILE_EXISTS',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',

  // Security
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  COMMAND_INJECTION: 'COMMAND_INJECTION',
  NULL_BYTE_INJECTION: 'NULL_BYTE_INJECTION',
  SYMLINK_DETECTED: 'SYMLINK_DETECTED',

  // Configuration
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_PARSE_ERROR: 'CONFIG_PARSE_ERROR',

  // Memory
  MEMORY_INIT_ERROR: 'MEMORY_INIT_ERROR',
  MEMORY_LOAD_ERROR: 'MEMORY_LOAD_ERROR',
  MEMORY_SAVE_ERROR: 'MEMORY_SAVE_ERROR',
  MEMORY_CORRUPT: 'MEMORY_CORRUPT',

  // Context
  CONTEXT_LOAD_ERROR: 'CONTEXT_LOAD_ERROR',
  CONTEXT_PARSE_ERROR: 'CONTEXT_PARSE_ERROR',
  CONTEXT_NOT_FOUND: 'CONTEXT_NOT_FOUND',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SCHEMA_MISMATCH: 'SCHEMA_MISMATCH',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',

  // Guardrails
  GUARDRAIL_VIOLATION: 'GUARDRAIL_VIOLATION',
  TOOL_ACCESS_DENIED: 'TOOL_ACCESS_DENIED',
  FILESYSTEM_BOUNDARY: 'FILESYSTEM_BOUNDARY',
  DESTRUCTIVE_ACTION_BLOCKED: 'DESTRUCTIVE_ACTION_BLOCKED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  APPEND_ONLY_VIOLATION: 'APPEND_ONLY_VIOLATION',
  TEXT_ONLY_VIOLATION: 'TEXT_ONLY_VIOLATION',

  // Hook System
  INVALID_EVENT: 'INVALID_EVENT',
  HANDLER_ERROR: 'HANDLER_ERROR',
  AGGREGATE_HANDLER_ERROR: 'AGGREGATE_HANDLER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// Error Details Types
// ============================================================================

export interface ErrorDetails {
  [key: string]: unknown;
}

export interface SerializedError {
  name: string;
  message: string;
  code: ErrorCode;
  details: ErrorDetails;
  timestamp: string;
  stack?: string;
}

// ============================================================================
// Base Exception Class
// ============================================================================

/**
 * Base error class for all Infinite Aura exceptions.
 * Provides consistent structure, serialization, and error tracking.
 */
export class InfiniteAuraError extends Error {
  public readonly code: ErrorCode;
  public readonly details: ErrorDetails;
  public readonly timestamp: Date;

  constructor(message: string, code: ErrorCode = ErrorCodes.UNKNOWN, details: ErrorDetails = {}) {
    super(message);
    this.name = 'InfiniteAuraError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON-compatible object
   */
  toJSON(): SerializedError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * String representation of the error
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

// ============================================================================
// Core Exception Classes
// ============================================================================

/**
 * Path validation errors - invalid paths, traversal attempts, etc.
 */
export class PathValidationError extends InfiniteAuraError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INVALID_PATH,
    details: ErrorDetails = {}
  ) {
    super(message, code, details);
    this.name = 'PathValidationError';
  }
}

/**
 * File operation errors - read/write/append failures
 */
export class FileOperationError extends InfiniteAuraError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.FILE_READ_ERROR,
    details: ErrorDetails = {}
  ) {
    super(message, code, details);
    this.name = 'FileOperationError';
  }
}

/**
 * Security policy violations
 */
export class SecurityError extends InfiniteAuraError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.SECURITY_VIOLATION,
    details: ErrorDetails = {}
  ) {
    super(message, code, details);
    this.name = 'SecurityError';
  }
}

/**
 * Configuration errors - invalid config, missing settings
 */
export class ConfigurationError extends InfiniteAuraError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.CONFIG_INVALID,
    details: ErrorDetails = {}
  ) {
    super(message, code, details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Memory scaffold failures
 */
export class MemoryError extends InfiniteAuraError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.MEMORY_INIT_ERROR,
    details: ErrorDetails = {}
  ) {
    super(message, code, details);
    this.name = 'MemoryError';
  }
}

/**
 * Context loading failures
 */
export class ContextError extends InfiniteAuraError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.CONTEXT_LOAD_ERROR,
    details: ErrorDetails = {}
  ) {
    super(message, code, details);
    this.name = 'ContextError';
  }
}

/**
 * Data validation failures
 */
export class ValidationError extends InfiniteAuraError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.VALIDATION_FAILED,
    details: ErrorDetails = {}
  ) {
    super(message, code, details);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// Guardrails Exception Classes
// ============================================================================

/**
 * Base class for all guardrail policy violations
 */
export class GuardrailViolationError extends InfiniteAuraError {
  public readonly policyId: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string,
    policyId: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    code: ErrorCode = ErrorCodes.GUARDRAIL_VIOLATION,
    details: ErrorDetails = {}
  ) {
    super(message, code, { ...details, policyId, severity });
    this.name = 'GuardrailViolationError';
    this.policyId = policyId;
    this.severity = severity;
  }

  toJSON(): SerializedError & { policyId: string; severity: string } {
    return {
      ...super.toJSON(),
      policyId: this.policyId,
      severity: this.severity,
    };
  }
}

/**
 * Tool usage blocked by policy
 */
export class ToolAccessDeniedError extends GuardrailViolationError {
  public readonly toolName: string;

  constructor(
    toolName: string,
    reason: string,
    policyId: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
    details: ErrorDetails = {}
  ) {
    super(
      `Access to tool '${toolName}' denied: ${reason}`,
      policyId,
      severity,
      ErrorCodes.TOOL_ACCESS_DENIED,
      { ...details, toolName }
    );
    this.name = 'ToolAccessDeniedError';
    this.toolName = toolName;
  }
}

/**
 * Access attempted outside allowed filesystem paths
 */
export class FileSystemBoundaryError extends GuardrailViolationError {
  public readonly attemptedPath: string;
  public readonly allowedPaths: string[];

  constructor(
    attemptedPath: string,
    allowedPaths: string[],
    policyId: string,
    details: ErrorDetails = {}
  ) {
    super(
      `Path '${attemptedPath}' is outside allowed boundaries`,
      policyId,
      'critical',
      ErrorCodes.FILESYSTEM_BOUNDARY,
      { ...details, attemptedPath, allowedPaths }
    );
    this.name = 'FileSystemBoundaryError';
    this.attemptedPath = attemptedPath;
    this.allowedPaths = allowedPaths;
  }
}

/**
 * Dangerous operation blocked by policy
 */
export class DestructiveActionBlockedError extends GuardrailViolationError {
  public readonly action: string;
  public readonly target: string;

  constructor(action: string, target: string, policyId: string, details: ErrorDetails = {}) {
    super(
      `Destructive action '${action}' on '${target}' blocked`,
      policyId,
      'critical',
      ErrorCodes.DESTRUCTIVE_ACTION_BLOCKED,
      { ...details, action, target }
    );
    this.name = 'DestructiveActionBlockedError';
    this.action = action;
    this.target = target;
  }
}

/**
 * Rate limit exceeded
 */
export class RateLimitExceededError extends GuardrailViolationError {
  public readonly limit: number;
  public readonly windowMs: number;
  public readonly current: number;

  constructor(
    operation: string,
    limit: number,
    windowMs: number,
    current: number,
    policyId: string,
    details: ErrorDetails = {}
  ) {
    super(
      `Rate limit exceeded for '${operation}': ${current}/${limit} in ${windowMs}ms`,
      policyId,
      'medium',
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      { ...details, operation, limit, windowMs, current }
    );
    this.name = 'RateLimitExceededError';
    this.limit = limit;
    this.windowMs = windowMs;
    this.current = current;
  }
}

/**
 * Append-only history violation
 */
export class AppendOnlyViolationError extends GuardrailViolationError {
  public readonly targetPath: string;
  public readonly attemptedOperation: string;

  constructor(
    targetPath: string,
    attemptedOperation: string,
    policyId: string,
    details: ErrorDetails = {}
  ) {
    super(
      `Append-only violation: cannot '${attemptedOperation}' on '${targetPath}'`,
      policyId,
      'critical',
      ErrorCodes.APPEND_ONLY_VIOLATION,
      { ...details, targetPath, attemptedOperation }
    );
    this.name = 'AppendOnlyViolationError';
    this.targetPath = targetPath;
    this.attemptedOperation = attemptedOperation;
  }
}

/**
 * Text-only policy violation (binary file operations blocked)
 */
export class TextOnlyViolationError extends GuardrailViolationError {
  public readonly filePath: string;
  public readonly detectedType: string;

  constructor(
    filePath: string,
    detectedType: string,
    policyId: string,
    details: ErrorDetails = {}
  ) {
    super(
      `Text-only violation: '${filePath}' detected as '${detectedType}'`,
      policyId,
      'high',
      ErrorCodes.TEXT_ONLY_VIOLATION,
      { ...details, filePath, detectedType }
    );
    this.name = 'TextOnlyViolationError';
    this.filePath = filePath;
    this.detectedType = detectedType;
  }
}

// ============================================================================
// Hook System Exception Classes
// ============================================================================

/**
 * Invalid event structure or data
 */
export class InvalidEventError extends ValidationError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, ErrorCodes.INVALID_EVENT, details);
    this.name = 'InvalidEventError';
  }
}

/**
 * Handler execution error
 */
export class HandlerError extends InfiniteAuraError {
  public readonly handlerName: string;

  constructor(handlerName: string, message: string, details: ErrorDetails = {}) {
    super(`Handler '${handlerName}' failed: ${message}`, ErrorCodes.HANDLER_ERROR, {
      ...details,
      handlerName,
    });
    this.name = 'HandlerError';
    this.handlerName = handlerName;
  }
}

/**
 * Aggregate error when multiple handlers fail
 */
export class AggregateHandlerError extends InfiniteAuraError {
  public readonly errors: Array<{ handlerName: string; error: Error }>;

  constructor(errors: Array<{ handlerName: string; error: Error }>, details: ErrorDetails = {}) {
    const message = `${errors.length} handler(s) failed: ${errors.map((e) => e.handlerName).join(', ')}`;
    super(message, ErrorCodes.AGGREGATE_HANDLER_ERROR, {
      ...details,
      failedHandlers: errors.map((e) => e.handlerName),
      errorMessages: errors.map((e) => e.error.message),
    });
    this.name = 'AggregateHandlerError';
    this.errors = errors;
  }
}
