import {
  ContextLayer,
  ALL_CONTEXT_LAYERS,
  DEFAULT_CONTEXT_CONFIG,
  DEFAULT_USER_CONTEXT,
  DEFAULT_RELEVANCE_SCORES,
  USER_CONTEXT_FILES,
  PROJECT_CONTEXT_FILES,
  AGENT_CONTEXT_FILES,
} from '../../src/context';

describe('Context Types', () => {
  describe('ContextLayer enum', () => {
    it('should have USER layer', () => {
      expect(ContextLayer.USER).toBe('user');
    });

    it('should have PROJECT layer', () => {
      expect(ContextLayer.PROJECT).toBe('project');
    });

    it('should have SESSION layer', () => {
      expect(ContextLayer.SESSION).toBe('session');
    });

    it('should have AGENT layer', () => {
      expect(ContextLayer.AGENT).toBe('agent');
    });
  });

  describe('ALL_CONTEXT_LAYERS', () => {
    it('should have 4 layers', () => {
      expect(ALL_CONTEXT_LAYERS).toHaveLength(4);
    });

    it('should be in correct order (User → Project → Session → Agent)', () => {
      expect(ALL_CONTEXT_LAYERS[0]).toBe(ContextLayer.USER);
      expect(ALL_CONTEXT_LAYERS[1]).toBe(ContextLayer.PROJECT);
      expect(ALL_CONTEXT_LAYERS[2]).toBe(ContextLayer.SESSION);
      expect(ALL_CONTEXT_LAYERS[3]).toBe(ContextLayer.AGENT);
    });

    it('should contain all layer types', () => {
      expect(ALL_CONTEXT_LAYERS).toContain(ContextLayer.USER);
      expect(ALL_CONTEXT_LAYERS).toContain(ContextLayer.PROJECT);
      expect(ALL_CONTEXT_LAYERS).toContain(ContextLayer.SESSION);
      expect(ALL_CONTEXT_LAYERS).toContain(ContextLayer.AGENT);
    });
  });

  describe('DEFAULT_CONTEXT_CONFIG', () => {
    it('should have maxTokensPerLayer', () => {
      expect(DEFAULT_CONTEXT_CONFIG.maxTokensPerLayer).toBe(1000);
    });

    it('should have maxTotalTokens', () => {
      expect(DEFAULT_CONTEXT_CONFIG.maxTotalTokens).toBe(4000);
    });

    it('should enable caching by default', () => {
      expect(DEFAULT_CONTEXT_CONFIG.enableCaching).toBe(true);
    });

    it('should have 5 minute cache expiry', () => {
      expect(DEFAULT_CONTEXT_CONFIG.cacheExpiryMs).toBe(5 * 60 * 1000);
    });

    it('should have all default layers', () => {
      expect(DEFAULT_CONTEXT_CONFIG.defaultLayers).toEqual(ALL_CONTEXT_LAYERS);
    });

    it('should have relevance threshold of 0.3', () => {
      expect(DEFAULT_CONTEXT_CONFIG.relevanceThreshold).toBe(0.3);
    });

    it('should have max events per layer of 50', () => {
      expect(DEFAULT_CONTEXT_CONFIG.maxEventsPerLayer).toBe(50);
    });
  });

  describe('DEFAULT_USER_CONTEXT', () => {
    it('should have empty preferences', () => {
      expect(DEFAULT_USER_CONTEXT.preferences).toEqual({});
    });

    it('should have empty goals array', () => {
      expect(DEFAULT_USER_CONTEXT.goals).toEqual([]);
    });

    it('should have empty constraints array', () => {
      expect(DEFAULT_USER_CONTEXT.constraints).toEqual([]);
    });

    it('should have empty working style', () => {
      expect(DEFAULT_USER_CONTEXT.workingStyle).toBe('');
    });

    it('should have empty metadata', () => {
      expect(DEFAULT_USER_CONTEXT.metadata).toEqual({});
    });
  });

  describe('DEFAULT_RELEVANCE_SCORES', () => {
    it('should have all scores at 0', () => {
      expect(DEFAULT_RELEVANCE_SCORES.user).toBe(0);
      expect(DEFAULT_RELEVANCE_SCORES.project).toBe(0);
      expect(DEFAULT_RELEVANCE_SCORES.session).toBe(0);
      expect(DEFAULT_RELEVANCE_SCORES.agent).toBe(0);
    });

    it('should have all 4 score properties', () => {
      expect(Object.keys(DEFAULT_RELEVANCE_SCORES)).toHaveLength(4);
    });
  });

  describe('USER_CONTEXT_FILES', () => {
    it('should have preferences file path', () => {
      expect(USER_CONTEXT_FILES.preferences).toBe('user/preferences.json');
    });

    it('should have goals file path', () => {
      expect(USER_CONTEXT_FILES.goals).toBe('user/goals.json');
    });

    it('should have constraints file path', () => {
      expect(USER_CONTEXT_FILES.constraints).toBe('user/constraints.json');
    });

    it('should have working style file path', () => {
      expect(USER_CONTEXT_FILES.workingStyle).toBe('user/working-style.json');
    });
  });

  describe('PROJECT_CONTEXT_FILES', () => {
    it('should have description file path', () => {
      expect(PROJECT_CONTEXT_FILES.description).toBe('description.json');
    });

    it('should have patterns file path', () => {
      expect(PROJECT_CONTEXT_FILES.patterns).toBe('patterns.json');
    });

    it('should have files file path', () => {
      expect(PROJECT_CONTEXT_FILES.files).toBe('files.json');
    });
  });

  describe('AGENT_CONTEXT_FILES', () => {
    it('should have capabilities file path', () => {
      expect(AGENT_CONTEXT_FILES.capabilities).toBe('capabilities.json');
    });

    it('should have performance file path', () => {
      expect(AGENT_CONTEXT_FILES.performance).toBe('performance.json');
    });
  });
});
