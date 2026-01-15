/**
 * ErrorHandler
 *
 * Central error handling with classification, retry logic, and logging.
 */

import { EventEmitter } from 'events';
import { ErrorClassifier } from './ErrorClassifier';
import { RetryManager } from './RetryManager';
import { ClassifiedError, ErrorContext, RetryConfig } from './types';

export interface RecoveryEvent {
  error: ClassifiedError;
  attempts: number;
}

export class ErrorHandler extends EventEmitter {
  private classifier: ErrorClassifier;
  private retryManager: RetryManager;
  private errorLog: ClassifiedError[];
  private readonly maxLogSize: number;

  constructor(retryConfig?: Partial<RetryConfig>) {
    super();
    this.classifier = new ErrorClassifier();
    this.retryManager = new RetryManager(retryConfig);
    this.errorLog = [];
    this.maxLogSize = 1000;
  }

  async handle<T>(fn: () => Promise<T>, context: ErrorContext): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const classified = this.classifier.classify(error as Error, context);
      this.logError(classified);

      // Emit error event (use 'errorOccurred' to avoid EventEmitter's special 'error' handling)
      this.emit('errorOccurred', classified);

      // If retryable, attempt retry
      if (classified.retryable) {
        const result = await this.retryManager.retry(fn);

        if (result.success && result.data !== undefined) {
          this.emit('recovered', {
            error: classified,
            attempts: result.attempts,
          } as RecoveryEvent);
          return result.data;
        }
      }

      // If not retryable or retry failed, throw
      throw error;
    }
  }

  classify(error: Error, context: ErrorContext): ClassifiedError {
    return this.classifier.classify(error, context);
  }

  private logError(error: ClassifiedError): void {
    this.errorLog.push(error);

    // Keep only last maxLogSize errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  getErrorLog(): ClassifiedError[] {
    return [...this.errorLog];
  }

  getErrorsByCategory(category: string): ClassifiedError[] {
    return this.errorLog.filter((e) => e.category === category);
  }

  getErrorsBySeverity(severity: string): ClassifiedError[] {
    return this.errorLog.filter((e) => e.severity === severity);
  }

  getErrorsBySession(sessionId: string): ClassifiedError[] {
    return this.errorLog.filter((e) => e.context.sessionId === sessionId);
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getRetryManager(): RetryManager {
    return this.retryManager;
  }

  getErrorCount(): number {
    return this.errorLog.length;
  }
}
