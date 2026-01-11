import { SessionContextLoader } from '../../src/context';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';
import { EventType } from '../../src/hooks';

describe('SessionContextLoader', () => {
  let loader: SessionContextLoader;
  let mockFileOps: jest.Mocked<FileOperations>;
  let mockDirOps: jest.Mocked<DirectoryOperations>;

  beforeEach(() => {
    const validator = new PathValidator('/tmp/test-memory');
    mockFileOps = {
      readFile: jest.fn().mockResolvedValue(''),
      writeFile: jest.fn().mockResolvedValue(undefined),
      appendFile: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(false),
      getFileStats: jest.fn().mockResolvedValue(undefined),
      copyFile: jest.fn().mockResolvedValue(undefined),
      moveFile: jest.fn().mockResolvedValue(undefined),
      getValidator: jest.fn().mockReturnValue(validator),
    } as unknown as jest.Mocked<FileOperations>;

    mockDirOps = {
      createDirectory: jest.fn().mockResolvedValue(undefined),
      deleteDirectory: jest.fn().mockResolvedValue(undefined),
      listFiles: jest.fn().mockResolvedValue([]),
      listDirectories: jest.fn().mockResolvedValue([]),
      directoryExists: jest.fn().mockResolvedValue(true),
      getDirectoryStats: jest.fn().mockResolvedValue(undefined),
      getValidator: jest.fn().mockReturnValue(validator),
    } as unknown as jest.Mocked<DirectoryOperations>;

    loader = new SessionContextLoader(mockFileOps, mockDirOps);
  });

  describe('constructor', () => {
    it('should create loader with default base directory', () => {
      expect(loader.getSessionsBaseDir()).toBe('history/sessions');
    });

    it('should accept custom base directory', () => {
      const customLoader = new SessionContextLoader(
        mockFileOps,
        mockDirOps,
        {},
        'custom/sessions'
      );
      expect(customLoader.getSessionsBaseDir()).toBe('custom/sessions');
    });
  });

  describe('load', () => {
    it('should return undefined when no sessionId provided', async () => {
      const result = await loader.load({});
      expect(result).toBeUndefined();
    });

    it('should return undefined when sessions directory does not exist', async () => {
      mockDirOps.directoryExists.mockResolvedValue(false);

      const result = await loader.load({ sessionId: 'test-session' });

      expect(result).toBeUndefined();
    });

    it('should return undefined when no events or summary found', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue([]);

      const result = await loader.load({ sessionId: 'test-session' });

      expect(result).toBeUndefined();
    });

    it('should load events from JSONL files matching sessionId', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['test-session.jsonl']);

      const events = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          type: EventType.CAPTURE_ALL,
          content: 'session event',
          metadata: { sessionId: 'test-session' },
        },
      ];

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('test-session.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const result = await loader.load({ sessionId: 'test-session' });

      expect(result?.recentEvents).toHaveLength(1);
      expect(result?.recentEvents[0].content).toBe('session event');
    });

    it('should filter events by sessionId metadata', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['events.jsonl']);

      const events = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          type: EventType.CAPTURE_ALL,
          content: 'session 1 event',
          metadata: { sessionId: 'session-1' },
        },
        {
          timestamp: '2024-01-15T11:00:00Z',
          type: EventType.CAPTURE_ALL,
          content: 'session 2 event',
          metadata: { sessionId: 'session-2' },
        },
      ];

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('events.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const result = await loader.load({ sessionId: 'session-1' });

      expect(result?.recentEvents).toHaveLength(1);
      expect(result?.recentEvents[0].content).toBe('session 1 event');
    });

    it('should load summary from summary file', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['test-session.jsonl']);

      const events = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          type: EventType.CAPTURE_ALL,
          content: 'event',
          metadata: {},
        },
      ];

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('test-session.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        if (path.endsWith('test-session-summary.json')) {
          return JSON.stringify({ summary: 'Session summary text' });
        }
        return '';
      });

      const result = await loader.load({ sessionId: 'test-session' });

      expect(result?.summary).toBe('Session summary text');
    });

    it('should load summary from session_summary event type', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['test-session.jsonl']);

      const events = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          type: 'session_summary',
          content: 'Summary from event',
          metadata: { sessionId: 'test-session' },
        },
      ];

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('test-session.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const result = await loader.load({ sessionId: 'test-session' });

      expect(result?.summary).toBe('Summary from event');
    });

    it('should determine startedAt from earliest event', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['test-session.jsonl']);

      const events = [
        {
          timestamp: '2024-01-15T12:00:00Z',
          type: EventType.CAPTURE_ALL,
          content: 'later event',
          metadata: { sessionId: 'test-session' },
        },
        {
          timestamp: '2024-01-15T10:00:00Z',
          type: EventType.CAPTURE_ALL,
          content: 'earlier event',
          metadata: { sessionId: 'test-session' },
        },
      ];

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('test-session.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const result = await loader.load({ sessionId: 'test-session' });

      expect(result?.startedAt).toBe('2024-01-15T10:00:00Z');
    });

    it('should limit events by token count', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['test-session.jsonl']);

      const events = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: `Event ${i} with content to increase token count`,
        metadata: { sessionId: 'test-session' },
      }));

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('test-session.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const customLoader = new SessionContextLoader(mockFileOps, mockDirOps, {
        maxTokensPerLayer: 200,
      });

      const result = await customLoader.load({ sessionId: 'test-session' });

      expect(result?.recentEvents.length).toBeLessThan(50);
    });

    it('should return complete session context', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['test-session.jsonl']);

      const events = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          type: EventType.CAPTURE_ALL,
          content: 'test event',
          metadata: { sessionId: 'test-session' },
        },
      ];

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('test-session.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        if (path.endsWith('test-session-summary.json')) {
          return JSON.stringify({ summary: 'Test summary' });
        }
        return '';
      });

      const result = await loader.load({ sessionId: 'test-session' });

      expect(result?.sessionId).toBe('test-session');
      expect(result?.startedAt).toBe('2024-01-15T10:00:00Z');
      expect(result?.recentEvents).toHaveLength(1);
      expect(result?.summary).toBe('Test summary');
      expect(result?.metadata).toEqual({});
    });

    it('should handle malformed JSONL lines gracefully', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['test-session.jsonl']);

      const validEvent = {
        timestamp: '2024-01-15T10:00:00Z',
        type: EventType.CAPTURE_ALL,
        content: 'valid event',
        metadata: { sessionId: 'test-session' },
      };

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('test-session.jsonl')) {
          return `${JSON.stringify(validEvent)}\ninvalid json line\n${JSON.stringify(validEvent)}`;
        }
        return '';
      });

      const result = await loader.load({ sessionId: 'test-session' });

      // Should still load valid events
      expect(result?.recentEvents.length).toBeGreaterThan(0);
    });
  });

  describe('getSessionsBaseDir', () => {
    it('should return the base directory', () => {
      expect(loader.getSessionsBaseDir()).toBe('history/sessions');
    });
  });
});
