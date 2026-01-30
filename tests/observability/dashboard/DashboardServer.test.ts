/**
 * DashboardServer Tests
 *
 * Tests for the CAM Dashboard server with Express + WebSocket.
 */

import { DashboardServer } from '../../../src/observability/dashboard/DashboardServer';
import type { StatusUpdate, AgentActivity } from '../../../src/observability/dashboard/types';
import type { ObservabilityEvent } from '../../../src/observability/types/events';
import WebSocket from 'ws';

describe('DashboardServer', () => {
  let server: DashboardServer;

  beforeEach(() => {
    server = new DashboardServer({ port: 0, host: 'localhost' });
  });

  afterEach(async () => {
    if (server.isActive()) {
      await server.stop();
    }
  });

  describe('initialization', () => {
    it('should create server with default config', () => {
      const defaultServer = new DashboardServer();
      expect(defaultServer).toBeInstanceOf(DashboardServer);
      expect(defaultServer.isActive()).toBe(false);
    });

    it('should create server with custom config', () => {
      const customServer = new DashboardServer({
        port: 4000,
        host: '0.0.0.0',
        enableCors: false,
      });
      expect(customServer).toBeInstanceOf(DashboardServer);
    });

    it('should start inactive', () => {
      expect(server.isActive()).toBe(false);
      expect(server.getUptime()).toBe(0);
      expect(server.getConnectionCount()).toBe(0);
    });
  });

  describe('start/stop', () => {
    it('should start the server', async () => {
      const startedPromise = new Promise<void>((resolve) => {
        server.on('started', resolve);
      });

      await server.start();
      await startedPromise;

      expect(server.isActive()).toBe(true);
    });

    it('should emit started event with port info', async () => {
      const info = await new Promise<{ port: number; host: string }>((resolve) => {
        server.on('started', resolve);
        server.start();
      });

      expect(info.host).toBe('localhost');
      expect(typeof info.port).toBe('number');
    });

    it('should throw when starting already running server', async () => {
      await server.start();
      await expect(server.start()).rejects.toThrow('already running');
    });

    it('should stop the server', async () => {
      await server.start();
      expect(server.isActive()).toBe(true);

      await server.stop();
      expect(server.isActive()).toBe(false);
    });

    it('should emit stopped event', async () => {
      await server.start();

      const stoppedPromise = new Promise<void>((resolve) => {
        server.on('stopped', resolve);
      });

      await server.stop();
      await stoppedPromise;
    });

    it('should handle stop when not running', async () => {
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should track uptime after start', async () => {
      await server.start();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(server.getUptime()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('status updates', () => {
    it('should update status', () => {
      const update: Partial<StatusUpdate> = {
        model: 'claude-3',
        contextUsage: 50,
      };

      server.updateStatus(update);

      const state = server.getState();
      expect(state.status.model).toBe('claude-3');
      expect(state.status.contextUsage).toBe(50);
    });

    it('should merge partial status updates', () => {
      server.updateStatus({ model: 'model-1' });
      server.updateStatus({ contextUsage: 75 });
      server.updateStatus({ learningScore: 8.5 });

      const state = server.getState();
      expect(state.status.model).toBe('model-1');
      expect(state.status.contextUsage).toBe(75);
      expect(state.status.learningScore).toBe(8.5);
    });

    it('should emit status:updated event', () => {
      const callback = jest.fn();
      server.on('status:updated', callback);

      server.updateStatus({ activeAgents: 3 });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ activeAgents: 3 })
      );
    });
  });

  describe('agent management', () => {
    const testAgent: AgentActivity = {
      id: 'agent-1',
      name: 'Test Agent',
      status: 'active',
      startedAt: new Date(),
      task: 'Test task',
      traits: ['fast', 'reliable'],
    };

    it('should add agent', () => {
      server.addAgent(testAgent);

      const state = server.getState();
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('agent-1');
    });

    it('should emit agent:added event', () => {
      const callback = jest.fn();
      server.on('agent:added', callback);

      server.addAgent(testAgent);

      expect(callback).toHaveBeenCalledWith(testAgent);
    });

    it('should update agent', () => {
      server.addAgent(testAgent);
      server.updateAgent('agent-1', { status: 'completed' });

      const state = server.getState();
      expect(state.agents[0].status).toBe('completed');
    });

    it('should emit agent:updated event', () => {
      const callback = jest.fn();
      server.on('agent:updated', callback);

      server.addAgent(testAgent);
      server.updateAgent('agent-1', { status: 'idle' });

      expect(callback).toHaveBeenCalled();
    });

    it('should not update non-existent agent', () => {
      const callback = jest.fn();
      server.on('agent:updated', callback);

      server.updateAgent('non-existent', { status: 'completed' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should remove agent', () => {
      server.addAgent(testAgent);
      server.removeAgent('agent-1');

      const state = server.getState();
      expect(state.agents).toHaveLength(0);
    });

    it('should emit agent:removed event', () => {
      const callback = jest.fn();
      server.on('agent:removed', callback);

      server.addAgent(testAgent);
      server.removeAgent('agent-1');

      expect(callback).toHaveBeenCalledWith('agent-1');
    });

    it('should handle removing non-existent agent', () => {
      const callback = jest.fn();
      server.on('agent:removed', callback);

      server.removeAgent('non-existent');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    const testEvent: ObservabilityEvent = {
      id: 'evt-1',
      type: 'agent:spawn',
      timestamp: new Date(),
      sessionId: 'session-1',
      data: { agentId: 'a1', agentName: 'Test' },
      metadata: {
        source: 'test',
        version: '1.0.0',
        environment: 'test',
      },
    };

    it('should add event to history', () => {
      server.addEvent(testEvent);

      const state = server.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].id).toBe('evt-1');
    });

    it('should emit event:added event', () => {
      const callback = jest.fn();
      server.on('event:added', callback);

      server.addEvent(testEvent);

      expect(callback).toHaveBeenCalledWith(testEvent);
    });

    it('should limit event history size', () => {
      const smallServer = new DashboardServer({ maxEventHistory: 5 });

      for (let i = 0; i < 10; i++) {
        smallServer.addEvent({
          ...testEvent,
          id: `evt-${i}`,
        });
      }

      const state = smallServer.getState();
      // State returns last 50, but we capped at 5
      expect(state.events.length).toBeLessThanOrEqual(5);
    });

    it('should maintain event order (newest last in history)', () => {
      server.addEvent({ ...testEvent, id: 'first' });
      server.addEvent({ ...testEvent, id: 'second' });
      server.addEvent({ ...testEvent, id: 'third' });

      const state = server.getState();
      expect(state.events[state.events.length - 1].id).toBe('third');
    });
  });

  describe('getState', () => {
    it('should return complete dashboard state', () => {
      server.updateStatus({ model: 'test-model', activeAgents: 2 });
      server.addAgent({
        id: 'a1',
        name: 'Agent 1',
        status: 'active',
        startedAt: new Date(),
      });

      const state = server.getState();

      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('agents');
      expect(state).toHaveProperty('tasks');
      expect(state).toHaveProperty('events');
      expect(state).toHaveProperty('connectionCount');
      expect(state).toHaveProperty('uptime');

      expect(state.status.model).toBe('test-model');
      expect(state.agents).toHaveLength(1);
      expect(state.connectionCount).toBe(0);
    });
  });

  describe('getUrl', () => {
    it('should return correct URL', () => {
      const customServer = new DashboardServer({ port: 3456, host: '127.0.0.1' });
      expect(customServer.getUrl()).toBe('http://127.0.0.1:3456');
    });
  });

  describe('broadcast', () => {
    it('should not throw when no clients connected', () => {
      expect(() => {
        server.broadcast('status', { test: true });
      }).not.toThrow();
    });
  });
});

interface ApiData {
  success: boolean;
  data?: unknown;
  timestamp: string;
}

describe('DashboardServer HTTP API', () => {
  let server: DashboardServer;
  let baseUrl: string;

  beforeAll(async () => {
    server = new DashboardServer({ port: 0, host: '127.0.0.1' });
    await server.start();
    // Wait a tick to ensure server is fully ready
    await new Promise((resolve) => setTimeout(resolve, 50));
    baseUrl = server.getUrl();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should respond to health check', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('status', 'healthy');
    expect(data.data).toHaveProperty('uptime');
    expect(data.data).toHaveProperty('connections');
  });

  it('should return current status', async () => {
    server.updateStatus({ model: 'api-test-model' });

    const response = await fetch(`${baseUrl}/api/status`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect((data.data as { model: string }).model).toBe('api-test-model');
  });

  it('should return dashboard state', async () => {
    const response = await fetch(`${baseUrl}/api/state`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('status');
    expect(data.data).toHaveProperty('agents');
    expect(data.data).toHaveProperty('tasks');
    expect(data.data).toHaveProperty('events');
  });

  it('should return agents list', async () => {
    server.addAgent({
      id: 'api-agent',
      name: 'API Test Agent',
      status: 'active',
      startedAt: new Date(),
    });

    const response = await fetch(`${baseUrl}/api/agents`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return tasks list', async () => {
    const response = await fetch(`${baseUrl}/api/tasks`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return events with default limit', async () => {
    const response = await fetch(`${baseUrl}/api/events`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return events with custom limit', async () => {
    const response = await fetch(`${baseUrl}/api/events?limit=10`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    expect((data.data as unknown[]).length).toBeLessThanOrEqual(10);
  });

  it('should filter events by type', async () => {
    server.addEvent({
      id: 'filter-test',
      type: 'agent:spawn',
      timestamp: new Date(),
      sessionId: 'test',
      data: {},
      metadata: { source: 'test', version: '1.0', environment: 'test' },
    });

    const response = await fetch(`${baseUrl}/api/events?type=agent:spawn`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    (data.data as ObservabilityEvent[]).forEach((evt: ObservabilityEvent) => {
      expect(evt.type).toBe('agent:spawn');
    });
  });

  it('should return metrics', async () => {
    const response = await fetch(`${baseUrl}/api/metrics`);
    const data = (await response.json()) as ApiData;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should have CORS headers when enabled', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('DashboardServer WebSocket', () => {
  let server: DashboardServer;
  let wsUrl: string;

  beforeAll(async () => {
    server = new DashboardServer({ port: 0, host: '127.0.0.1', wsPingInterval: 100 });
    await server.start();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const baseUrl = server.getUrl();
    wsUrl = baseUrl.replace('http://', 'ws://');
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should accept WebSocket connections', async () => {
    const connectedPromise = new Promise<string>((resolve) => {
      server.on('client:connected', resolve);
    });

    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const clientId = await connectedPromise;
    expect(typeof clientId).toBe('string');
    expect(server.getConnectionCount()).toBeGreaterThanOrEqual(1);

    ws.close();
  });

  it('should send initial status on connection', async () => {
    server.updateStatus({ model: 'ws-test-model' });

    const ws = new WebSocket(wsUrl);
    const message = await new Promise<{ type: string; data: StatusUpdate }>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'status') {
          resolve(msg);
        }
      });
    });

    expect(message.type).toBe('status');
    expect(message.data.model).toBe('ws-test-model');

    ws.close();
  });

  it('should handle ping messages', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const pongPromise = new Promise<{ type: string }>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pong') {
          resolve(msg);
        }
      });
    });

    ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));

    const pong = await pongPromise;
    expect(pong.type).toBe('pong');

    ws.close();
  });

  it('should emit client:disconnected on close', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const disconnectedPromise = new Promise<string>((resolve) => {
      server.on('client:disconnected', resolve);
    });

    ws.close();
    const clientId = await disconnectedPromise;
    expect(typeof clientId).toBe('string');
  });

  it('should broadcast status updates to connected clients', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    // Skip initial messages
    await new Promise((resolve) => setTimeout(resolve, 100));

    const messagePromise = new Promise<{ type: string; data: StatusUpdate }>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'status' && msg.data.activeAgents === 5) {
          resolve(msg);
        }
      });
    });

    server.updateStatus({ activeAgents: 5 });

    const message = await messagePromise;
    expect(message.data.activeAgents).toBe(5);

    ws.close();
  });

  it('should broadcast agent updates to connected clients', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    // Skip initial messages
    await new Promise((resolve) => setTimeout(resolve, 100));

    const messagePromise = new Promise<{ type: string; data: AgentActivity[] }>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'agents') {
          resolve(msg);
        }
      });
    });

    server.addAgent({
      id: 'ws-agent',
      name: 'WS Test Agent',
      status: 'active',
      startedAt: new Date(),
    });

    const message = await messagePromise;
    expect(message.type).toBe('agents');

    ws.close();
  });

  it('should broadcast events to connected clients', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const messagePromise = new Promise<{ type: string; data: ObservabilityEvent }>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'event') {
          resolve(msg);
        }
      });
    });

    server.addEvent({
      id: 'ws-event',
      type: 'agent:spawn',
      timestamp: new Date(),
      sessionId: 'test',
      data: {},
      metadata: { source: 'test', version: '1.0', environment: 'test' },
    });

    const message = await messagePromise;
    expect(message.type).toBe('event');
    expect(message.data.id).toBe('ws-event');

    ws.close();
  });

  it('should handle malformed messages gracefully', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    // Send malformed JSON
    ws.send('not valid json');

    // Should not crash, wait a bit
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.isActive()).toBe(true);

    ws.close();
  });

  it('should handle unknown message types', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    ws.send(JSON.stringify({ type: 'unknown', data: {} }));

    // Should not crash
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.isActive()).toBe(true);

    ws.close();
  });
});

