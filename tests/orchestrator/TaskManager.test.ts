/**
 * TaskManager Tests
 */

import { TaskManager } from '../../src/orchestrator/TaskManager';
import { TaskRequest } from '../../src/orchestrator/types';

describe('TaskManager', () => {
  let taskManager: TaskManager;

  beforeEach(() => {
    taskManager = new TaskManager(5);
  });

  describe('constructor', () => {
    it('should create with default max concurrent tasks', () => {
      const tm = new TaskManager();
      expect(tm.getMaxConcurrent()).toBe(5);
    });

    it('should create with custom max concurrent tasks', () => {
      const tm = new TaskManager(10);
      expect(tm.getMaxConcurrent()).toBe(10);
    });

    it('should start with empty task list', () => {
      expect(taskManager.getStats()).toEqual({
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('createTask', () => {
    it('should create a task with auto-generated id', () => {
      const request: TaskRequest = {
        input: 'test input',
        sessionId: 'session-1',
      };

      const task = taskManager.createTask(request);

      expect(task.id).toMatch(/^task_\d+_[a-z0-9]+$/);
      expect(task.status).toBe('pending');
      expect(task.request.input).toBe('test input');
      expect(task.request.sessionId).toBe('session-1');
    });

    it('should create a task with provided id', () => {
      const request: TaskRequest = {
        id: 'custom-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      const task = taskManager.createTask(request);

      expect(task.id).toBe('custom-id');
    });

    it('should emit taskCreated event', () => {
      const eventHandler = jest.fn();
      taskManager.on('taskCreated', eventHandler);

      const request: TaskRequest = {
        input: 'test input',
        sessionId: 'session-1',
      };

      const task = taskManager.createTask(request);

      expect(eventHandler).toHaveBeenCalledWith({ taskId: task.id });
    });

    it('should add task to queue', () => {
      const request: TaskRequest = {
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);

      expect(taskManager.getQueueLength()).toBe(1);
      expect(taskManager.getPendingTasks().length).toBe(1);
    });
  });

  describe('getTask', () => {
    it('should return task by id', () => {
      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      const task = taskManager.getTask('test-id');

      expect(task).toBeDefined();
      expect(task?.id).toBe('test-id');
    });

    it('should return undefined for non-existent task', () => {
      const task = taskManager.getTask('non-existent');
      expect(task).toBeUndefined();
    });
  });

  describe('startTask', () => {
    it('should start a pending task', async () => {
      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');

      const task = taskManager.getTask('test-id');
      expect(task?.status).toBe('running');
    });

    it('should emit taskStarted event', async () => {
      const eventHandler = jest.fn();
      taskManager.on('taskStarted', eventHandler);

      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');

      expect(eventHandler).toHaveBeenCalledWith({ taskId: 'test-id' });
    });

    it('should throw if task not found', async () => {
      await expect(taskManager.startTask('non-existent')).rejects.toThrow(
        'Task not found: non-existent'
      );
    });

    it('should throw if task is not pending', async () => {
      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');

      await expect(taskManager.startTask('test-id')).rejects.toThrow(
        'Task test-id is not pending (status: running)'
      );
    });

    it('should throw if max concurrent tasks reached', async () => {
      const tm = new TaskManager(1);

      tm.createTask({ id: 'task-1', input: 'input', sessionId: 's1' });
      tm.createTask({ id: 'task-2', input: 'input', sessionId: 's1' });

      await tm.startTask('task-1');

      await expect(tm.startTask('task-2')).rejects.toThrow(
        'Maximum concurrent tasks reached'
      );
    });

    it('should remove task from queue when started', async () => {
      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      expect(taskManager.getQueueLength()).toBe(1);

      await taskManager.startTask('test-id');
      expect(taskManager.getQueueLength()).toBe(0);
    });
  });

  describe('completeTask', () => {
    it('should complete a task', async () => {
      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');
      taskManager.completeTask('test-id', { output: 'result' });

      const task = taskManager.getTask('test-id');
      expect(task?.status).toBe('completed');
      expect(task?.result?.success).toBe(true);
      expect(task?.result?.output).toBe('result');
    });

    it('should emit taskCompleted event', async () => {
      const eventHandler = jest.fn();
      taskManager.on('taskCompleted', eventHandler);

      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');
      taskManager.completeTask('test-id', { output: 'result' });

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'test-id',
        })
      );
    });

    it('should throw if task not found', () => {
      expect(() => taskManager.completeTask('non-existent', {})).toThrow(
        'Task not found: non-existent'
      );
    });

    it('should calculate duration', async () => {
      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');

      // Small delay to ensure duration > 0
      await new Promise((resolve) => setTimeout(resolve, 10));

      taskManager.completeTask('test-id', {});

      const task = taskManager.getTask('test-id');
      expect(task?.metadata.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('failTask', () => {
    it('should fail a task', async () => {
      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');

      const error = new Error('Test error');
      taskManager.failTask('test-id', error);

      const task = taskManager.getTask('test-id');
      expect(task?.status).toBe('failed');
      expect(task?.result?.success).toBe(false);
      expect(task?.result?.error).toBe(error);
    });

    it('should emit taskFailed event', async () => {
      const eventHandler = jest.fn();
      taskManager.on('taskFailed', eventHandler);

      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');

      const error = new Error('Test error');
      taskManager.failTask('test-id', error);

      expect(eventHandler).toHaveBeenCalledWith({ taskId: 'test-id', error });
    });
  });

  describe('retryTask', () => {
    it('should reset task to pending', async () => {
      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');
      taskManager.failTask('test-id', new Error('error'));

      taskManager.retryTask('test-id');

      const task = taskManager.getTask('test-id');
      expect(task?.status).toBe('pending');
      expect(task?.metadata.retries).toBe(1);
    });

    it('should emit taskRetried event', async () => {
      const eventHandler = jest.fn();
      taskManager.on('taskRetried', eventHandler);

      const request: TaskRequest = {
        id: 'test-id',
        input: 'test input',
        sessionId: 'session-1',
      };

      taskManager.createTask(request);
      await taskManager.startTask('test-id');
      taskManager.failTask('test-id', new Error('error'));

      taskManager.retryTask('test-id');

      expect(eventHandler).toHaveBeenCalledWith({ taskId: 'test-id', retries: 1 });
    });
  });

  describe('getNextTask', () => {
    it('should return first task in queue', () => {
      taskManager.createTask({ id: 'task-1', input: 'input', sessionId: 's1' });
      taskManager.createTask({ id: 'task-2', input: 'input', sessionId: 's1' });

      const nextTask = taskManager.getNextTask();
      expect(nextTask?.id).toBe('task-1');
    });

    it('should return undefined if queue is empty', () => {
      const nextTask = taskManager.getNextTask();
      expect(nextTask).toBeUndefined();
    });
  });

  describe('getTasksBySession', () => {
    it('should return tasks for a specific session', () => {
      taskManager.createTask({ id: 'task-1', input: 'input', sessionId: 's1' });
      taskManager.createTask({ id: 'task-2', input: 'input', sessionId: 's2' });
      taskManager.createTask({ id: 'task-3', input: 'input', sessionId: 's1' });

      const s1Tasks = taskManager.getTasksBySession('s1');
      expect(s1Tasks.length).toBe(2);
      expect(s1Tasks.map((t) => t.id)).toEqual(['task-1', 'task-3']);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      taskManager.createTask({ id: 'task-1', input: 'input', sessionId: 's1' });
      taskManager.createTask({ id: 'task-2', input: 'input', sessionId: 's1' });
      taskManager.createTask({ id: 'task-3', input: 'input', sessionId: 's1' });

      await taskManager.startTask('task-1');
      await taskManager.startTask('task-2');
      taskManager.completeTask('task-1', {});
      taskManager.failTask('task-2', new Error('error'));

      const stats = taskManager.getStats();
      expect(stats.pending).toBe(1);
      expect(stats.running).toBe(0);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('canAcceptTask', () => {
    it('should return true when under limit', () => {
      expect(taskManager.canAcceptTask()).toBe(true);
    });

    it('should return false when at limit', async () => {
      const tm = new TaskManager(1);
      tm.createTask({ id: 'task-1', input: 'input', sessionId: 's1' });
      await tm.startTask('task-1');

      expect(tm.canAcceptTask()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all tasks', async () => {
      taskManager.createTask({ id: 'task-1', input: 'input', sessionId: 's1' });
      await taskManager.startTask('task-1');

      taskManager.clear();

      expect(taskManager.getStats()).toEqual({
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
      });
      expect(taskManager.getQueueLength()).toBe(0);
      expect(taskManager.getRunningCount()).toBe(0);
    });
  });
});
