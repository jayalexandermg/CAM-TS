PROMPT 14B: Error Handling & Recovery
Phase: 4 (Orchestrator)
Status: 🆕 NEW - Error resilience
Time Estimate: 6-8 hours
Priority: CRITICAL
Dependencies: Phase 3 complete
Parallel: ✅ Can run with 14A, 14C

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Implement comprehensive error handling, retry logic, and recovery strategies.

After this prompt:

✅ ErrorHandler class
✅ RetryManager class
✅ Error classification
✅ Retry strategies
✅ Fallback mechanisms
✅ 25-35 new tests
📦 REQUIREMENTS
1. Error Types
Create src/orchestrator/errors/types.ts:

typescript
Copy
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'validation' | 'timeout' | 'resource' | 'logic' | 'unknown';

export interface ErrorContext {
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  skillId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
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
2. Error Classification
Create src/orchestrator/errors/ErrorClassifier.ts:

typescript
Copy
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
      context
    };
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return 'network';
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

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('deadline exceeded')
    ) {
      return 'timeout';
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
3. Retry Manager
Create src/orchestrator/errors/RetryManager.ts:

typescript
Copy
import { RetryConfig, RetryResult } from './types';

export class RetryManager {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxRetries: config?.maxRetries || 3,
      initialDelay: config?.initialDelay || 1000,
      maxDelay: config?.maxDelay || 30000,
      backoffMultiplier: config?.backoffMultiplier || 2,
      retryableErrors: config?.retryableErrors || ['network', 'timeout', 'unknown']
    };
  }

  async retry<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<RetryResult<T>> {
    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts < this.config.maxRetries) {
      attempts++;

      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts
        };
      } catch (error) {
        lastError = error as Error;

        // If this was the last attempt, don't delay
        if (attempts >= this.config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempts);

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts
    };
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConfig(): RetryConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<RetryConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
}
4. Error Handler
Create src/orchestrator/errors/ErrorHandler.ts:

typescript
Copy
import { ErrorClassifier } from './ErrorClassifier';
import { RetryManager } from './RetryManager';
import { ClassifiedError, ErrorContext, RetryResult } from './types';
import { EventEmitter } from 'events';

export class ErrorHandler extends EventEmitter {
  private classifier: ErrorClassifier;
  private retryManager: RetryManager;
  private errorLog: ClassifiedError[];

  constructor() {
    super();
    this.classifier = new ErrorClassifier();
    this.retryManager = new RetryManager();
    this.errorLog = [];
  }

  async handle<T>(
    fn: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const classified = this.classifier.classify(error as Error, context);
      this.logError(classified);

      // Emit error event
      this.emit('error', classified);

      // If retryable, attempt retry
      if (classified.retryable) {
        const result = await this.retryManager.retry(fn);

        if (result.success && result.data !== undefined) {
          this.emit('recovered', {
            error: classified,
            attempts: result.attempts
          });
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

    // Keep only last 1000 errors
    if (this.errorLog.length > 1000) {
      this.errorLog.shift();
    }
  }

  getErrorLog(): ClassifiedError[] {
    return [...this.errorLog];
  }

  getErrorsByCategory(category: string): ClassifiedError[] {
    return this.errorLog.filter(e => e.category === category);
  }

  getErrorsBySeverity(severity: string): ClassifiedError[] {
    return this.errorLog.filter(e => e.severity === severity);
  }

  getErrorsBySession(sessionId: string): ClassifiedError[] {
    return this.errorLog.filter(e => e.context.sessionId === sessionId);
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getRetryManager(): RetryManager {
    return this.retryManager;
  }
}
5. Index Exports
Create src/orchestrator/errors/index.ts:

typescript
Copy
export * from './types';
export * from './ErrorClassifier';
export * from './RetryManager';
export * from './ErrorHandler';
📁 FILES TO CREATE
src/orchestrator/errors/types.ts
src/orchestrator/errors/ErrorClassifier.ts
src/orchestrator/errors/ErrorHandler.ts
src/orchestrator/errors/RetryManager.ts
src/orchestrator/errors/index.ts
tests/orchestrator/errors/ErrorClassifier.test.ts (8-12 tests)
tests/orchestrator/errors/RetryManager.test.ts (8-12 tests)
tests/orchestrator/errors/ErrorHandler.test.ts (9-11 tests)
Total: 8 files, 25-35 tests

✅ SUCCESS CRITERIA
✅ Error classification working
✅ Retry logic working
✅ Exponential backoff working
✅ Error logging working
✅ Error recovery working
✅ 25-35 tests passing
✅ No TypeScript errors
END OF PROMPT 14B
