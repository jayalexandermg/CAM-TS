/**
 * CLI-Orchestrator Integration Tests
 *
 * Tests the integration between CLI components and the Orchestrator
 * through the OrchestratorBridge.
 */

import { OrchestratorBridge } from '../../src/cli/OrchestratorBridge';
import { Session } from '../../src/cli/session/Session';

describe('CLI-Orchestrator Integration', () => {
  let bridge: OrchestratorBridge;
  let session: Session;

  beforeEach(() => {
    bridge = new OrchestratorBridge();
    session = new Session('test-cli-session');
  });

  afterEach(async () => {
    await bridge.shutdown();
  });

  describe('Basic Operations', () => {
    it('should process input through orchestrator', async () => {
      const response = await bridge.processInput('Hello', session);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should add turns to session history', async () => {
      await bridge.processInput('Test message', session);

      const history = session.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle errors gracefully', async () => {
      // Force an error by using invalid input
      const response = await bridge.processInput('<script>malicious</script>', session);

      expect(response).toContain('Error');
    });

    it('should pass session context to orchestrator', async () => {
      session.setPersona('researcher');

      const response = await bridge.processInput('Research AI', session);

      expect(response).toBeDefined();
    });

    it('should track turn count in context', async () => {
      // Add some turns first
      session.addTurn('first', 'first response');
      session.addTurn('second', 'second response');

      expect(session.getTurnCount()).toBe(2);

      // Process another input
      const response = await bridge.processInput('Third message', session);

      expect(response).toBeDefined();
      expect(session.getTurnCount()).toBe(3);
    });
  });

  describe('Session Management', () => {
    it('should preserve session ID across requests', async () => {
      const sessionId = session.getId();

      await bridge.processInput('First request', session);
      await bridge.processInput('Second request', session);

      expect(session.getId()).toBe(sessionId);
    });

    it('should handle session with persona', async () => {
      session.setPersona('coder');

      const response = await bridge.processInput('Write some code', session);

      expect(response).toBeDefined();
      expect(session.getPersona()).toBe('coder');
    });

    it('should update session history on success', async () => {
      const initialCount = session.getHistory().length;

      await bridge.processInput('Success message', session);

      const finalCount = session.getHistory().length;
      expect(finalCount).toBe(initialCount + 1);
    });

    it('should update session history on error', async () => {
      const initialCount = session.getHistory().length;

      await bridge.processInput('<script>error</script>', session);

      const finalCount = session.getHistory().length;
      expect(finalCount).toBe(initialCount + 1);
    });
  });

  describe('Orchestrator Access', () => {
    it('should provide access to underlying orchestrator', () => {
      const orchestrator = bridge.getOrchestrator();

      expect(orchestrator).toBeDefined();
      expect(orchestrator.getState).toBeDefined();
    });

    it('should track orchestrator state through bridge', async () => {
      const orchestrator = bridge.getOrchestrator();
      const initialState = orchestrator.getState();

      await bridge.processInput('Test message', session);

      const finalState = orchestrator.getState();
      expect(finalState.completedTasks).toBeGreaterThan(initialState.completedTasks);
    });
  });

  describe('Error Scenarios', () => {
    it('should return error message for validation failures', async () => {
      const response = await bridge.processInput('<script>xss</script>', session);

      expect(response).toMatch(/Error.*Validation failed/);
    });

    it('should not throw exceptions for invalid input', async () => {
      await expect(
        bridge.processInput('<script>bad</script>', session)
      ).resolves.toBeDefined();
    });

    it('should handle unknown errors gracefully', async () => {
      // Use a specially crafted input that triggers errors
      const response = await bridge.processInput('', session);

      // Empty input should still be handled (even if orchestrator rejects it)
      expect(response).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      await bridge.processInput('Before shutdown', session);

      await expect(bridge.shutdown()).resolves.toBeUndefined();
    });

    it('should allow multiple shutdowns', async () => {
      await bridge.shutdown();
      await expect(bridge.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('Multiple Sessions', () => {
    it('should handle different sessions independently', async () => {
      const session1 = new Session('session-1');
      const session2 = new Session('session-2');

      await bridge.processInput('Message to session 1', session1);
      await bridge.processInput('Message to session 2', session2);

      expect(session1.getHistory().length).toBe(1);
      expect(session2.getHistory().length).toBe(1);
    });

    it('should track metadata separately per session', async () => {
      const session1 = new Session('session-a');
      session1.setPersona('researcher');

      const session2 = new Session('session-b');
      session2.setPersona('coder');

      await bridge.processInput('Research task', session1);
      await bridge.processInput('Coding task', session2);

      expect(session1.getPersona()).toBe('researcher');
      expect(session2.getPersona()).toBe('coder');
    });
  });
});
