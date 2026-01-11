import {
  DynamicContextLoader,
  ContextRequest,
  ContextLayer,
  DEFAULT_DYNAMIC_CONTEXT_LOADER_CONFIG,
} from '../../src/context';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';

describe('DynamicContextLoader', () => {
  let loader: DynamicContextLoader;
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
      directoryExists: jest.fn().mockResolvedValue(false),
      getDirectoryStats: jest.fn().mockResolvedValue(undefined),
      getValidator: jest.fn().mockReturnValue(validator),
    } as unknown as jest.Mocked<DirectoryOperations>;

    loader = new DynamicContextLoader(mockFileOps, mockDirOps);
  });

  describe('constructor', () => {
    it('should create loader with default config', () => {
      const config = loader.getConfig();
      expect(config.maxTokensPerLayer).toBe(DEFAULT_DYNAMIC_CONTEXT_LOADER_CONFIG.maxTokensPerLayer);
      expect(config.maxTotalTokens).toBe(DEFAULT_DYNAMIC_CONTEXT_LOADER_CONFIG.maxTotalTokens);
    });

    it('should accept custom config', () => {
      const customLoader = new DynamicContextLoader(mockFileOps, mockDirOps, {
        maxTokensPerLayer: 500,
        projectsBaseDir: 'custom/projects',
      });
      const config = customLoader.getConfig();
      expect(config.maxTokensPerLayer).toBe(500);
      expect(config.projectsBaseDir).toBe('custom/projects');
    });

    it('should initialize scorer', () => {
      expect(loader.getScorer()).toBeDefined();
    });

    it('should initialize cache', () => {
      expect(loader.getCache()).toBeDefined();
    });
  });

  describe('load', () => {
    it('should return LoadedContext with all required properties', async () => {
      const result = await loader.load({});

      expect(result).toHaveProperty('relevanceScores');
      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('loadedAt');
    });

    it('should always try to load user context', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockResolvedValue(JSON.stringify({ language: 'en' }));

      const result = await loader.load({});

      expect(mockFileOps.readFile).toHaveBeenCalled();
      expect(result.relevanceScores).toHaveProperty('user');
    });

    it('should load project context when projectId provided', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.includes('projects/test-project')) {
          return JSON.stringify({ description: 'Test project' });
        }
        return '';
      });

      const result = await loader.load({ projectId: 'test-project' });

      expect(result.projectContext).toBeDefined();
    });

    it('should load session context when sessionId provided', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['test-session.jsonl']);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.endsWith('test-session.jsonl')) {
          return JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'capture_all',
            content: 'test',
            metadata: { sessionId: 'test-session' },
          });
        }
        return '';
      });

      const result = await loader.load({ sessionId: 'test-session' });

      expect(result.sessionContext).toBeDefined();
    });

    it('should load agent context when agentId provided', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.includes('agents/test-agent')) {
          if (path.endsWith('capabilities.json')) {
            return JSON.stringify({ capabilities: ['coding'] });
          }
        }
        return '';
      });

      const result = await loader.load({ agentId: 'test-agent' });

      expect(result.agentContext).toBeDefined();
    });

    it('should respect explicit layers parameter', async () => {
      const result = await loader.load({
        layers: [ContextLayer.USER],
        projectId: 'test-project',
        sessionId: 'test-session',
      });

      // Only user layer requested, so project and session should be undefined
      expect(result.projectContext).toBeUndefined();
      expect(result.sessionContext).toBeUndefined();
    });

    it('should calculate relevance scores', async () => {
      mockFileOps.readFile.mockResolvedValue(JSON.stringify({ language: 'en' }));

      const result = await loader.load({});

      expect(result.relevanceScores.user).toBeDefined();
      expect(result.relevanceScores.project).toBeDefined();
      expect(result.relevanceScores.session).toBeDefined();
      expect(result.relevanceScores.agent).toBeDefined();
    });

    it('should calculate total tokens', async () => {
      mockFileOps.readFile.mockResolvedValue(JSON.stringify({ language: 'en' }));

      const result = await loader.load({});

      expect(result.totalTokens).toBeGreaterThanOrEqual(0);
    });

    it('should set loadedAt timestamp', async () => {
      const beforeLoad = new Date().toISOString();
      const result = await loader.load({});
      const afterLoad = new Date().toISOString();

      expect(result.loadedAt).toBeDefined();
      expect(result.loadedAt >= beforeLoad).toBe(true);
      expect(result.loadedAt <= afterLoad).toBe(true);
    });

    it('should cache results', async () => {
      const request: ContextRequest = { projectId: 'test-project' };

      await loader.load(request);
      expect(loader.isCached(request)).toBe(true);
    });

    it('should return cached result on second call', async () => {
      const request: ContextRequest = { projectId: 'test-project' };

      const result1 = await loader.load(request);
      const result2 = await loader.load(request);

      expect(result1.loadedAt).toBe(result2.loadedAt);
    });
  });

  describe('loadUserContext', () => {
    it('should load only user context', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockResolvedValue(JSON.stringify({ language: 'en' }));

      const result = await loader.loadUserContext({});

      expect(result.userContext).toBeDefined();
      expect(result.projectContext).toBeUndefined();
      expect(result.sessionContext).toBeUndefined();
      expect(result.agentContext).toBeUndefined();
    });

    it('should score user context relevance', async () => {
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockResolvedValue(JSON.stringify({ language: 'en' }));

      const result = await loader.loadUserContext({});

      expect(result.relevanceScores.user).toBe(1.0);
    });
  });

  describe('loadProjectContext', () => {
    it('should load user and project contexts', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.includes('user/')) {
          return JSON.stringify({ language: 'en' });
        }
        if (path.includes('projects/')) {
          return JSON.stringify({ description: 'Test' });
        }
        return '';
      });

      const result = await loader.loadProjectContext({ projectId: 'test-project' });

      expect(result.userContext).toBeDefined();
      expect(result.projectContext).toBeDefined();
      expect(result.sessionContext).toBeUndefined();
      expect(result.agentContext).toBeUndefined();
    });
  });

  describe('loadSessionContext', () => {
    it('should load user, project, and session contexts', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockFileOps.fileExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['session.jsonl']);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.includes('user/')) {
          return JSON.stringify({ language: 'en' });
        }
        if (path.includes('projects/')) {
          return JSON.stringify({ description: 'Test' });
        }
        if (path.endsWith('.jsonl')) {
          return JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'capture_all',
            content: 'test',
            metadata: { sessionId: 'test-session' },
          });
        }
        return '';
      });

      const result = await loader.loadSessionContext({
        projectId: 'test-project',
        sessionId: 'test-session',
      });

      expect(result.userContext).toBeDefined();
      expect(result.projectContext).toBeDefined();
      expect(result.sessionContext).toBeDefined();
      expect(result.agentContext).toBeUndefined();
    });
  });

  describe('loadFullContext', () => {
    it('should load all four context layers', async () => {
      mockDirOps.directoryExists.mockResolvedValue(true);
      mockDirOps.listFiles.mockResolvedValue(['events.jsonl']);
      mockFileOps.readFile.mockImplementation(async (path: string) => {
        if (path.includes('user/')) {
          return JSON.stringify({ language: 'en' });
        }
        if (path.includes('projects/')) {
          return JSON.stringify({ description: 'Test' });
        }
        if (path.includes('agents/')) {
          if (path.endsWith('capabilities.json')) {
            return JSON.stringify({ capabilities: ['coding'] });
          }
        }
        if (path.endsWith('.jsonl')) {
          return JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'capture_all',
            content: 'test',
            metadata: { sessionId: 'test-session' },
          });
        }
        return '';
      });

      const result = await loader.loadFullContext({
        projectId: 'test-project',
        sessionId: 'test-session',
        agentId: 'test-agent',
      });

      // All layers should be defined (even if undefined due to no data)
      expect(result).toHaveProperty('userContext');
      expect(result).toHaveProperty('projectContext');
      expect(result).toHaveProperty('sessionContext');
      expect(result).toHaveProperty('agentContext');
    });
  });

  describe('cache operations', () => {
    it('should check if context is cached', async () => {
      const request: ContextRequest = { projectId: 'test-project' };

      expect(loader.isCached(request)).toBe(false);

      await loader.load(request);

      expect(loader.isCached(request)).toBe(true);
    });

    it('should invalidate specific cache entry', async () => {
      const request: ContextRequest = { projectId: 'test-project' };

      await loader.load(request);
      expect(loader.isCached(request)).toBe(true);

      const result = loader.invalidateCache(request);

      expect(result).toBe(true);
      expect(loader.isCached(request)).toBe(false);
    });

    it('should clear entire cache', async () => {
      const request1: ContextRequest = { projectId: 'project-1' };
      const request2: ContextRequest = { projectId: 'project-2' };

      await loader.load(request1);
      await loader.load(request2);

      loader.clearCache();

      expect(loader.isCached(request1)).toBe(false);
      expect(loader.isCached(request2)).toBe(false);
    });

    it('should prune expired cache entries', async () => {
      const shortCacheLoader = new DynamicContextLoader(mockFileOps, mockDirOps, {
        cache: { expiryMs: 50 },
      });

      await shortCacheLoader.load({ projectId: 'test-project' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const pruned = shortCacheLoader.pruneCache();

      expect(pruned).toBe(1);
    });

    it('should return cache statistics', async () => {
      const request: ContextRequest = { projectId: 'test-project' };

      await loader.load(request);
      await loader.load(request); // Cache hit

      const stats = loader.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(1);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = loader.getConfig();

      expect(config).toHaveProperty('maxTokensPerLayer');
      expect(config).toHaveProperty('maxTotalTokens');
      expect(config).toHaveProperty('projectsBaseDir');
      expect(config).toHaveProperty('sessionsBaseDir');
      expect(config).toHaveProperty('agentsBaseDir');
    });
  });

  describe('layer determination', () => {
    it('should determine layers based on request parameters', async () => {
      // Without any IDs, only USER layer
      const result1 = await loader.load({});
      expect(result1.projectContext).toBeUndefined();

      // With projectId, USER and PROJECT layers
      mockDirOps.directoryExists.mockResolvedValue(true);
      const result2 = await loader.load({ projectId: 'test' });
      // Project context would be loaded if directory existed
      expect(result2.relevanceScores).toBeDefined();
    });

    it('should use explicit layers when provided', async () => {
      const result = await loader.load({
        projectId: 'test-project',
        sessionId: 'test-session',
        agentId: 'test-agent',
        layers: [ContextLayer.USER, ContextLayer.AGENT],
      });

      // Only USER and AGENT layers requested
      expect(result.projectContext).toBeUndefined();
      expect(result.sessionContext).toBeUndefined();
    });
  });
});
