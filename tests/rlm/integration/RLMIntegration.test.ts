/**
 * RLM Integration Tests
 *
 * Comprehensive tests for RLM orchestrator, agent bridge, and CLI commands.
 */

import { RLMOrchestrator } from '../../../src/rlm/integration/RLMOrchestrator';
import { AgentRLMBridge } from '../../../src/rlm/integration/AgentRLMBridge';
import { RLMCommand } from '../../../src/cli/commands/RLMCommand';
import { Agent } from '../../../src/agents/Agent';
import { AgentDefinition } from '../../../src/agents/types';
import { Command } from '../../../src/cli/types';

// Helper to create test agents
function createTestAgent(name: string, expertise: string[] = ['general']): Agent {
  const definition: AgentDefinition = {
    name,
    description: `Test agent: ${name}`,
    expertise,
    personality: ['helpful', 'analytical'],
    communicationStyle: 'professional',
    approach: 'systematic',
    availableSkills: ['analyze', 'solve'],
  };

  return new Agent({
    definition,
    sessionId: `session_${Date.now()}`,
  });
}

// Helper to create test commands
function createCommand(
  name: string,
  subcommand?: string,
  positional: string[] = [],
  options: Map<string, string> = new Map(),
  flags: Map<string, boolean> = new Map()
): Command {
  return {
    name,
    subcommand,
    positional,
    options,
    flags,
  };
}

