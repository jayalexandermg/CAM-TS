/**
 * Scheduler Types
 *
 * Types for the proactive task scheduling system.
 * The scheduler operates on session boundaries, not as a daemon.
 */

export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string; // e.g., '0 0 * * *' for daily
  handler: string; // handler identifier (not function -- serializable)
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  metadata: Record<string, unknown>;
}

export interface TriggerEvent {
  type: 'cron' | 'event' | 'threshold';
  source: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export interface SchedulerConfig {
  taskDirectory: string; // where task JSON files are stored
  checkOnSessionStart: boolean;
  defaultTasks: ScheduledTask[];
}
