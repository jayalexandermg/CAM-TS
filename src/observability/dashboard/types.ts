/**
 * Dashboard Types
 *
 * Type definitions for the CAM Dashboard UI server and real-time updates.
 */

import type { ObservabilityEvent } from '../types/events';
import type { SystemMetrics } from '../types/metrics';

/**
 * Dashboard server configuration.
 */
export interface DashboardConfig {
  /** Server port (default: 3000) */
  port: number;
  /** Host to bind to (default: 'localhost') */
  host: string;
  /** Path to static files directory */
  staticPath?: string;
  /** Enable CORS for development */
  enableCors?: boolean;
  /** WebSocket ping interval in ms (default: 30000) */
  wsPingInterval?: number;
  /** Maximum events to keep in memory (default: 1000) */
  maxEventHistory?: number;
}

/**
 * WebSocket message types.
 */
export type WebSocketMessageType =
  | 'status'
  | 'event'
  | 'metrics'
  | 'agents'
  | 'tasks'
  | 'alert'
  | 'ping'
  | 'pong';

/**
 * WebSocket message structure.
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  timestamp: string;
  data: T;
}

/**
 * Status update data.
 */
export interface StatusUpdate {
  model: string;
  contextUsage: number;
  learningScore: number;
  activeAgents: number;
  pendingTasks: number;
}

/**
 * Agent activity information.
 */
export interface AgentActivity {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'completed' | 'failed';
  task?: string;
  startedAt: Date;
  completedAt?: Date;
  traits?: string[];
}

/**
 * Task information for dashboard display.
 */
export interface DashboardTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Dashboard state snapshot.
 */
export interface DashboardState {
  /** Current status */
  status: StatusUpdate;
  /** Active agents */
  agents: AgentActivity[];
  /** Recent tasks */
  tasks: DashboardTask[];
  /** Recent events */
  events: ObservabilityEvent[];
  /** System metrics */
  metrics?: Partial<SystemMetrics>;
  /** Connection count */
  connectionCount: number;
  /** Server uptime in seconds */
  uptime: number;
}

/**
 * Dashboard event for client updates.
 */
export interface DashboardEvent {
  id: string;
  type: string;
  timestamp: Date;
  summary: string;
  details?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'error';
}

/**
 * Client subscription options.
 */
export interface ClientSubscription {
  /** Subscribe to status updates */
  status: boolean;
  /** Subscribe to agent activity */
  agents: boolean;
  /** Subscribe to task updates */
  tasks: boolean;
  /** Subscribe to events */
  events: boolean;
  /** Event type filters */
  eventTypes?: string[];
}

/**
 * API response structure.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