describe('DashboardServer Registration', () => {
  let server: DashboardServer;

  beforeEach(() => {
    server = new DashboardServer({ port: 0 });
  });

  afterEach(async () => {
    if (server.isActive()) {
      await server.stop();
    }
  });

  it('should register AuditLogger and receive events', async () => {
    const mockLogger = {
      subscribe: jest.fn((callback: (event: ObservabilityEvent) => void) => {
        // Simulate event emission
        setTimeout(() => {
          callback({
            id: 'audit-event',
            type: 'agent:spawn',
            timestamp: new Date(),
            sessionId: 'test',
            data: {},
            metadata: { source: 'test', version: '1.0', environment: 'test' },
          });
        }, 10);
        return () => {};
      }),
      getMetrics: jest.fn(() => ({ total: 10 })),
    };

    server.registerAuditLogger(mockLogger as never);

    // Wait for event
    await new Promise((resolve) => setTimeout(resolve, 50));

    const state = server.getState();
    expect(state.events.length).toBeGreaterThan(0);
  });

  it('should register StatusLine and receive updates', () => {
    const mockStatusLine = {
      on: jest.fn((event: string, callback: (data: StatusUpdate) => void) => {
        if (event === 'update') {
          // Simulate update
          setTimeout(() => {
            callback({
              model: 'status-line-model',
              contextUsage: 30,
              learningScore: 5,
              activeAgents: 2,
              pendingTasks: 1,
            });
          }, 10);
        }
      }),
    };

    server.registerStatusLine(mockStatusLine as never);
    expect(mockStatusLine.on).toHaveBeenCalledWith('update', expect.any(Function));
  });

  it('should register TaskWatcher and receive task events', () => {
    const mockWatcher = {
      on: jest.fn(),
      getActiveTasks: jest.fn(() => []),
      getCompletedTasks: jest.fn(() => []),
    };

    server.registerTaskWatcher(mockWatcher as never);

    // Should subscribe to all task events
    expect(mockWatcher.on).toHaveBeenCalledWith('task:created', expect.any(Function));
    expect(mockWatcher.on).toHaveBeenCalledWith('task:started', expect.any(Function));
    expect(mockWatcher.on).toHaveBeenCalledWith('task:completed', expect.any(Function));
    expect(mockWatcher.on).toHaveBeenCalledWith('task:failed', expect.any(Function));
  });

  it('should get tasks from TaskWatcher in getState', () => {
    const mockWatcher = {
      on: jest.fn(),
      getActiveTasks: jest.fn(() => [
        {
          id: 'task-1',
          name: 'Test Task',
          status: 'running' as const,
          createdAt: new Date(),
          startedAt: new Date(),
        },
      ]),
      getCompletedTasks: jest.fn(() => []),
    };

    server.registerTaskWatcher(mockWatcher as never);
    const state = server.getState();

    expect(state.tasks.length).toBe(1);
    expect(state.tasks[0].name).toBe('Test Task');
  });
});

