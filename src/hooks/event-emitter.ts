/**
 * Infinite Aura - Event Emitter
 *
 * A custom TypeScript EventEmitter for the hook system.
 * Supports registering handlers, emitting events, and error handling.
 */

import { AggregateHandlerError, HookBlockedError } from '../exceptions';
import {
  HookEvent,
  HookHandler,
  EventEmitterOptions,
  HandlerError,
  EventType,
  HookResult,
  HookAction,
} from './types';

/**
 * Interface for hook handlers that support enforcement (returning HookResult)
 */
export interface EnforcingHookHandler extends HookHandler {
  /**
   * Execute the hook and return an enforcement result
   * @param event The event to process
   * @returns HookResult with action (ALLOW, BLOCK, or MODIFY)
   */
  execute?(event: HookEvent): Promise<HookResult>;
}

/**
 * Event emitter for the hook system
 *
 * Manages registration and emission of events to registered handlers.
 * Implements error handling to prevent one handler failure from breaking others.
 */
export class HookEventEmitter {
  private readonly handlers: Map<string, HookHandler> = new Map();
  private readonly options: Required<EventEmitterOptions>;

  constructor(options: EventEmitterOptions = {}) {
    this.options = {
      throwOnErrors: options.throwOnErrors ?? true,
      maxHandlersPerType: options.maxHandlersPerType ?? 100,
    };
  }

  /**
   * Register a hook handler
   *
   * @param handler The handler to register
   * @throws Error if handler with same name already exists
   */
  registerHandler(handler: HookHandler): void {
    if (this.handlers.has(handler.name)) {
      throw new Error(`Handler '${handler.name}' is already registered`);
    }

    // Check max handlers per type
    const handlersOfType = this.getHandlersByType(handler.eventType);
    if (handlersOfType.length >= this.options.maxHandlersPerType) {
      throw new Error(
        `Maximum handlers (${this.options.maxHandlersPerType}) reached for event type '${handler.eventType}'`
      );
    }

    this.handlers.set(handler.name, handler);
  }

  /**
   * Unregister a hook handler by name
   *
   * @param handlerName The name of the handler to unregister
   * @returns true if handler was removed, false if not found
   */
  unregisterHandler(handlerName: string): boolean {
    return this.handlers.delete(handlerName);
  }

