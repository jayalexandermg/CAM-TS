/**
 * Infinite Aura - SessionStart Hook
 *
 * Hook that fires on every session start, loads CORE context proactively,
 * and injects it into the system prompt BEFORE the AI responds.
 *
 * Supports two modes:
 * 1. Legacy mode: Uses CoreManager + PrepromptInjector directly
 * 2. Hydrator mode: Uses PrepromptHydrator for two-layer hydration
 */

import { CoreManager, CoreContext } from '../memory/core';
import { PrepromptInjector } from '../context/PrepromptInjector';
import { PrepromptHydrator } from '../context/PrepromptHydrator';
import { BaseHookHandler, BaseHookHandlerOptions } from './hook-handler';
import { HookEvent, EventType, SessionStartEvent, HookResult } from './types';

/**
 * Options for SessionStartHook
 */
export interface SessionStartHookOptions extends BaseHookHandlerOptions {
  /** Whether to output confirmation to console */
  outputConfirmation?: boolean;
  /** Custom output function (default: console.log) */
  outputFn?: (message: string) => void;
  /** Priority for the CORE context layer in preprompt (legacy mode only) */
  corePriority?: number;
  /** Layer name for CORE context (legacy mode only) */
  coreLayerName?: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<Omit<SessionStartHookOptions, keyof BaseHookHandlerOptions>> = {
  outputConfirmation: true,
  outputFn: console.log,
  corePriority: 0,
  coreLayerName: 'core',
};

/**
 * Hook that fires on session start to load CORE context
 *
 * This hook:
 * - Fires on SESSION_START events
 * - Loads CORE context (USER.md, PREFERENCES.md, ACTIVE_PROJECTS.md)
 * - Injects context into the system prompt via PrepromptInjector
 * - Outputs confirmation to user
 *
 * Supports two modes:
 * 1. Legacy mode (coreManager + prepromptInjector): Direct context loading
 * 2. Hydrator mode (with PrepromptHydrator): Two-layer hydration
 *
 * The context is loaded PROACTIVELY, before the AI makes any decisions,
 * ensuring the AI knows who the user is from the start.
 */
export class SessionStartHook extends BaseHookHandler {
  readonly name = 'session-start';
  readonly eventType = EventType.SESSION_START;

  private readonly coreManager: CoreManager;
  private readonly prepromptInjector: PrepromptInjector;
  private readonly hydrator: PrepromptHydrator | null;
  private readonly outputConfirmation: boolean;
  private readonly outputFn: (message: string) => void;
  private readonly corePriority: number;
  private readonly coreLayerName: string;

  /** Last loaded context (for inspection/testing) */
  private lastLoadedContext: CoreContext | null = null;
  /** Last session ID processed */
  private lastSessionId: string | null = null;

  /**
   * Create a new SessionStartHook
   * @param coreManager - CoreManager for loading CORE context
   * @param prepromptInjector - PrepromptInjector for system prompt injection
   * @param options - Configuration options
   * @param hydrator - Optional PrepromptHydrator for two-layer hydration mode
   */
  constructor(
    coreManager: CoreManager,
    prepromptInjector: PrepromptInjector,
    options: SessionStartHookOptions = {},
    hydrator?: PrepromptHydrator
  ) {
    super(options);
    this.coreManager = coreManager;
    this.prepromptInjector = prepromptInjector;
    this.hydrator = hydrator ?? null;
    this.outputConfirmation = options.outputConfirmation ?? DEFAULT_OPTIONS.outputConfirmation;
    this.outputFn = options.outputFn ?? DEFAULT_OPTIONS.outputFn;
    this.corePriority = options.corePriority ?? DEFAULT_OPTIONS.corePriority;
    this.coreLayerName = options.coreLayerName ?? DEFAULT_OPTIONS.coreLayerName;
  }

