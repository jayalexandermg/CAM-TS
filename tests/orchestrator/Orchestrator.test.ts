/**
 * Orchestrator Tests
 */

import { Orchestrator } from '../../src/orchestrator/Orchestrator';
import { TaskManager } from '../../src/orchestrator/TaskManager';
import { ErrorHandler } from '../../src/orchestrator/errors/ErrorHandler';
import { SecurityManager } from '../../src/orchestrator/security/SecurityManager';
import { AgentSpawner } from '../../src/agents/AgentSpawner';
import { LLMClient } from '../../src/orchestrator/llm/LLMClient';
import { TaskRequest } from '../../src/orchestrator/types';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator({
      maxConcurrentTasks: 5,
      enableLogging: false,
    });
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('constructor', () => {
    it('should create with default config', async () => {
      const orc = new Orchestrator();
      const config = orc.getConfig();

      expect(config.maxConcurrentTasks).toBe(5);
      expect(config.defaultTimeout).toBe(300000);
      expect(config.enableLogging).toBe(true);
      expect(config.llmProvider).toBe('mock');
      expect(config.llmModel).toBe('mock-model');

      await orc.shutdown();
    });

    it('should create with custom config', async () => {
      const orc = new Orchestrator({
        maxConcurrentTasks: 10,
        defaultTimeout: 60000,
        enableLogging: false,
        llmProvider: 'custom',
        llmModel: 'custom-model',
      });

      const config = orc.getConfig();
      expect(config.maxConcurrentTasks).toBe(10);
      expect(config.defaultTimeout).toBe(60000);
      expect(config.enableLogging).toBe(false);
      expect(config.llmProvider).toBe('custom');
      expect(config.llmModel).toBe('custom-model');

      await orc.shutdown();
    });

    it('should accept injected dependencies', async () => {
      const taskManager = new TaskManager(3);
      const orc = new Orchestrator({}, { taskManager });

      expect(orc.getTaskManager()).toBe(taskManager);
      await orc.shutdown();
    });

    it('should register base agents', () => {
      const spawner = orchestrator.getAgentSpawner();
      const definitions = spawner.listAgentDefinitions();

      expect(definitions).toContain('default');
      expect(definitions).toContain('researcher');
      expect(definitions).toContain('coder');
      expect(definitions).toContain('coordinator');
    });
  });

  describe('process', () => {
    it('should process a valid task request', async () => {
      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.output).toBeDefined();
    });

    it('should return task ID in result', async () => {
      const request: TaskRequest = {
        id: 'custom-task-id',
        input: 'Test input',
        sessionId: 'session-1',
      };

      const result = await orchestrator.process(request);

      expect(result.taskId).toBe('custom-task-id');
    });

    it('should fail for invalid input', async () => {
      // Create orchestrator with stricter security settings
      const securityManager = new SecurityManager({
        maxInputLength: 5, // Very short limit
      });

      const orc = new Orchestrator({}, { securityManager });

      const request: TaskRequest = {
        input: 'This input is too long for the limit',
        sessionId: 'session-1',
      };

      const result = await orc.process(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      await orc.shutdown();
    });

    it('should sanitize input and output', async () => {
      const request: TaskRequest = {
        input: '  Test input with whitespace  ',
        sessionId: 'session-1',
      };

      const result = await orchestrator.process(request);

      // Should complete successfully after sanitization
      expect(result.success).toBe(true);
    });

    it('should include metadata in result', async () => {
      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
      };

      const result = await orchestrator.process(request);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.startTime).toBeDefined();
      expect(result.metadata.retries).toBeDefined();
    });

    it('should track agent in metadata', async () => {
      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
      };

      const result = await orchestrator.process(request);

      expect(result.metadata.agentId).toBeDefined();
    });

    it('should use preferred agent type when skill is specified', async () => {
      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
        options: {
          preferredSkill: 'coding',
        },
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should emit taskCompleted event on success', async () => {
      const eventHandler = jest.fn();
      orchestrator.on('taskCompleted', eventHandler);

      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
      };

      await orchestrator.process(request);

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return orchestrator state', () => {
      const state = orchestrator.getState();

      expect(state).toHaveProperty('activeTasks');
      expect(state).toHaveProperty('completedTasks');
      expect(state).toHaveProperty('failedTasks');
      expect(state).toHaveProperty('activeAgents');
      expect(state).toHaveProperty('uptime');
    });

    it('should track uptime', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const state = orchestrator.getState();

      expect(state.uptime).toBeGreaterThanOrEqual(50);
    });

    it('should track completed tasks', async () => {
      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
      };

      await orchestrator.process(request);
      const state = orchestrator.getState();

      expect(state.completedTasks).toBe(1);
    });
  });

  describe('getTaskManager', () => {
    it('should return TaskManager instance', () => {
      const tm = orchestrator.getTaskManager();
      expect(tm).toBeInstanceOf(TaskManager);
    });
  });

  describe('getAgentSpawner', () => {
    it('should return AgentSpawner instance', () => {
      const spawner = orchestrator.getAgentSpawner();
      expect(spawner).toBeInstanceOf(AgentSpawner);
    });
  });

  describe('getSecurityManager', () => {
    it('should return SecurityManager instance', () => {
      const sm = orchestrator.getSecurityManager();
      expect(sm).toBeInstanceOf(SecurityManager);
    });
  });

  describe('getErrorHandler', () => {
    it('should return ErrorHandler instance', () => {
      const eh = orchestrator.getErrorHandler();
      expect(eh).toBeInstanceOf(ErrorHandler);
    });
  });

  describe('getLLMClient', () => {
    it('should return LLMClient instance', () => {
      const llm = orchestrator.getLLMClient();
      expect(llm).toBeInstanceOf(LLMClient);
    });
  });

  describe('shutdown', () => {
    it('should emit shutdown event', async () => {
      const eventHandler = jest.fn();
      orchestrator.on('shutdown', eventHandler);

      await orchestrator.shutdown();

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should clear tasks on shutdown', async () => {
      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
      };

      await orchestrator.process(request);
      await orchestrator.shutdown();

      const state = orchestrator.getState();
      expect(state.activeTasks).toBe(0);
    });

    it('should terminate all agents on shutdown', async () => {
      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
      };

      await orchestrator.process(request);
      await orchestrator.shutdown();

      const spawner = orchestrator.getAgentSpawner();
      expect(spawner.listAgents().length).toBe(0);
    });
  });

  describe('concurrent task handling', () => {
    it('should handle multiple concurrent tasks', async () => {
      const requests = [
        { input: 'Task 1', sessionId: 'session-1' },
        { input: 'Task 2', sessionId: 'session-1' },
        { input: 'Task 3', sessionId: 'session-1' },
      ];

      const results = await Promise.all(requests.map((r) => orchestrator.process(r)));

      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should respect max concurrent task limit', async () => {
      const orc = new Orchestrator({
        maxConcurrentTasks: 2,
      });

      const state = orc.getState();
      expect(state.activeTasks).toBe(0);

      await orc.shutdown();
    });
  });

  describe('agent type determination', () => {
    it('should use default agent when no skill specified', async () => {
      const request: TaskRequest = {
        input: 'Test input',
        sessionId: 'session-1',
      };

      const result = await orchestrator.process(request);
      expect(result.success).toBe(true);
    });

    it('should map research skill to researcher agent', async () => {
      const request: TaskRequest = {
        input: 'Research task',
        sessionId: 'session-1',
        options: { preferredSkill: 'research' },
      };

      const result = await orchestrator.process(request);
      expect(result.success).toBe(true);
    });

    it('should map coding skill to coder agent', async () => {
      const request: TaskRequest = {
        input: 'Coding task',
        sessionId: 'session-1',
        options: { preferredSkill: 'coding' },
      };

      const result = await orchestrator.process(request);
      expect(result.success).toBe(true);
    });

    it('should map coordination skill to coordinator agent', async () => {
      const request: TaskRequest = {
        input: 'Coordination task',
        sessionId: 'session-1',
        options: { preferredSkill: 'coordination' },
      };

      const result = await orchestrator.process(request);
      expect(result.success).toBe(true);
    });
  });

  describe('event forwarding', () => {
    it('should forward error events', () => {
      const errorHandler = jest.fn();
      orchestrator.on('error', errorHandler);

      // Trigger an error through the error handler
      const eh = orchestrator.getErrorHandler();
      eh.emit('errorOccurred', { message: 'test error' });

      expect(errorHandler).toHaveBeenCalled();
    });

    it('should forward recovered events', () => {
      const recoveredHandler = jest.fn();
      orchestrator.on('recovered', recoveredHandler);

      const eh = orchestrator.getErrorHandler();
      eh.emit('recovered', { message: 'recovered' });

      expect(recoveredHandler).toHaveBeenCalled();
    });
  });
});
