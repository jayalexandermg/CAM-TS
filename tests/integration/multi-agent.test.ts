/**
 * Multi-Agent Coordination Integration Tests
 *
 * End-to-end tests for multi-agent scenarios including:
 * - Concurrent agent operations
 * - Agent coordination through orchestrator
 * - Session-based agent management
 * - Resource management and limits
 * - Cross-agent communication patterns
 */

import { Orchestrator } from '../../src/orchestrator/Orchestrator';
import { AgentSpawner } from '../../src/agents/AgentSpawner';
import { Agent } from '../../src/agents/Agent';
import { AgentDefinition } from '../../src/agents/types';

describe('Multi-Agent Coordination Integration', () => {
  let orchestrator: Orchestrator;
  let spawner: AgentSpawner;

  // Test fixtures
  const agentDefinitions: Record<string, AgentDefinition> = {
    coordinator: {
      name: 'coordinator',
      description: 'Coordinates other agents',
      expertise: ['coordination', 'delegation'],
      personality: ['organized', 'clear'],
      communicationStyle: 'directive',
      approach: 'structured',
      availableSkills: ['coordination', 'delegation'],
    },
    researcher: {
      name: 'researcher',
      description: 'Performs research tasks',
      expertise: ['research', 'analysis'],
      personality: ['thorough', 'curious'],
      communicationStyle: 'detailed',
      approach: 'methodical',
      availableSkills: ['research', 'analysis'],
    },
    coder: {
      name: 'coder',
      description: 'Writes and reviews code',
      expertise: ['coding', 'review'],
      personality: ['precise', 'focused'],
      communicationStyle: 'technical',
      approach: 'systematic',
      availableSkills: ['coding', 'review'],
    },
    reviewer: {
      name: 'reviewer',
      description: 'Reviews work from other agents',
      expertise: ['review', 'validation'],
      personality: ['critical', 'thorough'],
      communicationStyle: 'constructive',
      approach: 'analytical',
      availableSkills: ['review', 'validation'],
    },
  };

  beforeEach(() => {
    orchestrator = new Orchestrator();
    spawner = new AgentSpawner();

    // Register all agent definitions
    for (const [name, definition] of Object.entries(agentDefinitions)) {
      spawner.registerAgentDefinition(name, definition);
    }
  });

  afterEach(async () => {
    await orchestrator.shutdown();
    spawner.clear();
  });

  describe('Concurrent Agent Operations', () => {
    it('should handle multiple agents running concurrently', async () => {
      const agents: Agent[] = [];

      // Spawn multiple agents
      for (let i = 0; i < 5; i++) {
        const agent = spawner.spawnByName('researcher', `concurrent-session-${i}`);
        agents.push(agent);
      }

      // Start all agents concurrently
      const startPromises = agents.map((agent, i) =>
        agent.start(`Research task ${i}`)
      );
      await Promise.all(startPromises);

      // Verify all are active
      const activeAgents = spawner.getActiveAgents();
      expect(activeAgents.length).toBe(5);

      // Complete all concurrently
      const completePromises = agents.map((agent, i) =>
        agent.complete({
          success: true,
          data: { result: `Result ${i}` },
          metadata: { duration: 100, retries: 0, skillsUsed: [] },
        })
      );
      await Promise.all(completePromises);

      // Verify all completed
      for (const agent of agents) {
        expect(agent.getStatus()).toBe('completed');
      }
    });

    it('should handle mixed success and failure concurrently', async () => {
      const agents: Agent[] = [];

      for (let i = 0; i < 4; i++) {
        agents.push(spawner.spawnByName('coder', 'mixed-session'));
      }

      // Start all
      await Promise.all(agents.map((a, i) => a.start(`Task ${i}`)));

      // Complete some, fail others
      await agents[0].complete({
        success: true,
        data: {},
        metadata: { duration: 50, retries: 0, skillsUsed: [] },
      });
      await agents[1].fail(new Error('Task 1 failed'));
      await agents[2].complete({
        success: true,
        data: {},
        metadata: { duration: 75, retries: 0, skillsUsed: [] },
      });
      await agents[3].fail(new Error('Task 3 failed'));

      const completed = agents.filter((a) => a.getStatus() === 'completed');
      const failed = agents.filter((a) => a.getStatus() === 'failed');

      expect(completed.length).toBe(2);
      expect(failed.length).toBe(2);
    });

    it('should track concurrent operations correctly', async () => {
      const sessionId = 'track-session';

      // Create agents of different types
      const coordinator = spawner.spawnByName('coordinator', sessionId);
      const researcher = spawner.spawnByName('researcher', sessionId);
      const coder = spawner.spawnByName('coder', sessionId);

      // Start coordinator first
      await coordinator.start('Coordinate research and coding');

      // Start subordinates
      await Promise.all([
        researcher.start('Research the topic'),
        coder.start('Implement the solution'),
      ]);

      // All should be active
      expect(spawner.getActiveAgents().length).toBe(3);
      expect(spawner.getAgentsBySession(sessionId).length).toBe(3);
    });
  });

  describe('Agent Hierarchy Management', () => {
    it('should create and manage agent hierarchy', () => {
      const sessionId = 'hierarchy-session';

      const root = spawner.spawnByName('coordinator', sessionId);
      const research = spawner.spawnByName('researcher', sessionId, root.getId());
      const code = spawner.spawnByName('coder', sessionId, root.getId());
      spawner.spawnByName('reviewer', sessionId, code.getId());

      expect(spawner.getChildAgents(root.getId()).length).toBe(2);
      expect(spawner.getChildAgents(code.getId()).length).toBe(1);
      expect(spawner.getChildAgents(research.getId()).length).toBe(0);
    });

    it('should cascade termination through hierarchy', async () => {
      const sessionId = 'cascade-session';

      const root = spawner.spawnByName('coordinator', sessionId);
      const child1 = spawner.spawnByName('researcher', sessionId, root.getId());
      spawner.spawnByName('coder', sessionId, root.getId());
      spawner.spawnByName('reviewer', sessionId, child1.getId());

      expect(spawner.getAgentCount()).toBe(4);

      // Terminate root - should cascade to all
      await spawner.terminateAgent(root.getId());

      expect(spawner.getAgentCount()).toBe(0);
    });

    it('should allow partial hierarchy termination', async () => {
      const sessionId = 'partial-session';

      const root = spawner.spawnByName('coordinator', sessionId);
      const branch1 = spawner.spawnByName('researcher', sessionId, root.getId());
      const branch2 = spawner.spawnByName('coder', sessionId, root.getId());
      spawner.spawnByName('reviewer', sessionId, branch1.getId());

      expect(spawner.getAgentCount()).toBe(4);

      // Terminate only branch1 and its children
      await spawner.terminateAgent(branch1.getId());

      expect(spawner.getAgentCount()).toBe(2);
      expect(spawner.getAgent(root.getId())).toBeDefined();
      expect(spawner.getAgent(branch2.getId())).toBeDefined();
    });
  });

  describe('Session-Based Coordination', () => {
    it('should isolate agents across sessions', () => {
      spawner.spawnByName('researcher', 'session-A');
      spawner.spawnByName('researcher', 'session-A');
      spawner.spawnByName('coder', 'session-B');
      spawner.spawnByName('coder', 'session-B');
      spawner.spawnByName('coder', 'session-B');

      expect(spawner.getAgentsBySession('session-A').length).toBe(2);
      expect(spawner.getAgentsBySession('session-B').length).toBe(3);
      expect(spawner.getAgentsBySession('session-C').length).toBe(0);
    });

    it('should terminate session without affecting others', async () => {
      spawner.spawnByName('researcher', 'keep-session');
      spawner.spawnByName('coder', 'keep-session');
      spawner.spawnByName('reviewer', 'remove-session');
      spawner.spawnByName('coordinator', 'remove-session');

      expect(spawner.getAgentCount()).toBe(4);

      await spawner.terminateSession('remove-session');

      expect(spawner.getAgentCount()).toBe(2);
      expect(spawner.getAgentsBySession('keep-session').length).toBe(2);
      expect(spawner.getAgentsBySession('remove-session').length).toBe(0);
    });

    it('should coordinate agents within same session', async () => {
      const sessionId = 'coord-session';
      const events: string[] = [];

      const agent1 = spawner.spawnByName('researcher', sessionId);
      const agent2 = spawner.spawnByName('coder', sessionId);

      agent1.on('completed', () => events.push('agent1-completed'));
      agent2.on('completed', () => events.push('agent2-completed'));

      await agent1.start('Research phase');
      await agent1.complete({
        success: true,
        data: { findings: 'Research results' },
        metadata: { duration: 100, retries: 0, skillsUsed: [] },
      });

      // Agent 2 starts after agent 1 completes
      await agent2.start('Implementation phase');
      await agent2.complete({
        success: true,
        data: { code: 'Implementation' },
        metadata: { duration: 200, retries: 0, skillsUsed: [] },
      });

      expect(events).toEqual(['agent1-completed', 'agent2-completed']);
    });
  });

  describe('Orchestrator Integration', () => {
    it('should process multiple requests through orchestrator', async () => {
      const results = await Promise.all([
        orchestrator.process({ input: 'Request 1', sessionId: 'orch-1' }),
        orchestrator.process({ input: 'Request 2', sessionId: 'orch-2' }),
        orchestrator.process({ input: 'Request 3', sessionId: 'orch-3' }),
      ]);

      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.taskId).toBeDefined();
      }
    });

    it('should maintain state across orchestrator operations', async () => {
      const initialState = orchestrator.getState();

      await orchestrator.process({ input: 'First', sessionId: 'state-1' });
      await orchestrator.process({ input: 'Second', sessionId: 'state-2' });

      const finalState = orchestrator.getState();

      expect(finalState.completedTasks).toBeGreaterThan(initialState.completedTasks);
    });

    it('should integrate spawner with orchestrator', () => {
      const orcSpawner = orchestrator.getAgentSpawner();
      const definitions = orcSpawner.listAgentDefinitions();

      expect(definitions).toContain('default');
      expect(definitions).toContain('researcher');
      expect(definitions).toContain('coder');
    });

    it('should track task manager stats', async () => {
      const taskManager = orchestrator.getTaskManager();

      await orchestrator.process({ input: 'Task A', sessionId: 'tm-1' });
      await orchestrator.process({ input: 'Task B', sessionId: 'tm-2' });

      const stats = taskManager.getStats();
      expect(stats.completed).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Resource Management', () => {
    it('should track agent count limits', () => {
      for (let i = 0; i < 10; i++) {
        spawner.spawnByName('researcher', `limit-session-${i}`);
      }

      expect(spawner.getAgentCount()).toBe(10);
    });

    it('should properly clean up terminated agents', async () => {
      const agents: Agent[] = [];
      for (let i = 0; i < 5; i++) {
        agents.push(spawner.spawnByName('coder', 'cleanup-session'));
      }

      expect(spawner.getAgentCount()).toBe(5);

      for (const agent of agents) {
        await spawner.terminateAgent(agent.getId());
      }

      expect(spawner.getAgentCount()).toBe(0);
    });

    it('should handle clear operation', () => {
      for (let i = 0; i < 5; i++) {
        spawner.spawnByName('researcher', `clear-session-${i}`);
      }

      expect(spawner.getAgentCount()).toBe(5);

      spawner.clear();

      expect(spawner.getAgentCount()).toBe(0);
    });

    it('should track security manager resources', () => {
      const securityManager = orchestrator.getSecurityManager();
      const usage = securityManager.getResourceUsage();

      expect(usage).toBeDefined();
      expect(typeof usage.agentCount).toBe('number');
    });
  });

  describe('Error Handling Across Agents', () => {
    it('should handle individual agent failures gracefully', async () => {
      const agents = [
        spawner.spawnByName('researcher', 'error-session'),
        spawner.spawnByName('coder', 'error-session'),
        spawner.spawnByName('reviewer', 'error-session'),
      ];

      await Promise.all(agents.map((a, i) => a.start(`Task ${i}`)));

      // First agent fails
      await agents[0].fail(new Error('Research failed'));

      // Other agents continue
      await agents[1].complete({
        success: true,
        data: {},
        metadata: { duration: 50, retries: 0, skillsUsed: [] },
      });

      // Session agents still accessible
      expect(spawner.getAgentsBySession('error-session').length).toBe(3);
      expect(agents[0].getStatus()).toBe('failed');
      expect(agents[1].getStatus()).toBe('completed');
      expect(agents[2].getStatus()).toBe('active');
    });

    it('should allow retry for failed agents while others continue', async () => {
      const agent1 = spawner.spawnByName('researcher', 'retry-session');
      const agent2 = spawner.spawnByName('coder', 'retry-session');

      await agent1.start('Task 1');
      await agent2.start('Task 2');

      // Agent 1 fails and retries
      await agent1.fail(new Error('Temporary failure'));
      await agent1.retry();
      await agent1.start('Task 1 retry');

      // Agent 2 completes normally
      await agent2.complete({
        success: true,
        data: {},
        metadata: { duration: 100, retries: 0, skillsUsed: [] },
      });

      expect(agent1.getStatus()).toBe('active');
      expect(agent1.getState().retryCount).toBe(1);
      expect(agent2.getStatus()).toBe('completed');
    });

    it('should propagate errors through orchestrator', async () => {
      const result = await orchestrator.process({
        input: '<script>malicious</script>',
        sessionId: 'error-orch',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Event Coordination', () => {
    it('should emit events in correct order across agents', async () => {
      const events: string[] = [];
      const agent1 = spawner.spawnByName('researcher', 'event-session');
      const agent2 = spawner.spawnByName('coder', 'event-session');

      agent1.on('started', () => events.push('a1-start'));
      agent1.on('completed', () => events.push('a1-complete'));
      agent2.on('started', () => events.push('a2-start'));
      agent2.on('completed', () => events.push('a2-complete'));

      await agent1.start('Research');
      await agent2.start('Code');
      await agent1.complete({
        success: true,
        data: {},
        metadata: { duration: 50, retries: 0, skillsUsed: [] },
      });
      await agent2.complete({
        success: true,
        data: {},
        metadata: { duration: 50, retries: 0, skillsUsed: [] },
      });

      expect(events).toEqual(['a1-start', 'a2-start', 'a1-complete', 'a2-complete']);
    });

    it('should handle status change events across hierarchy', () => {
      const statusChanges: string[] = [];

      const parent = spawner.spawnByName('coordinator', 'status-session');
      const child = spawner.spawnByName('researcher', 'status-session', parent.getId());

      parent.on('statusChanged', (e) =>
        statusChanges.push(`parent:${e.oldStatus}->${e.newStatus}`)
      );
      child.on('statusChanged', (e) =>
        statusChanges.push(`child:${e.oldStatus}->${e.newStatus}`)
      );

      parent.setStatus('active');
      child.setStatus('active');
      child.setStatus('completed');
      parent.setStatus('completed');

      expect(statusChanges).toEqual([
        'parent:idle->active',
        'child:idle->active',
        'child:active->completed',
        'parent:active->completed',
      ]);
    });
  });

  describe('Orchestrator Shutdown', () => {
    it('should clean up all agents on shutdown', async () => {
      await orchestrator.process({ input: 'Task 1', sessionId: 'shutdown-1' });
      await orchestrator.process({ input: 'Task 2', sessionId: 'shutdown-2' });

      const spawnerBeforeShutdown = orchestrator.getAgentSpawner();

      await orchestrator.shutdown();

      expect(spawnerBeforeShutdown.listAgents().length).toBe(0);
    });

    it('should emit shutdown event', async () => {
      const shutdownHandler = jest.fn();
      orchestrator.on('shutdown', shutdownHandler);

      await orchestrator.shutdown();

      expect(shutdownHandler).toHaveBeenCalled();
    });
  });
});
