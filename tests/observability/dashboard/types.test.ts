/**
 * Dashboard Types Tests
 *
 * Type-level tests for dashboard type definitions.
 */

import type {
  DashboardConfig,
  DashboardState,
  StatusUpdate,
  AgentActivity,
  DashboardTask,
  DashboardEvent,
  WebSocketMessage,
  WebSocketMessageType,
  ClientSubscription,
  ApiResponse,
} from '../../../src/observability/dashboard/types';

describe('Dashboard Types', () => {
  describe('DashboardConfig', () => {
    it('should allow valid configuration', () => {
      const config: DashboardConfig = {
        port: 3000,
        host: 'localhost',
        staticPath: '/path/to/static',
        enableCors: true,
        wsPingInterval: 30000,
        maxEventHistory: 1000,
      };

      expect(config.port).toBe(3000);
      expect(config.host).toBe('localhost');
    });

    it('should allow minimal configuration', () => {
      const config: DashboardConfig = {
        port: 8080,
        host: '0.0.0.0',
      };

      expect(config.port).toBe(8080);
    });
  });

  describe('StatusUpdate', () => {
    it('should define all status fields', () => {
      const status: StatusUpdate = {
        model: 'claude-3-opus',
        contextUsage: 45.5,
        learningScore: 8.2,
        activeAgents: 3,
        pendingTasks: 7,
      };

      expect(status.model).toBe('claude-3-opus');
      expect(status.contextUsage).toBe(45.5);
      expect(status.learningScore).toBe(8.2);
      expect(status.activeAgents).toBe(3);
      expect(status.pendingTasks).toBe(7);
    });
  });

  describe('AgentActivity', () => {
    it('should define active agent', () => {
      const agent: AgentActivity = {
        id: 'agent-123',
        name: 'Research Agent',
        status: 'active',
        task: 'Analyzing data',
        startedAt: new Date(),
        traits: ['analytical', 'thorough'],
      };

      expect(agent.id).toBe('agent-123');
      expect(agent.status).toBe('active');
      expect(agent.traits).toContain('analytical');
    });

    it('should allow completed agent with completedAt', () => {
      const agent: AgentActivity = {
        id: 'agent-456',
        name: 'Complete Agent',
        status: 'completed',
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-02'),
      };

      expect(agent.status).toBe('completed');
      expect(agent.completedAt).toBeDefined();
    });

    it('should allow all status values', () => {
      const statuses: AgentActivity['status'][] = [
        'active',
        'idle',
        'completed',
        'failed',
      ];

      statuses.forEach((status) => {
        const agent: AgentActivity = {
          id: 'test',
          name: 'Test',
          status,
          startedAt: new Date(),
        };
        expect(agent.status).toBe(status);
      });
    });
  });

  describe('DashboardTask', () => {
    it('should define task with progress', () => {
      const task: DashboardTask = {
        id: 'task-1',
        name: 'Process data',
        status: 'running',
        progress: 65,
        createdAt: new Date(),
        startedAt: new Date(),
      };

      expect(task.progress).toBe(65);
      expect(task.status).toBe('running');
    });

    it('should define failed task with error', () => {
      const task: DashboardTask = {
        id: 'task-2',
        name: 'Failed task',
        status: 'failed',
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        error: 'Connection timeout',
      };

      expect(task.status).toBe('failed');
      expect(task.error).toBe('Connection timeout');
    });

    it('should allow all status values', () => {
      const statuses: DashboardTask['status'][] = [
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled',
      ];

      statuses.forEach((status) => {
        const task: DashboardTask = {
          id: 'test',
          name: 'Test',
          status,
          createdAt: new Date(),
        };
        expect(task.status).toBe(status);
      });
    });
  });

  describe('DashboardEvent', () => {
    it('should define event with details', () => {
      const event: DashboardEvent = {
        id: 'evt-1',
        type: 'agent:spawn',
        timestamp: new Date(),
        summary: 'Agent spawned for task',
        details: { agentId: 'a1', task: 'research' },
        severity: 'info',
      };

      expect(event.type).toBe('agent:spawn');
      expect(event.severity).toBe('info');
    });

    it('should allow all severity values', () => {
      const severities: DashboardEvent['severity'][] = [
        'info',
        'warning',
        'error',
      ];

      severities.forEach((severity) => {
        const event: DashboardEvent = {
          id: 'test',
          type: 'test',
          timestamp: new Date(),
          summary: 'Test event',
          severity,
        };
        expect(event.severity).toBe(severity);
      });
    });
  });

  describe('WebSocketMessage', () => {
    it('should define typed message', () => {
      interface TestData {
        value: number;
      }

      const message: WebSocketMessage<TestData> = {
        type: 'status',
        timestamp: new Date().toISOString(),
        data: { value: 42 },
      };

      expect(message.type).toBe('status');
      expect(message.data.value).toBe(42);
    });

    it('should allow all message types', () => {
      const types: WebSocketMessageType[] = [
        'status',
        'event',
        'metrics',
        'agents',
        'tasks',
        'alert',
        'ping',
        'pong',
      ];

      types.forEach((type) => {
        const message: WebSocketMessage = {
          type,
          timestamp: new Date().toISOString(),
          data: {},
        };
        expect(message.type).toBe(type);
      });
    });
  });

  describe('ClientSubscription', () => {
    it('should define subscription options', () => {
      const subscription: ClientSubscription = {
        status: true,
        agents: true,
        tasks: false,
        events: true,
        eventTypes: ['agent:spawn', 'agent:complete'],
      };

      expect(subscription.status).toBe(true);
      expect(subscription.eventTypes).toContain('agent:spawn');
    });

    it('should allow minimal subscription', () => {
      const subscription: ClientSubscription = {
        status: false,
        agents: false,
        tasks: false,
        events: false,
      };

      expect(subscription.status).toBe(false);
    });
  });

  describe('DashboardState', () => {
    it('should define complete dashboard state', () => {
      const state: DashboardState = {
        status: {
          model: 'test',
          contextUsage: 50,
          learningScore: 5,
          activeAgents: 1,
          pendingTasks: 2,
        },
        agents: [],
        tasks: [],
        events: [],
        connectionCount: 3,
        uptime: 3600,
      };

      expect(state.connectionCount).toBe(3);
      expect(state.uptime).toBe(3600);
    });
  });

  describe('ApiResponse', () => {
    it('should define success response', () => {
      const response: ApiResponse<{ count: number }> = {
        success: true,
        data: { count: 10 },
        timestamp: new Date().toISOString(),
      };

      expect(response.success).toBe(true);
      expect(response.data?.count).toBe(10);
    });

    it('should define error response', () => {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Something went wrong',
        timestamp: new Date().toISOString(),
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });
  });
});
