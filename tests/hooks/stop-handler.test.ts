import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StopHandler, HookEvent, EventType } from '../../src/hooks';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';

describe('StopHandler', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let handler: StopHandler;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'stop-handler-test-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    handler = new StopHandler(fileOperations, directoryOperations);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const createStopEvent = (reason?: string): HookEvent => ({
    timestamp: new Date().toISOString(),
    type: EventType.STOP,
    content: 'Agent stopped',
    metadata: {
      reason: reason ?? 'normal completion',
      agentId: 'test-agent',
    },
  });

  describe('constructor', () => {
    it('should have correct name', () => {
      expect(handler.name).toBe('stop');
    });

    it('should have correct event type', () => {
      expect(handler.eventType).toBe(EventType.STOP);
    });

    it('should use default base directory', () => {
      expect(handler.getBaseDirectory()).toBe('history/execution');
    });

    it('should allow custom base directory', () => {
      const customHandler = new StopHandler(fileOperations, directoryOperations, {
        baseDirectory: 'custom/stops',
      });
      expect(customHandler.getBaseDirectory()).toBe('custom/stops');
    });
  });

  describe('handle', () => {
    it('should create directory if not exists', async () => {
      await handler.handle(createStopEvent());
      const dirExists = await directoryOperations.directoryExists('history/execution');
      expect(dirExists).toBe(true);
    });

    it('should write stop event to file', async () => {
      const event = createStopEvent('user requested stop');
      await handler.handle(event);

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.content).toBe('Agent stopped');
      expect(parsed.type).toBe(EventType.STOP);
    });

    it('should enrich event with stop metadata', async () => {
      const event = createStopEvent();
      await handler.handle(event);

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.stoppedAt).toBeDefined();
      expect(parsed.metadata.handledBy).toBe('stop');
    });

    it('should preserve original stop reason', async () => {
      const event = createStopEvent('error occurred');
      await handler.handle(event);

      const filePath = handler.getCurrentFilePath();
      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.reason).toBe('error occurred');
    });

    it('should append multiple stop events', async () => {
      await handler.handle(createStopEvent('reason 1'));
      await handler.handle(createStopEvent('reason 2'));

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
      await handler.handle(createStopEvent());
      const filePath = handler.getCurrentFilePath();

      expect(filePath).not.toBeNull();
      expect(filePath).toContain('STOP');
      expect(filePath).toContain('.jsonl');
    });
  });

  describe('resetFilename', () => {
    it('should reset current filename to null', async () => {
      await handler.handle(createStopEvent());
      expect(handler.getCurrentFilePath()).not.toBeNull();

      handler.resetFilename();
      expect(handler.getCurrentFilePath()).toBeNull();
    });

    it('should create new file after reset when time changes', async () => {
      await handler.handle(createStopEvent());
      const firstPath = handler.getCurrentFilePath();

      handler.resetFilename();

      // Wait to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await handler.handle(createStopEvent());
      const secondPath = handler.getCurrentFilePath();

      expect(secondPath).not.toBe(firstPath);
    });
  });
});
