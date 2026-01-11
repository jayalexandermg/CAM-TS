import { AgentContextLoader } from '../../src/context';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';
import { EventType } from '../../src/hooks';

describe('AgentContextLoader', () => {
  let loader: AgentContextLoader;
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

    loader = new AgentContextLoader(mockFileOps, mockDirOps);
  });

  describe('constructor', () => {
    it('should create loader with default base directory', () => {
      expect(loader.getAgentsBaseDir()).toBe('agents');
    });

    it('should accept custom base directory', () => {
      const customLoader = new AgentContextLoader(
        mockFileOps,
        mockDirOps,
        {},
        'custom/agents'
      );
      expect(customLoader.getAgentsBaseDir()).toBe('custom/agents');
    });
  });

  describe('load', () => {
    it('should return undefined when no agentId provided', async () => {
      const result = await loader.load({});
      expect(result).toBeUndefined();
    });

    it('should return undefined when agent directory does not exist', async () => {
      mockDirOps.directoryExists.mockResolvedValue(false);

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result).toBeUndefined();
    });

    it('should load capabilities from capabilities.json', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('capabilities.json')) {
          return JSON.stringify({ capabilities: ['coding', 'testing', 'debugging'] });
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result?.capabilities).toEqual(['coding', 'testing', 'debugging']);
    });

    it('should handle capabilities as direct array', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('capabilities.json')) {
          return JSON.stringify(['coding', 'testing']);
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result?.capabilities).toEqual(['coding', 'testing']);
    });

    it('should load performance metrics from performance.json', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('performance.json')) {
          return JSON.stringify({
            successRate: 0.95,
            avgResponseTime: 1.5,
            tasksCompleted: 100,
          });
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result?.performance).toEqual({
        successRate: 0.95,
        avgResponseTime: 1.5,
        tasksCompleted: 100,
      });
    });

    it('should filter non-numeric performance values', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('performance.json')) {
          return JSON.stringify({
            successRate: 0.95,
            name: 'test-agent', // Should be filtered
            avgTime: 1.5,
          });
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result?.performance).toEqual({
        successRate: 0.95,
        avgTime: 1.5,
      });
      expect(result?.performance).not.toHaveProperty('name');
    });

    it('should load events from JSONL files', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['history.jsonl']);

      const events = [
        {
          timestamp: new Date().toISOString(),
          type: EventType.CAPTURE_ALL,
          content: 'agent event',
          metadata: {},
        },
      ];

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('history.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result?.history).toHaveLength(1);
      expect(result?.history[0].content).toBe('agent event');
    });

    it('should combine events from multiple JSONL files', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['history1.jsonl', 'history2.jsonl']);

      const event1 = {
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: 'event 1',
        metadata: {},
      };
      const event2 = {
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: 'event 2',
        metadata: {},
      };

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('history1.jsonl')) {
          return JSON.stringify(event1);
        }
        if (path.endsWith('history2.jsonl')) {
          return JSON.stringify(event2);
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result?.history).toHaveLength(2);
    });

    it('should limit events by token count', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['history.jsonl']);

      const events = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: `Event ${i} with content to increase token count`,
        metadata: {},
      }));

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('history.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const customLoader = new AgentContextLoader(mockFileOps, mockDirOps, {
        maxTokensPerLayer: 200,
      });

      const result = await customLoader.load({ agentId: 'test-agent' });

      expect(result?.history.length).toBeLessThan(50);
    });

    it('should return complete agent context', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('capabilities.json')) {
          return JSON.stringify({ capabilities: ['coding'] });
        }
        if (path.endsWith('performance.json')) {
          return JSON.stringify({ successRate: 0.9 });
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result).toEqual({
        agentId: 'test-agent',
        capabilities: ['coding'],
        history: [],
        performance: { successRate: 0.9 },
        metadata: {},
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.readFile.mockResolvedValue('not valid json');

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result).toBeDefined();
      expect(result?.capabilities).toEqual([]);
      expect(result?.performance).toEqual({});
    });

    it('should handle file read errors', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.readFile.mockRejectedValue(new Error('File not found'));

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result).toBeDefined();
      expect(result?.agentId).toBe('test-agent');
    });

    it('should respect maxTokens from request', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['history.jsonl']);

      const events = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: `Event ${i} with some content`,
        metadata: {},
      }));

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('history.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent', maxTokens: 100 });

      expect(result?.history.length).toBeLessThan(100);
    });
  });

  describe('getAgentsBaseDir', () => {
    it('should return the base directory', () => {
      expect(loader.getAgentsBaseDir()).toBe('agents');
    });
  });
});
