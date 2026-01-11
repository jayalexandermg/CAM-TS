import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  DynamicContextLoader,
  ContextLayer,
  ContextRequest,
  RelevanceScorer,
  ContextCache,
} from '../../../src/context';
import { FileOperations } from '../../../src/memory/file-operations';
import { DirectoryOperations } from '../../../src/memory/directory-operations';
import { PathValidator } from '../../../src/memory/path-validator';
import { EventType } from '../../../src/hooks';

describe('Context System Integration', () => {
  let tempDir: string;
  let memoryRoot: string;
  let loader: DynamicContextLoader;
  let fileOps: FileOperations;
  let dirOps: DirectoryOperations;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-test-'));
    memoryRoot = tempDir;

    const validator = new PathValidator(memoryRoot);
    fileOps = new FileOperations(validator);
    dirOps = new DirectoryOperations(validator);

    loader = new DynamicContextLoader(fileOps, dirOps, {
      userBaseDir: 'user',
      projectsBaseDir: 'projects',
      sessionsBaseDir: 'history/sessions',
      agentsBaseDir: 'agents',
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  const createUserFiles = async (preferences: Record<string, unknown> = {}) => {
    const userDir = path.join(memoryRoot, 'user');
    await fs.mkdir(userDir, { recursive: true });

    if (Object.keys(preferences).length > 0) {
      await fs.writeFile(
        path.join(userDir, 'preferences.json'),
        JSON.stringify(preferences)
      );
    }
  };

  const createProjectFiles = async (
    projectId: string,
    data: { description?: string; patterns?: string[]; files?: string[] } = {}
  ) => {
    const projectDir = path.join(memoryRoot, 'projects', projectId);
    await fs.mkdir(projectDir, { recursive: true });

    if (data.description) {
      await fs.writeFile(
        path.join(projectDir, 'description.json'),
        JSON.stringify({ description: data.description })
      );
    }
    if (data.patterns) {
      await fs.writeFile(
        path.join(projectDir, 'patterns.json'),
        JSON.stringify({ patterns: data.patterns })
      );
    }
    if (data.files) {
      await fs.writeFile(
        path.join(projectDir, 'files.json'),
        JSON.stringify({ files: data.files })
      );
    }
  };

  const createSessionFiles = async (
    sessionId: string,
    events: Array<{ content: string; timestamp?: string }> = []
  ) => {
    const sessionsDir = path.join(memoryRoot, 'history/sessions');
    await fs.mkdir(sessionsDir, { recursive: true });

    const formattedEvents = events.map((e) => ({
      timestamp: e.timestamp || new Date().toISOString(),
      type: EventType.CAPTURE_ALL,
      content: e.content,
      metadata: { sessionId },
    }));

    await fs.writeFile(
      path.join(sessionsDir, `${sessionId}.jsonl`),
      formattedEvents.map((e) => JSON.stringify(e)).join('\n')
    );
  };

  const createAgentFiles = async (
    agentId: string,
    data: { capabilities?: string[]; performance?: Record<string, number> } = {}
  ) => {
    const agentDir = path.join(memoryRoot, 'agents', agentId);
    await fs.mkdir(agentDir, { recursive: true });

    if (data.capabilities) {
      await fs.writeFile(
        path.join(agentDir, 'capabilities.json'),
        JSON.stringify({ capabilities: data.capabilities })
      );
    }
    if (data.performance) {
      await fs.writeFile(
        path.join(agentDir, 'performance.json'),
        JSON.stringify(data.performance)
      );
    }
  };

  describe('full 4-layer loading', () => {
    it('should load all 4 layers when data exists', async () => {
      await createUserFiles({ language: 'en', theme: 'dark' });
      await createProjectFiles('project-1', {
        description: 'Test project',
        patterns: ['pattern1'],
      });
      await createSessionFiles('session-1', [{ content: 'test event' }]);
      await createAgentFiles('agent-1', {
        capabilities: ['coding', 'testing'],
        performance: { successRate: 0.95 },
      });

      const result = await loader.loadFullContext({
        projectId: 'project-1',
        sessionId: 'session-1',
        agentId: 'agent-1',
      });

      expect(result.userContext).toBeDefined();
      expect(result.userContext?.preferences).toEqual({ language: 'en', theme: 'dark' });

      expect(result.projectContext).toBeDefined();
      expect(result.projectContext?.description).toBe('Test project');
      expect(result.projectContext?.patterns).toContain('pattern1');

      expect(result.sessionContext).toBeDefined();
      expect(result.sessionContext?.recentEvents).toHaveLength(1);

      expect(result.agentContext).toBeDefined();
      expect(result.agentContext?.capabilities).toContain('coding');
      expect(result.agentContext?.performance.successRate).toBe(0.95);
    });

    it('should handle missing layers gracefully', async () => {
      // Only create user files
      await createUserFiles({ language: 'en' });

      const result = await loader.loadFullContext({
        projectId: 'nonexistent-project',
        sessionId: 'nonexistent-session',
        agentId: 'nonexistent-agent',
      });

      expect(result.userContext).toBeDefined();
      expect(result.projectContext).toBeUndefined();
      expect(result.sessionContext).toBeUndefined();
      expect(result.agentContext).toBeUndefined();
    });
  });

  describe('relevance scoring integration', () => {
    it('should score user context at 1.0', async () => {
      await createUserFiles({ language: 'en' });

      const result = await loader.load({});

      expect(result.relevanceScores.user).toBe(1.0);
    });

    it('should score exact project match at 1.0', async () => {
      await createProjectFiles('project-1', { description: 'Test' });

      const result = await loader.load({ projectId: 'project-1' });

      expect(result.relevanceScores.project).toBe(1.0);
    });

    it('should score exact session match at 1.0', async () => {
      await createSessionFiles('session-1', [{ content: 'test' }]);

      const result = await loader.load({ sessionId: 'session-1' });

      expect(result.relevanceScores.session).toBe(1.0);
    });

    it('should score exact agent match at 1.0', async () => {
      await createAgentFiles('agent-1', { capabilities: ['coding'] });

      const result = await loader.load({ agentId: 'agent-1' });

      expect(result.relevanceScores.agent).toBe(1.0);
    });
  });

  describe('caching integration', () => {
    it('should cache and return cached results', async () => {
      await createUserFiles({ language: 'en' });
      await createProjectFiles('project-1', { description: 'Test' });

      const request: ContextRequest = { projectId: 'project-1' };

      const result1 = await loader.load(request);
      const result2 = await loader.load(request);

      expect(result1.loadedAt).toBe(result2.loadedAt);
    });

    it('should invalidate cache when requested', async () => {
      await createUserFiles({ language: 'en' });

      const request: ContextRequest = { projectId: 'project-1' };

      await loader.load(request);
      expect(loader.isCached(request)).toBe(true);

      loader.invalidateCache(request);
      expect(loader.isCached(request)).toBe(false);
    });

    it('should show correct cache statistics', async () => {
      await createUserFiles({ language: 'en' });

      const request: ContextRequest = {};

      await loader.load(request); // First load, sets cache
      await loader.load(request); // Hit
      await loader.load(request); // Hit

      const stats = loader.getCacheStats();
      expect(stats.hits).toBe(2);
      // Size should be 1 since we loaded the same request 3 times
      expect(stats.size).toBe(1);
    });
  });

  describe('token counting integration', () => {
    it('should calculate total tokens', async () => {
      await createUserFiles({ language: 'en', preferences: { a: 1, b: 2, c: 3 } });

      const result = await loader.load({});

      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should limit events by token count', async () => {
      // Create many events
      const events = Array.from({ length: 100 }, (_, i) => ({
        content: `Event ${i} with some content to increase token count significantly more`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
      }));

      await createSessionFiles('session-1', events);

      const limitedLoader = new DynamicContextLoader(fileOps, dirOps, {
        maxTokensPerLayer: 500,
        sessionsBaseDir: 'history/sessions',
      });

      const result = await limitedLoader.load({ sessionId: 'session-1' });

      // Should have fewer events due to token limit
      if (result.sessionContext) {
        expect(result.sessionContext.recentEvents.length).toBeLessThan(100);
      }
    });
  });

  describe('layer selection', () => {
    it('should load only specified layers', async () => {
      await createUserFiles({ language: 'en' });
      await createProjectFiles('project-1', { description: 'Test' });
      await createAgentFiles('agent-1', { capabilities: ['coding'] });

      const result = await loader.load({
        projectId: 'project-1',
        agentId: 'agent-1',
        layers: [ContextLayer.USER, ContextLayer.AGENT],
      });

      expect(result.userContext).toBeDefined();
      expect(result.projectContext).toBeUndefined(); // Not in layers
      expect(result.agentContext).toBeDefined();
    });

    it('should auto-determine layers based on request params', async () => {
      await createUserFiles({ language: 'en' });
      await createProjectFiles('project-1', { description: 'Test' });

      // Only projectId provided, should load USER and PROJECT
      const result = await loader.load({ projectId: 'project-1' });

      expect(result.userContext).toBeDefined();
      expect(result.projectContext).toBeDefined();
      expect(result.sessionContext).toBeUndefined();
      expect(result.agentContext).toBeUndefined();
    });
  });

  describe('RelevanceScorer standalone', () => {
    it('should score query relevance', () => {
      const scorer = new RelevanceScorer();

      const score1 = scorer.scoreQueryRelevance(
        'This is about TypeScript and React development',
        'TypeScript React'
      );
      expect(score1).toBe(1.0);

      const score2 = scorer.scoreQueryRelevance(
        'Python machine learning',
        'TypeScript React'
      );
      expect(score2).toBe(0);

      const score3 = scorer.scoreQueryRelevance(
        'TypeScript backend development',
        'TypeScript React'
      );
      expect(score3).toBeGreaterThan(0);
      expect(score3).toBeLessThan(1.0);
    });
  });

  describe('ContextCache standalone', () => {
    it('should cache and retrieve values', () => {
      const cache = new ContextCache();

      const request: ContextRequest = { projectId: 'test' };
      const context = {
        relevanceScores: { user: 1, project: 0.8, session: 0, agent: 0 },
        totalTokens: 100,
        loadedAt: new Date().toISOString(),
      };

      cache.set(request, context);
      const retrieved = cache.get(request);

      expect(retrieved).toEqual(context);
    });

    it('should expire entries', async () => {
      const cache = new ContextCache({ expiryMs: 50 });

      const request: ContextRequest = { projectId: 'test' };
      const context = {
        relevanceScores: { user: 1, project: 0.8, session: 0, agent: 0 },
        totalTokens: 100,
        loadedAt: new Date().toISOString(),
      };

      cache.set(request, context);
      expect(cache.has(request)).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.has(request)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      // Create directory but with unreadable file (simulated by not creating proper JSON)
      const projectDir = path.join(memoryRoot, 'projects', 'broken-project');
      await fs.mkdir(projectDir, { recursive: true });
      await fs.writeFile(
        path.join(projectDir, 'description.json'),
        'not valid json'
      );

      const result = await loader.load({ projectId: 'broken-project' });

      // Should still return a result, just with empty/default values
      expect(result).toBeDefined();
      expect(result.projectContext?.description).toBe('');
    });

    it('should handle missing directories gracefully', async () => {
      const result = await loader.load({
        projectId: 'nonexistent',
        sessionId: 'nonexistent',
        agentId: 'nonexistent',
      });

      expect(result).toBeDefined();
      expect(result.projectContext).toBeUndefined();
      expect(result.sessionContext).toBeUndefined();
      expect(result.agentContext).toBeUndefined();
    });
  });

  describe('multiple sessions and projects', () => {
    it('should load correct project among many', async () => {
      await createProjectFiles('project-1', { description: 'First project' });
      await createProjectFiles('project-2', { description: 'Second project' });
      await createProjectFiles('project-3', { description: 'Third project' });

      const result = await loader.load({ projectId: 'project-2' });

      expect(result.projectContext?.description).toBe('Second project');
    });

    it('should load correct session among many', async () => {
      await createSessionFiles('session-1', [{ content: 'session 1 event' }]);
      await createSessionFiles('session-2', [{ content: 'session 2 event' }]);
      await createSessionFiles('session-3', [{ content: 'session 3 event' }]);

      const result = await loader.load({ sessionId: 'session-2' });

      expect(result.sessionContext?.recentEvents[0].content).toBe('session 2 event');
    });
  });
});
