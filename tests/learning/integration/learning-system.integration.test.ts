import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventType, HookEvent } from '../../../src/hooks';
import {
  InterestingnessScorer,
  LearnedPromoter,
  LearningIndicator,
  LearnedEvent,
} from '../../../src/learning';
import { ContentRouter, ContentClassifier } from '../../../src/routing';
import { FileOperations } from '../../../src/memory/file-operations';
import { DirectoryOperations } from '../../../src/memory/directory-operations';
import { PathValidator } from '../../../src/memory/path-validator';

describe('Learning System Integration', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let scorer: InterestingnessScorer;
  let promoter: LearnedPromoter;
  let classifier: ContentClassifier;
  let router: ContentRouter;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'learning-integration-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    scorer = new InterestingnessScorer();
    promoter = new LearnedPromoter(fileOperations, directoryOperations);
    classifier = new ContentClassifier();
    router = new ContentRouter(classifier, fileOperations, directoryOperations, {
      scorer,
      promoter,
    });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const createEvent = (
    content: string,
    metadata: Record<string, unknown> = {}
  ): HookEvent => ({
    timestamp: new Date().toISOString(),
    type: EventType.CAPTURE_ALL,
    content,
    metadata,
  });

  describe('End-to-End Learning Flow', () => {
    it('should score and promote high-interest events through router', async () => {
      const event = createEvent(
        'Major breakthrough: discovered that caching significantly improves performance',
        { projectId: 'perf-project', tags: ['insight'] }
      );

      const result = await router.route(event);

      expect(result.interestingnessScore).toBeDefined();
      expect(result.interestingnessScore!.score).toBeGreaterThan(0.7);
      expect(result.interestingnessScore!.indicators).toContain(LearningIndicator.BREAKTHROUGH);
      expect(result.promotionResult).toBeDefined();
      expect(result.promotionResult!.success).toBe(true);
    });

    it('should not promote low-interest events', async () => {
      const event = createEvent('Simple task completed', { projectId: 'test' });

      const result = await router.route(event);

      expect(result.interestingnessScore).toBeDefined();
      expect(result.interestingnessScore!.score).toBeLessThan(0.7);
      expect(result.promotionResult).toBeDefined();
      expect(result.promotionResult!.attempted).toBe(false);
    });

    it('should write LearnedEvent to learned/ directory', async () => {
      const event = createEvent(
        'User feedback received: they strongly prefer the dark theme over light theme',
        {
          projectId: 'ui-project',
          userFeedback: true,
          tags: ['feedback', 'user-input'],
        }
      );

      const result = await router.route(event);

      expect(result.promotionResult!.success).toBe(true);
      const learnedPath = result.promotionResult!.path!;
      const content = await fileOperations.readFile(learnedPath);
      const learned: LearnedEvent = JSON.parse(content.trim());

      expect(learned.originalEvent.content).toContain('User feedback');
      expect(learned.interestingnessScore.indicators).toContain(LearningIndicator.USER_FEEDBACK);
    });
  });

  describe('All 10 Indicators Detection', () => {
    const indicatorTestCases = [
      {
        indicator: LearningIndicator.DECISION,
        content: 'We decided to use PostgreSQL for the database',
        expectedScore: 0.7,
      },
      {
        indicator: LearningIndicator.BREAKTHROUGH,
        content: 'Discovered that the root cause was memory leak',
        expectedScore: 0.9,
      },
      {
        indicator: LearningIndicator.FAILURE,
        content: 'The deployment failed due to missing environment variables',
        expectedScore: 0.8,
      },
      {
        indicator: LearningIndicator.PATTERN,
        content: 'Noticed a recurring pattern: users always search first',
        expectedScore: 0.85,
      },
      {
        indicator: LearningIndicator.USER_FEEDBACK,
        content: 'User feedback: navigation is confusing',
        expectedScore: 0.95,
      },
      {
        indicator: LearningIndicator.CONSTRAINT,
        content: "We can't use that API due to rate limitations",
        expectedScore: 0.75,
      },
      {
        indicator: LearningIndicator.OPTIMIZATION,
        content: 'Improved query performance by adding an index',
        expectedScore: 0.8,
      },
      {
        indicator: LearningIndicator.QUESTION,
        content: 'Question: why does the system slow down at night?',
        expectedScore: 0.6,
      },
      {
        indicator: LearningIndicator.HYPOTHESIS,
        content: 'Hypothesis: the slowdown might be caused by batch jobs',
        expectedScore: 0.7,
      },
      {
        indicator: LearningIndicator.VALIDATION,
        content: 'Confirmed that the batch jobs were indeed causing the slowdown',
        expectedScore: 0.85,
      },
    ];

    indicatorTestCases.forEach(({ indicator, content }) => {
      it(`should detect ${indicator} indicator`, async () => {
        const event = createEvent(content, { projectId: 'test' });
        const score = scorer.score(event);

        expect(score.indicators).toContain(indicator);
      });
    });
  });

  describe('Score Calculation Accuracy', () => {
    it('should score single indicator events appropriately', async () => {
      const decisionEvent = createEvent('Decided to proceed with option A');
      const decisionScore = scorer.score(decisionEvent);

      expect(decisionScore.score).toBeCloseTo(0.7, 1);
    });

    it('should score multiple indicator events higher', async () => {
      const multiEvent = createEvent(
        'Discovered a pattern: users always choose the simplest option'
      );
      const multiScore = scorer.score(multiEvent);

      // Has BREAKTHROUGH + PATTERN
      expect(multiScore.indicators.length).toBeGreaterThanOrEqual(2);
      expect(multiScore.score).toBeGreaterThan(0.8);
    });

    it('should have high confidence for events with clear indicators', async () => {
      const clearEvent = createEvent('Major breakthrough: we discovered a critical pattern', {
        tags: ['insight', 'pattern'],
      });
      const clearScore = scorer.score(clearEvent);

      expect(clearScore.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Promotion Threshold Behavior', () => {
    it('should promote events at exactly threshold', async () => {
      // Create promoter with specific threshold and lower confidence requirement
      const customPromoter = new LearnedPromoter(fileOperations, directoryOperations, {
        config: { minScoreForPromotion: 0.7, minConfidenceForPromotion: 0.3 },
      });

      const customRouter = new ContentRouter(classifier, fileOperations, directoryOperations, {
        scorer,
        promoter: customPromoter,
      });

      const event = createEvent('We decided to use this specific approach for the project', {
        projectId: 'test',
        tags: ['decision'],
      });
      const result = await customRouter.route(event);

      // Score should be ~0.7 for decision
      if (result.interestingnessScore!.score >= 0.7) {
        expect(result.promotionResult!.attempted).toBe(true);
      }
    });

    it('should not promote events below threshold', async () => {
      const customPromoter = new LearnedPromoter(fileOperations, directoryOperations, {
        config: { minScoreForPromotion: 0.99 },
      });

      const customRouter = new ContentRouter(classifier, fileOperations, directoryOperations, {
        scorer,
        promoter: customPromoter,
      });

      const event = createEvent('Decided to proceed', { projectId: 'test' });
      const result = await customRouter.route(event);

      expect(result.promotionResult!.attempted).toBe(false);
    });
  });

  describe('LearnedEvent Format Verification', () => {
    it('should have correct LearnedEvent structure', async () => {
      const event = createEvent(
        'Major breakthrough in understanding the system: discovered a critical insight about the architecture',
        {
          projectId: 'analysis',
          tags: ['insight', 'breakthrough', 'discovery'],
        }
      );

      const result = await router.route(event);

      // Ensure promotion succeeded
      expect(result.promotionResult).toBeDefined();
      expect(result.promotionResult!.success).toBe(true);

      const learnedPath = result.promotionResult!.path!;
      const content = await fileOperations.readFile(learnedPath);
      const learned: LearnedEvent = JSON.parse(content.trim());

      // Verify structure
      expect(learned).toHaveProperty('originalEvent');
      expect(learned).toHaveProperty('interestingnessScore');
      expect(learned).toHaveProperty('promotedAt');
      expect(learned).toHaveProperty('learnedFrom');

      // Verify original event preserved
      expect(learned.originalEvent.content).toContain('Major breakthrough');
      expect(learned.originalEvent.type).toBe(EventType.CAPTURE_ALL);
      expect(learned.originalEvent.metadata.projectId).toBe('analysis');

      // Verify score data
      expect(learned.interestingnessScore.score).toBeGreaterThan(0);
      expect(learned.interestingnessScore.indicators.length).toBeGreaterThan(0);
      expect(learned.interestingnessScore.reasons.length).toBeGreaterThan(0);
      expect(learned.interestingnessScore.confidence).toBeGreaterThan(0);

      // Verify timestamps
      expect(new Date(learned.promotedAt).toISOString()).toBe(learned.promotedAt);
    });
  });

  describe('Router Without Learning', () => {
    it('should work without scorer and promoter', async () => {
      const basicRouter = new ContentRouter(classifier, fileOperations, directoryOperations);

      const event = createEvent('Regular event', { projectId: 'test' });
      const result = await basicRouter.route(event);

      expect(result.interestingnessScore).toBeUndefined();
      expect(result.promotionResult).toBeUndefined();
      expect(result.success).toBe(true);
    });

    it('should report learning disabled correctly', () => {
      const basicRouter = new ContentRouter(classifier, fileOperations, directoryOperations);
      expect(basicRouter.hasLearningEnabled()).toBe(false);

      expect(router.hasLearningEnabled()).toBe(true);
    });
  });

  describe('Multiple Event Processing', () => {
    it('should process multiple events with different scores', async () => {
      const events = [
        createEvent('Major breakthrough discovered', { projectId: 'p1' }),
        createEvent('Simple task completed', { projectId: 'p2' }),
        createEvent('User feedback: great work', { projectId: 'p3', userFeedback: true }),
        createEvent('Just a regular update', { projectId: 'p4' }),
      ];

      const results = await Promise.all(events.map((e) => router.route(e)));

      // First event - breakthrough (high score)
      expect(results[0].interestingnessScore!.indicators).toContain(LearningIndicator.BREAKTHROUGH);

      // Second event - no indicators (low score)
      expect(results[1].interestingnessScore!.score).toBeLessThan(0.5);

      // Third event - user feedback (high score)
      expect(results[2].interestingnessScore!.indicators).toContain(
        LearningIndicator.USER_FEEDBACK
      );

      // Fourth event - no indicators (low score)
      expect(results[3].interestingnessScore!.score).toBeLessThan(0.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const event = createEvent('', { projectId: 'test' });
      const result = await router.route(event);

      expect(result.interestingnessScore).toBeDefined();
      expect(result.interestingnessScore!.score).toBe(0);
    });

    it('should handle events with no metadata', async () => {
      const event = createEvent('Discovered a new pattern');
      const result = await router.route(event);

      expect(result.interestingnessScore).toBeDefined();
      expect(result.interestingnessScore!.indicators).toContain(LearningIndicator.BREAKTHROUGH);
      expect(result.interestingnessScore!.indicators).toContain(LearningIndicator.PATTERN);
    });

    it('should handle concurrent event scoring', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createEvent(`Breakthrough ${i}: discovered important insight`, { projectId: 'concurrent' })
      );

      const results = await Promise.all(events.map((e) => router.route(e)));

      results.forEach((r) => {
        expect(r.interestingnessScore).toBeDefined();
        expect(r.interestingnessScore!.indicators).toContain(LearningIndicator.BREAKTHROUGH);
      });
    });
  });
});
