/**
 * Infinite Aura - Base Hook Handler
 *
 * Abstract base class for all hook handlers.
 * Provides common functionality for event validation and formatting.
 */

import { InvalidEventError } from '../exceptions';
import { HookEvent, HookHandler, EventType, EventMetadata, HookResult, HookAction } from './types';

/**
 * Options for base hook handler
 */
export interface BaseHookHandlerOptions {
  /** Whether to validate events before handling */
  validateEvents?: boolean;
}

/**
 * Abstract base class for hook handlers
 *
 * Provides common functionality:
 * - Event validation
 * - JSONL formatting for storage
 * - Timestamp generation
 */
export abstract class BaseHookHandler implements HookHandler {
  abstract readonly name: string;
  abstract readonly eventType: EventType;

  protected readonly options: Required<BaseHookHandlerOptions>;

  constructor(options: BaseHookHandlerOptions = {}) {
    this.options = {
      validateEvents: options.validateEvents ?? true,
    };
  }

  /**
   * Handle an incoming event
   * Must be implemented by subclasses
   */
  abstract handle(event: HookEvent): Promise<void>;

  /**
   * Validate event structure and data
   *
   * @param event The event to validate
   * @throws InvalidEventError if event is invalid
   */
  protected validateEvent(event: HookEvent): void {
    if (!event) {
      throw new InvalidEventError('Event is required', { received: event });
    }

    // Validate timestamp
    if (!event.timestamp || typeof event.timestamp !== 'string') {
      throw new InvalidEventError('Event timestamp is required and must be a string', {
        timestamp: event.timestamp,
      });
    }

    // Validate timestamp format (ISO 8601)
    const timestampDate = new Date(event.timestamp);
    if (isNaN(timestampDate.getTime())) {
      throw new InvalidEventError('Event timestamp must be a valid ISO 8601 date', {
        timestamp: event.timestamp,
      });
    }

    // Validate type
    if (!event.type || !Object.values(EventType).includes(event.type)) {
      throw new InvalidEventError('Event type is required and must be a valid EventType', {
        type: event.type,
        validTypes: Object.values(EventType),
      });
    }

    // Validate content
    if (typeof event.content !== 'string') {
      throw new InvalidEventError('Event content must be a string', {
        contentType: typeof event.content,
      });
    }

    // Validate metadata
    if (!event.metadata || typeof event.metadata !== 'object') {
      throw new InvalidEventError('Event metadata is required and must be an object', {
        metadata: event.metadata,
      });
    }
  }

  /**
   * Format event for JSONL storage (single line JSON)
   *
   * @param event The event to format
   * @returns Single-line JSON string
   */
  protected formatEventForStorage(event: HookEvent): string {
    return JSON.stringify(event);
  }

  /**
   * Generate current ISO 8601 timestamp
   */
  protected generateTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create a new event with current timestamp
   */
  protected createEvent(type: EventType, content: string, metadata: EventMetadata = {}): HookEvent {
    return {
      timestamp: this.generateTimestamp(),
      type,
      content,
      metadata,
    };
  }

  /**
   * Validate and optionally skip validation based on options
   */
  protected maybeValidateEvent(event: HookEvent): void {
    if (this.options.validateEvents) {
      this.validateEvent(event);
    }
  }

  // ==========================================================================
  // Enforcement Helper Methods
  // ==========================================================================

  /**
   * Create an ALLOW result - operation proceeds normally
   *
   * @param metadata Optional metadata about the hook execution
   * @returns HookResult with ALLOW action
   */
  protected allow(metadata?: Record<string, unknown>): HookResult {
    return {
      action: HookAction.ALLOW,
      success: true,
      metadata,
    };
  }

  /**
   * Create a BLOCK result - operation is prevented
   *
   * @param reason Reason for blocking the operation
   * @param metadata Optional metadata about the hook execution
   * @returns HookResult with BLOCK action
   */
  protected block(reason: string, metadata?: Record<string, unknown>): HookResult {
    return {
      action: HookAction.BLOCK,
      success: false,
      reason,
      metadata,
    };
  }

  /**
   * Create a MODIFY result - operation proceeds with modified data
   *
   * @param data The modified data to use instead of the original
   * @param reason Optional reason for the modification
   * @param metadata Optional metadata about the hook execution
   * @returns HookResult with MODIFY action
   */
  protected modify(
    data: Record<string, unknown>,
    reason?: string,
    metadata?: Record<string, unknown>
  ): HookResult {
    return {
      action: HookAction.MODIFY,
      success: true,
      data,
      reason,
      metadata,
    };
  }
}
