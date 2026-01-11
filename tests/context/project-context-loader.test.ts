import { ProjectContextLoader } from '../../src/context';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';
import { EventType } from '../../src/hooks';

describe('ProjectContextLoader', () => {
  let loader: ProjectContextLoader;
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

    loader = new ProjectContextLoader(mockFileOps, mockDirOps);
  });

  describe('constructor', () => {
    it('should create loader with default base directory', () => {
      expect(loader.getProjectsBaseDir()).toBe('projects');
    });

    it('should accept custom base directory', () => {
      const customLoader = new ProjectContextLoader(
        mockFileOps,
        mockDirOps,
        {},
        'custom/projects'
      );
      expect(customLoader.getProjectsBaseDir()).toBe('custom/projects');
    });
  });

  describe('load', () => {
    it('should return undefined when no projectId provided', async () => {
      const result = await loader.load({});
      expect(result).toBeUndefined();
    });

    it('should return undefined when project directory does not exist', async () => {
      mockDirOps.directoryExists.mockResolvedValue(false);

      const result = await loader.load({ projectId: 'test-project' });

      expect(result).toBeUndefined();
    });

    it('should load description from description.json', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('description.json')) {
          return JSON.stringify({ description: 'A test project' });
        }
        return '';
      });

      const result = await loader.load({ projectId: 'test-project' });

      expect(result?.description).toBe('A test project');
    });

    it('should use name field if description not present', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('description.json')) {
          return JSON.stringify({ name: 'Test Project Name' });
        }
        return '';
      });

      const result = await loader.load({ projectId: 'test-project' });

      expect(result?.description).toBe('Test Project Name');
    });

    it('should load patterns from patterns.json', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('patterns.json')) {
          return JSON.stringify({ patterns: ['pattern1', 'pattern2'] });
        }
        return '';
      });

      const result = await loader.load({ projectId: 'test-project' });

      expect(result?.patterns).toEqual(['pattern1', 'pattern2']);
    });

    it('should handle patterns as direct array', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('patterns.json')) {
          return JSON.stringify(['pattern1', 'pattern2']);
        }
        return '';
      });

      const result = await loader.load({ projectId: 'test-project' });

      expect(result?.patterns).toEqual(['pattern1', 'pattern2']);
    });

    it('should load files from files.json', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('files.json')) {
          return JSON.stringify({ files: ['src/main.ts', 'package.json'] });
        }
        return '';
      });

      const result = await loader.load({ projectId: 'test-project' });

      expect(result?.files).toEqual(['src/main.ts', 'package.json']);
    });

    it('should load events from JSONL files', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['events.jsonl']);

      const events = [
        {
          timestamp: new Date().toISOString(),
          type: EventType.CAPTURE_ALL,
          content: 'test event',
          metadata: {},
        },
      ];

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('events.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const result = await loader.load({ projectId: 'test-project' });

      expect(result?.history).toHaveLength(1);
      expect(result?.history[0].content).toBe('test event');
    });

    it('should limit events by token count', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['events.jsonl']);

      const events = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: `Event ${i} with some content to increase token count significantly`,
        metadata: {},
      }));

      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('events.jsonl')) {
          return events.map((e) => JSON.stringify(e)).join('\n');
        }
        return '';
      });

      const customLoader = new ProjectContextLoader(mockFileOps, mockDirOps, {
        maxTokensPerLayer: 500,
      });

      const result = await customLoader.load({ projectId: 'test-project' });

      // Should have fewer than 100 events due to token limit
      expect(result?.history.length).toBeLessThan(100);
    });

    it('should return complete project context', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('description.json')) {
          return JSON.stringify({ description: 'Test project' });
        }
        if (path.endsWith('patterns.json')) {
          return JSON.stringify({ patterns: ['pattern1'] });
        }
        if (path.endsWith('files.json')) {
          return JSON.stringify({ files: ['file1.ts'] });
        }
        return '';
      });

      const result = await loader.load({ projectId: 'test-project' });

      expect(result).toEqual({
        projectId: 'test-project',
        description: 'Test project',
        history: [],
        patterns: ['pattern1'],
        files: ['file1.ts'],
        metadata: {},
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.readFile.mockResolvedValue('not valid json');

      const result = await loader.load({ projectId: 'test-project' });

      expect(result).toBeDefined();
      expect(result?.description).toBe('');
      expect(result?.patterns).toEqual([]);
    });

    it('should handle file read errors', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.readFile.mockRejectedValue(new Error('File not found'));

      const result = await loader.load({ projectId: 'test-project' });

      expect(result).toBeDefined();
      expect(result?.projectId).toBe('test-project');
    });
  });

  describe('getProjectsBaseDir', () => {
    it('should return the base directory', () => {
      expect(loader.getProjectsBaseDir()).toBe('projects');
    });

    it('should return custom base directory', () => {
      const customLoader = new ProjectContextLoader(
        mockFileOps,
        mockDirOps,
        {},
        'custom/path'
      );
      expect(customLoader.getProjectsBaseDir()).toBe('custom/path');
    });
  });
});
