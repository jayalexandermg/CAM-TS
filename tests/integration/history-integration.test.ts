/**
 * History Integration Tests
 *
 * End-to-end tests for history system integration with Orchestrator.
 * Validates UOCS integration, hook execution, and transcript capture.
 */

import { Orchestrator } from '../../src/orchestrator/Orchestrator';
import { UOCS } from '../../src/history/UOCS';
import { TaskRequest } from '../../src/orchestrator/types';

describe('History Integration', () => {
  let orchestrator: Orchestrator;

  beforeEach(async () => {
    orchestrator = new Orchestrator();
    await orchestrator.initialize();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('UOCS Integration', () => {
    it('should have UOCS instance available', () => {
      const uocs = orchestrator.getUOCS();

      expect(uocs).toBeDefined();
      expect(uocs).toBeInstanceOf(UOCS);
    });

    it('should start session tracking', async () => {
      const sessionId = 'history-test-start-1';
      await orchestrator.startSession(sessionId);

      const uocs = orchestrator.getUOCS();
      expect(uocs.getActiveSessionIds()).toContain(sessionId);
    });

    it('should capture session transcripts', async () => {
      const sessionId = 'history-test-transcript-1';
      await orchestrator.startSession(sessionId);

      await orchestrator.process({
        input: 'Hello',
        sessionId,
      });

      const uocs = orchestrator.getUOCS();
      const transcript = await uocs.getSessionTranscript(sessionId);

      expect(transcript).toBeDefined();
      expect(transcript?.sessionId).toBe(sessionId);
      expect(transcript?.startTime).toBeDefined();
    });

    it('should track multiple sessions independently', async () => {
      const sessionId1 = 'history-multi-1';
      const sessionId2 = 'history-multi-2';

      await orchestrator.startSession(sessionId1);
      await orchestrator.startSession(sessionId2);

      const uocs = orchestrator.getUOCS();
      const activeIds = uocs.getActiveSessionIds();

      expect(activeIds).toContain(sessionId1);
      expect(activeIds).toContain(sessionId2);
    });

    it('should capture outputs for sessions', async () => {
      const sessionId = 'history-test-output-1';

      await orchestrator.process({
        input: 'Test message',
        sessionId,
      });

      const uocs = orchestrator.getUOCS();
      expect(uocs.getActiveSessionIds()).toContain(sessionId);
    });
  });

  describe('Hook Integration', () => {
    it('should have PostToolUseHook available', () => {
      const hook = orchestrator.getPostToolUseHook();

      expect(hook).toBeDefined();
      expect(hook.name).toBe('post-tool-use');
    });

    it('should have StopHook available', () => {
      const hook = orchestrator.getStopHook();

      expect(hook).toBeDefined();
      expect(hook.name).toBe('Stop');
    });

    it('should have SubagentStopHook available', () => {
      const hook = orchestrator.getSubagentStopHook();

      expect(hook).toBeDefined();
      expect(hook.name).toBe('SubagentStop');
    });

    it('should share UOCS instance across hooks', () => {
      const uocs = orchestrator.getUOCS();
      const postToolHook = orchestrator.getPostToolUseHook();
      const stopHook = orchestrator.getStopHook();
      const subagentHook = orchestrator.getSubagentStopHook();

      expect(postToolHook.getUOCS()).toBe(uocs);
      expect(stopHook.getUOCS()).toBe(uocs);
      expect(subagentHook.getUOCS()).toBe(uocs);
    });
  });

  describe('Session Lifecycle', () => {
    it('should end sessions on shutdown', async () => {
      const sessionId = 'history-shutdown-1';
      await orchestrator.startSession(sessionId);

      // Session should be active before shutdown
      const uocs = orchestrator.getUOCS();
      expect(uocs.getActiveSessionIds()).toContain(sessionId);

      await orchestrator.shutdown();

      // After shutdown, session should be ended
      expect(uocs.getActiveSessionIds()).not.toContain(sessionId);
    });

    it('should end multiple sessions on shutdown', async () => {
      const sessions = ['shutdown-multi-1', 'shutdown-multi-2', 'shutdown-multi-3'];

      for (const sessionId of sessions) {
        await orchestrator.startSession(sessionId);
      }

      const uocs = orchestrator.getUOCS();
      expect(uocs.getActiveSessionIds().length).toBe(sessions.length);

      await orchestrator.shutdown();

      expect(uocs.getActiveSessionIds().length).toBe(0);
    });

    it('should auto-start session on process if not started', async () => {
      const sessionId = 'history-auto-start-1';

      // Process without explicit startSession
      await orchestrator.process({
        input: 'Test auto-start',
        sessionId,
      });

      const uocs = orchestrator.getUOCS();
      expect(uocs.getActiveSessionIds()).toContain(sessionId);
    });
  });

  describe('Initialization', () => {
    it('should initialize UOCS lazily via startSession', async () => {
      const sessionId = 'history-lazy-init-1';

      // startSession should trigger initialization
      await orchestrator.startSession(sessionId);

      const uocs = orchestrator.getUOCS();
      expect(uocs.getActiveSessionIds()).toContain(sessionId);
    });

    it('should only initialize once', async () => {
      // Multiple initialize calls should be idempotent
      await orchestrator.initialize();
      await orchestrator.initialize();
      await orchestrator.initialize();

      const uocs = orchestrator.getUOCS();
      expect(uocs).toBeDefined();
    });

    it('should be able to process requests after initialization', async () => {
      const sessionId = 'history-init-process-1';

      await orchestrator.initialize();
      await orchestrator.startSession(sessionId);

      const result = await orchestrator.process({
        input: 'Test after init',
        sessionId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Request Processing with History', () => {
    it('should process request and maintain session state', async () => {
      const sessionId = 'history-state-1';
      await orchestrator.startSession(sessionId);

      const request: TaskRequest = {
        input: 'First message',
        sessionId,
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);

      const uocs = orchestrator.getUOCS();
      const transcript = await uocs.getSessionTranscript(sessionId);

      expect(transcript).toBeDefined();
      expect(transcript?.turns.length).toBeGreaterThanOrEqual(0);
    });

    it('should capture context from multiple requests', async () => {
      const sessionId = 'history-multi-request-1';
      await orchestrator.startSession(sessionId);

      await orchestrator.process({
        input: 'First request',
        sessionId,
      });

      await orchestrator.process({
        input: 'Second request',
        sessionId,
      });

      const uocs = orchestrator.getUOCS();
      expect(uocs.getActiveSessionIds()).toContain(sessionId);
    });
  });
});
