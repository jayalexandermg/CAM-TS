import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AuditLogger,
  MemoryAuditStorage,
  JsonlAuditStorage,
} from '../../../src/observability/audit';
import { ObservabilityEvent, ObservabilityEventType } from '../../../src/observability/types';

describe('AuditLogger', () => {
  let logger: AuditLogger;
  const testLogDir = path.join(__dirname, '.test-logs');
  const testLogFile = path.join(testLogDir, 'test-audit.jsonl');

  afterEach(async () => {
    if (logger) {
      await logger.close();
    }
    // Clean up test files
    await fs.rm(testLogDir, { recursive: true, force: true });
  });

  describe('Initialization', () => {
    it('should create logger with memory storage', () => {
      logger = new AuditLogger({
        storage: { type: 'memory' },
      });

      expect(logger).toBeInstanceOf(AuditLogger);
      expect(logger.getSessionId()).toBeDefined();
      expect(logger.getSessionId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should create logger with JSONL storage', () => {
      logger = new AuditLogger({
        storage: { type: 'jsonl', path: testLogFile },
      });

      expect(logger).toBeInstanceOf(AuditLogger);
    });

    it('should apply default metadata', async () => {
      logger = new AuditLogger({
        storage: { type: 'memory' },
        defaultMetadata: {
          source: 'test-source',
          tags: ['unit-test'],
        },
      });

      const event = await logger.log('session:start', { test: true });

      expect(event.metadata.source).toBe('test-source');
      expect(event.metadata.tags).toEqual(['unit-test']);
    });
  });

  describe('Logging Events', () => {
    beforeEach(() => {
      logger = new AuditLogger({
        storage: { type: 'memory' },
      });
    });

    it('should log basic event with correct structure', async () => {
      const event = await logger.log('session:start', { userId: 'user-123' });

      expect(event.id).toBeDefined();
      expect(event.type).toBe('session:start');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.sessionId).toBe(logger.getSessionId());
      expect(event.data).toEqual({ userId: 'user-123' });
      expect(event.metadata.source).toBe('cam');
      expect(event.metadata.version).toBe('1.0.0');
    });

    it('should log event with duration', async () => {
      const event = await logger.log('skill:complete', { skillName: 'test' }, { duration: 150 });

      expect(event.duration).toBe(150);
    });

    it('should log event with success flag', async () => {
      const event = await logger.log('agent:complete', { agentId: 'a-1' }, { success: true });

      expect(event.success).toBe(true);
    });

    it('should log event with error information', async () => {
      const error = new Error('Something went wrong');
      (error as Error & { code: string }).code = 'ERR_TEST';

      const event = await logger.log('system:error', { context: 'test' }, { error });

      expect(event.error).toBeDefined();
      expect(event.error?.message).toBe('Something went wrong');
      expect(event.error?.code).toBe('ERR_TEST');
    });

    it('should log agent spawn events', async () => {
      await logger.logAgentSpawn('agent-001', 'ResearchAgent', ['analytical', 'thorough']);

      const events = await logger.query({ type: 'agent:spawn' });

      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({
        agentId: 'agent-001',
        agentName: 'ResearchAgent',
        traits: ['analytical', 'thorough'],
      });
    });

    it('should log skill invocations', async () => {
      await logger.logSkillInvoke('code-review', { file: 'test.ts' });

      const events = await logger.query({ type: 'skill:invoke' });

      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({
        skillName: 'code-review',
        inputs: { file: 'test.ts' },
      });
    });

    it('should log memory operations', async () => {
      await logger.logMemoryOp('short-term', 'write', 'user-preferences');

      const events = await logger.query({ type: 'memory:write' });

      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({
        tier: 'short-term',
        operation: 'write',
        key: 'user-preferences',
      });
    });
  });

  describe('Querying Events', () => {
    beforeEach(async () => {
      logger = new AuditLogger({
        storage: { type: 'memory' },
      });

      // Log multiple events
      await logger.log('session:start', {});
      await logger.logAgentSpawn('a1', 'Agent1');
      await logger.logAgentSpawn('a2', 'Agent2');
      await logger.logSkillInvoke('skill1', {});
      await logger.logSkillInvoke('skill2', {});
      await logger.log('session:end', {});
    });

    it('should filter by single type', async () => {
      const events = await logger.query({ type: 'agent:spawn' });

      expect(events).toHaveLength(2);
      events.forEach((e) => expect(e.type).toBe('agent:spawn'));
    });

    it('should filter by multiple types', async () => {
      const events = await logger.query({ type: ['session:start', 'session:end'] });

      expect(events).toHaveLength(2);
      expect(events.map((e) => e.type)).toContain('session:start');
      expect(events.map((e) => e.type)).toContain('session:end');
    });

    it('should filter by session ID', async () => {
      const sessionId = logger.getSessionId();
      const events = await logger.query({ sessionId });

      expect(events).toHaveLength(6);
      events.forEach((e) => expect(e.sessionId).toBe(sessionId));
    });

    it('should apply limit', async () => {
      const events = await logger.query({ limit: 3 });

      expect(events).toHaveLength(3);
    });

    it('should apply offset', async () => {
      const allEvents = await logger.query({});
      const offsetEvents = await logger.query({ offset: 2 });

      expect(offsetEvents).toHaveLength(4);
      expect(offsetEvents[0].id).toBe(allEvents[2].id);
    });

    it('should combine limit and offset for pagination', async () => {
      const page1 = await logger.query({ offset: 0, limit: 2 });
      const page2 = await logger.query({ offset: 2, limit: 2 });
      const page3 = await logger.query({ offset: 4, limit: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page3).toHaveLength(2);

      // Verify no overlap
      const allIds = [...page1, ...page2, ...page3].map((e) => e.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(6);
    });
  });

  describe('Real-time Subscriptions', () => {
    beforeEach(() => {
      logger = new AuditLogger({
        storage: { type: 'memory' },
      });
    });

    it('should notify subscribers of new events', async () => {
      const receivedEvents: ObservabilityEvent[] = [];
      logger.subscribe((event) => receivedEvents.push(event));

      await logger.log('session:start', {});
      await logger.logAgentSpawn('a1', 'Agent1');

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].type).toBe('session:start');
      expect(receivedEvents[1].type).toBe('agent:spawn');
    });

    it('should allow unsubscribing', async () => {
      const receivedEvents: ObservabilityEvent[] = [];
      const unsubscribe = logger.subscribe((event) => receivedEvents.push(event));

      await logger.log('session:start', {});
      unsubscribe();
      await logger.log('session:end', {});

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('session:start');
    });

    it('should support multiple subscribers', async () => {
      const subscriber1Events: ObservabilityEvent[] = [];
      const subscriber2Events: ObservabilityEvent[] = [];

      logger.subscribe((event) => subscriber1Events.push(event));
      logger.subscribe((event) => subscriber2Events.push(event));

      await logger.log('session:start', {});

      expect(subscriber1Events).toHaveLength(1);
      expect(subscriber2Events).toHaveLength(1);
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      logger = new AuditLogger({
        storage: { type: 'memory' },
      });

      await logger.logAgentSpawn('a1', 'Agent1');
      await logger.logAgentSpawn('a2', 'Agent2');
      await logger.logSkillInvoke('skill1', {});
      await logger.log('skill:complete', { skillName: 'skill1' }, { duration: 100 });
      await logger.log('skill:complete', { skillName: 'skill2' }, { duration: 200 });
      await logger.log('system:error', {}, { error: new Error('test') });
    });

    it('should calculate agent spawns', async () => {
      const metrics = await logger.getMetrics();

      expect(metrics.activeAgents).toBe(2);
    });

    it('should calculate average response time', async () => {
      const metrics = await logger.getMetrics();

      expect(metrics.averageResponseTime).toBe(150);
    });

    it('should calculate error rate', async () => {
      const metrics = await logger.getMetrics();

      expect(metrics.errorRate).toBeCloseTo(1 / 6, 2);
    });
  });

  describe('Log Rotation', () => {
    it('should rotate memory storage', async () => {
      logger = new AuditLogger({
        storage: { type: 'memory' },
      });

      await logger.log('session:start', {});
      await logger.log('session:end', {});

      const rotatedCount = await logger.rotate();

      expect(rotatedCount).toBe(2);

      const events = await logger.query({});
      expect(events).toHaveLength(0);
    });
  });
});

