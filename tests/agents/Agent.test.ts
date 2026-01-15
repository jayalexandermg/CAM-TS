import { Agent } from '../../src/agents/Agent';
import { AgentConfig, AgentDefinition, AgentResult } from '../../src/agents/types';

describe('Agent', () => {
  const testDefinition: AgentDefinition = {
    name: 'test-agent',
    description: 'A test agent',
    expertise: ['testing'],
    personality: ['helpful'],
    communicationStyle: 'direct',
    approach: 'systematic',
    availableSkills: ['test'],
  };

  const createConfig = (overrides?: Partial<AgentConfig>): AgentConfig => ({
    definition: testDefinition,
    sessionId: 'session-123',
    ...overrides,
  });

  describe('constructor', () => {
    it('should create an agent with generated id', () => {
      const agent = new Agent(createConfig());
      expect(agent.getId()).toMatch(/^agent_\d+_[a-z0-9]+$/);
    });

    it('should create an agent with custom id', () => {
      const agent = new Agent(createConfig({ id: 'custom-id' }));
      expect(agent.getId()).toBe('custom-id');
    });

    it('should initialize with idle status', () => {
      const agent = new Agent(createConfig());
      expect(agent.getStatus()).toBe('idle');
    });

    it('should set default maxRetries to 3', () => {
      const agent = new Agent(createConfig());
      expect(agent.getState().maxRetries).toBe(3);
    });

    it('should use custom maxRetries when provided', () => {
      const agent = new Agent(createConfig({ maxRetries: 5 }));
      expect(agent.getState().maxRetries).toBe(5);
    });

    it('should store parent agent id', () => {
      const agent = new Agent(createConfig({ parentAgentId: 'parent-123' }));
      expect(agent.getParentAgentId()).toBe('parent-123');
    });
  });

  describe('getState', () => {
    it('should return a copy of state', () => {
      const agent = new Agent(createConfig());
      const state1 = agent.getState();
      const state2 = agent.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it('should include all required fields', () => {
      const agent = new Agent(createConfig({ id: 'test-id' }));
      const state = agent.getState();
      expect(state).toMatchObject({
        id: 'test-id',
        status: 'idle',
        sessionId: 'session-123',
        retryCount: 0,
        maxRetries: 3,
      });
      expect(state.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getDefinition', () => {
    it('should return a copy of definition', () => {
      const agent = new Agent(createConfig());
      const def1 = agent.getDefinition();
      const def2 = agent.getDefinition();
      expect(def1).not.toBe(def2);
      expect(def1).toEqual(testDefinition);
    });
  });

  describe('start', () => {
    it('should transition from idle to active', async () => {
      const agent = new Agent(createConfig());
      await agent.start('test task');
      expect(agent.getStatus()).toBe('active');
    });

    it('should set startedAt timestamp', async () => {
      const agent = new Agent(createConfig());
      await agent.start('test task');
      expect(agent.getState().startedAt).toBeInstanceOf(Date);
    });

    it('should set currentTask', async () => {
      const agent = new Agent(createConfig());
      await agent.start('test task');
      expect(agent.getState().currentTask).toBe('test task');
    });

    it('should emit started event', async () => {
      const agent = new Agent(createConfig());
      const listener = jest.fn();
      agent.on('started', listener);
      await agent.start('test task');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: agent.getId(),
          task: 'test task',
        })
      );
    });

    it('should throw if not idle', async () => {
      const agent = new Agent(createConfig());
      await agent.start('task');
      await expect(agent.start('another task')).rejects.toThrow('is not idle');
    });
  });

  describe('execute', () => {
    it('should start the agent and complete with result', async () => {
      const agent = new Agent(createConfig());
      const result = await agent.execute('test task');
      expect(result.success).toBe(true);
      expect(agent.getStatus()).toBe('completed');
    });

    it('should include metadata in result', async () => {
      const agent = new Agent(createConfig());
      const result = await agent.execute('test task');
      expect(result.metadata).toMatchObject({
        duration: 0,
        retries: 0,
        skillsUsed: [],
      });
    });
  });

  describe('complete', () => {
    it('should transition from active to completed', async () => {
      const agent = new Agent(createConfig());
      await agent.start('task');
      const result: AgentResult = { success: true };
      await agent.complete(result);
      expect(agent.getStatus()).toBe('completed');
    });

    it('should set completedAt timestamp', async () => {
      const agent = new Agent(createConfig());
      await agent.start('task');
      await agent.complete({ success: true });
      expect(agent.getState().completedAt).toBeInstanceOf(Date);
    });

    it('should store result in state', async () => {
      const agent = new Agent(createConfig());
      await agent.start('task');
      const result: AgentResult = { success: true, data: { foo: 'bar' } };
      await agent.complete(result);
      expect(agent.getState().result).toEqual(result);
    });

    it('should emit completed event', async () => {
      const agent = new Agent(createConfig());
      const listener = jest.fn();
      agent.on('completed', listener);
      await agent.start('task');
      await agent.complete({ success: true });
      expect(listener).toHaveBeenCalled();
    });

    it('should throw if not active or waiting', async () => {
      const agent = new Agent(createConfig());
      await expect(agent.complete({ success: true })).rejects.toThrow(
        'is not active'
      );
    });

    it('should allow completion from waiting status', async () => {
      const agent = new Agent(createConfig());
      await agent.start('task');
      agent.setStatus('waiting');
      await agent.complete({ success: true });
      expect(agent.getStatus()).toBe('completed');
    });
  });

  describe('fail', () => {
    it('should transition to failed status', async () => {
      const agent = new Agent(createConfig());
      await agent.fail(new Error('test error'));
      expect(agent.getStatus()).toBe('failed');
    });

    it('should set failedAt timestamp', async () => {
      const agent = new Agent(createConfig());
      await agent.fail(new Error('test error'));
      expect(agent.getState().failedAt).toBeInstanceOf(Date);
    });

    it('should store error in state', async () => {
      const agent = new Agent(createConfig());
      const error = new Error('test error');
      await agent.fail(error);
      expect(agent.getState().error).toBe(error);
    });

    it('should emit failed event', async () => {
      const agent = new Agent(createConfig());
      const listener = jest.fn();
      agent.on('failed', listener);
      await agent.fail(new Error('test'));
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('should increment retry count', async () => {
      const agent = new Agent(createConfig());
      await agent.fail(new Error('test'));
      await agent.retry();
      expect(agent.getState().retryCount).toBe(1);
    });

    it('should reset status to idle', async () => {
      const agent = new Agent(createConfig());
      await agent.fail(new Error('test'));
      await agent.retry();
      expect(agent.getStatus()).toBe('idle');
    });

    it('should clear error', async () => {
      const agent = new Agent(createConfig());
      await agent.fail(new Error('test'));
      await agent.retry();
      expect(agent.getState().error).toBeUndefined();
    });

    it('should emit retry event', async () => {
      const agent = new Agent(createConfig());
      const listener = jest.fn();
      agent.on('retry', listener);
      await agent.fail(new Error('test'));
      await agent.retry();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ retryCount: 1 })
      );
    });

    it('should throw when max retries exceeded', async () => {
      const agent = new Agent(createConfig({ maxRetries: 1 }));
      await agent.fail(new Error('test'));
      await agent.retry();
      await agent.fail(new Error('test'));
      await expect(agent.retry()).rejects.toThrow('exceeded max retries');
    });
  });

  describe('setStatus', () => {
    it('should change status', () => {
      const agent = new Agent(createConfig());
      agent.setStatus('active');
      expect(agent.getStatus()).toBe('active');
    });

    it('should emit statusChanged event', () => {
      const agent = new Agent(createConfig());
      const listener = jest.fn();
      agent.on('statusChanged', listener);
      agent.setStatus('active');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          oldStatus: 'idle',
          newStatus: 'active',
        })
      );
    });
  });

  describe('canRetry', () => {
    it('should return true when retries available', () => {
      const agent = new Agent(createConfig({ maxRetries: 3 }));
      expect(agent.canRetry()).toBe(true);
    });

    it('should return false when max retries reached', async () => {
      const agent = new Agent(createConfig({ maxRetries: 1 }));
      await agent.fail(new Error('test'));
      await agent.retry();
      expect(agent.canRetry()).toBe(false);
    });
  });

  describe('getDuration', () => {
    it('should return undefined if not started', () => {
      const agent = new Agent(createConfig());
      expect(agent.getDuration()).toBeUndefined();
    });

    it('should return duration after completion', async () => {
      const agent = new Agent(createConfig());
      await agent.start('task');
      await new Promise((r) => setTimeout(r, 10));
      await agent.complete({ success: true });
      const duration = agent.getDuration();
      expect(duration).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should return duration after failure', async () => {
      const agent = new Agent(createConfig());
      await agent.start('task');
      await new Promise((r) => setTimeout(r, 10));
      await agent.fail(new Error('test'));
      const duration = agent.getDuration();
      expect(duration).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(10);
    });
  });
});
