import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionSummaryHandler, HookEvent, EventType } from '../../src/hooks';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';

describe('SessionSummaryHandler', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let handler: SessionSummaryHandler;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'session-summary-test-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    handler = new SessionSummaryHandler(fileOperations, directoryOperations);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const createSessionEvent = (sessionId: string = 'session-1'): HookEvent => ({
    timestamp: new Date().toISOString(),
    type: EventType.SESSION_SUMMARY,
    content: 'Session completed successfully',
    metadata: {
      sessionId,
      durationMs: 300000,
      tasksCompleted: ['task1', 'task2'],
    },
  });

  describe('constructor', () => {
    it('should have correct name', () => {
      expect(handler.name).toBe('session-summary');
    });

    it('should have correct event type', () => {
      expect(handler.eventType).toBe(EventType.SESSION_SUMMARY);
    });

    it('should use default base directory', () => {
      expect(handler.getBaseDirectory()).toBe('history/sessions');
    });

    it('should allow custom base directory', () => {
      const customHandler = new SessionSummaryHandler(fileOperations, directoryOperations, {
        baseDirectory: 'custom/sessions',
      });
      expect(customHandler.getBaseDirectory()).toBe('custom/sessions');
    });
  });

  describe('handle', () => {
    it('should create directory if not exists', async () => {
      await handler.handle(createSessionEvent());
      const dirExists = await directoryOperations.directoryExists('history/sessions');
      expect(dirExists).toBe(true);
    });

    it('should write session summary to file', async () => {
      const event = createSessionEvent();
      await handler.handle(event);

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.content).toBe('Session completed successfully');
      expect(parsed.type).toBe(EventType.SESSION_SUMMARY);
    });

    it('should enrich event with session metadata', async () => {
      await handler.handle(createSessionEvent());

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.recordedAt).toBeDefined();
      expect(parsed.metadata.handledBy).toBe('session-summary');
      expect(parsed.metadata.sessionEndTime).toBeDefined();
    });

    it('should preserve original session metadata', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.SESSION_SUMMARY,
        content: 'Summary',
        metadata: {
          sessionId: 'test-session',
          durationMs: 60000,
          tasksCompleted: ['task-a', 'task-b', 'task-c'],
        },
      };

      await handler.handle(event);

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.sessionId).toBe('test-session');
      expect(parsed.metadata.durationMs).toBe(60000);
      expect(parsed.metadata.tasksCompleted).toEqual(['task-a', 'task-b', 'task-c']);
    });

    it('should append multiple session summaries', async () => {
      await handler.handle(createSessionEvent('session-1'));
      await handler.handle(createSessionEvent('session-2'));

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
    });
  });

  describe('getCurrentFilePath', () => {
    it('should return null before any events', () => {
      expect(handler.getCurrentFilePath()).toBeNull();
    });

    it('should return path after handling event', async () => {
      await handler.handle(createSessionEvent());
      const filePath = handler.getCurrentFilePath();

      expect(filePath).not.toBeNull();
      expect(filePath).toContain('history/sessions');
      expect(filePath).toContain('SESSION-SUMMARY');
      expect(filePath).toContain('.jsonl');
    });
  });

  describe('resetFilename', () => {
    it('should reset current filename to null', async () => {
      await handler.handle(createSessionEvent());
      expect(handler.getCurrentFilePath()).not.toBeNull();

      handler.resetFilename();
      expect(handler.getCurrentFilePath()).toBeNull();
    });

    it('should create new file after reset when time changes', async () => {
      await handler.handle(createSessionEvent());
      const firstPath = handler.getCurrentFilePath();

      handler.resetFilename();

      // Wait to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await handler.handle(createSessionEvent());
      const secondPath = handler.getCurrentFilePath();

      expect(secondPath).not.toBe(firstPath);
    });
  });

  describe('createSessionSummary', () => {
    it('should create valid session summary event', () => {
      const event = handler.createSessionSummary(
        'Session completed',
        'session-123',
        300000,
        ['task1', 'task2']
      );

      expect(event.type).toBe(EventType.SESSION_SUMMARY);
      expect(event.content).toBe('Session completed');
      expect(event.metadata.sessionId).toBe('session-123');
      expect(event.metadata.durationMs).toBe(300000);
      expect(event.metadata.tasksCompleted).toEqual(['task1', 'task2']);
      expect(event.metadata.taskCount).toBe(2);
      expect(event.timestamp).toBeDefined();
    });

    it('should include additional metadata', () => {
      const event = handler.createSessionSummary(
        'Done',
        'session-1',
        1000,
        [],
        { customField: 'custom value' }
      );

      expect(event.metadata.customField).toBe('custom value');
    });
  });
});
