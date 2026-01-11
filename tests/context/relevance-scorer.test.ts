import {
  RelevanceScorer,
  DEFAULT_RELEVANCE_SCORER_CONFIG,
  UserContext,
  ProjectContext,
  SessionContext,
  AgentContext,
  ContextRequest,
} from '../../src/context';
import { EventType, HookEvent } from '../../src/hooks';
import { TaskType } from '../../src/routing';

describe('RelevanceScorer', () => {
  let scorer: RelevanceScorer;

  beforeEach(() => {
    scorer = new RelevanceScorer();
  });

  const createEvent = (timestamp: string = new Date().toISOString()): HookEvent => ({
    timestamp,
    type: EventType.CAPTURE_ALL,
    content: 'test event',
    metadata: {},
  });

  const createUserContext = (): UserContext => ({
    preferences: { language: 'en' },
    goals: ['test goal'],
    constraints: [],
    workingStyle: 'focused',
    metadata: {},
  });

  const createProjectContext = (
    projectId: string,
    history: HookEvent[] = []
  ): ProjectContext => ({
    projectId,
    description: 'Test project',
    history,
    patterns: [],
    files: [],
    metadata: {},
  });

  const createSessionContext = (
    sessionId: string,
    startedAt: string = new Date().toISOString()
  ): SessionContext => ({
    sessionId,
    startedAt,
    recentEvents: [],
    summary: '',
    metadata: {},
  });

  const createAgentContext = (agentId: string, capabilities: string[] = []): AgentContext => ({
    agentId,
    capabilities,
    history: [],
    performance: {},
    metadata: {},
  });

  describe('constructor', () => {
    it('should create scorer with default config', () => {
      const config = scorer.getConfig();
      expect(config.exactMatchWeight).toBe(1.0);
      expect(config.recentActivityWeight).toBe(0.8);
      expect(config.olderActivityWeight).toBe(0.5);
      expect(config.partialMatchWeight).toBe(0.5);
    });

    it('should accept custom config', () => {
      const customScorer = new RelevanceScorer({
        exactMatchWeight: 0.9,
        recentActivityWeight: 0.7,
      });
      const config = customScorer.getConfig();
      expect(config.exactMatchWeight).toBe(0.9);
      expect(config.recentActivityWeight).toBe(0.7);
    });

    it('should merge custom config with defaults', () => {
      const customScorer = new RelevanceScorer({
        exactMatchWeight: 0.9,
      });
      const config = customScorer.getConfig();
      expect(config.exactMatchWeight).toBe(0.9);
      expect(config.recentActivityWeight).toBe(DEFAULT_RELEVANCE_SCORER_CONFIG.recentActivityWeight);
    });
  });

  describe('getDefaultScores', () => {
    it('should return scores with all zeros', () => {
      const scores = scorer.getDefaultScores();
      expect(scores.user).toBe(0);
      expect(scores.project).toBe(0);
      expect(scores.session).toBe(0);
      expect(scores.agent).toBe(0);
    });
  });

  describe('scoreUserContext', () => {
    it('should return 0 for undefined context', () => {
      const request: ContextRequest = {};
      const score = scorer.scoreUserContext(undefined, request);
      expect(score).toBe(0);
    });

    it('should return 1.0 for any valid user context', () => {
      const userContext = createUserContext();
      const request: ContextRequest = {};
      const score = scorer.scoreUserContext(userContext, request);
      expect(score).toBe(1.0);
    });

    it('should always return exactMatchWeight for valid context', () => {
      const customScorer = new RelevanceScorer({ exactMatchWeight: 0.8 });
      const userContext = createUserContext();
      const request: ContextRequest = {};
      const score = customScorer.scoreUserContext(userContext, request);
      expect(score).toBe(0.8);
    });
  });

  describe('scoreProjectContext', () => {
    it('should return 0 for undefined context', () => {
      const request: ContextRequest = { projectId: 'test-project' };
      const score = scorer.scoreProjectContext(undefined, request);
      expect(score).toBe(0);
    });

    it('should return 1.0 for exact projectId match', () => {
      const projectContext = createProjectContext('test-project');
      const request: ContextRequest = { projectId: 'test-project' };
      const score = scorer.scoreProjectContext(projectContext, request);
      expect(score).toBe(1.0);
    });

    it('should return 0 for different projectId', () => {
      const projectContext = createProjectContext('project-a');
      const request: ContextRequest = { projectId: 'project-b' };
      const score = scorer.scoreProjectContext(projectContext, request);
      expect(score).toBe(0);
    });

    it('should return recentActivityWeight for recent history', () => {
      const recentTimestamp = new Date().toISOString();
      const projectContext = createProjectContext('test-project', [createEvent(recentTimestamp)]);
      const request: ContextRequest = {}; // No projectId specified
      const score = scorer.scoreProjectContext(projectContext, request);
      expect(score).toBe(0.8);
    });

    it('should return olderActivityWeight for older history', () => {
      const oldTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
      const projectContext = createProjectContext('test-project', [createEvent(oldTimestamp)]);
      const request: ContextRequest = {};
      const score = scorer.scoreProjectContext(projectContext, request);
      expect(score).toBe(0.5);
    });

    it('should return 0 for context with no history and no matching projectId', () => {
      const projectContext = createProjectContext('test-project', []);
      const request: ContextRequest = {};
      const score = scorer.scoreProjectContext(projectContext, request);
      expect(score).toBe(0);
    });
  });

  describe('scoreSessionContext', () => {
    it('should return 0 for undefined context', () => {
      const request: ContextRequest = { sessionId: 'test-session' };
      const score = scorer.scoreSessionContext(undefined, request);
      expect(score).toBe(0);
    });

    it('should return 1.0 for exact sessionId match', () => {
      const sessionContext = createSessionContext('test-session');
      const request: ContextRequest = { sessionId: 'test-session' };
      const score = scorer.scoreSessionContext(sessionContext, request);
      expect(score).toBe(1.0);
    });

    it('should return recency score for different sessionId', () => {
      const sessionContext = createSessionContext('session-a');
      const request: ContextRequest = { sessionId: 'session-b' };
      const score = scorer.scoreSessionContext(sessionContext, request);
      // No exact match, but recency is checked - very recent session returns 0.7
      expect(score).toBeCloseTo(0.7, 5);
    });

    it('should return 0.7 for very recent session (within 1 hour)', () => {
      const recentTimestamp = new Date().toISOString();
      const sessionContext = createSessionContext('test-session', recentTimestamp);
      const request: ContextRequest = {}; // No sessionId specified
      const score = scorer.scoreSessionContext(sessionContext, request);
      expect(score).toBeCloseTo(0.7, 5);
    });

    it('should return 0.4 for recent session (within 24 hours)', () => {
      const timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      const sessionContext = createSessionContext('test-session', timestamp);
      const request: ContextRequest = {};
      const score = scorer.scoreSessionContext(sessionContext, request);
      expect(score).toBe(0.4);
    });

    it('should return 0 for old session', () => {
      const oldTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
      const sessionContext = createSessionContext('test-session', oldTimestamp);
      const request: ContextRequest = {};
      const score = scorer.scoreSessionContext(sessionContext, request);
      expect(score).toBe(0);
    });
  });

  describe('scoreAgentContext', () => {
    it('should return 0 for undefined context', () => {
      const request: ContextRequest = { agentId: 'test-agent' };
      const score = scorer.scoreAgentContext(undefined, request);
      expect(score).toBe(0);
    });

    it('should return 1.0 for exact agentId match', () => {
      const agentContext = createAgentContext('test-agent');
      const request: ContextRequest = { agentId: 'test-agent' };
      const score = scorer.scoreAgentContext(agentContext, request);
      expect(score).toBe(1.0);
    });

    it('should return 0 for different agentId', () => {
      const agentContext = createAgentContext('agent-a');
      const request: ContextRequest = { agentId: 'agent-b' };
      const score = scorer.scoreAgentContext(agentContext, request);
      expect(score).toBe(0);
    });

    it('should return recentActivityWeight for full capability match', () => {
      const agentContext = createAgentContext('test-agent', ['coding', 'research', 'testing']);
      const request: ContextRequest = { taskType: TaskType.CODING };
      const score = scorer.scoreAgentContext(agentContext, request);
      expect(score).toBe(0.8);
    });

    it('should return partialMatchWeight for partial capability match', () => {
      // Use capabilities that partially match 'coding' - e.g., 'coding-review' contains 'coding'
      const agentContext = createAgentContext('test-agent', ['coding-review', 'codinghelper']);
      const request: ContextRequest = { taskType: TaskType.CODING };
      const score = scorer.scoreAgentContext(agentContext, request);
      expect(score).toBe(0.5);
    });

    it('should return 0 when no capability matches', () => {
      const agentContext = createAgentContext('test-agent', ['documentation', 'testing']);
      const request: ContextRequest = { taskType: TaskType.CODING };
      const score = scorer.scoreAgentContext(agentContext, request);
      expect(score).toBe(0);
    });

    it('should be case insensitive for capability matching', () => {
      const agentContext = createAgentContext('test-agent', ['CODING', 'RESEARCH']);
      const request: ContextRequest = { taskType: TaskType.CODING };
      const score = scorer.scoreAgentContext(agentContext, request);
      expect(score).toBe(0.8);
    });
  });

  describe('scoreAll', () => {
    it('should return scores for all layers', () => {
      const userContext = createUserContext();
      const projectContext = createProjectContext('test-project');
      const sessionContext = createSessionContext('test-session');
      const agentContext = createAgentContext('test-agent');
      const request: ContextRequest = {
        projectId: 'test-project',
        sessionId: 'test-session',
        agentId: 'test-agent',
      };

      const scores = scorer.scoreAll(
        userContext,
        projectContext,
        sessionContext,
        agentContext,
        request
      );

      expect(scores).toHaveProperty('user');
      expect(scores).toHaveProperty('project');
      expect(scores).toHaveProperty('session');
      expect(scores).toHaveProperty('agent');
    });

    it('should return all 1.0 for exact matches', () => {
      const userContext = createUserContext();
      const projectContext = createProjectContext('test-project');
      const sessionContext = createSessionContext('test-session');
      const agentContext = createAgentContext('test-agent');
      const request: ContextRequest = {
        projectId: 'test-project',
        sessionId: 'test-session',
        agentId: 'test-agent',
      };

      const scores = scorer.scoreAll(
        userContext,
        projectContext,
        sessionContext,
        agentContext,
        request
      );

      expect(scores.user).toBe(1.0);
      expect(scores.project).toBe(1.0);
      expect(scores.session).toBe(1.0);
      expect(scores.agent).toBe(1.0);
    });

    it('should handle undefined contexts', () => {
      const request: ContextRequest = {};

      const scores = scorer.scoreAll(undefined, undefined, undefined, undefined, request);

      expect(scores.user).toBe(0);
      expect(scores.project).toBe(0);
      expect(scores.session).toBe(0);
      expect(scores.agent).toBe(0);
    });
  });

  describe('scoreQueryRelevance', () => {
    it('should return 0 for empty query', () => {
      const score = scorer.scoreQueryRelevance('test content', '');
      expect(score).toBe(0);
    });

    it('should return 0 for undefined query', () => {
      const score = scorer.scoreQueryRelevance('test content', undefined);
      expect(score).toBe(0);
    });

    it('should return 0 for empty content', () => {
      const score = scorer.scoreQueryRelevance('', 'test query');
      expect(score).toBe(0);
    });

    it('should return 1.0 for full match', () => {
      const score = scorer.scoreQueryRelevance('test content here', 'test content here');
      expect(score).toBe(1.0);
    });

    it('should return partial score for partial match', () => {
      const score = scorer.scoreQueryRelevance('test content here', 'test other');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1.0);
    });

    it('should be case insensitive', () => {
      const score = scorer.scoreQueryRelevance('TEST CONTENT', 'test content');
      expect(score).toBe(1.0);
    });

    it('should skip short words (<=2 chars) for matching', () => {
      // Query has 4 words but only 'content' (>2 chars) can match
      // Score = matches/totalWords = 1/4 = 0.25
      const score = scorer.scoreQueryRelevance('a b c content', 'a b c content');
      expect(score).toBe(0.25);
    });

    it('should return 0 when no words match', () => {
      const score = scorer.scoreQueryRelevance('apple banana cherry', 'dog elephant fish');
      expect(score).toBe(0);
    });
  });
});
