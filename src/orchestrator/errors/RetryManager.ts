/**
 * RetryManager
 *
 * Manages retry logic with exponential backoff for failed operations.
 */

import { RetryConfig, RetryResult } from './types';

export class RetryManager {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      initialDelay: config?.initialDelay ?? 1000,
      maxDelay: config?.maxDelay ?? 30000,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
      retryableErrors: config?.retryableErrors ?? ['network', 'timeout', 'unknown'],
    };
  }

  async retry<T>(fn: () => Promise<T>, _context?: string): Promise<RetryResult<T>> {
    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts < this.config.maxRetries) {
      attempts++;

      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts,
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
      attempts,
    };
  }

  calculateDelay(attempt: number): number {
    const delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConfig(): RetryConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<RetryConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
