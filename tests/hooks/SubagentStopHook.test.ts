import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { SubagentStopHook, SubagentStopContext } from '../../src/hooks/SubagentStopHook';
import { UOCS } from '../../src/history/UOCS';
import { HistoryStorage } from '../../src/history/HistoryStorage';
import { AgentResult } from '../../src/agents/types';

describe('SubagentStopHook', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-subagent-stop-hook');
  let storage: HistoryStorage;
  let uocs: UOCS;
  let hook: SubagentStopHook;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.promises.rm(testBasePath, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(testBasePath, { recursive: true });
    storage = new HistoryStorage(testBasePath);
    uocs = new UOCS(storage);
    await uocs.initialize();
    hook = new SubagentStopHook(uocs);
  });

  const createSuccessResult = (data?: unknown): AgentResult => ({
    success: true,
    data,
    metadata: {
      duration: 100,
      retries: 0,
      skillsUsed: ['search']
    }
  });

  const createFailureResult = (error?: Error): AgentResult => ({
    success: false,
    error: error || new Error('Task failed'),
    metadata: {
      duration: 50,
      retries: 1,
      skillsUsed: []
    }
  });

  const createSubagentStopContext = (overrides: Partial<SubagentStopContext> = {}): SubagentStopContext => ({
    sessionId: 'test-session-123',
    agentId: 'subagent-1',
    parentAgentId: 'main-agent',
    result: createSuccessResult(),
    ...overrides
  });

  // =========================================================================
  // Hook Properties Tests
  // =========================================================================

  describe('properties', () => {
    it('should have correct name', () => {
      expect(hook.name).toBe('SubagentStop');
    });

    it('should return UOCS instance', () => {
      expect(hook.getUOCS()).toBe(uocs);
    });

    it('should allow setting UOCS instance', () => {
      const newUocs = new UOCS();
      hook.setUOCS(newUocs);
      expect(hook.getUOCS()).toBe(newUocs);
    });

    it('should create with default UOCS if none provided', () => {
      const defaultHook = new SubagentStopHook();
      expect(defaultHook.getUOCS()).toBeDefined();
    });
  });

  // =========================================================================
  // Execute Tests - Turn Capture
  // =========================================================================

  describe('execute - turn capture', () => {
    it('should capture system turn for successful completion', async () => {
      uocs.startSession('turn-session');

      let capturedTurn: unknown = null;
      uocs.on('turnCaptured', (data) => {
        capturedTurn = data.turn;
      });

      const context = createSubagentStopContext({ sessionId: 'turn-session' });
      await hook.execute(context);

      expect(capturedTurn).not.toBeNull();
      expect((capturedTurn as { role: string }).role).toBe('system');
      expect((capturedTurn as { content: string }).content).toContain('Subagent subagent-1 completed: success');
    });

    it('should capture system turn for failed completion', async () => {
      uocs.startSession('fail-turn-session');

      let capturedTurn: unknown = null;
      uocs.on('turnCaptured', (data) => {
        capturedTurn = data.turn;
      });

      const context = createSubagentStopContext({
        sessionId: 'fail-turn-session',
        result: createFailureResult()
      });
      await hook.execute(context);

      expect((capturedTurn as { content: string }).content).toContain('Subagent subagent-1 completed: failed');
    });

    it('should include agentId in captured turn', async () => {
      uocs.startSession('agent-turn-session');

      let capturedTurn: unknown = null;
      uocs.on('turnCaptured', (data) => {
        capturedTurn = data.turn;
      });

      const context = createSubagentStopContext({
        sessionId: 'agent-turn-session',
        agentId: 'search-agent'
      });
      await hook.execute(context);

      expect((capturedTurn as { agentId: string }).agentId).toBe('search-agent');
    });
  });

  // =========================================================================
  // Execute Tests - Output Capture
  // =========================================================================

  describe('execute - output capture', () => {
    it('should capture result as output', async () => {
      uocs.startSession('output-session');

      let capturedOutput: unknown = null;
      uocs.on('outputCaptured', (entry) => {
        capturedOutput = entry;
      });

      const context = createSubagentStopContext({
        sessionId: 'output-session',
        taskDescription: 'Search for files'
      });
      await hook.execute(context);

      expect(capturedOutput).not.toBeNull();
      const content = JSON.parse((capturedOutput as { content: string }).content);
      expect(content.subagentId).toBe('subagent-1');
      expect(content.parentAgentId).toBe('main-agent');
      expect(content.task).toBe('Search for files');
    });

    it('should include success metadata in output', async () => {
      uocs.startSession('success-meta-session');

      let capturedOutput: unknown = null;
      uocs.on('outputCaptured', (entry) => {
        capturedOutput = entry;
      });

      const context = createSubagentStopContext({ sessionId: 'success-meta-session' });
      await hook.execute(context);

      expect((capturedOutput as { metadata: Record<string, unknown> }).metadata?.type).toBe('subagent_completion');
      expect((capturedOutput as { metadata: Record<string, unknown> }).metadata?.success).toBe(true);
    });

    it('should include failure metadata in output', async () => {
      uocs.startSession('fail-meta-session');

      let capturedOutput: unknown = null;
      uocs.on('outputCaptured', (entry) => {
        capturedOutput = entry;
      });

      const context = createSubagentStopContext({
        sessionId: 'fail-meta-session',
        result: createFailureResult()
      });
      await hook.execute(context);

      expect((capturedOutput as { metadata: Record<string, unknown> }).metadata?.success).toBe(false);
    });
  });

  // =========================================================================
  // Execute Tests - Learning Extraction
  // =========================================================================

  describe('execute - learning extraction', () => {
    it('should extract learnings from successful result with learnings array', async () => {
      uocs.startSession('learning-session');

      const capturedLearnings: unknown[] = [];
      uocs.on('learningCaptured', (learning) => {
        capturedLearnings.push(learning);
      });

      const context = createSubagentStopContext({
        sessionId: 'learning-session',
        agentId: 'research-agent',
        result: createSuccessResult({
          learnings: [
            { topic: 'TypeScript', insight: 'Use strict mode', confidence: 0.9 },
            { topic: 'Testing', insight: 'Write unit tests first', confidence: 0.85 }
          ]
        })
      });

      await hook.execute(context);

      expect(capturedLearnings).toHaveLength(2);
      expect((capturedLearnings[0] as { topic: string }).topic).toBe('TypeScript');
      expect((capturedLearnings[0] as { insight: string }).insight).toBe('Use strict mode');
      expect((capturedLearnings[0] as { confidence: number }).confidence).toBe(0.9);
    });

    it('should handle string learnings', async () => {
      uocs.startSession('string-learning-session');

      const capturedLearnings: unknown[] = [];
      uocs.on('learningCaptured', (learning) => {
        capturedLearnings.push(learning);
      });

      const context = createSubagentStopContext({
        sessionId: 'string-learning-session',
        result: createSuccessResult({
          learnings: ['Use async/await', 'Handle errors properly']
        })
      });

      await hook.execute(context);

      expect(capturedLearnings).toHaveLength(2);
      expect((capturedLearnings[0] as { insight: string }).insight).toBe('Use async/await');
      expect((capturedLearnings[0] as { topic: string }).topic).toBe('subagent_insight');
    });

    it('should use default confidence for learnings without confidence', async () => {
      uocs.startSession('default-conf-session');

      let capturedLearning: unknown = null;
      uocs.on('learningCaptured', (learning) => {
        capturedLearning = learning;
      });

      const context = createSubagentStopContext({
        sessionId: 'default-conf-session',
        result: createSuccessResult({
          learnings: [{ insight: 'No confidence specified' }]
        })
      });

      await hook.execute(context);

      expect((capturedLearning as { confidence: number }).confidence).toBe(0.7);
    });

    it('should not extract learnings from failed result', async () => {
      uocs.startSession('no-learning-session');

      let learningCaptured = false;
      uocs.on('learningCaptured', () => {
        learningCaptured = true;
      });

      const context = createSubagentStopContext({
        sessionId: 'no-learning-session',
        result: createFailureResult()
      });

      await hook.execute(context);

      expect(learningCaptured).toBe(false);
    });

    it('should not extract learnings if result has no data', async () => {
      uocs.startSession('no-data-session');

      let learningCaptured = false;
      uocs.on('learningCaptured', () => {
        learningCaptured = true;
      });

      const context = createSubagentStopContext({
        sessionId: 'no-data-session',
        result: { success: true }
      });

      await hook.execute(context);

      expect(learningCaptured).toBe(false);
    });

    it('should include source in captured learnings', async () => {
      uocs.startSession('source-learning-session');

      let capturedLearning: unknown = null;
      uocs.on('learningCaptured', (learning) => {
        capturedLearning = learning;
      });

      const context = createSubagentStopContext({
        sessionId: 'source-learning-session',
        agentId: 'analysis-agent',
        result: createSuccessResult({
          learnings: [{ topic: 'Analysis', insight: 'Deep analysis helpful' }]
        })
      });

      await hook.execute(context);

      expect((capturedLearning as { source: string }).source).toBe('Subagent: analysis-agent');
    });
  });

  // =========================================================================
  // Execute Tests - Result Data
  // =========================================================================

  describe('execute - result data', () => {
    it('should return success result with subagent info', async () => {
      uocs.startSession('result-session');
      const context = createSubagentStopContext({
        sessionId: 'result-session',
        agentId: 'worker-agent',
        parentAgentId: 'orchestrator'
      });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.subagentId).toBe('worker-agent');
      expect(result.data?.parentAgentId).toBe('orchestrator');
      expect(result.data?.resultSuccess).toBe(true);
    });

    it('should return resultSuccess false for failed subagent', async () => {
      uocs.startSession('fail-result-session');
      const context = createSubagentStopContext({
        sessionId: 'fail-result-session',
        result: createFailureResult()
      });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.resultSuccess).toBe(false);
    });

    it('should include duration in result', async () => {
      uocs.startSession('duration-session');
      const context = createSubagentStopContext({ sessionId: 'duration-session' });

      const result = await hook.execute(context);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe('error handling', () => {
    it('should return error result on UOCS failure', async () => {
      const failingUocs = {
        captureTurn: jest.fn().mockImplementation(() => {
          throw new Error('Turn capture failed');
        }),
        captureOutput: jest.fn(),
        captureLearning: jest.fn()
      } as unknown as UOCS;

      hook.setUOCS(failingUocs);
      const context = createSubagentStopContext();

      const result = await hook.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Turn capture failed');
    });

    it('should handle non-existent session gracefully', async () => {
      const context = createSubagentStopContext({ sessionId: 'non-existent-session' });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
    });

    it('should include duration even on error', async () => {
      const failingUocs = {
        captureTurn: jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        }),
        captureOutput: jest.fn(),
        captureLearning: jest.fn()
      } as unknown as UOCS;

      hook.setUOCS(failingUocs);
      const context = createSubagentStopContext();

      const result = await hook.execute(context);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
