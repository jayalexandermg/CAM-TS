/**
 * Dashboard Server
 *
 * Express + WebSocket server for real-time CAM monitoring dashboard.
 * Provides endpoints for metrics, events, and agent activity with
 * WebSocket support for live updates.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { join } from 'path';
import { randomUUID } from 'crypto';

import type {
  DashboardConfig,
  DashboardState,
  StatusUpdate,
  AgentActivity,
  DashboardTask,
  WebSocketMessage,
  ApiResponse,
} from './types';
import type { ObservabilityEvent } from '../types/events';
import type { AuditLogger } from '../audit/AuditLogger';
import type { StatusLine } from '../status/StatusLine';
import type { TaskWatcher } from '../status/TaskWatcher';
import type { TrackedTask } from '../status/types';

/**
 * Default dashboard configuration.
 */
const DEFAULT_CONFIG: DashboardConfig = {
  port: 3000,
  host: 'localhost',
  enableCors: true,
  wsPingInterval: 30000,
  maxEventHistory: 1000,
};

/**
 * Connected WebSocket client with metadata.
 */
interface ConnectedClient {
  id: string;
  ws: WebSocket;
  connectedAt: Date;
  lastPing: Date;
}

/**
 * Dashboard server for CAM monitoring.
 *
 * Provides:
 * - REST API for metrics and events
 * - WebSocket for real-time updates
 * - Static file serving for dashboard UI
 */
export class DashboardServer extends EventEmitter {
  private config: DashboardConfig;
  private app: Application;
  private server: HttpServer | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private startTime: Date | null = null;
  private isRunning = false;
  private actualPort: number | null = null;

  // Data sources
  private auditLogger: AuditLogger | null = null;
  private statusLine: StatusLine | null = null;
  private taskWatcher: TaskWatcher | null = null;

  // In-memory state
  private currentStatus: StatusUpdate = {
    model: 'unknown',
    contextUsage: 0,
    learningScore: 0,
    activeAgents: 0,
    pendingTasks: 0,
  };
  private agents: Map<string, AgentActivity> = new Map();
  private eventHistory: ObservabilityEvent[] = [];

  constructor(config: Partial<DashboardConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configure Express middleware.
   */
  private setupMiddleware(): void {
    // JSON body parsing
    this.app.use(express.json());

    // CORS for development
    if (this.config.enableCors) {
      this.app.use((_req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        next();
      });
    }

    // Static file serving
    const staticPath = this.config.staticPath || this.getDefaultStaticPath();
    this.app.use(express.static(staticPath));
  }

  /**
   * Get default static files path.
   */
  private getDefaultStaticPath(): string {
    return join(__dirname, 'public');
  }

  /**
   * Setup REST API routes.
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (_req: Request, res: Response) => {
      this.sendApiResponse(res, {
        status: 'healthy',
        uptime: this.getUptime(),
        connections: this.clients.size,
      });
    });

    // Get current status
    this.app.get('/api/status', (_req: Request, res: Response) => {
      this.sendApiResponse(res, this.currentStatus);
    });

    // Get dashboard state
    this.app.get('/api/state', (_req: Request, res: Response) => {
      this.sendApiResponse(res, this.getState());
    });

    // Get agents
    this.app.get('/api/agents', (_req: Request, res: Response) => {
      this.sendApiResponse(res, Array.from(this.agents.values()));
    });

    // Get tasks
    this.app.get('/api/tasks', (_req: Request, res: Response) => {
      const tasks = this.taskWatcher
        ? [...this.taskWatcher.getActiveTasks(), ...this.taskWatcher.getCompletedTasks()]
        : [];
      this.sendApiResponse(res, tasks.map(this.mapTask));
    });

    // Get events
    this.app.get('/api/events', (req: Request, res: Response) => {
      const limit = parseInt(req.query['limit'] as string) || 50;
      const type = req.query['type'] as string;

      let events = this.eventHistory;
      if (type) {
        events = events.filter((e) => e.type === type);
      }

      this.sendApiResponse(res, events.slice(-limit));
    });

    // Get metrics
    this.app.get('/api/metrics', (_req: Request, res: Response) => {
      const metrics = this.auditLogger?.getMetrics();
      this.sendApiResponse(res, metrics || {});
    });

    // Fallback to serve index.html for SPA routing
    this.app.get('*', (_req: Request, res: Response) => {
      const staticPath = this.config.staticPath || this.getDefaultStaticPath();
      res.sendFile(join(staticPath, 'index.html'));
    });
  }

  /**
   * Send standardized API response.
   */
  private sendApiResponse<T>(res: Response, data: T, status = 200): void {
    const response: ApiResponse<T> = {
      success: status >= 200 && status < 300,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(response);
  }

  /**
   * Start the dashboard server.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Dashboard server is already running');
    }

    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);

      // Setup WebSocket server
      this.wss = new WebSocketServer({ server: this.server });
      this.setupWebSocket();

      // Start listening
      this.server.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        this.startTime = new Date();

        // Get actual port (important when config.port is 0)
        const address = this.server!.address();
        this.actualPort =
          typeof address === 'object' && address ? address.port : this.config.port;

        // Start ping interval for WebSocket keep-alive
        this.startPingInterval();

        this.emit('started', {
          port: this.actualPort,
          host: this.config.host,
        });

        resolve();
      });

      this.server.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the dashboard server.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all WebSocket connections
    for (const client of this.clients.values()) {
      client.ws.close(1000, 'Server shutting down');
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Close HTTP server
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.isRunning = false;
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Setup WebSocket event handlers.
   */
  private setupWebSocket(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = randomUUID();
      const client: ConnectedClient = {
        id: clientId,
        ws,
        connectedAt: new Date(),
        lastPing: new Date(),
      };

      this.clients.set(clientId, client);
      this.emit('client:connected', clientId);

      // Send initial state
      this.sendToClient(client, 'status', this.currentStatus);
      this.sendToClient(client, 'agents', Array.from(this.agents.values()));

      // Handle messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(client, message);
        } catch {
          // Ignore malformed messages
        }
      });

