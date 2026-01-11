import { SessionManager } from '../../src/session/SessionManager';
import { HookEventEmitter } from '../../src/hooks/event-emitter';
import { EventType, HookEvent, HookHandler } from '../../src/hooks/types';

describe('SessionManager', () => {
  let eventEmitter: HookEventEmitter;
  let sessionManager: SessionManager;
  let capturedEvents: HookEvent[];

  // Test handler to capture emitted events
  class EventCapturingHandler implements HookHandler {
    readonly name = 'event-capturer';
    readonly eventType = EventType.SESSION_START;

    constructor(private events: HookEvent[]) {}

    async handle(event: HookEvent): Promise<void> {
      this.events.push(event);
    }
  }

  beforeEach(() => {
    eventEmitter = new HookEventEmitter({ throwOnErrors: false });
    capturedEvents = [];
    eventEmitter.registerHandler(new EventCapturingHandler(capturedEvents));
    sessionManager = new SessionManager(eventEmitter);
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create SessionManager with event emitter', () => {
      const sm = new SessionManager(eventEmitter);
      expect(sm.getEventEmitter()).toBe(eventEmitter);
    });

    it('should accept custom session ID generator', async () => {
      let counter = 0;
      const customGenerator = () => `custom-${++counter}`;
      const sm = new SessionManager(eventEmitter, { sessionIdGenerator: customGenerator });

      const id1 = await sm.startSession();
      const id2 = await sm.startSession();

      expect(id1).toBe('custom-1');
      expect(id2).toBe('custom-2');
    });

    it('should start with no active session', () => {
      expect(sessionManager.hasActiveSession()).toBe(false);
      expect(sessionManager.getCurrentSessionId()).toBeUndefined();
    });
  });

  // =========================================================================
  // Start Session Tests
  // =========================================================================

  describe('startSession', () => {
    it('should start a new session', async () => {
      const sessionId = await sessionManager.startSession();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should generate unique session IDs', async () => {
      const ids = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const id = await sessionManager.startSession();
        ids.add(id);
      }

      expect(ids.size).toBe(10);
    });

    it('should set current session ID', async () => {
      const sessionId = await sessionManager.startSession();
      expect(sessionManager.getCurrentSessionId()).toBe(sessionId);
    });

    it('should mark session as active', async () => {
      await sessionManager.startSession();
      expect(sessionManager.hasActiveSession()).toBe(true);
    });

    it('should trigger SESSION_START event', async () => {
      await sessionManager.startSession();

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe(EventType.SESSION_START);
    });

    it('should include session ID in event metadata', async () => {
      const sessionId = await sessionManager.startSession();

      expect(capturedEvents[0].metadata.sessionId).toBe(sessionId);
    });

    it('should set resuming to false for new session', async () => {
      await sessionManager.startSession();

      expect(capturedEvents[0].metadata.resuming).toBe(false);
    });

    it('should end existing session before starting new one', async () => {
      const id1 = await sessionManager.startSession();
      const id2 = await sessionManager.startSession();

      expect(id1).not.toBe(id2);
      expect(sessionManager.getCurrentSessionId()).toBe(id2);
      expect(capturedEvents.length).toBe(2);
    });
  });

  // =========================================================================
  // Resume Session Tests
  // =========================================================================

  describe('resumeSession', () => {
    it('should resume an existing session', async () => {
      const originalId = 'original-session-123';
      await sessionManager.resumeSession(originalId);

      expect(sessionManager.getCurrentSessionId()).toBe(originalId);
    });

    it('should trigger SESSION_START event with resuming flag', async () => {
      await sessionManager.resumeSession('session-to-resume');

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].metadata.resuming).toBe(true);
    });

    it('should store previous session ID when resuming', async () => {
      await sessionManager.startSession();
      const originalId = sessionManager.getCurrentSessionId();

      await sessionManager.resumeSession('new-session');

      const state = sessionManager.getCurrentSession();
      expect(state?.previousSessionId).toBe(originalId);
    });

    it('should include previousSessionId in event metadata', async () => {
      const firstId = await sessionManager.startSession();
      await sessionManager.resumeSession('resumed-session');

      expect(capturedEvents[1].metadata.previousSessionId).toBe(firstId);
    });

    it('should mark session as resumed in state', async () => {
      await sessionManager.resumeSession('session-123');

      const state = sessionManager.getCurrentSession();
      expect(state?.resuming).toBe(true);
    });
  });

  // =========================================================================
  // End Session Tests
  // =========================================================================

  describe('endSession', () => {
    it('should end current session', async () => {
      await sessionManager.startSession();
      await sessionManager.endSession();

      expect(sessionManager.hasActiveSession()).toBe(false);
      expect(sessionManager.getCurrentSessionId()).toBeUndefined();
    });

    it('should clear session state', async () => {
      await sessionManager.startSession();
      await sessionManager.endSession();

      expect(sessionManager.getCurrentSession()).toBeNull();
    });

    it('should do nothing if no active session', async () => {
      await expect(sessionManager.endSession()).resolves.not.toThrow();
    });

    it('should allow starting new session after end', async () => {
      await sessionManager.startSession();
      await sessionManager.endSession();
      const newId = await sessionManager.startSession();

      expect(sessionManager.getCurrentSessionId()).toBe(newId);
    });
  });

  // =========================================================================
  // Session State Tests
  // =========================================================================

  describe('getCurrentSession', () => {
    it('should return null when no session', () => {
      expect(sessionManager.getCurrentSession()).toBeNull();
    });

    it('should return session state for new session', async () => {
      const sessionId = await sessionManager.startSession();
      const state = sessionManager.getCurrentSession();

      expect(state).not.toBeNull();
      expect(state?.sessionId).toBe(sessionId);
      expect(state?.resuming).toBe(false);
      expect(state?.startedAt).toBeInstanceOf(Date);
    });

    it('should return session state for resumed session', async () => {
      await sessionManager.resumeSession('resumed-123');
      const state = sessionManager.getCurrentSession();

      expect(state?.sessionId).toBe('resumed-123');
      expect(state?.resuming).toBe(true);
    });

    it('should return copy of session state', async () => {
      await sessionManager.startSession();
      const state1 = sessionManager.getCurrentSession();
      const state2 = sessionManager.getCurrentSession();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getSessionDurationMs', () => {
    it('should return 0 when no session', () => {
      expect(sessionManager.getSessionDurationMs()).toBe(0);
    });

    it('should return positive duration for active session', async () => {
      await sessionManager.startSession();

      // Wait a small amount
      await new Promise((resolve) => setTimeout(resolve, 10));

      const duration = sessionManager.getSessionDurationMs();
      expect(duration).toBeGreaterThan(0);
    });

    it('should increase over time', async () => {
      await sessionManager.startSession();

      const duration1 = sessionManager.getSessionDurationMs();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const duration2 = sessionManager.getSessionDurationMs();

      expect(duration2).toBeGreaterThan(duration1);
    });
  });

  // =========================================================================
  // Event Emitter Tests
  // =========================================================================

  describe('event emission', () => {
    it('should emit events to registered handlers', async () => {
      await sessionManager.startSession();
      expect(capturedEvents.length).toBe(1);
    });

    it('should include timestamp in events', async () => {
      await sessionManager.startSession();

      expect(capturedEvents[0].timestamp).toBeDefined();
      const timestamp = new Date(capturedEvents[0].timestamp);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should include content in events', async () => {
      await sessionManager.startSession();

      expect(capturedEvents[0].content).toContain('Session');
      expect(capturedEvents[0].content).toContain('started');
    });

    it('should indicate resumed in content for resumed sessions', async () => {
      await sessionManager.resumeSession('session-123');

      expect(capturedEvents[0].content).toContain('resumed');
    });

    it('should use emitSafe to not throw on handler errors', async () => {
      // Register a failing handler
      eventEmitter.registerHandler({
        name: 'failing-handler',
        eventType: EventType.SESSION_START,
        handle: async () => {
          throw new Error('Handler failed');
        },
      });

      // Should not throw
      await expect(sessionManager.startSession()).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration', () => {
    it('should handle full session lifecycle', async () => {
      // Start
      const sessionId = await sessionManager.startSession();
      expect(sessionManager.hasActiveSession()).toBe(true);

      // Work for a bit
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(sessionManager.getSessionDurationMs()).toBeGreaterThan(0);

      // End
      await sessionManager.endSession();
      expect(sessionManager.hasActiveSession()).toBe(false);

      // Start new
      const newId = await sessionManager.startSession();
      expect(newId).not.toBe(sessionId);
    });

    it('should handle session resume flow', async () => {
      // Start original
      const originalId = await sessionManager.startSession();

      // End it
      await sessionManager.endSession();

      // Resume
      await sessionManager.resumeSession(originalId);

      const state = sessionManager.getCurrentSession();
      expect(state?.sessionId).toBe(originalId);
      expect(state?.resuming).toBe(true);
    });
  });
});
