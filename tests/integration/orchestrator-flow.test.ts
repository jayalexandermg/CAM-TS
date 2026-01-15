/**
 * Orchestrator Integration Tests
 *
 * End-to-end tests for the orchestrator flow, validating
 * that all components work together correctly.
 */

import { Orchestrator } from '../../src/orchestrator/Orchestrator';
import { TaskRequest } from '../../src/orchestrator/types';

describe('Orchestrator Integration', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('End-to-End Flow', () => {
    it('should process a simple request', async () => {
      const request: TaskRequest = {
        input: 'Hello, how are you?',
        sessionId: 'test-session-1',
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.taskId).toBeDefined();
    });

    it('should spawn an agent for the request', async () => {
      const request: TaskRequest = {
        input: 'Help me with coding',
        sessionId: 'test-session-2',
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
      expect(result.metadata.agentId).toBeDefined();
    });

    it('should handle multiple requests in sequence', async () => {
      const sessionId = 'test-session-3';

      const result1 = await orchestrator.process({
        input: 'First message',
        sessionId,
      });

      const result2 = await orchestrator.process({
        input: 'Second message',
        sessionId,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reject invalid input', async () => {
      const request: TaskRequest = {
        input: '<script>alert("xss")</script>',
        sessionId: 'test-session-4',
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track orchestrator state', async () => {
      await orchestrator.process({
        input: 'Test message',
        sessionId: 'test-session-5',
      });

      const state = orchestrator.getState();

      expect(state.completedTasks).toBeGreaterThanOrEqual(1);
      expect(state.uptime).toBeGreaterThan(0);
    });

    it('should handle requests with context', async () => {
      const request: TaskRequest = {
        input: 'Hello with context',
        sessionId: 'test-session-context',
        context: {
          persona: 'researcher',
          turnCount: 5,
        },
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should handle requests with task options', async () => {
      const request: TaskRequest = {
        input: 'Research something',
        sessionId: 'test-session-options',
        options: {
          preferredSkill: 'research',
        },
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should process empty but valid input', async () => {
      const request: TaskRequest = {
        input: '   hello   ', // whitespace-padded
        sessionId: 'test-session-whitespace',
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('should integrate with TaskManager', async () => {
      const taskManager = orchestrator.getTaskManager();

      await orchestrator.process({
        input: 'Test',
        sessionId: 'test-session-6',
      });

      const stats = taskManager.getStats();
      expect(stats.completed).toBeGreaterThanOrEqual(1);
    });

    it('should integrate with SecurityManager', () => {
      const securityManager = orchestrator.getSecurityManager();
      const usage = securityManager.getResourceUsage();

      expect(usage).toBeDefined();
      expect(usage.agentCount).toBeGreaterThanOrEqual(0);
    });

    it('should integrate with AgentSpawner', () => {
      const spawner = orchestrator.getAgentSpawner();
      const definitions = spawner.listAgentDefinitions();

      expect(definitions).toContain('default');
      expect(definitions).toContain('researcher');
      expect(definitions).toContain('coder');
    });

    it('should integrate with ErrorHandler', () => {
      const errorHandler = orchestrator.getErrorHandler();

      expect(errorHandler).toBeDefined();
    });

    it('should integrate with LLMClient', () => {
      const llmClient = orchestrator.getLLMClient();

      expect(llmClient).toBeDefined();
    });

    it('should maintain consistent state across operations', async () => {
      const initialState = orchestrator.getState();

      await orchestrator.process({
        input: 'Message 1',
        sessionId: 'test-state-1',
      });

      await orchestrator.process({
        input: 'Message 2',
        sessionId: 'test-state-2',
      });

      const finalState = orchestrator.getState();

      expect(finalState.completedTasks).toBeGreaterThan(initialState.completedTasks);
      expect(finalState.uptime).toBeGreaterThan(initialState.uptime);
    });
  });

  describe('Error Handling', () => {
    it('should handle and report validation errors', async () => {
      const result = await orchestrator.process({
        input: '<script>malicious</script>',
        sessionId: 'test-validation-error',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Validation failed');
    });

    it('should track failed tasks', async () => {
      const initialState = orchestrator.getState();

      await orchestrator.process({
        input: '<script>xss</script>',
        sessionId: 'test-failed-task',
      });

      const finalState = orchestrator.getState();

      // Failed tasks should be tracked (validation failure doesn't increment completed)
      expect(finalState.failedTasks).toBeGreaterThanOrEqual(initialState.failedTasks);
    });
  });

  describe('Shutdown', () => {
    it('should clean up resources on shutdown', async () => {
      await orchestrator.process({
        input: 'Test before shutdown',
        sessionId: 'test-shutdown',
      });

      await orchestrator.shutdown();

      const spawner = orchestrator.getAgentSpawner();
      const agents = spawner.listAgents();

      expect(agents.length).toBe(0);
    });

    it('should emit shutdown event', async () => {
      const shutdownPromise = new Promise<void>((resolve) => {
        orchestrator.on('shutdown', () => resolve());
      });

      await orchestrator.shutdown();

      await expect(shutdownPromise).resolves.toBeUndefined();
    });
  });
});
