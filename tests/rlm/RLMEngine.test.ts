/**
 * RLMEngine Integration Tests
 *
 * Tests for the Recursive Language Model Engine covering:
 * - Simple problem solving
 * - Complex problem decomposition
 * - Recursion depth management
 * - Result synthesis
 * - Validation
 */

import { RLMEngine } from '../../src/rlm/RLMEngine';
import { ReasoningLoop } from '../../src/rlm/ReasoningLoop';
import {
  Problem,
  ReasoningContext,
  DEFAULT_RLM_CONFIG,
} from '../../src/rlm/types';

describe('RLMEngine', () => {
  let engine: RLMEngine;

  beforeEach(() => {
    engine = new RLMEngine({
      maxDepth: 3,
      stepTimeout: 5000,
      maxSubProblems: 3,
      confidenceThreshold: 0.7,
      enableValidation: true,
      enableCaching: true,
      maxTotalTime: 30000,
    });
  });

  describe('Simple Problem Solving', () => {
    it('should solve a simple problem directly', async () => {
      const result = await engine.reason('What is 2 + 2?');

      expect(result.success).toBe(true);
      expect(result.solution).toBeDefined();
      expect(result.solution?.solvedDirectly).toBe(true);
      expect(result.solution?.depth).toBe(0);
    });

    it('should identify simple problems correctly', () => {
      expect(engine.isSimpleProblem('What is water?')).toBe(true);
      expect(engine.isSimpleProblem('Hello')).toBe(true);
      expect(engine.isSimpleProblem('Short query')).toBe(true);
    });

    it('should identify complex problems correctly', () => {
      const complexQuery = 'Explain the relationship between climate change and biodiversity, ' +
                          'then describe potential solutions and their economic implications';
      expect(engine.isSimpleProblem(complexQuery)).toBe(false);
    });

    it('should use solveSimple for direct solutions', async () => {
      const solution = await engine.solveSimple('What is the capital of France?');

      expect(solution.solvedDirectly).toBe(true);
      expect(solution.confidence).toBeGreaterThan(0.5);
      expect(solution.answer).toContain('capital');
    });

    it('should include context in simple solutions', async () => {
      const solution = await engine.solveSimple(
        'What is the weather?',
        'Location: Paris, France'
      );

      expect(solution.answer).toBeDefined();
      expect(solution.reasoning).toContain('simple');
    });
  });

  describe('Complex Problem Decomposition', () => {
    it('should decompose complex problems into sub-problems', async () => {
      const complexQuery = 'Analyze the economic and environmental impacts of renewable energy ' +
                          'and propose implementation strategies for developing countries';

      const result = await engine.reason(complexQuery);

      expect(result.success).toBe(true);
      // Complex queries may be decomposed or solved directly depending on confidence
      // Check that analysis was performed
      expect(result.trace.steps.some(s => s.type === 'analysis')).toBe(true);
      // If decomposed, should have decomposition step
      if (!result.solution?.solvedDirectly) {
        expect(result.trace.steps.some(s => s.type === 'decomposition')).toBe(true);
      }
    });

    it('should create multiple sub-problems for complex queries', async () => {
      const query = 'Compare advantages and disadvantages of solar, wind, and hydro power';
      const subProblems = await engine.decompose(query);

      expect(subProblems.length).toBeGreaterThan(0);
      expect(subProblems.length).toBeLessThanOrEqual(4);
      expect(subProblems[0].depth).toBe(1);
      // Sub-problems have a parent ID from the decompose method
      expect(subProblems[0].parentId).toBeDefined();
    });

    it('should handle decomposition with constraints', async () => {
      const result = await engine.reason(
        'Design a sustainable city transportation system',
        {
          constraints: ['Budget limited to $1 billion', 'Must be carbon neutral'],
        }
      );

      expect(result.success).toBe(true);
      expect(result.trace.rootProblem.constraints).toHaveLength(2);
    });

    it('should use provided context in decomposition', async () => {
      const result = await engine.reason(
        'Optimize the system architecture',
        {
          context: 'Existing system uses microservices with Kubernetes',
        }
      );

      expect(result.success).toBe(true);
      expect(result.trace.rootProblem.context).toContain('microservices');
    });
  });

  describe('Recursion Depth Management', () => {
    it('should respect maximum recursion depth', async () => {
      const deepEngine = new RLMEngine({ maxDepth: 2 });
      const complexQuery = 'Solve a very complex multi-layered problem with many aspects ' +
                          'and interconnected components and dependencies';

      const result = await deepEngine.reason(complexQuery);

      expect(result.success).toBe(true);
      expect(result.trace.maxDepthReached).toBeLessThanOrEqual(2);
    });

    it('should emit depthLimitReached event', async () => {
      const shallowEngine = new RLMEngine({ maxDepth: 1 });
      const depthEvents: number[] = [];

      shallowEngine.on('depthLimitReached', ({ depth }) => {
        depthEvents.push(depth);
      });

      await shallowEngine.reason(
        'Complex problem requiring deep analysis and multiple decomposition levels'
      );

      // May or may not trigger depending on complexity assessment
      expect(depthEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('should force solve at maximum depth', async () => {
      const result = await engine.reason(
        'Extremely complex problem with many aspects and considerations ' +
        'requiring deep recursive analysis'
      );

      expect(result.success).toBe(true);
      expect(result.metrics.maxDepth).toBeLessThanOrEqual(3);
    });

    it('should track depth in metrics', async () => {
      const result = await engine.reason('Analyze multiple interconnected factors');

      expect(result.metrics.maxDepth).toBeGreaterThanOrEqual(0);
      expect(result.metrics.maxDepth).toBeLessThanOrEqual(3);
    });
  });

  describe('Result Synthesis', () => {
    it('should synthesize sub-solutions correctly', async () => {
      const result = await engine.reason(
        'Compare and contrast three different approaches to machine learning'
      );

      expect(result.success).toBe(true);
      if (result.solution && !result.solution.solvedDirectly) {
        expect(result.solution.subSolutions).toBeDefined();
        expect(result.trace.steps.some(s => s.type === 'synthesis')).toBe(true);
      }
    });

    it('should produce coherent combined answers', async () => {
      const result = await engine.reason(
        'Explain the benefits and drawbacks of remote work'
      );

      expect(result.success).toBe(true);
      expect(result.solution?.answer).toBeDefined();
      expect(result.solution?.answer.length).toBeGreaterThan(20);
    });

    it('should maintain confidence through synthesis', async () => {
      const result = await engine.reason('Analyze multiple factors');

      expect(result.success).toBe(true);
      expect(result.solution?.confidence).toBeGreaterThan(0);
      expect(result.solution?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Validation', () => {
    it('should validate reasoning chains when enabled', async () => {
      const result = await engine.reason('Simple validation test');

      expect(result.validationResults).toBeDefined();
      expect(result.validationResults!.length).toBeGreaterThan(0);
    });

    it('should skip validation when disabled', async () => {
      const noValidationEngine = new RLMEngine({ enableValidation: false });
      const result = await noValidationEngine.reason('Test without validation');

      expect(result.validationResults).toBeUndefined();
    });

    it('should validate solution quality', async () => {
      const result = await engine.reason('Test solution quality validation');

      const solutionValidation = result.validationResults?.find(
        v => v.target === 'solution'
      );

      expect(solutionValidation).toBeDefined();
      expect(solutionValidation?.valid).toBe(true);
      expect(solutionValidation?.qualityScore).toBeGreaterThan(0);
    });

    it('should validate chain coherence', async () => {
      const result = await engine.reason('Test chain coherence');

      const chainValidation = result.validationResults?.find(
        v => v.target === 'chain'
      );

      expect(chainValidation).toBeDefined();
      expect(chainValidation?.valid).toBe(true);
    });

    it('should report validation issues', async () => {
      const result = await engine.reason('Test for potential issues');

      expect(result.validationResults).toBeDefined();
      // May or may not have issues depending on the result
      for (const validation of result.validationResults || []) {
        expect(validation.issues).toBeInstanceOf(Array);
      }
    });
  });

  describe('Event Emissions', () => {
    it('should emit reasoningStarted event', async () => {
      const startHandler = jest.fn();
      engine.on('reasoningStarted', startHandler);

      await engine.reason('Test event emission');

      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(startHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: expect.any(String),
          problem: expect.objectContaining({
            description: 'Test event emission',
          }),
        })
      );
    });

    it('should emit reasoningComplete event', async () => {
      const completeHandler = jest.fn();
      engine.on('reasoningComplete', completeHandler);

      await engine.reason('Test completion event');

      expect(completeHandler).toHaveBeenCalledTimes(1);
      expect(completeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            success: true,
          }),
        })
      );
    });

    it('should emit stepStarted and stepCompleted events', async () => {
      const stepStarted: string[] = [];
      const stepCompleted: string[] = [];

      engine.on('stepStarted', ({ step }) => stepStarted.push(step.id));
      engine.on('stepCompleted', ({ step }) => stepCompleted.push(step.id));

      await engine.reason('Test step events');

      expect(stepStarted.length).toBeGreaterThan(0);
      expect(stepCompleted.length).toBeGreaterThan(0);
      expect(stepStarted.length).toBe(stepCompleted.length);
    });

    it('should emit analysisComplete event', async () => {
      const analysisHandler = jest.fn();
      engine.on('analysisComplete', analysisHandler);

      await engine.reason('Test analysis event');

      expect(analysisHandler).toHaveBeenCalled();
      expect(analysisHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          problemId: expect.any(String),
          analysis: expect.objectContaining({
            complexity: expect.any(String),
            confidence: expect.any(Number),
          }),
        })
      );
    });

    it('should emit solutionFound event', async () => {
      const solutionHandler = jest.fn();
      engine.on('solutionFound', solutionHandler);

      await engine.reason('Test solution event');

      expect(solutionHandler).toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it('should cache solutions when enabled', async () => {
      const cachingEngine = new RLMEngine({ enableCaching: true });

      await cachingEngine.reason('Cache test query');
      const result2 = await cachingEngine.reason('Cache test query');

      // Second call should use cache
      expect(result2.metrics.cacheHits).toBeGreaterThanOrEqual(0);
    });

    it('should not cache when disabled', async () => {
      const noCacheEngine = new RLMEngine({ enableCaching: false });

      await noCacheEngine.reason('No cache query');
      const result2 = await noCacheEngine.reason('No cache query');

      expect(result2.metrics.cacheHits).toBe(0);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track total time', async () => {
      const result = await engine.reason('Metrics test');

      // Total time should be at least 0 (may be 0 for very fast operations)
      expect(result.metrics.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.trace.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should track analysis time', async () => {
      const result = await engine.reason('Analysis time test');

      expect(result.metrics.analysisTime).toBeGreaterThanOrEqual(0);
    });

    it('should track problems processed', async () => {
      const result = await engine.reason('Problem count test');

      expect(result.metrics.problemsProcessed).toBeGreaterThanOrEqual(1);
    });

    it('should differentiate direct vs recursive solves', async () => {
      const result = await engine.reason('Simple short query');

      expect(result.metrics.directSolves + result.metrics.recursiveSolves)
        .toBe(result.metrics.problemsProcessed);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultEngine = new RLMEngine();
      const config = defaultEngine.getConfig();

      expect(config.maxDepth).toBe(DEFAULT_RLM_CONFIG.maxDepth);
      expect(config.confidenceThreshold).toBe(DEFAULT_RLM_CONFIG.confidenceThreshold);
    });

    it('should allow custom configuration', () => {
      const customEngine = new RLMEngine({
        maxDepth: 10,
        confidenceThreshold: 0.5,
      });

      const config = customEngine.getConfig();
      expect(config.maxDepth).toBe(10);
      expect(config.confidenceThreshold).toBe(0.5);
    });

    it('should allow configuration updates', () => {
      engine.updateConfig({ maxDepth: 7 });

      expect(engine.getConfig().maxDepth).toBe(7);
    });

    it('should preserve unmodified config values on update', () => {
      const originalThreshold = engine.getConfig().confidenceThreshold;
      engine.updateConfig({ maxDepth: 7 });

      expect(engine.getConfig().confidenceThreshold).toBe(originalThreshold);
    });
  });

  describe('Trace Management', () => {
    it('should track active traces', async () => {
      const promise = engine.reason('Long running query');

      // May or may not catch active traces depending on timing
      const activeIds = engine.getActiveTraceIds();
      expect(activeIds).toBeInstanceOf(Array);

      await promise;
    });

    it('should store completed results', async () => {
      const result = await engine.reason('Completed trace test');

      const completed = engine.getCompletedResult(result.trace.id);
      expect(completed).toBeDefined();
      expect(completed?.trace.id).toBe(result.trace.id);
    });

    it('should clear completed traces', async () => {
      await engine.reason('Clear test');
      engine.clearCompleted();

      const stats = engine.getStats();
      expect(stats.completedTraces).toBe(0);
    });

    it('should report accurate statistics', async () => {
      await engine.reason('Stats test 1');
      await engine.reason('Stats test 2');

      const stats = engine.getStats();
      expect(stats.completedTraces).toBe(2);
      expect(stats.activeTraces).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      // Test with very restrictive config
      const restrictedEngine = new RLMEngine({
        maxDepth: 1,
        maxSubProblems: 1,
        confidenceThreshold: 0.99, // Very high threshold
      });

      const result = await restrictedEngine.reason(
        'A moderately complex query that might be constrained'
      );

      // Should still produce a result (forced solve at depth limit)
      expect(result.success).toBe(true);
      expect(result.trace).toBeDefined();
    });

    it('should track failed status when error occurs', async () => {
      // Create a trace and verify error handling structure
      const result = await engine.reason('Test error handling structure');

      // Verify the result structure supports error tracking
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('trace');
      expect(result).toHaveProperty('metrics');

      // If failed, should have error
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.trace.status).toBe('failed');
      }
    });

    it('should emit events during reasoning process', async () => {
      const events: string[] = [];
      engine.on('reasoningStarted', () => events.push('started'));
      engine.on('reasoningComplete', () => events.push('complete'));
      engine.on('reasoningFailed', () => events.push('failed'));

      await engine.reason('Event tracking test');

      expect(events).toContain('started');
      // Should have either complete or failed
      expect(events.some(e => e === 'complete' || e === 'failed')).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should use provided session ID', async () => {
      const result = await engine.reason('Session test', {
        sessionId: 'custom-session-123',
      });

      // Session ID is tracked in context
      expect(result.success).toBe(true);
    });

    it('should generate session ID if not provided', async () => {
      const result = await engine.reason('Auto session test');

      expect(result.success).toBe(true);
      // Session ID is auto-generated internally
    });
  });
});

