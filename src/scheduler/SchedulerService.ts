/**
 * SchedulerService - Proactive Task Scheduling
 *
 * NOT a daemon -- operates on session boundaries.
 * Checks for pending tasks when invoked (e.g., on session start)
 * and executes handlers for tasks whose nextRun has passed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScheduledTask, SchedulerConfig } from './types';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Default scheduled tasks registered on first init
 */
const BUILT_IN_TASKS: ScheduledTask[] = [
  {
    id: 'memory-consolidation',
    name: 'Memory Consolidation',
    description: 'Daily review and consolidation of memory entries',
    cronExpression: '0 0 * * *',
    handler: 'memory-consolidation',
    enabled: true,
    metadata: { builtIn: true },
  },
  {
    id: 'capability-gap-scan',
    name: 'Capability Gap Scan',
    description: 'Weekly scan for capability gaps using GapDetector',
    cronExpression: '0 0 * * 0',
    handler: 'capability-gap-scan',
    enabled: true,
    metadata: { builtIn: true },
  },
  {
    id: 'skill-performance-review',
    name: 'Skill Performance Review',
    description: 'Weekly review of skill execution performance',
    cronExpression: '0 0 * * 0',
    handler: 'skill-performance-review',
    enabled: true,
    metadata: { builtIn: true },
  },
];

/**
 * Parse a simple cron expression and calculate next run time.
 * Supports: daily ('0 0 * * *'), weekly ('0 0 * * 0'), hourly ('0 * * * *').
 */
function calculateNextRun(cronExpression: string, from: Date): Date {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    // Fallback: next day
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  const [minute, hour, , , dayOfWeek] = parts;

  // Hourly: '0 * * * *'
  if (hour === '*') {
    const next = new Date(from);
    next.setMinutes(parseInt(minute, 10), 0, 0);
    if (next <= from) {
      next.setHours(next.getHours() + 1);
    }
    return next;
  }

  const targetHour = parseInt(hour, 10);
  const targetMinute = parseInt(minute, 10);

  // Weekly: dayOfWeek is a specific number (0=Sunday)
  if (dayOfWeek !== '*') {
    const targetDay = parseInt(dayOfWeek, 10);
    const next = new Date(from);
    next.setHours(targetHour, targetMinute, 0, 0);
    const currentDay = next.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= from)) {
      daysUntil += 7;
    }
    next.setDate(next.getDate() + daysUntil);
    return next;
  }

  // Daily: '0 0 * * *'
  const next = new Date(from);
  next.setHours(targetHour, targetMinute, 0, 0);
  if (next <= from) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Serialize a ScheduledTask to JSON-safe object (Dates -> ISO strings)
 */
function serializeTask(task: ScheduledTask): Record<string, unknown> {
  return {
    ...task,
    lastRun: task.lastRun?.toISOString(),
    nextRun: task.nextRun?.toISOString(),
  };
}

/**
 * Deserialize a JSON object back to ScheduledTask
 */
function deserializeTask(data: Record<string, unknown>): ScheduledTask {
  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string,
    cronExpression: data.cronExpression as string,
    handler: data.handler as string,
    enabled: data.enabled as boolean,
    lastRun: data.lastRun ? new Date(data.lastRun as string) : undefined,
    nextRun: data.nextRun ? new Date(data.nextRun as string) : undefined,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
  };
}

export class SchedulerService {
  private readonly config: SchedulerConfig;
  private tasks: Map<string, ScheduledTask> = new Map();

  constructor(config: SchedulerConfig) {
    this.config = config;
    this.loadTasks();
    this.ensureDefaults();
  }

  /**
   * Register a new scheduled task. Saves to disk as JSON.
   */
  registerTask(task: ScheduledTask): void {
    // Calculate nextRun if not set
    if (!task.nextRun) {
      task.nextRun = calculateNextRun(task.cronExpression, new Date());
    }
    this.tasks.set(task.id, task);
    this.saveTask(task);
  }

  /**
   * Unregister a task by ID. Removes the JSON file from disk.
   */
  unregisterTask(id: string): boolean {
    const removed = this.tasks.delete(id);
    if (removed) {
      const filePath = path.join(this.config.taskDirectory, `${id}.json`);
      try {
        fs.unlinkSync(filePath);
      } catch {
        // File may not exist on disk
      }
    }
    return removed;
  }

  /**
   * Returns tasks whose nextRun <= now and are enabled.
   */
  checkPending(): ScheduledTask[] {
    const now = new Date();
    const pending: ScheduledTask[] = [];
    for (const task of this.tasks.values()) {
      if (task.enabled && task.nextRun && task.nextRun <= now) {
        pending.push(task);
      }
    }
    return pending;
  }

  /**
   * Execute all pending tasks using the provided handler function.
   */
  async executePending(
    handler: (task: ScheduledTask) => Promise<void>
  ): Promise<ScheduledTask[]> {
    const pending = this.checkPending();
    for (const task of pending) {
      await handler(task);
      this.markCompleted(task.id);
    }
    return pending;
  }

  /**
   * Mark a task as completed: updates lastRun and calculates nextRun.
   */
  markCompleted(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    const now = new Date();
    task.lastRun = now;
    task.nextRun = calculateNextRun(task.cronExpression, now);
    this.saveTask(task);
  }

  /**
   * List all registered tasks.
   */
  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get a single task by ID.
   */
  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  // --- Private ---

  private loadTasks(): void {
    try {
      if (!fs.existsSync(this.config.taskDirectory)) {
        fs.mkdirSync(this.config.taskDirectory, { recursive: true });
        return;
      }
      const files = fs.readdirSync(this.config.taskDirectory);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const filePath = path.join(this.config.taskDirectory, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw) as Record<string, unknown>;
          const task = deserializeTask(data);
          this.tasks.set(task.id, task);
        } catch {
          // Skip corrupted task files
        }
      }
    } catch {
      // Directory doesn't exist yet, will be created on first save
    }
  }

  private ensureDefaults(): void {
    const builtIns = this.config.defaultTasks.length > 0
      ? this.config.defaultTasks
      : BUILT_IN_TASKS;

    for (const defaultTask of builtIns) {
      if (!this.tasks.has(defaultTask.id)) {
        this.registerTask({ ...defaultTask });
      }
    }
  }

  private saveTask(task: ScheduledTask): void {
    try {
      if (!fs.existsSync(this.config.taskDirectory)) {
        fs.mkdirSync(this.config.taskDirectory, { recursive: true });
      }
      const filePath = path.join(this.config.taskDirectory, `${task.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(serializeTask(task), null, 2));
    } catch {
      // Silently fail on write errors -- non-critical
    }
  }
}

export { generateId, calculateNextRun };
