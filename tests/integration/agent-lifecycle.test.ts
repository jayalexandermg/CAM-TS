/**
 * Agent Lifecycle Integration Tests
 *
 * End-to-end tests for agent lifecycle management including:
 * - Agent creation and initialization
 * - State transitions (idle → active → completed/failed)
 * - Event emissions during lifecycle
 * - Retry mechanisms
 * - Parent-child relationships
 */

import { Agent } from '../../src/agents/Agent';
import { AgentSpawner } from '../../src/agents/AgentSpawner';
import { AgentDefinition, AgentConfig } from '../../src/agents/types';

describe('Agent Lifecycle Integration', () => {
  let spawner: AgentSpawner;

  // Test fixtures
  const defaultDefinition: AgentDefinition = {
    name: 'default',
    description: 'Default test agent',
    expertise: ['general'],
    personality: ['helpful', 'friendly'],
    communicationStyle: 'conversational',
    approach: 'balanced',
    availableSkills: ['general'],
  };

  const researcherDefinition: AgentDefinition = {
    name: 'researcher',
    description: 'Research-focused agent',
    expertise: ['research', 'analysis'],
    personality: ['thorough', 'analytical'],
    communicationStyle: 'detailed',
    approach: 'methodical',
    availableSkills: ['research', 'analysis'],
  };

  const coderDefinition: AgentDefinition = {
    name: 'coder',
    description: 'Coding-focused agent',
    expertise: ['coding', 'debugging'],
    personality: ['precise', 'efficient'],
    communicationStyle: 'technical',
    approach: 'systematic',
    availableSkills: ['coding', 'debugging'],
  };

  beforeEach(() => {
    spawner = new AgentSpawner();
    spawner.registerAgentDefinition('default', defaultDefinition);
    spawner.registerAgentDefinition('researcher', researcherDefinition);
    spawner.registerAgentDefinition('coder', coderDefinition);
  });

  afterEach(() => {
    spawner.clear();
  });

  describe('Agent Creation', () => {
    it('should create agent with correct initial state', () => {
      const config: AgentConfig = {
        definition: defaultDefinition,
        sessionId: 'session-1',
      };

      const agent = spawner.spawn(config);

      expect(agent.getId()).toBeDefined();
      expect(agent.getStatus()).toBe('idle');
      expect(agent.getSessionId()).toBe('session-1');
      expect(agent.getParentAgentId()).toBeUndefined();
    });

    it('should create agent by name using registered definition', () => {
      const agent = spawner.spawnByName('researcher', 'session-2');

      expect(agent.getDefinition().name).toBe('researcher');
      expect(agent.getDefinition().expertise).toContain('research');
    });

    it('should throw error for unregistered agent definition', () => {
      expect(() => {
        spawner.spawnByName('nonexistent', 'session-3');
      }).toThrow('Agent definition not found: nonexistent');
    });

    it('should generate unique agent IDs', () => {
      const agent1 = spawner.spawnByName('default', 'session-4');
      const agent2 = spawner.spawnByName('default', 'session-4');

      expect(agent1.getId()).not.toBe(agent2.getId());
    });

    it('should track all spawned agents', () => {
      spawner.spawnByName('default', 'session-5');
      spawner.spawnByName('researcher', 'session-5');
      spawner.spawnByName('coder', 'session-5');

      expect(spawner.getAgentCount()).toBe(3);
      expect(spawner.listAgents().length).toBe(3);
    });
  });

  describe('State Transitions', () => {
    it('should transition from idle to active on start', async () => {
      const agent = spawner.spawnByName('default', 'session-6');

      expect(agent.getStatus()).toBe('idle');

      await agent.start('Test task');

      expect(agent.getStatus()).toBe('active');
    });

    it('should transition from active to completed on success', async () => {
      const agent = spawner.spawnByName('default', 'session-7');

      await agent.start('Test task');
      await agent.complete({
        success: true,
        data: { message: 'Done' },
        metadata: { duration: 100, retries: 0, skillsUsed: [] },
      });

      expect(agent.getStatus()).toBe('completed');
    });

    it('should transition to failed on error', async () => {
      const agent = spawner.spawnByName('default', 'session-8');

      await agent.start('Test task');
      await agent.fail(new Error('Task failed'));

      expect(agent.getStatus()).toBe('failed');
    });

    it('should not allow starting non-idle agent', async () => {
      const agent = spawner.spawnByName('default', 'session-9');

      await agent.start('First task');

      await expect(agent.start('Second task')).rejects.toThrow(
        'is not idle'
      );
    });

    it('should not allow completing non-active agent', async () => {
      const agent = spawner.spawnByName('default', 'session-10');

      await expect(
        agent.complete({
          success: true,
          data: {},
          metadata: { duration: 0, retries: 0, skillsUsed: [] },
        })
      ).rejects.toThrow('is not active');
    });
  });

  describe('Event Emissions', () => {
    it('should emit started event when agent starts', async () => {
      const agent = spawner.spawnByName('default', 'session-11');
      const startedHandler = jest.fn();

      agent.on('started', startedHandler);
      await agent.start('Test task');

      expect(startedHandler).toHaveBeenCalledTimes(1);
      expect(startedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: agent.getId(),
          task: 'Test task',
        })
      );
    });

    it('should emit completed event on successful completion', async () => {
      const agent = spawner.spawnByName('default', 'session-12');
      const completedHandler = jest.fn();

      agent.on('completed', completedHandler);
      await agent.start('Test task');
      await agent.complete({
        success: true,
        data: { result: 'success' },
        metadata: { duration: 50, retries: 0, skillsUsed: ['skill1'] },
      });

      expect(completedHandler).toHaveBeenCalledTimes(1);
      expect(completedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: agent.getId(),
          result: expect.objectContaining({ success: true }),
        })
      );
    });

    it('should emit failed event on failure', async () => {
      const agent = spawner.spawnByName('default', 'session-13');
      const failedHandler = jest.fn();
      const error = new Error('Test error');

      agent.on('failed', failedHandler);
      await agent.start('Test task');
      await agent.fail(error);

      expect(failedHandler).toHaveBeenCalledTimes(1);
      expect(failedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: agent.getId(),
          error,
        })
      );
    });

    it('should emit statusChanged event on status change', () => {
      const agent = spawner.spawnByName('default', 'session-14');
      const statusHandler = jest.fn();

      agent.on('statusChanged', statusHandler);
      agent.setStatus('active');

      expect(statusHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          oldStatus: 'idle',
          newStatus: 'active',
        })
      );
    });

    it('should emit retry event on retry', async () => {
      const agent = spawner.spawnByName('default', 'session-15');
      const retryHandler = jest.fn();

      agent.on('retry', retryHandler);
      await agent.start('Test task');
      await agent.fail(new Error('First failure'));
      await agent.retry();

      expect(retryHandler).toHaveBeenCalledTimes(1);
      expect(retryHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: agent.getId(),
          retryCount: 1,
        })
      );
    });
  });

  describe('Retry Mechanism', () => {
    it('should allow retry after failure', async () => {
      const agent = spawner.spawnByName('default', 'session-16');

      await agent.start('Test task');
      await agent.fail(new Error('First failure'));

      expect(agent.canRetry()).toBe(true);

      await agent.retry();

      expect(agent.getStatus()).toBe('idle');
      expect(agent.getState().retryCount).toBe(1);
    });

    it('should track retry count', async () => {
      const config: AgentConfig = {
        definition: defaultDefinition,
        sessionId: 'session-17',
        maxRetries: 5,
      };
      const agent = spawner.spawn(config);

      for (let i = 0; i < 3; i++) {
        await agent.start(`Task attempt ${i + 1}`);
        await agent.fail(new Error(`Failure ${i + 1}`));
        await agent.retry();
      }

      expect(agent.getState().retryCount).toBe(3);
      expect(agent.canRetry()).toBe(true);
    });

    it('should enforce max retries limit', async () => {
      const config: AgentConfig = {
        definition: defaultDefinition,
        sessionId: 'session-18',
        maxRetries: 2,
      };
      const agent = spawner.spawn(config);

      // First attempt + 2 retries = 3 total attempts
      await agent.start('Task 1');
      await agent.fail(new Error('Failure 1'));
      await agent.retry();

      await agent.start('Task 2');
      await agent.fail(new Error('Failure 2'));
      await agent.retry();

      await agent.start('Task 3');
      await agent.fail(new Error('Failure 3'));

      expect(agent.canRetry()).toBe(false);
      await expect(agent.retry()).rejects.toThrow('exceeded max retries');
    });

    it('should reset to idle state after retry', async () => {
      const agent = spawner.spawnByName('default', 'session-19');

      await agent.start('Test task');
      await agent.fail(new Error('Failure'));
      await agent.retry();

      expect(agent.getStatus()).toBe('idle');
      expect(agent.getState().error).toBeUndefined();
    });
  });

  describe('Parent-Child Relationships', () => {
    it('should create child agent with parent reference', () => {
      const parentAgent = spawner.spawnByName('default', 'session-20');
      const childAgent = spawner.spawnByName(
        'researcher',
        'session-20',
        parentAgent.getId()
      );

      expect(childAgent.getParentAgentId()).toBe(parentAgent.getId());
    });

    it('should find child agents by parent ID', () => {
      const parentAgent = spawner.spawnByName('default', 'session-21');

      spawner.spawnByName('researcher', 'session-21', parentAgent.getId());
      spawner.spawnByName('coder', 'session-21', parentAgent.getId());

      const children = spawner.getChildAgents(parentAgent.getId());

      expect(children.length).toBe(2);
    });

    it('should terminate child agents when parent is terminated', async () => {
      const parentAgent = spawner.spawnByName('default', 'session-22');
      const childAgent1 = spawner.spawnByName(
        'researcher',
        'session-22',
        parentAgent.getId()
      );
      const childAgent2 = spawner.spawnByName(
        'coder',
        'session-22',
        parentAgent.getId()
      );

      expect(spawner.getAgentCount()).toBe(3);

      await spawner.terminateAgent(parentAgent.getId());

      expect(spawner.getAgent(parentAgent.getId())).toBeUndefined();
      expect(spawner.getAgent(childAgent1.getId())).toBeUndefined();
      expect(spawner.getAgent(childAgent2.getId())).toBeUndefined();
      expect(spawner.getAgentCount()).toBe(0);
    });

    it('should maintain hierarchy with nested children', async () => {
      const rootAgent = spawner.spawnByName('default', 'session-23');
      const midAgent = spawner.spawnByName(
        'researcher',
        'session-23',
        rootAgent.getId()
      );
      const leafAgent = spawner.spawnByName(
        'coder',
        'session-23',
        midAgent.getId()
      );

      expect(spawner.getChildAgents(rootAgent.getId()).length).toBe(1);
      expect(spawner.getChildAgents(midAgent.getId()).length).toBe(1);
      expect(spawner.getChildAgents(leafAgent.getId()).length).toBe(0);

      // Terminating mid should also terminate leaf
      await spawner.terminateAgent(midAgent.getId());

      expect(spawner.getAgent(midAgent.getId())).toBeUndefined();
      expect(spawner.getAgent(leafAgent.getId())).toBeUndefined();
      expect(spawner.getAgent(rootAgent.getId())).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should group agents by session', () => {
      spawner.spawnByName('default', 'session-A');
      spawner.spawnByName('researcher', 'session-A');
      spawner.spawnByName('coder', 'session-B');

      const sessionAAgents = spawner.getAgentsBySession('session-A');
      const sessionBAgents = spawner.getAgentsBySession('session-B');

      expect(sessionAAgents.length).toBe(2);
      expect(sessionBAgents.length).toBe(1);
    });

    it('should terminate all agents in a session', async () => {
      spawner.spawnByName('default', 'session-C');
      spawner.spawnByName('researcher', 'session-C');
      spawner.spawnByName('coder', 'session-D');

      await spawner.terminateSession('session-C');

      expect(spawner.getAgentsBySession('session-C').length).toBe(0);
      expect(spawner.getAgentsBySession('session-D').length).toBe(1);
    });

    it('should get active agents only', async () => {
      const agent1 = spawner.spawnByName('default', 'session-E');
      const agent2 = spawner.spawnByName('researcher', 'session-E');
      spawner.spawnByName('coder', 'session-E');

      await agent1.start('Task 1');
      await agent2.start('Task 2');

      const activeAgents = spawner.getActiveAgents();

      expect(activeAgents.length).toBe(2);
      expect(activeAgents.map((a) => a.getId())).toContain(agent1.getId());
      expect(activeAgents.map((a) => a.getId())).toContain(agent2.getId());
    });
  });

  describe('Agent Duration Tracking', () => {
    it('should track task duration for completed agent', async () => {
      const agent = spawner.spawnByName('default', 'session-F');

      await agent.start('Test task');

      // Small delay to ensure measurable duration
      await new Promise((resolve) => setTimeout(resolve, 10));

      await agent.complete({
        success: true,
        data: {},
        metadata: { duration: 0, retries: 0, skillsUsed: [] },
      });

      const duration = agent.getDuration();
      expect(duration).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should track duration for failed agent', async () => {
      const agent = spawner.spawnByName('default', 'session-G');

      await agent.start('Test task');
      await new Promise((resolve) => setTimeout(resolve, 5));
      await agent.fail(new Error('Failure'));

      const duration = agent.getDuration();
      expect(duration).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(5);
    });

    it('should return undefined duration for non-started agent', () => {
      const agent = spawner.spawnByName('default', 'session-H');

      expect(agent.getDuration()).toBeUndefined();
    });
  });

  describe('Full Lifecycle Flow', () => {
    it('should complete full success lifecycle', async () => {
      const events: string[] = [];
      const agent = spawner.spawnByName('default', 'session-I');

      agent.on('started', () => events.push('started'));
      agent.on('completed', () => events.push('completed'));

      expect(agent.getStatus()).toBe('idle');

      const result = await agent.execute('Complete task successfully');

      expect(result.success).toBe(true);
      expect(agent.getStatus()).toBe('completed');
      expect(events).toEqual(['started', 'completed']);
    });

    it('should handle failure and retry lifecycle', async () => {
      const events: string[] = [];
      const agent = spawner.spawnByName('default', 'session-J');

      agent.on('started', () => events.push('started'));
      agent.on('failed', () => events.push('failed'));
      agent.on('retry', () => events.push('retry'));
      agent.on('completed', () => events.push('completed'));

      // First attempt - fail
      await agent.start('Task');
      await agent.fail(new Error('First failure'));
      await agent.retry();

      // Second attempt - succeed
      await agent.start('Task retry');
      await agent.complete({
        success: true,
        data: {},
        metadata: { duration: 0, retries: 1, skillsUsed: [] },
      });

      expect(events).toEqual([
        'started',
        'failed',
        'retry',
        'started',
        'completed',
      ]);
      expect(agent.getState().retryCount).toBe(1);
    });
  });
});
