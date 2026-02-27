/**
 * Status Types
 *
 * Type definitions for StatusLine and TaskWatcher components.
 */

/**
 * Status line display data
 */
export interface StatusLineData {
  /** Current model identifier */
  model: string;
  /** Context usage percentage (0-100) */
  contextUsage: number;
  /** Learning score (accumulated learning metric) */
  learningScore: number;
  /** Number of active agents */
  activeAgents: number;
  /** Number of pending/running tasks */
  pendingTasks: number;
  /** Optional custom status segments */
  customSegments?: StatusSegment[];
}

/**
 * A single segment in the status line
 */
export interface StatusSegment {
  /** Label for the segment */
  label: string;
  /** Value to display */
  value: string | number;
  /** Optional color hint */
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

/**
 * Status line configuration
 */
export interface StatusLineConfig {
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Whether to show the model name */
  showModel?: boolean;
  /** Whether to show context usage */
  showContext?: boolean;
  /** Whether to show learning score */
  showLearning?: boolean;
  /** Whether to show agent count */
  showAgents?: boolean;
  /** Whether to show task count */
  showTasks?: boolean;
  /** Custom format function */
  formatter?: (data: StatusLineData) => string;
}

/**
 * Background task status
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * A tracked background task
 */
export interface TrackedTask {
  /** Unique task identifier */
  id: string;
  /** Task name or description */
  name: string;
  /** Current status */
  status: TaskStatus;
  /** When the task was created */
  createdAt: Date;
  /** When the task started running */
  startedAt?: Date;
  /** When the task completed/failed */
  completedAt?: Date;
  /** Progress percentage (0-100), if available */
  progress?: number;
  /** Error message if failed */
  error?: string;
  /** Additional task metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Task watcher configuration
 */
export interface TaskWatcherConfig {
  /** Maximum number of completed tasks to keep in history */
  maxHistory?: number;
  /** Whether to emit events on task state changes */
  emitEvents?: boolean;
  /** Cleanup interval for completed tasks (ms) */
  cleanupInterval?: number;
}

/**
 * Task event types
 */
export type TaskEventType =
  | 'created'
  | 'started'
  | 'progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Task event payload
 */
export interface TaskEvent {
  type: TaskEventType;
  task: TrackedTask;
  timestamp: Date;
}

/**
 * Task completion callback
 */
export type TaskCallback = (task: TrackedTask) => void | Promise<void>;
