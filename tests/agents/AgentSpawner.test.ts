import { AgentSpawner } from '../../src/agents/AgentSpawner';
import { AgentDefinition, AgentConfig } from '../../src/agents/types';
import { BASE_AGENTS } from '../../src/agents/definitions/base-agents';

describe('AgentSpawner', () => {
  let spawner: AgentSpawner;

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

  beforeEach(() => {
    spawner = new AgentSpawner();
  });

  describe('registerAgentDefinition', () => {
    it('should register a new definition', () => {
      spawner.registerAgentDefinition('test', testDefinition);
      expect(spawner.getAgentDefinition('test')).toEqual(testDefinition);
    });

    it('should overwrite existing definition', () => {
      spawner.registerAgentDefinition('test', testDefinition);
      const newDef = { ...testDefinition, description: 'Updated' };
      spawner.registerAgentDefinition('test', newDef);
      expect(spawner.getAgentDefinition('test')?.description).toBe('Updated');
    });
  });

  describe('getAgentDefinition', () => {
    it('should return undefined for unknown definition', () => {
      expect(spawner.getAgentDefinition('unknown')).toBeUndefined();
    });

    it('should return registered definition', () => {
      spawner.registerAgentDefinition('test', testDefinition);
      expect(spawner.getAgentDefinition('test')).toEqual(testDefinition);
    });
  });

  describe('listAgentDefinitions', () => {
    it('should return empty array when no definitions', () => {
      expect(spawner.listAgentDefinitions()).toEqual([]);
    });

    it('should return list of registered definition names', () => {
      spawner.registerAgentDefinition('agent1', testDefinition);
      spawner.registerAgentDefinition('agent2', testDefinition);
      const names = spawner.listAgentDefinitions();
      expect(names).toContain('agent1');
      expect(names).toContain('agent2');
      expect(names.length).toBe(2);
    });
  });

  describe('spawn', () => {
    it('should create and track a new agent', () => {
      const agent = spawner.spawn(createConfig());
      expect(spawner.getAgent(agent.getId())).toBe(agent);
    });

    it('should increment agent count', () => {
      expect(spawner.getAgentCount()).toBe(0);
      spawner.spawn(createConfig());
      expect(spawner.getAgentCount()).toBe(1);
    });

    it('should create agent with provided config', () => {
      const agent = spawner.spawn(createConfig({ id: 'custom-id' }));
      expect(agent.getId()).toBe('custom-id');
    });

    it('should create agent with parent agent id', () => {
      const agent = spawner.spawn(
        createConfig({ parentAgentId: 'parent-123' })
      );
      expect(agent.getParentAgentId()).toBe('parent-123');
    });
  });

  describe('spawnByName', () => {
    it('should spawn agent using registered definition', () => {
      spawner.registerAgentDefinition('test', testDefinition);
      const agent = spawner.spawnByName('test', 'session-123');
      expect(agent.getDefinition().name).toBe('test-agent');
    });

    it('should throw for unknown definition', () => {
      expect(() =>
        spawner.spawnByName('unknown', 'session-123')
      ).toThrow('Agent definition not found: unknown');
    });

    it('should set parent agent id', () => {
      spawner.registerAgentDefinition('test', testDefinition);
      const agent = spawner.spawnByName('test', 'session-123', 'parent-456');
      expect(agent.getParentAgentId()).toBe('parent-456');
    });

    it('should work with BASE_AGENTS definitions', () => {
      Object.entries(BASE_AGENTS).forEach(([name, def]) => {
        spawner.registerAgentDefinition(name, def);
      });
      const agent = spawner.spawnByName('coder', 'session-123');
      expect(agent.getDefinition().name).toBe('coder');
    });
  });

  describe('getAgent', () => {
    it('should return undefined for unknown id', () => {
      expect(spawner.getAgent('unknown')).toBeUndefined();
    });

    it('should return agent by id', () => {
      const agent = spawner.spawn(createConfig({ id: 'test-id' }));
      expect(spawner.getAgent('test-id')).toBe(agent);
    });
  });

  describe('listAgents', () => {
    it('should return empty array when no agents', () => {
      expect(spawner.listAgents()).toEqual([]);
    });

    it('should return all spawned agents', () => {
      const agent1 = spawner.spawn(createConfig());
      const agent2 = spawner.spawn(createConfig());
      const agents = spawner.listAgents();
      expect(agents).toContain(agent1);
      expect(agents).toContain(agent2);
      expect(agents.length).toBe(2);
    });
  });

  describe('getActiveAgents', () => {
    it('should return only active agents', async () => {
      const agent1 = spawner.spawn(createConfig());
      const agent2 = spawner.spawn(createConfig());
      await agent1.start('task1');
      expect(spawner.getActiveAgents()).toContain(agent1);
      expect(spawner.getActiveAgents()).not.toContain(agent2);
    });

    it('should return empty when no active agents', () => {
      spawner.spawn(createConfig());
      expect(spawner.getActiveAgents()).toEqual([]);
    });
  });

  describe('getAgentsBySession', () => {
    it('should return agents for specific session', () => {
      const agent1 = spawner.spawn(createConfig({ sessionId: 'session-1' }));
      const agent2 = spawner.spawn(createConfig({ sessionId: 'session-2' }));
      const agent3 = spawner.spawn(createConfig({ sessionId: 'session-1' }));
      const sessionAgents = spawner.getAgentsBySession('session-1');
      expect(sessionAgents).toContain(agent1);
      expect(sessionAgents).toContain(agent3);
      expect(sessionAgents).not.toContain(agent2);
    });

    it('should return empty for unknown session', () => {
      spawner.spawn(createConfig());
      expect(spawner.getAgentsBySession('unknown')).toEqual([]);
    });
  });

  describe('getChildAgents', () => {
    it('should return child agents of parent', () => {
      const parent = spawner.spawn(createConfig({ id: 'parent' }));
      const child1 = spawner.spawn(
        createConfig({ parentAgentId: 'parent' })
      );
      const child2 = spawner.spawn(
        createConfig({ parentAgentId: 'parent' })
      );
      const other = spawner.spawn(createConfig());
      const children = spawner.getChildAgents('parent');
      expect(children).toContain(child1);
      expect(children).toContain(child2);
      expect(children).not.toContain(parent);
      expect(children).not.toContain(other);
    });

    it('should return empty for agent without children', () => {
      spawner.spawn(createConfig({ id: 'alone' }));
      expect(spawner.getChildAgents('alone')).toEqual([]);
    });
  });

  describe('terminateAgent', () => {
    it('should remove agent from spawner', async () => {
      spawner.spawn(createConfig({ id: 'test-id' }));
      await spawner.terminateAgent('test-id');
      expect(spawner.getAgent('test-id')).toBeUndefined();
    });

    it('should throw for unknown agent', async () => {
      await expect(spawner.terminateAgent('unknown')).rejects.toThrow(
        'Agent not found: unknown'
      );
    });

    it('should terminate child agents recursively', async () => {
      spawner.spawn(createConfig({ id: 'parent' }));
      spawner.spawn(createConfig({ id: 'child1', parentAgentId: 'parent' }));
      spawner.spawn(createConfig({ id: 'child2', parentAgentId: 'parent' }));
      await spawner.terminateAgent('parent');
      expect(spawner.getAgentCount()).toBe(0);
    });

    it('should terminate grandchildren', async () => {
      spawner.spawn(createConfig({ id: 'grandparent' }));
      spawner.spawn(
        createConfig({ id: 'parent', parentAgentId: 'grandparent' })
      );
      spawner.spawn(
        createConfig({ id: 'child', parentAgentId: 'parent' })
      );
      await spawner.terminateAgent('grandparent');
      expect(spawner.getAgentCount()).toBe(0);
    });
  });

  describe('terminateSession', () => {
    it('should terminate all agents in session', async () => {
      spawner.spawn(createConfig({ sessionId: 'session-1' }));
      spawner.spawn(createConfig({ sessionId: 'session-1' }));
      spawner.spawn(createConfig({ sessionId: 'session-2' }));
      await spawner.terminateSession('session-1');
      expect(spawner.getAgentCount()).toBe(1);
      expect(spawner.getAgentsBySession('session-1')).toEqual([]);
    });

    it('should handle empty session', async () => {
      await spawner.terminateSession('unknown');
      expect(spawner.getAgentCount()).toBe(0);
    });
  });

  describe('getAgentCount', () => {
    it('should return 0 initially', () => {
      expect(spawner.getAgentCount()).toBe(0);
    });

    it('should track agent count', () => {
      spawner.spawn(createConfig());
      spawner.spawn(createConfig());
      expect(spawner.getAgentCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all agents', () => {
      spawner.spawn(createConfig());
      spawner.spawn(createConfig());
      spawner.clear();
      expect(spawner.getAgentCount()).toBe(0);
      expect(spawner.listAgents()).toEqual([]);
    });
  });

  describe('BASE_AGENTS integration', () => {
    beforeEach(() => {
      Object.entries(BASE_AGENTS).forEach(([name, def]) => {
        spawner.registerAgentDefinition(name, def);
      });
    });

    it('should have default agent', () => {
      expect(spawner.getAgentDefinition('default')).toBeDefined();
    });

    it('should have researcher agent', () => {
      expect(spawner.getAgentDefinition('researcher')).toBeDefined();
    });

    it('should have coder agent', () => {
      expect(spawner.getAgentDefinition('coder')).toBeDefined();
    });

    it('should have coordinator agent', () => {
      expect(spawner.getAgentDefinition('coordinator')).toBeDefined();
    });

    it('should spawn all base agents', () => {
      const agents = spawner.listAgentDefinitions().map((name) =>
        spawner.spawnByName(name, 'session')
      );
      expect(agents.length).toBe(4);
    });
  });
});
