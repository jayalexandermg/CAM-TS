/**
 * Infinite Aura - Session Manager
 *
 * Manages session lifecycle and triggers session hooks.
 * Coordinates with HookEventEmitter to fire session start/end events.
 */

import * as crypto from 'crypto';
import { HookEventEmitter } from '../hooks/event-emitter';
import { EventType, SessionStartEvent, SessionStartMetadata } from '../hooks/types';

/**
 * Options for SessionManager
 */
export interface SessionManagerOptions {
  /** Custom session ID generator */
  sessionIdGenerator?: () => string;
}

/**
 * Session state information
 */
export interface SessionState {
  /** Current session ID */
  sessionId: string;
  /** When the session started */
  startedAt: Date;
  /** Whether this is a resumed session */
  resuming: boolean;
  /** Previous session ID if resuming */
  previousSessionId?: string;
}

/**
 * Manages session lifecycle
 *
 * The SessionManager:
 * - Starts new sessions and generates session IDs
 * - Resumes existing sessions
 * - Triggers SESSION_START events via HookEventEmitter
 * - Tracks the current session state
 * - Ends sessions cleanly
 */
export class SessionManager {
  private readonly eventEmitter: HookEventEmitter;
  private readonly sessionIdGenerator: () => string;
  private currentSession: SessionState | null = null;

  /**
   * Create a new SessionManager
   * @param eventEmitter - HookEventEmitter for triggering events
   * @param options - Configuration options
   */
  constructor(eventEmitter: HookEventEmitter, options: SessionManagerOptions = {}) {
    this.eventEmitter = eventEmitter;
    this.sessionIdGenerator = options.sessionIdGenerator ?? this.defaultSessionIdGenerator;
  }

  /**
   * Start a new session
   * @returns The new session ID
   */
  async startSession(): Promise<string> {
    // End any existing session
    if (this.currentSession) {
      await this.endSession();
    }

    // Generate new session ID
    const sessionId = this.sessionIdGenerator();

    // Create session state
    this.currentSession = {
      sessionId,
      startedAt: new Date(),
      resuming: false,
    };

    // Trigger session start event
    await this.triggerSessionStart(sessionId, false);

    return sessionId;
  }

  /**
   * Resume an existing session
   * @param sessionId - Session ID to resume
   */
  async resumeSession(sessionId: string): Promise<void> {
    // Store previous session ID if there was one
    const previousSessionId = this.currentSession?.sessionId;

    // Create session state for resumed session
    this.currentSession = {
      sessionId,
      startedAt: new Date(),
      resuming: true,
      previousSessionId,
    };

    // Trigger session start event with resuming flag
    await this.triggerSessionStart(sessionId, true, previousSessionId);
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    // Could trigger SESSION_END event here if needed
    // For now, just clear the session state
    this.currentSession = null;
  }

  /**
   * Get the current session ID
   * @returns Current session ID or undefined if no active session
   */
  getCurrentSessionId(): string | undefined {
    return this.currentSession?.sessionId;
  }

  /**
   * Get the current session state
   * @returns Current session state or null if no active session
   */
  getCurrentSession(): SessionState | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Check if there is an active session
   * @returns true if there is an active session
   */
  hasActiveSession(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Get the session duration in milliseconds
   * @returns Duration in ms or 0 if no active session
   */
  getSessionDurationMs(): number {
    if (!this.currentSession) {
      return 0;
    }
    return Date.now() - this.currentSession.startedAt.getTime();
  }

  /**
   * Trigger session start event
   * @param sessionId - Session ID
   * @param resuming - Whether this is resuming an existing session
   * @param previousSessionId - Previous session ID if resuming
   */
  private async triggerSessionStart(
    sessionId: string,
    resuming: boolean,
    previousSessionId?: string
  ): Promise<void> {
    const metadata: SessionStartMetadata = {
      sessionId,
      resuming,
    };

    if (previousSessionId) {
      metadata.previousSessionId = previousSessionId;
    }

    const event: SessionStartEvent = {
      timestamp: new Date().toISOString(),
      type: EventType.SESSION_START,
      content: `Session ${resuming ? 'resumed' : 'started'}: ${sessionId}`,
      metadata,
    };

    // Emit event to all registered handlers
    await this.eventEmitter.emitSafe(event);
  }

  /**
   * Default session ID generator
   * @returns Unique session ID
   */
  private defaultSessionIdGenerator(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `session-${timestamp}-${random}`;
  }

  /**
   * Get the event emitter
   * @returns HookEventEmitter instance
   */
  getEventEmitter(): HookEventEmitter {
    return this.eventEmitter;
  }
}
