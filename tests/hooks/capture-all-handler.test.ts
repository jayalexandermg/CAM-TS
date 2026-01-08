import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CaptureAllHandler, HookEvent, EventType } from '../../src/hooks';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';

describe('CaptureAllHandler', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let handler: CaptureAllHandler;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'capture-all-test-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    handler = new CaptureAllHandler(fileOperations, directoryOperations);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const createTestEvent = (content: string = 'Test event'): HookEvent => ({
    timestamp: new Date().toISOString(),
    type: EventType.CAPTURE_ALL,
    content,
    metadata: { testKey: 'testValue' },
  });

  describe('constructor', () => {
    it('should have correct name', () => {
      expect(handler.name).toBe('capture-all');
    });

    it('should have correct event type', () => {
      expect(handler.eventType).toBe(EventType.CAPTURE_ALL);
    });

    it('should use default base directory', () => {
      expect(handler.getBaseDirectory()).toBe('history/execution');
    });

    it('should allow custom base directory', () => {
      const customHandler = new CaptureAllHandler(fileOperations, directoryOperations, {
        baseDirectory: 'custom/path',
      });
      expect(customHandler.getBaseDirectory()).toBe('custom/path');
    });
  });

  describe('handle', () => {
    it('should create directory if not exists', async () => {
      const event = createTestEvent();
      await handler.handle(event);

      const dirExists = await directoryOperations.directoryExists('history/execution');
      expect(dirExists).toBe(true);
    });

    it('should write event to file', async () => {
      const event = createTestEvent('First event');
      await handler.handle(event);

      const filePath = handler.getCurrentFilePath();
      expect(filePath).not.toBeNull();

      const content = await fileOperations.readFile(filePath!);
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.content).toBe('First event');
    });

    it('should append multiple events to same file', async () => {
      await handler.handle(createTestEvent('Event 1'));
      await handler.handle(createTestEvent('Event 2'));
      await handler.handle(createTestEvent('Event 3'));

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0]).content).toBe('Event 1');
      expect(JSON.parse(lines[1]).content).toBe('Event 2');
      expect(JSON.parse(lines[2]).content).toBe('Event 3');
    });

    it('should write valid JSONL format', async () => {
      const event = createTestEvent();
      await handler.handle(event);

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const lines = content.trim().split('\n');

      // Each line should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it('should preserve event metadata', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: 'Test',
        metadata: {
          agentId: 'test-agent',
          projectId: 'test-project',
          tags: ['tag1', 'tag2'],
        },
      };

      await handler.handle(event);

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.agentId).toBe('test-agent');
      expect(parsed.metadata.projectId).toBe('test-project');
      expect(parsed.metadata.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle events with empty content', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: '',
        metadata: {},
      };

      await handler.handle(event);
      const filePath = handler.getCurrentFilePath();
      expect(filePath).not.toBeNull();
    });
  });

  describe('getCurrentFilePath', () => {
    it('should return null before any events', () => {
      expect(handler.getCurrentFilePath()).toBeNull();
    });

    it('should return path after handling event', async () => {
      await handler.handle(createTestEvent());
      const filePath = handler.getCurrentFilePath();

      expect(filePath).not.toBeNull();
      expect(filePath).toContain('history/execution');
      expect(filePath).toContain('.jsonl');
    });
  });

  describe('resetFilename', () => {
    it('should reset current filename to null', async () => {
      await handler.handle(createTestEvent());
      expect(handler.getCurrentFilePath()).not.toBeNull();

      handler.resetFilename();
      expect(handler.getCurrentFilePath()).toBeNull();
    });

    it('should create new file after reset when time changes', async () => {
      await handler.handle(createTestEvent());
      const firstPath = handler.getCurrentFilePath();

      handler.resetFilename();

      // Wait to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await handler.handle(createTestEvent());
      const secondPath = handler.getCurrentFilePath();

      expect(secondPath).not.toBe(firstPath);
    });
  });
});
