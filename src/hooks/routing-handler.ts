/**
 * Infinite Aura - Routing-Aware Hook Handler
 *
 * A hook handler that uses ContentRouter for intelligent multi-destination routing.
 * Routes events to multiple UFC directories based on content classification.
 */

import { BaseHookHandler, BaseHookHandlerOptions } from './hook-handler';
import { HookEvent, EventType } from './types';
import { ContentRouter } from '../routing/content-router';
import { RoutingResult } from '../routing/types';

/**
 * Options for RoutingHandler
 */
export interface RoutingHandlerOptions extends BaseHookHandlerOptions {
  /** Custom name for this handler */
  handlerName?: string;
  /** Event type this handler responds to (defaults to CAPTURE_ALL) */
  eventType?: EventType;
}

/**
 * Hook handler that uses ContentRouter for intelligent routing
 *
 * This handler:
 * - Receives events based on configured eventType
 * - Uses ContentRouter to classify and route events
 * - Writes events to multiple destinations based on classification
 * - Provides routing result information
 */
export class RoutingHandler extends BaseHookHandler {
  readonly name: string;
  readonly eventType: EventType;

  private readonly router: ContentRouter;
  private lastRoutingResult: RoutingResult | null = null;

  constructor(router: ContentRouter, options: RoutingHandlerOptions = {}) {
    super(options);
    this.router = router;
    this.name = options.handlerName ?? 'routing-handler';
    this.eventType = options.eventType ?? EventType.CAPTURE_ALL;
  }

  /**
   * Handle an event by routing it to multiple destinations
   */
  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);

    // Route the event using ContentRouter
    this.lastRoutingResult = await this.router.route(event);

    // If routing failed, throw the errors
    if (!this.lastRoutingResult.success && this.lastRoutingResult.errors) {
      throw new Error(`Routing failed: ${this.lastRoutingResult.errors.join('; ')}`);
    }
  }

  /**
   * Get the last routing result
   */
  getLastRoutingResult(): RoutingResult | null {
    return this.lastRoutingResult;
  }

  /**
   * Get the content router instance
   */
  getRouter(): ContentRouter {
    return this.router;
  }

  /**
   * Reset the router's filename cache
   */
  resetFilenameCache(): void {
    this.router.resetFilenameCache();
  }
}

/**
 * Create a routing handler for capture-all events
 */
export function createCaptureAllRoutingHandler(
  router: ContentRouter,
  options: Omit<RoutingHandlerOptions, 'eventType'> = {}
): RoutingHandler {
  return new RoutingHandler(router, {
    ...options,
    handlerName: options.handlerName ?? 'capture-all-routing',
    eventType: EventType.CAPTURE_ALL,
  });
}

/**
 * Create a routing handler for stop events
 */
export function createStopRoutingHandler(
  router: ContentRouter,
  options: Omit<RoutingHandlerOptions, 'eventType'> = {}
): RoutingHandler {
  return new RoutingHandler(router, {
    ...options,
    handlerName: options.handlerName ?? 'stop-routing',
    eventType: EventType.STOP,
  });
}

/**
 * Create a routing handler for subagent-stop events
 */
export function createSubagentStopRoutingHandler(
  router: ContentRouter,
  options: Omit<RoutingHandlerOptions, 'eventType'> = {}
): RoutingHandler {
  return new RoutingHandler(router, {
    ...options,
    handlerName: options.handlerName ?? 'subagent-stop-routing',
    eventType: EventType.SUBAGENT_STOP,
  });
}

/**
 * Create a routing handler for session-summary events
 */
export function createSessionSummaryRoutingHandler(
  router: ContentRouter,
  options: Omit<RoutingHandlerOptions, 'eventType'> = {}
): RoutingHandler {
  return new RoutingHandler(router, {
    ...options,
    handlerName: options.handlerName ?? 'session-summary-routing',
    eventType: EventType.SESSION_SUMMARY,
  });
}
