/**
 * ErrorClassifier
 *
 * Classifies errors by category, severity, and retryability
 * based on error message patterns and context.
 */

import { ErrorCategory, ErrorSeverity, ClassifiedError, ErrorContext } from './types';

export class ErrorClassifier {
  classify(error: Error, context: ErrorContext): ClassifiedError {
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    const retryable = this.isRetryable(category, severity);

    return {
      error,
      category,
      severity,
      retryable,
      context,
    };
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return 'network';
    }

    // Timeout errors (check before network since timeout can include "timeout")
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('deadline exceeded')
    ) {
      return 'timeout';
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('missing')
    ) {
      return 'validation';
    }

    // Resource errors
    if (
      message.includes('memory') ||
      message.includes('disk') ||
      message.includes('quota') ||
      message.includes('limit exceeded')
    ) {
      return 'resource';
    }

    // Logic errors
    if (
      message.includes('assertion') ||
      message.includes('invariant') ||
      message.includes('unexpected')
    ) {
      return 'logic';
    }

    return 'unknown';
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors
    if (category === 'resource' || category === 'logic') {
      return 'critical';
    }

    // High severity
    if (category === 'validation') {
      return 'high';
    }

    // Medium severity
    if (category === 'timeout') {
      return 'medium';
    }

    // Low severity
    if (category === 'network') {
      return 'low';
    }

    return 'medium';
  }

  private isRetryable(category: ErrorCategory, severity: ErrorSeverity): boolean {
    // Don't retry critical errors
    if (severity === 'critical') {
      return false;
    }

    // Don't retry validation errors
    if (category === 'validation') {
      return false;
    }

    // Retry network and timeout errors
    if (category === 'network' || category === 'timeout') {
      return true;
    }

    // Don't retry logic errors
    if (category === 'logic') {
      return false;
    }

    // Unknown errors are retryable by default
    return true;
  }
}