  /**
   * Handle a session start event
   * @param event - The session start event
   */
  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);
    await this.execute(event as SessionStartEvent);
  }

  /**
   * Execute the hook on session start
   * @param event - The session start event
   * @returns Hook execution result with enforcement action
   */
  async execute(event: SessionStartEvent): Promise<HookResult> {
    try {
      // Store session ID
      this.lastSessionId = event.metadata.sessionId ?? null;

      // Use hydrator mode if available, otherwise legacy mode
      if (this.hydrator) {
        return await this.executeWithHydrator(event);
      } else {
        return await this.executeLegacy(event);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log error but don't block session start - allow with error metadata
      if (this.outputConfirmation) {
        this.outputFn(`[SessionStart] Warning: Failed to load CORE context: ${err.message}`);
      }

      // Use enforcement pattern - allow session to continue even on error
      // Session start should never block, just log the error
      return {
        ...this.allow({
          contextLoaded: false,
          error: err.message,
        }),
        // Maintain backward compatibility
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Execute using PrepromptHydrator (Layer 1 hydration)
   * @param event - Session start event
   * @returns Hook result
   */
  private async executeWithHydrator(event: SessionStartEvent): Promise<HookResult> {
    // Load Layer 1 via hydrator
    await this.hydrator!.loadLayer1();

    // Also load context for confirmation output
    const context = await this.loadCoreContext();

    // Output confirmation
    if (this.outputConfirmation) {
      this.outputSessionConfirmation(context, event);
    }

    // Use the enforcement pattern - allow session to proceed
    return {
      ...this.allow({
        contextLoaded: true,
        sessionId: event.metadata.sessionId,
        layer1Loaded: true,
      }),
      // Maintain backward compatibility with data field
      data: {
        sessionId: event.metadata.sessionId,
        loadedLayers: ['USER', 'PREFERENCES', 'ACTIVE_PROJECTS'],
        resuming: event.metadata.resuming ?? false,
        useHydrator: true,
      },
    };
  }

  /**
   * Execute using legacy mode (direct CoreManager + PrepromptInjector)
   * @param event - Session start event
   * @returns Hook result
   */
  private async executeLegacy(event: SessionStartEvent): Promise<HookResult> {
    // Load CORE context
    const context = await this.loadCoreContext();

    // Format and inject into preprompt
    const formattedContext = this.formatContextForPreprompt(context);
    this.prepromptInjector.injectContext(this.coreLayerName, formattedContext, this.corePriority);

    // Output confirmation
    if (this.outputConfirmation) {
      this.outputSessionConfirmation(context, event);
    }

    // Use the enforcement pattern - allow session to proceed
    return {
      ...this.allow({
        contextLoaded: true,
        sessionId: event.metadata.sessionId,
      }),
      // Maintain backward compatibility with data field
      data: {
        sessionId: event.metadata.sessionId,
        loadedLayers: ['USER', 'PREFERENCES', 'ACTIVE_PROJECTS'],
        resuming: event.metadata.resuming ?? false,
      },
    };
  }

  /**
   * Load CORE context from CoreManager
   * @returns CoreContext with all CORE files
   */
  private async loadCoreContext(): Promise<CoreContext> {
    // Check if CORE is valid, initialize if needed
    const isValid = await this.coreManager.validateCore();
    if (!isValid) {
      await this.coreManager.initialize();
    }

    // Load context
    const context = await this.coreManager.loadCore();
    this.lastLoadedContext = context;
    return context;
  }

  /**
   * Format CORE context for preprompt injection
   * @param context - CoreContext to format
   * @returns Formatted context string
   */
  private formatContextForPreprompt(context: CoreContext): string {
    const sections: string[] = [];

    // Add user identity section
    if (context.user && context.user.trim()) {
      sections.push(`## User Identity\n${context.user}`);
    }

    // Add preferences section
    if (context.preferences && context.preferences.trim()) {
      sections.push(`## User Preferences\n${context.preferences}`);
    }

    // Add active projects section
    if (context.activeProjects && context.activeProjects.trim()) {
      sections.push(`## Active Projects\n${context.activeProjects}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Output confirmation to user
   * @param context - Loaded context
   * @param event - Session start event
   */
  private outputSessionConfirmation(context: CoreContext, event: SessionStartEvent): void {
    const loadedItems: string[] = [];

    if (context.user && context.user.trim()) {
      loadedItems.push('USER');
    }
    if (context.preferences && context.preferences.trim()) {
      loadedItems.push('PREFERENCES');
    }
    if (context.activeProjects && context.activeProjects.trim()) {
      loadedItems.push('ACTIVE_PROJECTS');
    }

    const resuming = event.metadata.resuming ? ' (resuming)' : '';
    const message = `[SessionStart] Loaded: ${loadedItems.join(', ')}${resuming}`;
    this.outputFn(message);
  }

  /**
   * Get the last loaded context (for testing/inspection)
   * @returns Last loaded CoreContext or null
   */
  getLastLoadedContext(): CoreContext | null {
    return this.lastLoadedContext;
  }

  /**
   * Get the last processed session ID
   * @returns Last session ID or null
   */
  getLastSessionId(): string | null {
    return this.lastSessionId;
  }

  /**
   * Get the CoreManager
   * @returns CoreManager instance
   */
  getCoreManager(): CoreManager {
    return this.coreManager;
  }

  /**
   * Get the PrepromptInjector
   * @returns PrepromptInjector instance
   */
  getPrepromptInjector(): PrepromptInjector {
    return this.prepromptInjector;
  }

  /**
   * Check if confirmation output is enabled
   * @returns true if confirmation output is enabled
   */
  isOutputConfirmationEnabled(): boolean {
    return this.outputConfirmation;
  }

  /**
   * Get the PrepromptHydrator (if using hydrator mode)
   * @returns PrepromptHydrator instance or null
   */
  getHydrator(): PrepromptHydrator | null {
    return this.hydrator;
  }

  /**
   * Check if using hydrator mode
   * @returns true if hydrator is configured
   */
  isUsingHydrator(): boolean {
    return this.hydrator !== null;
  }
}
