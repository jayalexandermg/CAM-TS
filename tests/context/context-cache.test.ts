import {
  ContextCache,
  DEFAULT_CONTEXT_CACHE_CONFIG,
  ContextRequest,
  LoadedContext,
  ContextLayer,
} from '../../src/context';

describe('ContextCache', () => {
  let cache: ContextCache;

  beforeEach(() => {
    cache = new ContextCache();
  });

  const createRequest = (overrides: Partial<ContextRequest> = {}): ContextRequest => ({
    projectId: 'test-project',
    sessionId: 'test-session',
    ...overrides,
  });

  const createLoadedContext = (overrides: Partial<LoadedContext> = {}): LoadedContext => ({
    relevanceScores: { user: 1, project: 0.8, session: 0.5, agent: 0 },
    totalTokens: 500,
    loadedAt: new Date().toISOString(),
    ...overrides,
  });

  describe('constructor', () => {
    it('should create cache with default config', () => {
      const config = cache.getConfig();
      expect(config.expiryMs).toBe(DEFAULT_CONTEXT_CACHE_CONFIG.expiryMs);
      expect(config.maxEntries).toBe(DEFAULT_CONTEXT_CACHE_CONFIG.maxEntries);
      expect(config.enabled).toBe(true);
    });

    it('should accept custom config', () => {
      const customCache = new ContextCache({
        expiryMs: 10000,
        maxEntries: 50,
      });
      const config = customCache.getConfig();
      expect(config.expiryMs).toBe(10000);
      expect(config.maxEntries).toBe(50);
    });

    it('should start with empty stats', () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve context', () => {
      const request = createRequest();
      const context = createLoadedContext();

      cache.set(request, context);
      const retrieved = cache.get(request);

      expect(retrieved).toEqual(context);
    });

    it('should return undefined for non-existent request', () => {
      const request = createRequest();
      const retrieved = cache.get(request);
      expect(retrieved).toBeUndefined();
    });

    it('should count hits and misses', () => {
      const request = createRequest();
      const context = createLoadedContext();

      cache.get(request); // Miss
      cache.set(request, context);
      cache.get(request); // Hit
      cache.get(request); // Hit
      cache.get(createRequest({ projectId: 'other' })); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
    });

    it('should not store when disabled', () => {
      const disabledCache = new ContextCache({ enabled: false });
      const request = createRequest();
      const context = createLoadedContext();

      disabledCache.set(request, context);
      const retrieved = disabledCache.get(request);

      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true when entry exists', () => {
      const request = createRequest();
      const context = createLoadedContext();

      cache.set(request, context);
      expect(cache.has(request)).toBe(true);
    });

    it('should return false when entry does not exist', () => {
      const request = createRequest();
      expect(cache.has(request)).toBe(false);
    });

    it('should return false when disabled', () => {
      const disabledCache = new ContextCache({ enabled: false });
      const request = createRequest();
      const context = createLoadedContext();

      disabledCache.set(request, context);
      expect(disabledCache.has(request)).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should remove specific entry', () => {
      const request1 = createRequest({ projectId: 'project-1' });
      const request2 = createRequest({ projectId: 'project-2' });
      const context = createLoadedContext();

      cache.set(request1, context);
      cache.set(request2, context);

      const result = cache.invalidate(request1);

      expect(result).toBe(true);
      expect(cache.has(request1)).toBe(false);
      expect(cache.has(request2)).toBe(true);
    });

    it('should return false when entry does not exist', () => {
      const request = createRequest();
      const result = cache.invalidate(request);
      expect(result).toBe(false);
    });
  });

  describe('invalidateBy', () => {
    it('should invalidate entries matching filter', () => {
      const request1 = createRequest({ projectId: 'project-1' });
      const request2 = createRequest({ projectId: 'project-2' });
      const request3 = createRequest({ projectId: 'project-1', sessionId: 'session-2' });
      const context = createLoadedContext();

      cache.set(request1, context);
      cache.set(request2, context);
      cache.set(request3, context);

      const count = cache.invalidateBy((req) => req.projectId === 'project-1');

      expect(count).toBe(2);
      expect(cache.has(request1)).toBe(false);
      expect(cache.has(request2)).toBe(true);
      expect(cache.has(request3)).toBe(false);
    });
  });

  describe('invalidateProject', () => {
    it('should invalidate all entries for a project', () => {
      const request1 = createRequest({ projectId: 'project-1', sessionId: 'session-1' });
      const request2 = createRequest({ projectId: 'project-1', sessionId: 'session-2' });
      const request3 = createRequest({ projectId: 'project-2', sessionId: 'session-1' });
      const context = createLoadedContext();

      cache.set(request1, context);
      cache.set(request2, context);
      cache.set(request3, context);

      const count = cache.invalidateProject('project-1');

      expect(count).toBe(2);
      expect(cache.has(request3)).toBe(true);
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate all entries for a session', () => {
      const request1 = createRequest({ projectId: 'project-1', sessionId: 'session-1' });
      const request2 = createRequest({ projectId: 'project-2', sessionId: 'session-1' });
      const request3 = createRequest({ projectId: 'project-1', sessionId: 'session-2' });
      const context = createLoadedContext();

      cache.set(request1, context);
      cache.set(request2, context);
      cache.set(request3, context);

      const count = cache.invalidateSession('session-1');

      expect(count).toBe(2);
      expect(cache.has(request3)).toBe(true);
    });
  });

  describe('invalidateAgent', () => {
    it('should invalidate all entries for an agent', () => {
      const request1 = createRequest({ agentId: 'agent-1' });
      const request2 = createRequest({ agentId: 'agent-1', projectId: 'other' });
      const request3 = createRequest({ agentId: 'agent-2' });
      const context = createLoadedContext();

      cache.set(request1, context);
      cache.set(request2, context);
      cache.set(request3, context);

      const count = cache.invalidateAgent('agent-1');

      expect(count).toBe(2);
      expect(cache.has(request3)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const request1 = createRequest({ projectId: 'project-1' });
      const request2 = createRequest({ projectId: 'project-2' });
      const context = createLoadedContext();

      cache.set(request1, context);
      cache.set(request2, context);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.has(request1)).toBe(false);
      expect(cache.has(request2)).toBe(false);
    });

    it('should reset hit/miss counters', () => {
      const request = createRequest();
      const context = createLoadedContext();

      cache.set(request, context);
      cache.get(request);
      cache.get(createRequest({ projectId: 'other' }));

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('cache expiry', () => {
    it('should expire entries after expiryMs', async () => {
      const shortCache = new ContextCache({ expiryMs: 50 });
      const request = createRequest();
      const context = createLoadedContext();

      shortCache.set(request, context);
      expect(shortCache.has(request)).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortCache.has(request)).toBe(false);
    });

    it('should return undefined for expired entry on get', async () => {
      const shortCache = new ContextCache({ expiryMs: 50 });
      const request = createRequest();
      const context = createLoadedContext();

      shortCache.set(request, context);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortCache.get(request)).toBeUndefined();
    });
  });

  describe('prune', () => {
    it('should remove expired entries', async () => {
      const shortCache = new ContextCache({ expiryMs: 50 });
      const request1 = createRequest({ projectId: 'project-1' });
      const request2 = createRequest({ projectId: 'project-2' });
      const context = createLoadedContext();

      shortCache.set(request1, context);

      await new Promise((resolve) => setTimeout(resolve, 100));

      shortCache.set(request2, context);

      const pruned = shortCache.prune();

      expect(pruned).toBe(1);
      expect(shortCache.has(request2)).toBe(true);
    });

    it('should return 0 when nothing to prune', () => {
      const request = createRequest();
      const context = createLoadedContext();

      cache.set(request, context);
      const pruned = cache.prune();

      expect(pruned).toBe(0);
    });
  });

  describe('max entries limit', () => {
    it('should evict oldest entry when limit reached', () => {
      const limitedCache = new ContextCache({ maxEntries: 2 });
      const request1 = createRequest({ projectId: 'project-1' });
      const request2 = createRequest({ projectId: 'project-2' });
      const request3 = createRequest({ projectId: 'project-3' });
      const context = createLoadedContext();

      limitedCache.set(request1, context);
      limitedCache.set(request2, context);
      limitedCache.set(request3, context);

      expect(limitedCache.getStats().size).toBe(2);
      expect(limitedCache.has(request1)).toBe(false); // Evicted
      expect(limitedCache.has(request2)).toBe(true);
      expect(limitedCache.has(request3)).toBe(true);
    });
  });

  describe('generateSignature', () => {
    it('should generate consistent signatures', () => {
      const request = createRequest();
      const sig1 = cache.generateSignature(request);
      const sig2 = cache.generateSignature(request);
      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different requests', () => {
      const request1 = createRequest({ projectId: 'project-1' });
      const request2 = createRequest({ projectId: 'project-2' });
      const sig1 = cache.generateSignature(request1);
      const sig2 = cache.generateSignature(request2);
      expect(sig1).not.toBe(sig2);
    });

    it('should include all request properties in signature', () => {
      const request: ContextRequest = {
        projectId: 'project',
        sessionId: 'session',
        agentId: 'agent',
        taskType: 'coding' as ContextRequest['taskType'],
        query: 'test query',
        maxTokens: 1000,
        layers: [ContextLayer.USER, ContextLayer.PROJECT],
      };
      const sig = cache.generateSignature(request);

      expect(sig).toContain('p:project');
      expect(sig).toContain('s:session');
      expect(sig).toContain('a:agent');
      expect(sig).toContain('t:coding');
      expect(sig).toContain('q:test query');
      expect(sig).toContain('m:1000');
      expect(sig).toContain('l:');
    });

    it('should handle empty request', () => {
      const request: ContextRequest = {};
      const sig = cache.generateSignature(request);
      expect(sig).toBe('');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const request1 = createRequest({ projectId: 'project-1' });
      const request2 = createRequest({ projectId: 'project-2' });
      const context = createLoadedContext();

      cache.set(request1, context);
      cache.set(request2, context);
      cache.get(request1); // Hit
      cache.get(createRequest({ projectId: 'other' })); // Miss

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.maxEntries).toBe(DEFAULT_CONTEXT_CACHE_CONFIG.maxEntries);
      expect(stats.expiryMs).toBe(DEFAULT_CONTEXT_CACHE_CONFIG.expiryMs);
    });

    it('should return 0 hit rate when no gets', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });
});
