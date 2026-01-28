/**
 * StatusLine and TaskWatcher Tests
 *
 * Tests for real-time status display and background task monitoring.
 */

import { StatusLine } from '../../../src/observability/status/StatusLine';
import { TaskWatcher } from '../../../src/observability/status/TaskWatcher';
import { StatusLineData, StatusSegment } from '../../../src/observability/status/types';

describe('StatusLine', () => {
  let statusLine: StatusLine;

  beforeEach(() => {
    statusLine = new StatusLine();
  });

  afterEach(() => {
    statusLine.stop();
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const data = statusLine.getData();

      expect(data.model).toBe('unknown');
      expect(data.contextUsage).toBe(0);
      expect(data.learningScore).toBe(0);
      expect(data.activeAgents).toBe(0);
      expect(data.pendingTasks).toBe(0);
    });

    it('should not be running by default', () => {
      expect(statusLine.isRunning()).toBe(false);
    });

    it('should use custom config when provided', () => {
      const custom = new StatusLine({
        updateInterval: 500,
        showModel: false,
      });

      expect(custom.getUpdateInterval()).toBe(500);
      custom.stop();
    });
  });

  // =========================================================================
  // Data Update Tests
  // =========================================================================

  describe('data updates', () => {
    it('should update model', () => {
      statusLine.setModel('gpt-4');
      expect(statusLine.getData().model).toBe('gpt-4');
    });

    it('should update context usage with clamping', () => {
      statusLine.setContextUsage(75);
      expect(statusLine.getData().contextUsage).toBe(75);

      statusLine.setContextUsage(150); // Over 100
      expect(statusLine.getData().contextUsage).toBe(100);

      statusLine.setContextUsage(-10); // Negative
      expect(statusLine.getData().contextUsage).toBe(0);
    });

    it('should update learning score', () => {
      statusLine.setLearningScore(42);
      expect(statusLine.getData().learningScore).toBe(42);
    });

    it('should update active agents with minimum of 0', () => {
      statusLine.setActiveAgents(5);
      expect(statusLine.getData().activeAgents).toBe(5);

      statusLine.setActiveAgents(-1);
      expect(statusLine.getData().activeAgents).toBe(0);
    });

    it('should update pending tasks with minimum of 0', () => {
      statusLine.setPendingTasks(3);
      expect(statusLine.getData().pendingTasks).toBe(3);

      statusLine.setPendingTasks(-5);
      expect(statusLine.getData().pendingTasks).toBe(0);
    });

    it('should emit update event on data change', () => {
      const handler = jest.fn();
      statusLine.on('update', handler);

      statusLine.setModel('claude');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude' }));
    });

    it('should not emit update event when data unchanged', () => {
      statusLine.setModel('gpt-4');

      const handler = jest.fn();
      statusLine.on('update', handler);

      statusLine.setModel('gpt-4'); // Same value

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Custom Segments Tests
  // =========================================================================

  describe('custom segments', () => {
    it('should add custom segment', () => {
      const segment: StatusSegment = {
        label: 'Memory',
        value: '256MB',
        color: 'info',
      };

      statusLine.addSegment(segment);
      const data = statusLine.getData();

      expect(data.customSegments).toHaveLength(1);
      expect(data.customSegments![0]).toEqual(segment);
    });

    it('should update existing segment by label', () => {
      statusLine.addSegment({ label: 'Memory', value: '256MB' });
      statusLine.addSegment({ label: 'Memory', value: '512MB' });

      const data = statusLine.getData();
      expect(data.customSegments).toHaveLength(1);
      expect(data.customSegments![0].value).toBe('512MB');
    });

    it('should remove segment by label', () => {
      statusLine.addSegment({ label: 'Memory', value: '256MB' });
      statusLine.addSegment({ label: 'CPU', value: '50%' });

      statusLine.removeSegment('Memory');
      const data = statusLine.getData();

      expect(data.customSegments).toHaveLength(1);
      expect(data.customSegments![0].label).toBe('CPU');
    });
  });

  // =========================================================================
  // Rendering Tests
  // =========================================================================

  describe('rendering', () => {
    it('should render status line with default format', () => {
      statusLine.setModel('claude');
      statusLine.setContextUsage(45.5);
      statusLine.setLearningScore(10);
      statusLine.setActiveAgents(2);
      statusLine.setPendingTasks(3);

      const rendered = statusLine.render();

      expect(rendered).toContain('[claude]');
      expect(rendered).toContain('Context: 45.5%');
      expect(rendered).toContain('Learning: 10');
      expect(rendered).toContain('Agents: 2');
      expect(rendered).toContain('Tasks: 3');
    });

    it('should render with custom formatter', () => {
      const customStatus = new StatusLine({
        formatter: (data: StatusLineData) => `Model=${data.model} CTX=${data.contextUsage}%`,
      });

      customStatus.setModel('test');
      customStatus.setContextUsage(50);

      expect(customStatus.render()).toBe('Model=test CTX=50%');
      customStatus.stop();
    });

    it('should render colored output', () => {
      statusLine.setModel('gpt-4');
      statusLine.setContextUsage(80);

      const colored = statusLine.renderColored();

      // Should contain ANSI escape codes
      expect(colored).toContain('\x1b[');
      expect(colored).toContain('gpt-4');
    });

    it('should render custom segments', () => {
      statusLine.addSegment({ label: 'Custom', value: 'test' });
      const rendered = statusLine.render();

      expect(rendered).toContain('Custom: test');
    });
  });

  // =========================================================================
  // Provider Tests
  // =========================================================================

  describe('data providers', () => {
    it('should register and use data provider', async () => {
      const provider = jest.fn().mockResolvedValue({ model: 'provided-model' });
      statusLine.registerProvider('test', provider);

      await statusLine.refresh();

      expect(provider).toHaveBeenCalled();
      expect(statusLine.getData().model).toBe('provided-model');
    });

    it('should unregister data provider', async () => {
      const provider = jest.fn().mockResolvedValue({ model: 'new-model' });
      statusLine.registerProvider('test', provider);
      statusLine.unregisterProvider('test');

      await statusLine.refresh();

      expect(provider).not.toHaveBeenCalled();
    });

    it('should emit error on provider failure', async () => {
      const error = new Error('Provider failed');
      const provider = jest.fn().mockRejectedValue(error);
      statusLine.registerProvider('failing', provider);

      const errorHandler = jest.fn();
      statusLine.on('error', errorHandler);

      await statusLine.refresh();

      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });

  // =========================================================================
  // Start/Stop Tests
  // =========================================================================

  describe('start and stop', () => {
    it('should start and emit started event', () => {
      const handler = jest.fn();
      statusLine.on('started', handler);

      statusLine.start();

      expect(statusLine.isRunning()).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('should stop and emit stopped event', () => {
      const handler = jest.fn();
      statusLine.on('stopped', handler);

      statusLine.start();
      statusLine.stop();

      expect(statusLine.isRunning()).toBe(false);
      expect(handler).toHaveBeenCalled();
    });

    it('should not start twice', () => {
      const handler = jest.fn();
      statusLine.on('started', handler);

      statusLine.start();
      statusLine.start();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit tick events when running', (done) => {
      const fastStatus = new StatusLine({ updateInterval: 50 });
      const handler = jest.fn();
      fastStatus.on('tick', handler);

      fastStatus.start();

      setTimeout(() => {
        fastStatus.stop();
        expect(handler).toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  // =========================================================================
  // Update Interval Tests
  // =========================================================================

  describe('update interval', () => {
    it('should get update interval', () => {
      expect(statusLine.getUpdateInterval()).toBe(1000);
    });

    it('should set update interval with minimum', () => {
      statusLine.setUpdateInterval(50); // Below 100 minimum
      expect(statusLine.getUpdateInterval()).toBe(100);

      statusLine.setUpdateInterval(500);
      expect(statusLine.getUpdateInterval()).toBe(500);
    });
  });
});

describe('TaskWatcher', () => {
  let watcher: TaskWatcher;

  beforeEach(() => {
    watcher = new TaskWatcher({ cleanupInterval: 0 }); // Disable auto cleanup for tests
  });

  afterEach(() => {
    watcher.stop();
  });

  // =========================================================================
  // Task Creation Tests
  // =========================================================================

  describe('task creation', () => {
    it('should create task with pending status', () => {
      const task = watcher.createTask('Test Task');

      expect(task.id).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(task.status).toBe('pending');
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it('should create task with metadata', () => {
      const task = watcher.createTask('Task with meta', { priority: 'high' });

      expect(task.metadata).toEqual({ priority: 'high' });
    });

    it('should emit created event', () => {
      const handler = jest.fn();
      watcher.on('task:created', handler);

      watcher.createTask('Event Task');

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].type).toBe('created');
    });
  });

  // =========================================================================
  // Task Lifecycle Tests
  // =========================================================================

  describe('task lifecycle', () => {
    it('should start a pending task', () => {
      const task = watcher.createTask('Lifecycle Task');
      const started = watcher.startTask(task.id);

      expect(started?.status).toBe('running');
      expect(started?.startedAt).toBeInstanceOf(Date);
    });

    it('should not start non-pending task', () => {
      const task = watcher.createTask('Already started');
      watcher.startTask(task.id);
      const secondStart = watcher.startTask(task.id);

      expect(secondStart).toBeNull();
    });

    it('should complete a running task', () => {
      const task = watcher.createTask('Complete Task');
      watcher.startTask(task.id);
      const completed = watcher.completeTask(task.id);

      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeInstanceOf(Date);
      expect(completed?.progress).toBe(100);
    });

    it('should fail a task with error', () => {
      const task = watcher.createTask('Failing Task');
      watcher.startTask(task.id);
      const failed = watcher.failTask(task.id, 'Something went wrong');

      expect(failed?.status).toBe('failed');
      expect(failed?.error).toBe('Something went wrong');
    });

    it('should cancel a task', () => {
      const task = watcher.createTask('Cancel Task');
      watcher.startTask(task.id);
      const cancelled = watcher.cancelTask(task.id);

      expect(cancelled?.status).toBe('cancelled');
    });

    it('should update task progress', () => {
      const task = watcher.createTask('Progress Task');
      watcher.startTask(task.id);
      watcher.updateProgress(task.id, 50);

      expect(watcher.getTask(task.id)?.progress).toBe(50);
    });

    it('should clamp progress to 0-100', () => {
      const task = watcher.createTask('Clamp Task');
      watcher.startTask(task.id);

      watcher.updateProgress(task.id, 150);
      expect(watcher.getTask(task.id)?.progress).toBe(100);

      watcher.updateProgress(task.id, -10);
      expect(watcher.getTask(task.id)?.progress).toBe(0);
    });
  });

  // =========================================================================
  // Task Query Tests
  // =========================================================================

  describe('task queries', () => {
    beforeEach(() => {
      // Create tasks in various states
      watcher.createTask('Pending 1'); // Stays pending
      const t2 = watcher.createTask('Running 1');
      watcher.startTask(t2.id);
      const t3 = watcher.createTask('Completed 1');
      watcher.startTask(t3.id);
      watcher.completeTask(t3.id);
      const t4 = watcher.createTask('Failed 1');
      watcher.startTask(t4.id);
      watcher.failTask(t4.id);
    });

    it('should get all tasks', () => {
      expect(watcher.getAllTasks()).toHaveLength(4);
    });

    it('should get tasks by status', () => {
      expect(watcher.getTasksByStatus('pending')).toHaveLength(1);
      expect(watcher.getTasksByStatus('running')).toHaveLength(1);
      expect(watcher.getTasksByStatus('completed')).toHaveLength(1);
      expect(watcher.getTasksByStatus('failed')).toHaveLength(1);
    });

    it('should get active tasks', () => {
      expect(watcher.getActiveTasks()).toHaveLength(2);
    });

    it('should get completed tasks', () => {
      expect(watcher.getCompletedTasks()).toHaveLength(2);
    });

    it('should get active count', () => {
      expect(watcher.getActiveCount()).toBe(2);
    });

    it('should get task stats', () => {
      const stats = watcher.getStats();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(1);
      expect(stats.running).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.cancelled).toBe(0);
    });
  });

  // =========================================================================
  // Callback Tests
  // =========================================================================

  describe('completion callbacks', () => {
    it('should invoke callback on task completion', (done) => {
      const task = watcher.createTask('Callback Task');

      watcher.onComplete(task.id, (completedTask) => {
        expect(completedTask.status).toBe('completed');
        done();
      });

      watcher.startTask(task.id);
      watcher.completeTask(task.id);
    });

    it('should invoke callback immediately if already completed', (done) => {
      const task = watcher.createTask('Already Done');
      watcher.startTask(task.id);
      watcher.completeTask(task.id);

      watcher.onComplete(task.id, (completedTask) => {
        expect(completedTask.status).toBe('completed');
        done();
      });
    });

    it('should wait for task with promise', async () => {
      const task = watcher.createTask('Promise Task');

      // Complete in next tick
      setTimeout(() => {
        watcher.startTask(task.id);
        watcher.completeTask(task.id);
      }, 10);

      const result = await watcher.waitForTask(task.id);
      expect(result.status).toBe('completed');
    });

    it('should reject promise on task failure', async () => {
      const task = watcher.createTask('Fail Promise');

      setTimeout(() => {
        watcher.startTask(task.id);
        watcher.failTask(task.id, 'Oops');
      }, 10);

      await expect(watcher.waitForTask(task.id)).rejects.toThrow('Oops');
    });

    it('should reject promise for non-existent task', async () => {
      await expect(watcher.waitForTask('nonexistent')).rejects.toThrow('not found');
    });
  });

  // =========================================================================
  // Cleanup Tests
  // =========================================================================

  describe('cleanup', () => {
    it('should remove a task', () => {
      const task = watcher.createTask('To Remove');
      expect(watcher.getTask(task.id)).toBeDefined();

      watcher.removeTask(task.id);
      expect(watcher.getTask(task.id)).toBeUndefined();
    });

    it('should clear completed tasks', () => {
      const t1 = watcher.createTask('To Complete');
      watcher.startTask(t1.id);
      watcher.completeTask(t1.id);
      watcher.createTask('Stay Pending');

      const removed = watcher.clearCompleted();

      expect(removed).toBe(1);
      expect(watcher.getAllTasks()).toHaveLength(1);
    });

    it('should clear all tasks', () => {
      watcher.createTask('Task 1');
      watcher.createTask('Task 2');

      watcher.clearAll();

      expect(watcher.getAllTasks()).toHaveLength(0);
    });
  });

  // =========================================================================
  // Event Tests
  // =========================================================================

  describe('events', () => {
    it('should emit task events', () => {
      const genericHandler = jest.fn();
      const startedHandler = jest.fn();

      watcher.on('task', genericHandler);
      watcher.on('task:started', startedHandler);

      const task = watcher.createTask('Event Task');
      watcher.startTask(task.id);

      expect(genericHandler).toHaveBeenCalledTimes(2); // created + started
      expect(startedHandler).toHaveBeenCalledTimes(1);
    });

    it('should not emit events when disabled', () => {
      const quietWatcher = new TaskWatcher({
        emitEvents: false,
        cleanupInterval: 0,
      });

      const handler = jest.fn();
      quietWatcher.on('task', handler);

      quietWatcher.createTask('Silent Task');

      expect(handler).not.toHaveBeenCalled();
      quietWatcher.stop();
    });
  });
});