describe('MemoryAuditStorage', () => {
  let storage: MemoryAuditStorage;

  beforeEach(() => {
    storage = new MemoryAuditStorage({ type: 'memory', maxEntries: 5 });
  });

  afterEach(async () => {
    await storage.close();
  });

  it('should enforce max entries limit', async () => {
    for (let i = 0; i < 10; i++) {
      await storage.write(createTestEvent(`event-${i}`));
    }

    const count = await storage.count();
    expect(count).toBe(5);

    const events = await storage.read({});
    expect(events[0].id).toBe('event-5');
    expect(events[4].id).toBe('event-9');
  });

  it('should filter by time range', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 60000);
    const future = new Date(now.getTime() + 60000);

    await storage.write(createTestEvent('past', past));
    await storage.write(createTestEvent('now', now));
    await storage.write(createTestEvent('future', future));

    const events = await storage.read({
      startTime: new Date(now.getTime() - 1000),
      endTime: new Date(now.getTime() + 1000),
    });

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('now');
  });
});

describe('JsonlAuditStorage', () => {
  let storage: JsonlAuditStorage;
  const testLogDir = path.join(__dirname, '.jsonl-test-logs');
  const testLogFile = path.join(testLogDir, 'test.jsonl');

  afterEach(async () => {
    if (storage) {
      await storage.close();
    }
    await fs.rm(testLogDir, { recursive: true, force: true });
  });

  it('should write and read events from file', async () => {
    storage = new JsonlAuditStorage({ type: 'jsonl', path: testLogFile });

    await storage.write(createTestEvent('event-1'));
    await storage.write(createTestEvent('event-2'));

    const events = await storage.read({});

    expect(events).toHaveLength(2);
    expect(events[0].id).toBe('event-1');
    expect(events[1].id).toBe('event-2');
  });

  it('should create directory if not exists', async () => {
    const nestedPath = path.join(testLogDir, 'nested', 'deep', 'audit.jsonl');
    storage = new JsonlAuditStorage({ type: 'jsonl', path: nestedPath });

    await storage.write(createTestEvent('event-1'));
    await storage.flush();

    const content = await fs.readFile(nestedPath, 'utf-8');
    expect(content).toContain('event-1');
  });

  it('should handle rotation', async () => {
    storage = new JsonlAuditStorage({ type: 'jsonl', path: testLogFile });

    await storage.write(createTestEvent('event-1'));
    await storage.flush();

    const rotatedCount = await storage.rotate();

    expect(rotatedCount).toBe(1);

    // Original file should be renamed
    const files = await fs.readdir(testLogDir);
    expect(files.some((f) => f.includes('.archive'))).toBe(true);
  });
});

// Helper function to create test events
function createTestEvent(
  id: string,
  timestamp: Date = new Date(),
  type: ObservabilityEventType = 'session:start'
): ObservabilityEvent {
  return {
    id,
    type,
    timestamp,
    sessionId: 'test-session',
    data: {},
    metadata: {
      source: 'test',
      version: '1.0.0',
      environment: 'test',
    },
  };
}
