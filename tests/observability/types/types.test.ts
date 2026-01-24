import {
  ObservabilityEventType,
  ObservabilityEvent,
  EventMetadata,
  ErrorInfo,
  AgentSpawnEventData,
  SkillInvokeEventData,
  MemoryEventData,
  RatingEventData,
  MemoryMetrics,
  AgentMetrics,
  SkillMetrics,
  SystemMetrics,
  TimeSeriesPoint,
  TimeSeriesMetric,
  MetricsDashboardData,
  SystemAlert,
} from '../../../src/observability/types';

describe('Observability Types', () => {
  describe('ObservabilityEventType', () => {
    const ALL_EVENT_TYPES: ObservabilityEventType[] = [
      'agent:spawn',
      'agent:complete',
      'agent:error',
      'agent:terminate',
      'skill:invoke',
      'skill:complete',
      'skill:error',
      'memory:write',
      'memory:read',
      'memory:consolidate',
      'user:rating',
      'user:feedback',
      'session:start',
      'session:end',
      'rlm:step',
      'rlm:complete',
      'system:error',
      'system:warning',
    ];

    it('should have at least 18 event types', () => {
      expect(ALL_EVENT_TYPES.length).toBeGreaterThanOrEqual(18);
    });

    it('should have all agent event types', () => {
      const agentTypes = ALL_EVENT_TYPES.filter((t) => t.startsWith('agent:'));
      expect(agentTypes).toContain('agent:spawn');
      expect(agentTypes).toContain('agent:complete');
      expect(agentTypes).toContain('agent:error');
      expect(agentTypes).toContain('agent:terminate');
      expect(agentTypes).toHaveLength(4);
    });

    it('should have all skill event types', () => {
      const skillTypes = ALL_EVENT_TYPES.filter((t) => t.startsWith('skill:'));
      expect(skillTypes).toContain('skill:invoke');
      expect(skillTypes).toContain('skill:complete');
      expect(skillTypes).toContain('skill:error');
      expect(skillTypes).toHaveLength(3);
    });

    it('should have all memory event types', () => {
      const memoryTypes = ALL_EVENT_TYPES.filter((t) => t.startsWith('memory:'));
      expect(memoryTypes).toContain('memory:write');
      expect(memoryTypes).toContain('memory:read');
      expect(memoryTypes).toContain('memory:consolidate');
      expect(memoryTypes).toHaveLength(3);
    });

    it('should have all user event types', () => {
      const userTypes = ALL_EVENT_TYPES.filter((t) => t.startsWith('user:'));
      expect(userTypes).toContain('user:rating');
      expect(userTypes).toContain('user:feedback');
      expect(userTypes).toHaveLength(2);
    });

    it('should have all session event types', () => {
      const sessionTypes = ALL_EVENT_TYPES.filter((t) => t.startsWith('session:'));
      expect(sessionTypes).toContain('session:start');
      expect(sessionTypes).toContain('session:end');
      expect(sessionTypes).toHaveLength(2);
    });

    it('should have all rlm event types', () => {
      const rlmTypes = ALL_EVENT_TYPES.filter((t) => t.startsWith('rlm:'));
      expect(rlmTypes).toContain('rlm:step');
      expect(rlmTypes).toContain('rlm:complete');
      expect(rlmTypes).toHaveLength(2);
    });

    it('should have all system event types', () => {
      const systemTypes = ALL_EVENT_TYPES.filter((t) => t.startsWith('system:'));
      expect(systemTypes).toContain('system:error');
      expect(systemTypes).toContain('system:warning');
      expect(systemTypes).toHaveLength(2);
    });

    it('should have all event types as valid strings', () => {
      for (const eventType of ALL_EVENT_TYPES) {
        expect(typeof eventType).toBe('string');
        expect(eventType.length).toBeGreaterThan(0);
        expect(eventType).toMatch(/^[a-z]+:[a-z]+$/);
      }
    });
  });

  describe('EventMetadata', () => {
    it('should create valid metadata with required fields', () => {
      const metadata: EventMetadata = {
        source: 'test-component',
        version: '1.0.0',
        environment: 'test',
      };

      expect(metadata.source).toBe('test-component');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.environment).toBe('test');
    });

    it('should support optional fields', () => {
      const metadata: EventMetadata = {
        source: 'test-component',
        version: '1.0.0',
        environment: 'dev',
        correlationId: 'corr-123',
        parentId: 'parent-456',
        tags: ['tag1', 'tag2'],
      };

      expect(metadata.correlationId).toBe('corr-123');
      expect(metadata.parentId).toBe('parent-456');
      expect(metadata.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('ErrorInfo', () => {
    it('should create valid error info with message only', () => {
      const error: ErrorInfo = {
        message: 'Something went wrong',
      };

      expect(error.message).toBe('Something went wrong');
    });

    it('should support all optional error fields', () => {
      const error: ErrorInfo = {
        message: 'Error occurred',
        code: 'ERR_001',
        stack: 'Error: Error occurred\n  at test.ts:1:1',
        context: { userId: '123', action: 'save' },
      };

      expect(error.code).toBe('ERR_001');
      expect(error.stack).toContain('Error occurred');
      expect(error.context).toEqual({ userId: '123', action: 'save' });
    });
  });

  describe('ObservabilityEvent', () => {
    it('should create valid event with required fields', () => {
      const event: ObservabilityEvent = {
        id: 'evt-123',
        type: 'agent:spawn',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        sessionId: 'session-456',
        data: { test: 'data' },
        metadata: {
          source: 'test',
          version: '1.0.0',
          environment: 'test',
        },
      };

      expect(event.id).toBe('evt-123');
      expect(event.type).toBe('agent:spawn');
      expect(event.sessionId).toBe('session-456');
      expect(event.data).toEqual({ test: 'data' });
    });

    it('should support optional event fields', () => {
      const event: ObservabilityEvent = {
        id: 'evt-123',
        type: 'skill:complete',
        timestamp: new Date(),
        sessionId: 'session-456',
        userId: 'user-789',
        data: {},
        metadata: {
          source: 'test',
          version: '1.0.0',
          environment: 'test',
        },
        duration: 150,
        success: true,
        error: undefined,
      };

      expect(event.userId).toBe('user-789');
      expect(event.duration).toBe(150);
      expect(event.success).toBe(true);
    });

    it('should support error events', () => {
      const event: ObservabilityEvent = {
        id: 'evt-error',
        type: 'system:error',
        timestamp: new Date(),
        sessionId: 'session-456',
        data: {},
        metadata: {
          source: 'test',
          version: '1.0.0',
          environment: 'test',
        },
        success: false,
        error: {
          message: 'Critical failure',
          code: 'CRIT_001',
        },
      };

      expect(event.success).toBe(false);
      expect(event.error?.message).toBe('Critical failure');
      expect(event.error?.code).toBe('CRIT_001');
    });

    it('should serialize and deserialize correctly', () => {
      const event: ObservabilityEvent = {
        id: 'evt-123',
        type: 'memory:write',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        sessionId: 'session-456',
        data: { key: 'test-key', size: 1024 },
        metadata: {
          source: 'memory-manager',
          version: '1.0.0',
          environment: 'prod',
          tags: ['important'],
        },
        duration: 25,
        success: true,
      };

      const serialized = JSON.stringify(event);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.id).toBe(event.id);
      expect(deserialized.type).toBe(event.type);
      expect(deserialized.sessionId).toBe(event.sessionId);
      expect(deserialized.data).toEqual(event.data);
      expect(deserialized.duration).toBe(event.duration);
      expect(deserialized.success).toBe(event.success);
      // Note: Date becomes string after JSON serialization
      expect(new Date(deserialized.timestamp).toISOString()).toBe(event.timestamp.toISOString());
    });
  });

  describe('AgentSpawnEventData', () => {
    it('should create valid agent spawn data', () => {
      const data: AgentSpawnEventData = {
        agentId: 'agent-001',
        agentName: 'ResearchAgent',
        traits: ['analytical', 'thorough'],
        task: 'Analyze codebase',
      };

      expect(data.agentId).toBe('agent-001');
      expect(data.agentName).toBe('ResearchAgent');
      expect(data.traits).toContain('analytical');
      expect(data.task).toBe('Analyze codebase');
    });

    it('should work with minimal required fields', () => {
      const data: AgentSpawnEventData = {
        agentId: 'agent-002',
        agentName: 'SimpleAgent',
      };

      expect(data.agentId).toBe('agent-002');
      expect(data.traits).toBeUndefined();
      expect(data.task).toBeUndefined();
    });
  });

  describe('SkillInvokeEventData', () => {
    it('should create valid skill invoke data', () => {
      const data: SkillInvokeEventData = {
        skillName: 'code-review',
        inputs: { file: 'test.ts', lines: [1, 50] },
        matchConfidence: 0.95,
      };

      expect(data.skillName).toBe('code-review');
      expect(data.inputs).toEqual({ file: 'test.ts', lines: [1, 50] });
      expect(data.matchConfidence).toBe(0.95);
    });

    it('should work without confidence score', () => {
      const data: SkillInvokeEventData = {
        skillName: 'format-code',
        inputs: {},
      };

      expect(data.skillName).toBe('format-code');
      expect(data.matchConfidence).toBeUndefined();
    });
  });

  describe('MemoryEventData', () => {
    it('should create valid memory event data', () => {
      const data: MemoryEventData = {
        tier: 'immediate',
        operation: 'write',
        key: 'current-task',
        size: 2048,
      };

      expect(data.tier).toBe('immediate');
      expect(data.operation).toBe('write');
      expect(data.key).toBe('current-task');
      expect(data.size).toBe(2048);
    });

    it('should support all tier values', () => {
      const tiers: MemoryEventData['tier'][] = ['immediate', 'short-term', 'long-term'];

      for (const tier of tiers) {
        const data: MemoryEventData = { tier, operation: 'read' };
        expect(data.tier).toBe(tier);
      }
    });

    it('should support all operation values', () => {
      const operations: MemoryEventData['operation'][] = ['read', 'write', 'delete', 'consolidate'];

      for (const operation of operations) {
        const data: MemoryEventData = { tier: 'immediate', operation };
        expect(data.operation).toBe(operation);
      }
    });
  });

  describe('RatingEventData', () => {
    it('should create valid rating event data', () => {
      const data: RatingEventData = {
        rating: 8,
        ratingType: 'explicit',
        targetType: 'response',
        targetId: 'resp-123',
        comment: 'Very helpful!',
      };

      expect(data.rating).toBe(8);
      expect(data.ratingType).toBe('explicit');
      expect(data.targetType).toBe('response');
      expect(data.targetId).toBe('resp-123');
      expect(data.comment).toBe('Very helpful!');
    });

    it('should support implicit ratings', () => {
      const data: RatingEventData = {
        rating: 6,
        ratingType: 'implicit',
        targetType: 'session',
      };

      expect(data.ratingType).toBe('implicit');
      expect(data.comment).toBeUndefined();
    });

    it('should support all target types', () => {
      const targetTypes: RatingEventData['targetType'][] = ['agent', 'skill', 'response', 'session'];

      for (const targetType of targetTypes) {
        const data: RatingEventData = {
          rating: 5,
          ratingType: 'explicit',
          targetType,
        };
        expect(data.targetType).toBe(targetType);
      }
    });
  });

  describe('MemoryMetrics', () => {
    it('should create valid memory metrics', () => {
      const metrics: MemoryMetrics = {
        immediateTokens: 1000,
        shortTermTokens: 5000,
        longTermEntries: 50,
        totalSize: 102400,
        hitRate: 0.85,
        averageRetrievalTime: 15,
      };

      expect(metrics.immediateTokens).toBe(1000);
      expect(metrics.shortTermTokens).toBe(5000);
      expect(metrics.longTermEntries).toBe(50);
      expect(metrics.totalSize).toBe(102400);
      expect(metrics.hitRate).toBe(0.85);
      expect(metrics.averageRetrievalTime).toBe(15);
    });

    it('should have all required fields', () => {
      const metrics: MemoryMetrics = {
        immediateTokens: 0,
        shortTermTokens: 0,
        longTermEntries: 0,
        totalSize: 0,
        hitRate: 0,
        averageRetrievalTime: 0,
      };

      expect(Object.keys(metrics)).toHaveLength(6);
    });
  });

  describe('AgentMetrics', () => {
    it('should create valid agent metrics', () => {
      const metrics: AgentMetrics = {
        totalSpawned: 100,
        activeCount: 5,
        averageTaskDuration: 2500,
        successRate: 0.92,
        errorRate: 0.08,
        byType: {
          ResearchAgent: 40,
          CodeAgent: 35,
          ReviewAgent: 25,
        },
      };

      expect(metrics.totalSpawned).toBe(100);
      expect(metrics.activeCount).toBe(5);
      expect(metrics.averageTaskDuration).toBe(2500);
      expect(metrics.successRate).toBe(0.92);
      expect(metrics.errorRate).toBe(0.08);
      expect(metrics.byType['ResearchAgent']).toBe(40);
    });

    it('should have all required fields', () => {
      const metrics: AgentMetrics = {
        totalSpawned: 0,
        activeCount: 0,
        averageTaskDuration: 0,
        successRate: 0,
        errorRate: 0,
        byType: {},
      };

      expect(Object.keys(metrics)).toHaveLength(6);
    });
  });

  describe('SkillMetrics', () => {
    it('should create valid skill metrics', () => {
      const metrics: SkillMetrics = {
        totalInvocations: 500,
        averageLatency: 120,
        successRate: 0.98,
        popularSkills: [
          { name: 'code-review', count: 150 },
          { name: 'refactor', count: 100 },
        ],
        routingAccuracy: 0.95,
      };

      expect(metrics.totalInvocations).toBe(500);
      expect(metrics.averageLatency).toBe(120);
      expect(metrics.successRate).toBe(0.98);
      expect(metrics.popularSkills).toHaveLength(2);
      expect(metrics.routingAccuracy).toBe(0.95);
    });
  });

  describe('SystemMetrics', () => {
    it('should create valid system metrics', () => {
      const metrics: SystemMetrics = {
        uptime: 86400,
        activeAgents: 3,
        memoryCurrent: {
          immediateTokens: 1000,
          shortTermTokens: 5000,
          longTermEntries: 50,
          totalSize: 102400,
          hitRate: 0.85,
          averageRetrievalTime: 15,
        },
        skillStats: {
          totalInvocations: 500,
          averageLatency: 120,
          successRate: 0.98,
          popularSkills: [],
          routingAccuracy: 0.95,
        },
        agentStats: {
          totalSpawned: 100,
          activeCount: 3,
          averageTaskDuration: 2500,
          successRate: 0.92,
          errorRate: 0.08,
          byType: {},
        },
        averageResponseTime: 350,
        errorRate: 0.02,
        requestsPerMinute: 25,
        timestamp: new Date(),
      };

      expect(metrics.uptime).toBe(86400);
      expect(metrics.activeAgents).toBe(3);
      expect(metrics.memoryCurrent.hitRate).toBe(0.85);
      expect(metrics.skillStats.successRate).toBe(0.98);
      expect(metrics.agentStats.totalSpawned).toBe(100);
      expect(metrics.averageResponseTime).toBe(350);
      expect(metrics.requestsPerMinute).toBe(25);
    });
  });

  describe('TimeSeriesPoint', () => {
    it('should create valid time series point', () => {
      const point: TimeSeriesPoint = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        value: 42.5,
      };

      expect(point.timestamp).toBeInstanceOf(Date);
      expect(point.value).toBe(42.5);
    });
  });

  describe('TimeSeriesMetric', () => {
    it('should create valid time series metric', () => {
      const metric: TimeSeriesMetric = {
        name: 'response_time',
        points: [
          { timestamp: new Date('2024-01-01T12:00:00Z'), value: 100 },
          { timestamp: new Date('2024-01-01T12:01:00Z'), value: 120 },
          { timestamp: new Date('2024-01-01T12:02:00Z'), value: 95 },
        ],
        aggregation: 'avg',
      };

      expect(metric.name).toBe('response_time');
      expect(metric.points).toHaveLength(3);
      expect(metric.aggregation).toBe('avg');
    });

    it('should support all aggregation types', () => {
      const aggregations: TimeSeriesMetric['aggregation'][] = ['sum', 'avg', 'max', 'min', 'count'];

      for (const aggregation of aggregations) {
        const metric: TimeSeriesMetric = {
          name: 'test',
          points: [],
          aggregation,
        };
        expect(metric.aggregation).toBe(aggregation);
      }
    });
  });

  describe('SystemAlert', () => {
    it('should create valid system alert', () => {
      const alert: SystemAlert = {
        id: 'alert-001',
        severity: 'warning',
        message: 'Memory usage above 80%',
        timestamp: new Date(),
        acknowledged: false,
      };

      expect(alert.id).toBe('alert-001');
      expect(alert.severity).toBe('warning');
      expect(alert.message).toBe('Memory usage above 80%');
      expect(alert.acknowledged).toBe(false);
    });

    it('should support all severity levels', () => {
      const severities: SystemAlert['severity'][] = ['info', 'warning', 'error', 'critical'];

      for (const severity of severities) {
        const alert: SystemAlert = {
          id: 'test',
          severity,
          message: 'Test alert',
          timestamp: new Date(),
          acknowledged: true,
        };
        expect(alert.severity).toBe(severity);
      }
    });
  });

  describe('MetricsDashboardData', () => {
    it('should create valid dashboard data', () => {
      const now = new Date();
      const dashboardData: MetricsDashboardData = {
        system: {
          uptime: 3600,
          activeAgents: 2,
          memoryCurrent: {
            immediateTokens: 500,
            shortTermTokens: 2500,
            longTermEntries: 25,
            totalSize: 51200,
            hitRate: 0.9,
            averageRetrievalTime: 10,
          },
          skillStats: {
            totalInvocations: 100,
            averageLatency: 100,
            successRate: 0.95,
            popularSkills: [],
            routingAccuracy: 0.9,
          },
          agentStats: {
            totalSpawned: 50,
            activeCount: 2,
            averageTaskDuration: 2000,
            successRate: 0.9,
            errorRate: 0.1,
            byType: {},
          },
          averageResponseTime: 300,
          errorRate: 0.05,
          requestsPerMinute: 20,
          timestamp: now,
        },
        timeSeries: {
          responseTime: { name: 'responseTime', points: [], aggregation: 'avg' },
          activeAgents: { name: 'activeAgents', points: [], aggregation: 'max' },
          errorRate: { name: 'errorRate', points: [], aggregation: 'avg' },
          memoryUsage: { name: 'memoryUsage', points: [], aggregation: 'max' },
        },
        recentEvents: [],
        alerts: [],
      };

      expect(dashboardData.system.uptime).toBe(3600);
      expect(dashboardData.timeSeries.responseTime.aggregation).toBe('avg');
      expect(dashboardData.recentEvents).toEqual([]);
      expect(dashboardData.alerts).toEqual([]);
    });

    it('should support events and alerts', () => {
      const dashboardData: MetricsDashboardData = {
        system: {
          uptime: 0,
          activeAgents: 0,
          memoryCurrent: {
            immediateTokens: 0,
            shortTermTokens: 0,
            longTermEntries: 0,
            totalSize: 0,
            hitRate: 0,
            averageRetrievalTime: 0,
          },
          skillStats: {
            totalInvocations: 0,
            averageLatency: 0,
            successRate: 0,
            popularSkills: [],
            routingAccuracy: 0,
          },
          agentStats: {
            totalSpawned: 0,
            activeCount: 0,
            averageTaskDuration: 0,
            successRate: 0,
            errorRate: 0,
            byType: {},
          },
          averageResponseTime: 0,
          errorRate: 0,
          requestsPerMinute: 0,
          timestamp: new Date(),
        },
        timeSeries: {
          responseTime: { name: 'responseTime', points: [], aggregation: 'avg' },
          activeAgents: { name: 'activeAgents', points: [], aggregation: 'max' },
          errorRate: { name: 'errorRate', points: [], aggregation: 'avg' },
          memoryUsage: { name: 'memoryUsage', points: [], aggregation: 'max' },
        },
        recentEvents: [
          {
            id: 'evt-1',
            type: 'session:start',
            timestamp: new Date(),
            sessionId: 'sess-1',
            data: {},
            metadata: { source: 'test', version: '1.0', environment: 'test' },
          },
        ],
        alerts: [
          {
            id: 'alert-1',
            severity: 'info',
            message: 'System started',
            timestamp: new Date(),
            acknowledged: true,
          },
        ],
      };

      expect(dashboardData.recentEvents).toHaveLength(1);
      expect(dashboardData.alerts).toHaveLength(1);
      expect(dashboardData.recentEvents[0].type).toBe('session:start');
      expect(dashboardData.alerts[0].severity).toBe('info');
    });

    it('should serialize and deserialize correctly', () => {
      const dashboardData: MetricsDashboardData = {
        system: {
          uptime: 7200,
          activeAgents: 1,
          memoryCurrent: {
            immediateTokens: 100,
            shortTermTokens: 500,
            longTermEntries: 10,
            totalSize: 10240,
            hitRate: 0.8,
            averageRetrievalTime: 5,
          },
          skillStats: {
            totalInvocations: 50,
            averageLatency: 80,
            successRate: 0.96,
            popularSkills: [{ name: 'test-skill', count: 25 }],
            routingAccuracy: 0.92,
          },
          agentStats: {
            totalSpawned: 20,
            activeCount: 1,
            averageTaskDuration: 1500,
            successRate: 0.95,
            errorRate: 0.05,
            byType: { TestAgent: 20 },
          },
          averageResponseTime: 200,
          errorRate: 0.01,
          requestsPerMinute: 15,
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        timeSeries: {
          responseTime: {
            name: 'responseTime',
            points: [{ timestamp: new Date('2024-01-01T00:00:00Z'), value: 200 }],
            aggregation: 'avg',
          },
          activeAgents: { name: 'activeAgents', points: [], aggregation: 'max' },
          errorRate: { name: 'errorRate', points: [], aggregation: 'avg' },
          memoryUsage: { name: 'memoryUsage', points: [], aggregation: 'max' },
        },
        recentEvents: [],
        alerts: [],
      };

      const serialized = JSON.stringify(dashboardData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.system.uptime).toBe(7200);
      expect(deserialized.system.skillStats.popularSkills[0].name).toBe('test-skill');
      expect(deserialized.timeSeries.responseTime.points[0].value).toBe(200);
    });
  });
});
