/**
 * TaskWatcher - Background task monitoring
 *
 * Tracks background tasks, provides completion callbacks, and emits
 * real-time events for task state changes.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  TrackedTask,
  TaskStatus,
  TaskWatcherConfig,
  TaskEvent,
  TaskEventType,
  TaskCallback,
} from './types';

const DEFAULT_CONFIG: Required<TaskWatcherConfig> = {
  maxHistory: 100,
  emitEvents: true,
  cleanupInterval: 60000, // 1 minute
};

export class TaskWatcher extends EventEmitter {
  private config: Required<TaskWatcherConfig>;
  private tasks: Map<string, TrackedTask> = new Map();
  private completionCallbacks: Map<string, TaskCallback[]> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: TaskWatcherConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Create and track a new task
   */
  createTask(name: string, metadata?: Record<string, unknown>): TrackedTask {
    const task: TrackedTask = {
      id: crypto.randomUUID(),
      name,
      status: 'pending',
      createdAt: new Date(),
      metadata,
    };

    this.tasks.set(task.id, task);
    this.emitTaskEvent('created', task);

    return task;
  }

  /**
   * Start a task (transition from pending to running)
   */
  startTask(taskId: string): TrackedTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return null;

    task.status = 'running';
    task.startedAt = new Date();
    this.emitTaskEvent('started', task);

    return task;
  }

  /**
   * Update task progress
   */
  updateProgress(taskId: string, progress: number): TrackedTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') return null;

    task.progress = Math.max(0, Math.min(100, progress));
    this.emitTaskEvent('progress', task);

    return task;
  }

  /**
   * Complete a task successfully
   */
  completeTask(taskId: string): TrackedTask | null {
    const task = this.tasks.get(taskId);
    if (!task || (task.status !== 'running' && task.status !== 'pending')) return null;

    task.status = 'completed';
    task.completedAt = new Date();
    task.progress = 100;
    this.emitTaskEvent('completed', task);
    this.invokeCallbacks(taskId, task);

    return task;
  }

  /**
   * Mark a task as failed
   */
  failTask(taskId: string, error?: string): TrackedTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'completed' || task.status === 'cancelled') return null;

    task.status = 'failed';
    task.completedAt = new Date();
    task.error = error;
    this.emitTaskEvent('failed', task);
    this.invokeCallbacks(taskId, task);

    return task;
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): TrackedTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'completed' || task.status === 'failed') return null;

    task.status = 'cancelled';
    task.completedAt = new Date();
    this.emitTaskEvent('cancelled', task);
    this.invokeCallbacks(taskId, task);

    return task;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): TrackedTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): TrackedTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): TrackedTask[] {
    return this.getAllTasks().filter(t => t.status === status);
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): TrackedTask[] {
    return this.getTasksByStatus('pending');
  }

  /**
   * Get running tasks
   */
  getRunningTasks(): TrackedTask[] {
    return this.getTasksByStatus('running');
  }

  /**
   * Get active tasks (pending or running)
   */
  getActiveTasks(): TrackedTask[] {
    return this.getAllTasks().filter(t => t.status === 'pending' || t.status === 'running');
  }

  /**
   * Get completed tasks (success, failed, or cancelled)
   */
  getCompletedTasks(): TrackedTask[] {
    return this.getAllTasks().filter(t =>
      t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    );
  }

  /**
   * Get count of active tasks
   */
  getActiveCount(): number {
    return this.getActiveTasks().length;
  }

  /**
   * Register a callback for when a task completes (success, failure, or cancel)
   */
  onComplete(taskId: string, callback: TaskCallback): void {
    const callbacks = this.completionCallbacks.get(taskId) || [];
    callbacks.push(callback);
    this.completionCallbacks.set(taskId, callbacks);

    // If task is already completed, invoke immediately
    const task = this.tasks.get(taskId);
    if (task && (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled')) {
      this.invokeCallback(callback, task);
    }
  }

  /**
   * Wait for a task to complete
   */
  waitForTask(taskId: string): Promise<TrackedTask> {
    return new Promise((resolve, reject) => {
      const task = this.tasks.get(taskId);

      if (!task) {
        reject(new Error(`Task ${taskId} not found`));
        return;
      }

      if (task.status === 'completed') {
        resolve(task);
        return;
      }

      if (task.status === 'failed' || task.status === 'cancelled') {
        reject(new Error(task.error || `Task ${task.status}`));
        return;
      }

      this.onComplete(taskId, (completedTask) => {
        if (completedTask.status === 'completed') {
          resolve(completedTask);
        } else {
          reject(new Error(completedTask.error || `Task ${completedTask.status}`));
        }
      });
    });
  }

  /**
   * Remove a task from tracking
   */
  removeTask(taskId: string): boolean {
    this.completionCallbacks.delete(taskId);
    return this.tasks.delete(taskId);
  }

  /**
   * Clear all completed tasks
   */
  clearCompleted(): number {
    const completed = this.getCompletedTasks();
    for (const task of completed) {
      this.removeTask(task.id);
    }
    return completed.length;
  }

  /**
   * Clear all tasks
   */
  clearAll(): void {
    this.tasks.clear();
    this.completionCallbacks.clear();
  }

  /**
   * Stop the task watcher and cleanup
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get task statistics
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const tasks = this.getAllTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
  }

  /**
   * Emit a task event
   */
  private emitTaskEvent(type: TaskEventType, task: TrackedTask): void {
    if (!this.config.emitEvents) return;

    const event: TaskEvent = {
      type,
      task: { ...task },
      timestamp: new Date(),
    };

    this.emit('task', event);
    this.emit(`task:${type}`, event);
  }

  /**
   * Invoke completion callbacks for a task
   */
  private invokeCallbacks(taskId: string, task: TrackedTask): void {
    const callbacks = this.completionCallbacks.get(taskId) || [];
    for (const callback of callbacks) {
      this.invokeCallback(callback, task);
    }
    this.completionCallbacks.delete(taskId);
  }

  /**
   * Safely invoke a callback
   */
  private invokeCallback(callback: TaskCallback, task: TrackedTask): void {
    try {
      const result = callback(task);
      if (result instanceof Promise) {
        result.catch(error => this.emit('error', error));
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up old completed tasks
   */
  private cleanup(): void {
    const completed = this.getCompletedTasks();

    if (completed.length <= this.config.maxHistory) {
      return;
    }

    // Sort by completion time, oldest first
    completed.sort((a, b) =>
      (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0)
    );

    // Remove oldest tasks beyond maxHistory
    const toRemove = completed.slice(0, completed.length - this.config.maxHistory);
    for (const task of toRemove) {
      this.removeTask(task.id);
    }

    this.emit('cleanup', toRemove.length);
  }
}