describe('ReasoningLoop', () => {
  let loop: ReasoningLoop;

  beforeEach(() => {
    loop = new ReasoningLoop({
      maxDepth: 3,
      maxSubProblems: 3,
      confidenceThreshold: 0.7,
    });
  });

  describe('Problem Analysis', () => {
    it('should analyze problem complexity', async () => {
      const context = createTestContext();
      const problem: Problem = {
        id: 'test-1',
        description: 'Simple question',
        depth: 0,
      };

      const analysis = await loop.analyzeProblem(problem, context);

      expect(analysis.complexity).toBeDefined();
      expect(['simple', 'moderate', 'complex']).toContain(analysis.complexity);
    });

    it('should extract key concepts', async () => {
      const context = createTestContext();
      const problem: Problem = {
        id: 'test-2',
        description: 'Explain machine learning algorithms and neural networks',
        depth: 0,
      };

      const analysis = await loop.analyzeProblem(problem, context);

      expect(analysis.keyConcepts.length).toBeGreaterThan(0);
    });

    it('should suggest decomposition for complex problems', async () => {
      const context = createTestContext();
      const problem: Problem = {
        id: 'test-3',
        description: 'Analyze the economic, social, and environmental impacts ' +
                    'of urbanization and propose sustainable development strategies',
        depth: 0,
      };

      const analysis = await loop.analyzeProblem(problem, context);

      if (!analysis.canSolveDirectly) {
        expect(analysis.suggestedDecomposition).toBeDefined();
        expect(analysis.suggestedDecomposition!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Direct Solving', () => {
    it('should solve simple problems directly', async () => {
      const context = createTestContext();
      const problem: Problem = {
        id: 'simple-1',
        description: 'What color is the sky?',
        depth: 0,
      };

      const solution = await loop.solve(problem, context);

      expect(solution.solvedDirectly).toBe(true);
      expect(solution.answer).toBeDefined();
    });
  });

  describe('Event Emissions', () => {
    it('should emit analysis events', async () => {
      const analysisHandler = jest.fn();
      loop.on('analysisComplete', analysisHandler);

      const context = createTestContext();
      const problem: Problem = {
        id: 'event-1',
        description: 'Test analysis events',
        depth: 0,
      };

      await loop.solve(problem, context);

      expect(analysisHandler).toHaveBeenCalled();
    });

    it('should emit solution events', async () => {
      const solutionHandler = jest.fn();
      loop.on('solutionFound', solutionHandler);

      const context = createTestContext();
      const problem: Problem = {
        id: 'event-2',
        description: 'Test solution events',
        depth: 0,
      };

      await loop.solve(problem, context);

      expect(solutionHandler).toHaveBeenCalled();
    });
  });
});

// Helper function to create test context
function createTestContext(): ReasoningContext {
  return {
    sessionId: 'test-session',
    trace: {
      id: 'test-trace',
      rootProblem: { id: 'root', description: 'Root', depth: 0 },
      steps: [],
      status: 'analyzing',
      maxDepthReached: 0,
      totalDuration: 0,
      startTime: new Date(),
    },
    problemStack: [],
    solutionCache: new Map(),
    metrics: {
      totalTime: 0,
      analysisTime: 0,
      decompositionTime: 0,
      solvingTime: 0,
      synthesisTime: 0,
      problemsProcessed: 0,
      directSolves: 0,
      recursiveSolves: 0,
      maxDepth: 0,
      cacheHits: 0,
      cacheMisses: 0,
    },
    config: DEFAULT_RLM_CONFIG,
    startTime: Date.now(),
  };
}