describe('DashboardServer Edge Cases', () => {
  it('should handle stop when server is null', async () => {
    const server = new DashboardServer({ port: 0 });
    // Stop without starting - server is null
    await server.stop();
    expect(server.isActive()).toBe(false);
  });

  it('should not send to closed WebSocket', async () => {
    const server = new DashboardServer({ port: 0, host: '127.0.0.1' });
    await server.start();
    const wsUrl = server.getUrl().replace('http://', 'ws://');

    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    // Close the socket
    ws.close();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // This should not throw - it should skip closed sockets
    expect(() => {
      server.broadcast('status', { test: true });
    }).not.toThrow();

    await server.stop();
  });

  it('should broadcast to multiple clients', async () => {
    const server = new DashboardServer({ port: 0, host: '127.0.0.1' });
    await server.start();
    const wsUrl = server.getUrl().replace('http://', 'ws://');

    const ws1 = new WebSocket(wsUrl);
    const ws2 = new WebSocket(wsUrl);

    await Promise.all([
      new Promise<void>((resolve) => ws1.on('open', resolve)),
      new Promise<void>((resolve) => ws2.on('open', resolve)),
    ]);

    // Skip initial messages
    await new Promise((resolve) => setTimeout(resolve, 100));

    const messages: unknown[] = [];
    const collectMessages = (data: Buffer): void => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'status' && msg.data.pendingTasks === 99) {
        messages.push(msg);
      }
    };

    ws1.on('message', collectMessages);
    ws2.on('message', collectMessages);

    server.updateStatus({ pendingTasks: 99 });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(messages.length).toBe(2);

    ws1.close();
    ws2.close();
    await server.stop();
  });
});