      // Handle pong responses
      ws.on('pong', () => {
        client.lastPing = new Date();
      });

      // Handle disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        this.emit('client:disconnected', clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        this.emit('client:error', { clientId, error });
      });
    });
  }

  /**
   * Handle incoming client message.
   */
  private handleClientMessage(
    client: ConnectedClient,
    message: WebSocketMessage
  ): void {
    switch (message.type) {
      case 'ping':
        this.sendToClient(client, 'pong', { time: Date.now() });
        break;
      default:
        // Unknown message type
        break;
    }
  }

  /**
   * Start WebSocket ping interval for keep-alive.
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = (this.config.wsPingInterval || 30000) * 2;

      for (const [clientId, client] of this.clients) {
        // Check for stale connections
        if (now - client.lastPing.getTime() > timeout) {
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        // Send ping
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, this.config.wsPingInterval || 30000);
  }

  /**
   * Send message to a specific client.
   */
  private sendToClient<T>(
    client: ConnectedClient,
    type: string,
    data: T
  ): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage<T> = {
        type: type as WebSocketMessage['type'],
        timestamp: new Date().toISOString(),
        data,
      };
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all connected clients.
   */
  broadcast<T>(type: string, data: T): void {
    const message: WebSocketMessage<T> = {
      type: type as WebSocketMessage['type'],
      timestamp: new Date().toISOString(),
      data,
    };
    const payload = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  /**
   * Register AuditLogger for event streaming.
   */
  registerAuditLogger(logger: AuditLogger): void {
    this.auditLogger = logger;

    // Subscribe to events
    logger.subscribe((event: ObservabilityEvent) => {
      this.addEvent(event);
    });
  }

  /**
   * Register StatusLine for status updates.
   */
  registerStatusLine(statusLine: StatusLine): void {
    this.statusLine = statusLine;

    // Subscribe to updates
    statusLine.on('update', (data: StatusUpdate) => {
      this.updateStatus(data);
    });
  }

  /**
   * Register TaskWatcher for task tracking.
   */
  registerTaskWatcher(watcher: TaskWatcher): void {
    this.taskWatcher = watcher;

    // Subscribe to task events
    const taskEvents = [
      'task:created',
      'task:started',
      'task:progress',
      'task:completed',
      'task:failed',
      'task:cancelled',
    ];

    for (const eventName of taskEvents) {
      watcher.on(eventName, (task: TrackedTask) => {
        this.broadcast('tasks', this.mapTask(task));
      });
    }
  }

  /**
   * Update current status and broadcast.
   */
  updateStatus(update: Partial<StatusUpdate>): void {
    this.currentStatus = { ...this.currentStatus, ...update };
    this.broadcast('status', this.currentStatus);
    this.emit('status:updated', this.currentStatus);
  }

  /**
   * Add agent activity.
   */
  addAgent(agent: AgentActivity): void {
    this.agents.set(agent.id, agent);
    this.broadcast('agents', Array.from(this.agents.values()));
    this.emit('agent:added', agent);
  }

  /**
   * Update agent activity.
   */
  updateAgent(agentId: string, update: Partial<AgentActivity>): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      Object.assign(agent, update);
      this.broadcast('agents', Array.from(this.agents.values()));
      this.emit('agent:updated', agent);
    }
  }

  /**
   * Remove agent activity.
   */
  removeAgent(agentId: string): void {
    if (this.agents.delete(agentId)) {
      this.broadcast('agents', Array.from(this.agents.values()));
      this.emit('agent:removed', agentId);
    }
  }

  /**
   * Add event to history and broadcast.
   */
  addEvent(event: ObservabilityEvent): void {
    this.eventHistory.push(event);

    // Trim history if needed
    const maxHistory = this.config.maxEventHistory || 1000;
    if (this.eventHistory.length > maxHistory) {
      this.eventHistory = this.eventHistory.slice(-maxHistory);
    }

    this.broadcast('event', event);
    this.emit('event:added', event);
  }

  /**
   * Get current dashboard state.
   */
  getState(): DashboardState {
    const tasks = this.taskWatcher
      ? [...this.taskWatcher.getActiveTasks(), ...this.taskWatcher.getCompletedTasks()]
      : [];

    return {
      status: this.currentStatus,
      agents: Array.from(this.agents.values()),
      tasks: tasks.map(this.mapTask),
      events: this.eventHistory.slice(-50),
      connectionCount: this.clients.size,
      uptime: this.getUptime(),
    };
  }

  /**
   * Map TrackedTask to DashboardTask.
   */
  private mapTask(task: TrackedTask): DashboardTask {
    return {
      id: task.id,
      name: task.name,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      error: task.error,
    };
  }

  /**
   * Get server uptime in seconds.
   */
  getUptime(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Get connected client count.
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Check if server is running.
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get server URL.
   */
  getUrl(): string {
    const port = this.actualPort ?? this.config.port;
    return `http://${this.config.host}:${port}`;
  }
}
