/**
 * Error Types for Orchestrator Error Handling
 *
 * Defines error severity levels, categories, and interfaces for
 * error classification, retry configuration, and retry results.
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'validation' | 'timeout' | 'resource' | 'logic' | 'unknown';

export interface ErrorContext {
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  skillId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ClassifiedError {
  error: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  context: ErrorContext;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCategory[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}
