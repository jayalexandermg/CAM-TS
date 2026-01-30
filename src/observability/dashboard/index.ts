/**
 * Dashboard Module
 *
 * Exports the CAM Dashboard server and types for real-time monitoring.
 */

export { DashboardServer } from './DashboardServer';
export type {
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
} from './types';
