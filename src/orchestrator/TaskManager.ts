/**
 * TaskManager
 *
 * Manages task lifecycle including creation, execution tracking,
 * completion, failure, and retry handling.
 */

import { EventEmitter } from 'events';
import { TaskRequest, TaskResult, TaskMetadata } from './types';

export interface Task {
  id: string;
  request: TaskRequest;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata: TaskMetadata;
  result?: TaskResult;
}

export class TaskManager extends EventEmitter {
  private tasks: Map<string, Task>;
  private taskQueue: string[];
  private maxConcurrent: number;
  private runningCount: number;

  constructor(maxConcurrent: number = 5) {
    super();
    this.tasks = new Map();
    this.taskQueue = [];
    this.maxConcurrent = maxConcurrent;
    this.runningCount = 0;
  }

  createTask(request: TaskRequest): Task {
    const id = request.id || this.generateId();

    const task: Task = {
      id,
      request: { ...request, id },
      status: 'pending',
      metadata: {
        startTime: new Date(),
        retries: 0,
      },
    };

    this.tasks.set(id, task);
    this.taskQueue.push(id);

    this.emit('taskCreated', { taskId: id });

    return task;
  }

  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `task_${timestamp}_${random}`;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  async startTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Task ${id} is not pending (status: ${task.status})`);
    }

    if (this.runningCount >= this.maxConcurrent) {
      throw new Error('Maximum concurrent tasks reached');
    }

    task.status = 'running';
    task.metadata.startTime = new Date();
    this.runningCount++;

    // Remove from queue
    const queueIndex = this.taskQueue.indexOf(id);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.emit('taskStarted', { taskId: id });
  }

  completeTask(id: string, result: Partial<TaskResult>): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    task.status = 'completed';
    task.metadata.endTime = new Date();
    task.metadata.duration = task.metadata.endTime.getTime() - task.metadata.startTime.getTime();

    task.result = {
      taskId: id,
      success: true,
      ...result,
      metadata: { ...task.metadata, ...result.metadata },
    };

    this.runningCount--;

    this.emit('taskCompleted', { taskId: id, result: task.result });
  }

  failTask(id: string, error: Error): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    task.status = 'failed';
    task.metadata.endTime = new Date();
    task.metadata.duration = task.metadata.endTime.getTime() - task.metadata.startTime.getTime();

    task.result = {
      taskId: id,
      success: false,
      error,
      metadata: task.metadata,
    };

    this.runningCount--;

    this.emit('taskFailed', { taskId: id, error });
  }

  retryTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    task.status = 'pending';
    task.metadata.retries++;
    task.result = undefined;

    this.taskQueue.push(id);

    this.emit('taskRetried', { taskId: id, retries: task.metadata.retries });
  }

  getNextTask(): Task | undefined {
    if (this.taskQueue.length === 0) {
      return undefined;
    }

    const nextId = this.taskQueue[0];
    return this.tasks.get(nextId);
  }

  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
  }

  getRunningTasks(): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'running');
  }

  getCompletedTasks(): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'completed');
  }

  getFailedTasks(): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'failed');
  }

  getTasksBySession(sessionId: string): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.request.sessionId === sessionId);
  }

  getStats(): { pending: number; running: number; completed: number; failed: number } {
    return {
      pending: this.getPendingTasks().length,
      running: this.getRunningTasks().length,
      completed: this.getCompletedTasks().length,
      failed: this.getFailedTasks().length,
    };
  }

  canAcceptTask(): boolean {
    return this.runningCount < this.maxConcurrent;
  }

  clear(): void {
    this.tasks.clear();
    this.taskQueue = [];
    this.runningCount = 0;
  }

  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  getRunningCount(): number {
    return this.runningCount;
  }

  getQueueLength(): number {
    return this.taskQueue.length;
  }
}