  /**
   * Emit an event to all registered handlers
   *
   * Events are sent to:
   * 1. All handlers matching the event's type
   * 2. All CAPTURE_ALL handlers (they receive everything)
   *
   * @param event The event to emit
   * @throws AggregateHandlerError if any handlers fail and throwOnErrors is true
   */
  async emit(event: HookEvent): Promise<void> {
    const errors: HandlerError[] = [];

    // Get handlers that should receive this event
    const targetHandlers = this.getTargetHandlers(event.type);

    // Execute all handlers in parallel, catching errors
    const results = await Promise.allSettled(
      targetHandlers.map(async (handler) => {
        try {
          await handler.handle(event);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push({
            handlerName: handler.name,
            error: err,
            event,
          });
        }
      })
    );

    // Log any rejected promises (shouldn't happen with our try/catch, but safety first)
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const handler = targetHandlers[index];
        errors.push({
          handlerName: handler.name,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          event,
        });
      }
    });

    // If there were errors and throwOnErrors is enabled, throw aggregate error
    if (errors.length > 0 && this.options.throwOnErrors) {
      throw new AggregateHandlerError(
        errors.map((e) => ({ handlerName: e.handlerName, error: e.error }))
      );
    }
  }

  /**
   * Emit an event without throwing on handler errors
   *
   * @param event The event to emit
   * @returns Array of handler errors that occurred, or empty array if none
   */
  async emitSafe(event: HookEvent): Promise<HandlerError[]> {
    const errors: HandlerError[] = [];
    const targetHandlers = this.getTargetHandlers(event.type);

    await Promise.allSettled(
      targetHandlers.map(async (handler) => {
        try {
          await handler.handle(event);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push({
            handlerName: handler.name,
            error: err,
            event,
          });
        }
      })
    );

    return errors;
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): HookHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get handler by name
   */
  getHandler(name: string): HookHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * Get all handlers for a specific event type
   */
  getHandlersByType(eventType: EventType): HookHandler[] {
    return Array.from(this.handlers.values()).filter((h) => h.eventType === eventType);
  }

  /**
   * Get handlers that should receive an event
   * (includes handlers for the specific type AND CAPTURE_ALL handlers)
   */
  private getTargetHandlers(eventType: EventType): HookHandler[] {
    return Array.from(this.handlers.values()).filter(
      (h) => h.eventType === eventType || h.eventType === EventType.CAPTURE_ALL
    );
  }

  /**
   * Get the number of registered handlers
   */
  getHandlerCount(): number {
    return this.handlers.size;
  }

  /**
   * Check if a handler is registered
   */
  hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * Clear all registered handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get emitter options
   */
  getOptions(): Readonly<Required<EventEmitterOptions>> {
    return { ...this.options };
  }

  // ==========================================================================
  // Enforcement Methods
  // ==========================================================================

  /**
   * Execute a specific hook and enforce its result
   *
   * This method is used when you need to execute a single hook and enforce
   * its result (ALLOW, BLOCK, or MODIFY). Unlike emit(), this method:
   * - Executes only the specified hook (by name)
   * - Enforces the hook result (throws HookBlockedError on BLOCK)
   * - Returns the HookResult for ALLOW or MODIFY
   *
   * @param handlerName The name of the handler to execute
   * @param event The event to process
   * @returns HookResult with action and optional data
   * @throws HookBlockedError if hook returns BLOCK action
   */
  async executeHook(handlerName: string, event: HookEvent): Promise<HookResult> {
    const handler = this.handlers.get(handlerName) as EnforcingHookHandler | undefined;

    if (!handler) {
      // No handler registered - allow by default
      return { action: HookAction.ALLOW, success: true };
    }

    // Check if handler supports enforcement (has execute method)
    if (!handler.execute) {
      // Legacy handler - call handle and return ALLOW
      await handler.handle(event);
      return { action: HookAction.ALLOW, success: true };
    }

    // Execute the enforcing handler
    const result = await handler.execute(event);

    // Determine action (default to ALLOW if not specified)
    const action = result.action ?? HookAction.ALLOW;

    // Enforce BLOCK action
    if (action === HookAction.BLOCK) {
      throw new HookBlockedError(
        result.reason || 'Operation blocked by hook',
        handlerName,
        event as unknown as Record<string, unknown>
      );
    }

    return {
      ...result,
      action,
    };
  }

  /**
   * Execute a hook and apply data modifications if any
   *
   * This method is used when you have data that may be modified by a hook.
   * It executes the hook, enforces BLOCK if returned, and applies MODIFY.
   *
   * @param handlerName The name of the handler to execute
   * @param event The event to process
   * @param data The data that may be modified by the hook
   * @returns The original or modified data
   * @throws HookBlockedError if hook returns BLOCK action
   */
  async executeHookWithData<T extends Record<string, unknown>>(
    handlerName: string,
    event: HookEvent,
    data: T
  ): Promise<T> {
    const result = await this.executeHook(handlerName, event);

    // If MODIFY action with data, return the modified data
    if (result.action === HookAction.MODIFY && result.data) {
      return result.data as T;
    }

    // Otherwise return original data
    return data;
  }

  /**
   * Execute hooks for an event type with enforcement
   *
   * Unlike emit(), this method processes hooks sequentially and enforces
   * results. If any hook returns BLOCK, execution stops and error is thrown.
   * MODIFY results are accumulated and returned.
   *
   * @param event The event to process
   * @returns Array of HookResults from all executed hooks
   * @throws HookBlockedError if any hook returns BLOCK action
   */
  async executeHooksWithEnforcement(event: HookEvent): Promise<HookResult[]> {
    const targetHandlers = this.getTargetHandlers(event.type);
    const results: HookResult[] = [];

    // Execute handlers sequentially for enforcement
    for (const handler of targetHandlers) {
      const enforcingHandler = handler as EnforcingHookHandler;

      let result: HookResult;

      if (enforcingHandler.execute) {
        result = await enforcingHandler.execute(event);
      } else {
        // Legacy handler
        await handler.handle(event);
        result = { action: HookAction.ALLOW, success: true };
      }

      const action = result.action ?? HookAction.ALLOW;

      // Enforce BLOCK action
      if (action === HookAction.BLOCK) {
        throw new HookBlockedError(
          result.reason || 'Operation blocked by hook',
          handler.name,
          event as unknown as Record<string, unknown>
        );
      }

      results.push({ ...result, action });
    }

    return results;
  }
}