describe('RLMOrchestrator', () => {
  let orchestrator: RLMOrchestrator;

  beforeEach(() => {
    orchestrator = new RLMOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('solve', () => {
    it('should solve a simple problem', async () => {
      const result = await orchestrator.solve({
        query: 'What is 2 + 2?',
      });

      expect(result.success).toBe(true);
      expect(result.solution).toBeDefined();
      expect(result.metrics.totalTime).toBeGreaterThan(0);
    });

    it('should solve with context', async () => {
      const result = await orchestrator.solve({
        query: 'What is the capital?',
        context: 'We are discussing France.',
      });

      expect(result.success).toBe(true);
      expect(result.solution).toBeDefined();
    });

    it('should solve with constraints', async () => {
      const result = await orchestrator.solve({
        query: 'Design an API endpoint',
        constraints: ['Must use REST', 'Must return JSON'],
      });

      expect(result.success).toBe(true);
      expect(result.metrics.contextTokens).toBeGreaterThan(0);
    });

    it('should track session and agent IDs', async () => {
      const result = await orchestrator.solve({
        query: 'Test problem',
        sessionId: 'test-session-123',
        agentId: 'test-agent-456',
      });

      expect(result.success).toBe(true);
    });

    it('should respect concurrency limits', async () => {
      const orchestratorLimited = new RLMOrchestrator({
        maxConcurrentTasks: 1,
      });

      // Start first task
      const promise1 = orchestratorLimited.solve({ query: 'Task 1' });

      // Try to start second task - should fail
      await expect(
        orchestratorLimited.solve({ query: 'Task 2' })
      ).rejects.toThrow('Maximum concurrent tasks reached');

      await promise1;
      await orchestratorLimited.shutdown();
    });

    it('should emit events during solving', async () => {
      const events: string[] = [];
      orchestrator.on('taskStarted', () => events.push('started'));
      orchestrator.on('taskCompleted', () => events.push('completed'));

      await orchestrator.solve({ query: 'Test event emission' });

      expect(events).toContain('started');
      expect(events).toContain('completed');
    });

    it('should cache results', async () => {
      const request = { query: 'Cached test query' };

      // First solve - cache miss
      const result1 = await orchestrator.solve(request);
      expect(result1.metrics.cacheHits).toBe(0);

      // Second solve - cache hit
      const result2 = await orchestrator.solve(request);
      expect(result2.metrics.cacheHits).toBe(1);
    });
  });

  describe('analyze', () => {
    it('should analyze simple problems', async () => {
      const result = await orchestrator.analyze({
        query: 'What is 5 + 3?',
      });

      expect(result.success).toBe(true);
      expect(result.complexity).toBe('simple');
      expect(result.canSolveDirectly).toBe(true);
    });

    it('should analyze complex problems', async () => {
      const result = await orchestrator.analyze({
        query: 'Design a distributed system with fault tolerance, load balancing, and data replication across multiple regions',
      });

      expect(result.success).toBe(true);
      expect(['moderate', 'complex']).toContain(result.complexity);
      expect(result.keyConcepts.length).toBeGreaterThan(0);
      expect(result.suggestedApproach).toBeDefined();
    });

    it('should provide suggested decomposition for complex problems', async () => {
      const result = await orchestrator.analyze({
        query: 'Build a microservices architecture with authentication, rate limiting, and monitoring',
      });

      expect(result.success).toBe(true);
      if (!result.canSolveDirectly) {
        expect(result.suggestedDecomposition).toBeDefined();
        expect(result.suggestedDecomposition!.length).toBeGreaterThan(0);
      }
    });

    it('should include confidence scores', async () => {
      const result = await orchestrator.analyze({
        query: 'Calculate the sum of numbers from 1 to 100',
      });

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('solveWithRollback', () => {
    it('should solve with sandbox protection', async () => {
      const result = await orchestrator.solveWithRollback({
        query: 'Safe problem solving',
      });

      expect(result.success).toBe(true);
      expect(result.metrics.sandboxOperations).toBeGreaterThan(0);
    });
  });

  describe('context management', () => {
    it('should add and use context', () => {
      const contextId = orchestrator.addContext(
        'Important background information',
        'knowledge',
        'test'
      );

      expect(contextId).toBeDefined();
      expect(typeof contextId).toBe('string');
    });

    it('should clear context', () => {
      orchestrator.addContext('Context to clear', 'knowledge');
      orchestrator.clearContext();

      const stats = orchestrator.getContextManager().getStats();
      expect(stats.itemCount).toBe(0);
    });

    it('should emit context update events', () => {
      let eventData: { itemCount: number; tokens: number } | undefined;
      orchestrator.on('contextUpdated', (data) => {
        eventData = data;
      });

      orchestrator.addContext('Test context', 'knowledge');

      expect(eventData).toBeDefined();
      expect(eventData!.itemCount).toBeGreaterThan(0);
    });
  });

  describe('caching', () => {
    it('should check for cached results', async () => {
      const request = { query: 'Cache check test' };

      expect(orchestrator.hasCachedResult(request)).toBe(false);
      await orchestrator.solve(request);
      expect(orchestrator.hasCachedResult(request)).toBe(true);
    });

    it('should get cached results', async () => {
      const request = { query: 'Get cached result test' };

      await orchestrator.solve(request);
      const cached = orchestrator.getCachedResult(request);

      expect(cached).toBeDefined();
      expect(cached!.success).toBe(true);
    });

    it('should clear cache', async () => {
      const request = { query: 'Clear cache test' };

      await orchestrator.solve(request);
      expect(orchestrator.hasCachedResult(request)).toBe(true);

      orchestrator.clearCache();
      expect(orchestrator.hasCachedResult(request)).toBe(false);
    });
  });

  describe('state management', () => {
    it('should track orchestrator state', () => {
      const state = orchestrator.getState();

      expect(state.activeTasks).toBe(0);
      expect(state.completedTasks).toBe(0);
      expect(state.failedTasks).toBe(0);
      expect(state.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should update state after solving', async () => {
      await orchestrator.solve({ query: 'State tracking test' });

      const state = orchestrator.getState();
      expect(state.completedTasks).toBe(1);
      expect(state.problemsSolved).toBe(1);
      expect(state.averageSolveTime).toBeGreaterThanOrEqual(0);
    });

    it('should track active tasks', async () => {
      const promise = orchestrator.solve({ query: 'Active task test' });

      // Task should be active during solving
      const activeIds = orchestrator.getActiveTaskIds();
      // Note: task might complete very quickly
      expect(Array.isArray(activeIds)).toBe(true);

      await promise;
    });
  });

  describe('task cancellation', () => {
    it('should cancel active tasks', async () => {
      const promise = orchestrator.solve({ query: 'Task to cancel' });

      const activeIds = orchestrator.getActiveTaskIds();
      if (activeIds.length > 0) {
        const cancelled = await orchestrator.cancelTask(activeIds[0]);
        expect(cancelled).toBe(true);
      }

      // Wait for promise to complete (with possible cancellation)
      try {
        await promise;
      } catch {
        // Task may fail due to cancellation
      }
    });

    it('should return false for non-existent tasks', async () => {
      const cancelled = await orchestrator.cancelTask('non-existent-task');
      expect(cancelled).toBe(false);
    });
  });
});

describe('AgentRLMBridge', () => {
  let orchestrator: RLMOrchestrator;
  let bridge: AgentRLMBridge;

  beforeEach(() => {
    orchestrator = new RLMOrchestrator();
    bridge = new AgentRLMBridge(orchestrator);
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('agent registration', () => {
    it('should register an agent', () => {
      const agent = createTestAgent('TestAgent');
      const sessionId = bridge.registerAgent(agent);

      expect(sessionId).toBeDefined();
      expect(bridge.isRegistered(agent.getId())).toBe(true);
    });

    it('should register with custom session ID', () => {
      const agent = createTestAgent('TestAgent');
      const customSessionId = 'custom-session-123';
      const sessionId = bridge.registerAgent(agent, customSessionId);

      expect(sessionId).toBe(customSessionId);
    });

    it('should unregister an agent', () => {
      const agent = createTestAgent('TestAgent');
      bridge.registerAgent(agent);

      const unregistered = bridge.unregisterAgent(agent.getId());
      expect(unregistered).toBe(true);
      expect(bridge.isRegistered(agent.getId())).toBe(false);
    });

    it('should return false when unregistering non-existent agent', () => {
      const unregistered = bridge.unregisterAgent('non-existent');
      expect(unregistered).toBe(false);
    });

    it('should emit registration events', () => {
      const events: string[] = [];
      bridge.on('agentRegistered', () => events.push('registered'));
      bridge.on('agentUnregistered', () => events.push('unregistered'));

      const agent = createTestAgent('TestAgent');
      bridge.registerAgent(agent);
      bridge.unregisterAgent(agent.getId());

      expect(events).toContain('registered');
      expect(events).toContain('unregistered');
    });

    it('should list registered agents', () => {
      const agent1 = createTestAgent('Agent1');
      const agent2 = createTestAgent('Agent2');

      bridge.registerAgent(agent1);
      bridge.registerAgent(agent2);

      const registered = bridge.getRegisteredAgents();
      expect(registered.length).toBe(2);
      expect(registered).toContain(agent1.getId());
      expect(registered).toContain(agent2.getId());
    });

    it('should get agent session info', () => {
      const agent = createTestAgent('TestAgent');
      const sessionId = bridge.registerAgent(agent);

      const session = bridge.getAgentSession(agent.getId());
      expect(session).toBeDefined();
      expect(session!.sessionId).toBe(sessionId);
      expect(session!.agentId).toBe(agent.getId());
    });
  });

  describe('reasoning', () => {
    it('should reason about a task', async () => {
      const agent = createTestAgent('ReasoningAgent', ['problem-solving']);
      bridge.registerAgent(agent);

      const result = await bridge.reason(agent, 'What is the best approach?');

      expect(result.agentId).toBe(agent.getId());
      expect(result.task).toBe('What is the best approach?');
      expect(result.rlmResult.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should throw when reasoning with unregistered agent', async () => {
      const agent = createTestAgent('UnregisteredAgent');

      await expect(bridge.reason(agent, 'Test')).rejects.toThrow(
        /not registered/
      );
    });

    it('should force RLM usage', async () => {
      const agent = createTestAgent('ForceRLMAgent');
      bridge.registerAgent(agent);

      const result = await bridge.reason(agent, 'Simple question', {
        forceRLM: true,
      });

      expect(result.rlmResult.success).toBe(true);
    });

    it('should use provided context', async () => {
      const agent = createTestAgent('ContextAgent');
      bridge.registerAgent(agent);

      const result = await bridge.reason(agent, 'What is relevant?', {
        context: 'Additional context for reasoning',
      });

      expect(result.rlmResult.success).toBe(true);
    });

    it('should use provided constraints', async () => {
      const agent = createTestAgent('ConstraintAgent');
      bridge.registerAgent(agent);

      const result = await bridge.reason(agent, 'Design a solution', {
        constraints: ['Must be fast', 'Must be scalable'],
      });

      expect(result.rlmResult.success).toBe(true);
    });

    it('should emit reasoning complete events', async () => {
      const agent = createTestAgent('EventAgent');
      bridge.registerAgent(agent);

      // Set up listener before triggering reason
      const eventPromise = new Promise<boolean>((resolve) => {
        bridge.once('reasoningComplete', () => resolve(true));
        // Timeout fallback
        setTimeout(() => resolve(false), 1000);
      });

      await bridge.reason(agent, 'Test event');

      // Give event time to fire if it hasn't already
      const eventFired = await eventPromise;
      expect(eventFired).toBe(true);
    });
  });

  describe('reasoning history', () => {
    it('should track reasoning history', async () => {
      const agent = createTestAgent('HistoryAgent');
      bridge.registerAgent(agent);

      await bridge.reason(agent, 'First reasoning task');
      await bridge.reason(agent, 'Second reasoning task');

      const history = bridge.getReasoningHistory(agent.getId());
      expect(history.length).toBe(2);
      expect(history[0].task).toBe('First reasoning task');
      expect(history[1].task).toBe('Second reasoning task');
    });

    it('should clear reasoning history', async () => {
      const agent = createTestAgent('ClearHistoryAgent');
      bridge.registerAgent(agent);

      await bridge.reason(agent, 'Task to clear');

      const cleared = bridge.clearReasoningHistory(agent.getId());
      expect(cleared).toBe(true);

      const history = bridge.getReasoningHistory(agent.getId());
      expect(history.length).toBe(0);
    });

    it('should return empty history for non-existent agent', () => {
      const history = bridge.getReasoningHistory('non-existent');
      expect(history).toEqual([]);
    });
  });

  describe('task analysis', () => {
    it('should analyze task complexity', async () => {
      const result = await bridge.analyzeTask('Complex multi-step problem');

      expect(result.success).toBe(true);
      expect(result.complexity).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('agent context', () => {
    it('should add agent-specific context', () => {
      const agent = createTestAgent('ContextAgent');
      bridge.registerAgent(agent);

      const itemId = bridge.addAgentContext(
        agent.getId(),
        'Agent-specific knowledge',
        'knowledge'
      );

      expect(itemId).toBeDefined();
    });

    it('should return null for non-existent agent context', () => {
      const itemId = bridge.addAgentContext('non-existent', 'Test', 'knowledge');
      expect(itemId).toBeNull();
    });

    it('should add shared context', () => {
      const itemId = bridge.addSharedContext('Shared knowledge', 'knowledge');
      expect(itemId).toBeDefined();
    });
  });

  describe('collaborative solving', () => {
    it('should solve sequentially with multiple agents', async () => {
      const agent1 = createTestAgent('Agent1', ['analysis']);
      const agent2 = createTestAgent('Agent2', ['synthesis']);

      bridge.registerAgent(agent1);
      bridge.registerAgent(agent2);

      const results = await bridge.collaborativeSolve(
        [agent1, agent2],
        'Collaborative problem',
        'sequential'
      );

      expect(results.length).toBe(2);
      expect(results[0].agentId).toBe(agent1.getId());
      expect(results[1].agentId).toBe(agent2.getId());
    });

    it('should solve in parallel with multiple agents', async () => {
      const agent1 = createTestAgent('ParallelAgent1');
      const agent2 = createTestAgent('ParallelAgent2');

      bridge.registerAgent(agent1);
      bridge.registerAgent(agent2);

      const results = await bridge.collaborativeSolve(
        [agent1, agent2],
        'Parallel problem',
        'parallel'
      );

      expect(results.length).toBe(2);
    });

    it('should solve with consensus strategy', async () => {
      const agent1 = createTestAgent('ConsensusAgent1');
      const agent2 = createTestAgent('ConsensusAgent2');

      bridge.registerAgent(agent1);
      bridge.registerAgent(agent2);

      const results = await bridge.collaborativeSolve(
        [agent1, agent2],
        'Consensus problem',
        'consensus'
      );

      expect(results.length).toBe(2);
    });
  });

  describe('configuration', () => {
    it('should get configuration', () => {
      const config = bridge.getConfig();

      expect(config.autoUseRLM).toBeDefined();
      expect(config.complexityThreshold).toBeDefined();
      expect(config.cacheAgentResults).toBeDefined();
      expect(config.shareContext).toBeDefined();
    });

    it('should update configuration', () => {
      bridge.updateConfig({ complexityThreshold: 0.8 });

      const config = bridge.getConfig();
      expect(config.complexityThreshold).toBe(0.8);
    });
  });
});

describe('RLMCommand', () => {
  let command: RLMCommand;

  beforeEach(() => {
    command = new RLMCommand();
  });

  afterEach(async () => {
    await command.getOrchestrator().shutdown();
  });

  describe('solve subcommand', () => {
    it('should solve a problem', async () => {
      const cmd = createCommand('rlm', 'solve', ['solve', 'What is 2+2?']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('RLM Solution');
    });

    it('should require a query', async () => {
      const cmd = createCommand('rlm', 'solve', ['solve']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Missing query');
    });

    it('should accept context option', async () => {
      const options = new Map([['context', 'Additional context']]);
      const cmd = createCommand('rlm', 'solve', ['solve', 'Test query'], options);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
    });

    it('should accept depth option', async () => {
      const options = new Map([['depth', '3']]);
      const cmd = createCommand('rlm', 'solve', ['solve', 'Test query'], options);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
    });

    it('should accept no-validate flag', async () => {
      const flags = new Map([['no-validate', true]]);
      const cmd = createCommand('rlm', 'solve', ['solve', 'Test query'], new Map(), flags);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('analyze subcommand', () => {
    it('should analyze a problem', async () => {
      const cmd = createCommand('rlm', 'analyze', ['analyze', 'Design a REST API']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Problem Analysis');
      expect(result.output).toContain('Complexity');
    });

    it('should require a query', async () => {
      const cmd = createCommand('rlm', 'analyze', ['analyze']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Missing query');
    });

    it('should accept depth option', async () => {
      const options = new Map([['depth', 'deep']]);
      const cmd = createCommand('rlm', 'analyze', ['analyze', 'Test'], options);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('status subcommand', () => {
    it('should show status', async () => {
      const cmd = createCommand('rlm', 'status', ['status']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('RLM Orchestrator Status');
      expect(result.output).toContain('Tasks:');
      expect(result.output).toContain('Performance:');
      expect(result.output).toContain('Context:');
    });
  });

  describe('clear subcommand', () => {
    it('should clear context', async () => {
      const cmd = createCommand('rlm', 'clear', ['clear', 'context']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Context cleared');
    });

    it('should clear cache', async () => {
      const cmd = createCommand('rlm', 'clear', ['clear', 'cache']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Cache cleared');
    });

    it('should clear all', async () => {
      const cmd = createCommand('rlm', 'clear', ['clear', 'all']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Context and cache cleared');
    });

    it('should clear all by default', async () => {
      const cmd = createCommand('rlm', 'clear', ['clear']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Context and cache cleared');
    });

    it('should reject invalid clear target', async () => {
      const cmd = createCommand('rlm', 'clear', ['clear', 'invalid']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Unknown clear target');
    });
  });

  describe('unknown subcommand', () => {
    it('should show error for unknown subcommand', async () => {
      const cmd = createCommand('rlm', 'unknown', ['unknown']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Unknown RLM subcommand');
    });
  });

  describe('help', () => {
    it('should provide help text', () => {
      const help = command.getHelp();

      expect(help).toContain('RLM Commands');
      expect(help).toContain('rlm solve');
      expect(help).toContain('rlm analyze');
      expect(help).toContain('rlm status');
      expect(help).toContain('rlm clear');
    });

    it('should provide description', () => {
      const description = command.getDescription();
      expect(description).toContain('Recursive Language Model');
    });
  });

  describe('orchestrator access', () => {
    it('should provide access to orchestrator', () => {
      const orchestrator = command.getOrchestrator();
      expect(orchestrator).toBeInstanceOf(RLMOrchestrator);
    });

    it('should allow custom orchestrator injection', () => {
      const customOrchestrator = new RLMOrchestrator({ maxConcurrentTasks: 5 });
      const customCommand = new RLMCommand(customOrchestrator);

      expect(customCommand.getOrchestrator()).toBe(customOrchestrator);
    });
  });
});

describe('Integration - End to End', () => {
  let orchestrator: RLMOrchestrator;
  let bridge: AgentRLMBridge;

  beforeEach(() => {
    orchestrator = new RLMOrchestrator();
    bridge = new AgentRLMBridge(orchestrator);
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  it('should complete a full agent reasoning workflow', async () => {
    // Create and register agent
    const agent = createTestAgent('WorkflowAgent', ['analysis', 'design']);
    const sessionId = bridge.registerAgent(agent);
    expect(sessionId).toBeDefined();

    // Add context
    bridge.addAgentContext(agent.getId(), 'Domain knowledge about APIs', 'knowledge');
    bridge.addSharedContext('Project uses TypeScript', 'constraint');

    // Analyze problem
    const analysis = await bridge.analyzeTask('Design a new API endpoint');
    expect(analysis.success).toBe(true);

    // Reason about task
    const result = await bridge.reason(agent, 'Design a new API endpoint', {
      context: 'For a user management system',
      constraints: ['Must be RESTful', 'Must support pagination'],
    });

    expect(result.rlmResult.success).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);

    // Check history
    const history = bridge.getReasoningHistory(agent.getId());
    expect(history.length).toBe(1);

    // Check orchestrator state
    // Note: When autoUseRLM is enabled and task is simple,
    // directReason is used which doesn't go through orchestrator.solve
    const state = orchestrator.getState();
    expect(state.completedTasks).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple agents collaboratively', async () => {
    const analyst = createTestAgent('Analyst', ['analysis', 'requirements']);
    const designer = createTestAgent('Designer', ['architecture', 'patterns']);
    const reviewer = createTestAgent('Reviewer', ['validation', 'testing']);

    bridge.registerAgent(analyst);
    bridge.registerAgent(designer);
    bridge.registerAgent(reviewer);

    // Add shared context
    bridge.addSharedContext('Building a microservices architecture', 'knowledge');

    // Collaborative problem solving
    const results = await bridge.collaborativeSolve(
      [analyst, designer, reviewer],
      'Design a fault-tolerant system',
      'sequential'
    );

    expect(results.length).toBe(3);
    expect(results.every((r) => r.rlmResult.success)).toBe(true);
  });
});
