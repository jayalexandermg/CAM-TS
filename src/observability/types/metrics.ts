/**
 * Observability Metrics Types
 *
 * Defines types for system metrics, performance tracking, and dashboard data.
 * These metrics provide insights into system health and performance.
 */

import type { ObservabilityEvent } from './events';

/**
 * Metrics for memory system performance.
 */
export interface MemoryMetrics {
  /** Token count in immediate memory */
  immediateTokens: number;
  /** Token count in short-term memory */
  shortTermTokens: number;
  /** Number of entries in long-term memory */
  longTermEntries: number;
  /** Total size in bytes */
  totalSize: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Average retrieval time in milliseconds */
  averageRetrievalTime: number;
}

/**
 * Metrics for agent system performance.
 */
export interface AgentMetrics {
  /** Total number of agents spawned */
  totalSpawned: number;
  /** Currently active agent count */
  activeCount: number;
  /** Average task completion time in milliseconds */
  averageTaskDuration: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Count of agents by type */
  byType: Record<string, number>;
}

/**
 * Metrics for skill system performance.
 */
export interface SkillMetrics {
  /** Total number of skill invocations */
  totalInvocations: number;
  /** Average latency in milliseconds */
  averageLatency: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Most frequently used skills */
  popularSkills: { name: string; count: number }[];
  /** Routing accuracy (0-1) */
  routingAccuracy: number;
}

/**
 * Comprehensive system metrics snapshot.
 */
export interface SystemMetrics {
  /** System uptime in seconds */
  uptime: number;
  /** Currently active agent count */
  activeAgents: number;
  /** Current memory metrics */
  memoryCurrent: MemoryMetrics;
  /** Skill system statistics */
  skillStats: SkillMetrics;
  /** Agent system statistics */
  agentStats: AgentMetrics;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** System error rate (0-1) */
  errorRate: number;
  /** Requests per minute */
  requestsPerMinute: number;
  /** Timestamp of metrics snapshot */
  timestamp: Date;
}

/**
 * A single point in a time series.
 */
export interface TimeSeriesPoint {
  /** Timestamp of the data point */
  timestamp: Date;
  /** Value at this point */
  value: number;
}

/**
 * Time series metric data for trending analysis.
 */
export interface TimeSeriesMetric {
  /** Name of the metric */
  name: string;
  /** Data points */
  points: TimeSeriesPoint[];
  /** Aggregation method used */
  aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count';
}

/**
 * Complete dashboard data structure for UI rendering.
 */
export interface MetricsDashboardData {
  /** Current system metrics */
  system: SystemMetrics;
  /** Time series data for charts */
  timeSeries: {
    responseTime: TimeSeriesMetric;
    activeAgents: TimeSeriesMetric;
    errorRate: TimeSeriesMetric;
    memoryUsage: TimeSeriesMetric;
  };
  /** Recent observability events */
  recentEvents: ObservabilityEvent[];
  /** Active system alerts */
  alerts: SystemAlert[];
}

/**
 * System alert for critical notifications.
 */
export interface SystemAlert {
  /** Unique alert identifier */
  id: string;
  /** Alert severity level */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** Human-readable alert message */
  message: string;
  /** When the alert was triggered */
  timestamp: Date;
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
}
