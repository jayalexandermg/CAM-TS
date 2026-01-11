import { UserContextLoader, ContextRequest, USER_CONTEXT_FILES } from '../../src/context';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';

describe('UserContextLoader', () => {
  let loader: UserContextLoader;
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

    loader = new UserContextLoader(mockFileOps, mockDirOps);
  });

  const createRequest = (): ContextRequest => ({});

  describe('constructor', () => {
    it('should create loader with default config', () => {
      expect(loader).toBeDefined();
    });

    it('should accept custom config', () => {
      const customLoader = new UserContextLoader(mockFileOps, mockDirOps, {
        maxTokensPerLayer: 500,
      });
      expect(customLoader).toBeDefined();
    });
  });

  describe('load', () => {
    it('should return undefined when no user data exists', async () => {
      mockFileOps.readFile.mockResolvedValue('');

      const result = await loader.load(createRequest());

      expect(result).toBeUndefined();
    });

    it('should load preferences from preferences.json', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('preferences.json')) {
          return JSON.stringify({ language: 'en', theme: 'dark' });
        }
        return '';
      });

      const result = await loader.load(createRequest());

      expect(result).toBeDefined();
      expect(result?.preferences).toEqual({ language: 'en', theme: 'dark' });
    });

    it('should load goals from goals.json', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('goals.json')) {
          return JSON.stringify({ goals: ['goal1', 'goal2'] });
        }
        return '';
      });

      const result = await loader.load(createRequest());

      expect(result).toBeDefined();
      expect(result?.goals).toEqual(['goal1', 'goal2']);
    });

    it('should handle goals as direct array', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('goals.json')) {
          return JSON.stringify(['goal1', 'goal2']);
        }
        return '';
      });

      const result = await loader.load(createRequest());

      expect(result?.goals).toEqual(['goal1', 'goal2']);
    });

    it('should load constraints from constraints.json', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('constraints.json')) {
          return JSON.stringify({ constraints: ['no offensive content', 'family friendly'] });
        }
        return '';
      });

      const result = await loader.load(createRequest());

      expect(result?.constraints).toEqual(['no offensive content', 'family friendly']);
    });

    it('should load working style from working-style.json', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('working-style.json')) {
          return JSON.stringify({ workingStyle: 'focused and detail-oriented' });
        }
        return '';
      });

      const result = await loader.load(createRequest());

      expect(result?.workingStyle).toBe('focused and detail-oriented');
    });

    it('should handle style property for working style', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('working-style.json')) {
          return JSON.stringify({ style: 'collaborative' });
        }
        return '';
      });

      const result = await loader.load(createRequest());

      expect(result?.workingStyle).toBe('collaborative');
    });

    it('should combine all user context data', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('preferences.json')) {
          return JSON.stringify({ language: 'en' });
        }
        if (path.endsWith('goals.json')) {
          return JSON.stringify({ goals: ['goal1'] });
        }
        if (path.endsWith('constraints.json')) {
          return JSON.stringify({ constraints: ['constraint1'] });
        }
        if (path.endsWith('working-style.json')) {
          return JSON.stringify({ workingStyle: 'focused' });
        }
        return '';
      });

      const result = await loader.load(createRequest());

      expect(result).toEqual({
        preferences: { language: 'en' },
        goals: ['goal1'],
        constraints: ['constraint1'],
        workingStyle: 'focused',
        metadata: {},
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      mockFileOps.readFile.mockResolvedValue('not valid json');

      const result = await loader.load(createRequest());

      expect(result).toBeUndefined();
    });

    it('should handle file read errors', async () => {
      mockFileOps.readFile.mockRejectedValue(new Error('File not found'));

      const result = await loader.load(createRequest());

      expect(result).toBeUndefined();
    });
  });

  describe('getDefaultContext', () => {
    it('should return default user context', () => {
      const defaultContext = loader.getDefaultContext();

      expect(defaultContext.preferences).toEqual({});
      expect(defaultContext.goals).toEqual([]);
      expect(defaultContext.constraints).toEqual([]);
      expect(defaultContext.workingStyle).toBe('');
      expect(defaultContext.metadata).toEqual({});
    });
  });

  describe('file path constants', () => {
    it('should use correct file paths', () => {
      expect(USER_CONTEXT_FILES.preferences).toBe('user/preferences.json');
      expect(USER_CONTEXT_FILES.goals).toBe('user/goals.json');
      expect(USER_CONTEXT_FILES.constraints).toBe('user/constraints.json');
      expect(USER_CONTEXT_FILES.workingStyle).toBe('user/working-style.json');
    });
  });
});
