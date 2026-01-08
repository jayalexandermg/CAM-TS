import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventType, HookEvent } from '../../src/hooks';
import {
  LearnedPromoter,
  InterestingnessScore,
  LearningIndicator,
  LearnedEvent,
} from '../../src/learning';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';

describe('LearnedPromoter', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let promoter: LearnedPromoter;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'learned-promoter-test-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    promoter = new LearnedPromoter(fileOperations, directoryOperations);
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

  const createHighScore = (): InterestingnessScore => ({
    score: 0.85,
    indicators: [LearningIndicator.BREAKTHROUGH, LearningIndicator.PATTERN],
    reasons: ['Detected breakthrough', 'Detected pattern'],
    confidence: 0.8,
  });

  const createLowScore = (): InterestingnessScore => ({
    score: 0.3,
    indicators: [LearningIndicator.QUESTION],
    reasons: ['Detected question'],
    confidence: 0.4,
  });

  describe('constructor', () => {
    it('should create promoter with default config', () => {
      const config = promoter.getConfig();
      expect(config.minScoreForPromotion).toBe(0.7);
      expect(config.enableAutoPromotion).toBe(true);
    });

    it('should accept custom config', () => {
      const customPromoter = new LearnedPromoter(fileOperations, directoryOperations, {
        config: { minScoreForPromotion: 0.5 },
      });
      const config = customPromoter.getConfig();
      expect(config.minScoreForPromotion).toBe(0.5);
    });

    it('should accept custom learned base directory', () => {
      const customPromoter = new LearnedPromoter(fileOperations, directoryOperations, {
        learnedBaseDir: 'custom/learned',
      });
      expect(customPromoter.getLearnedBaseDir()).toBe('custom/learned');
    });
  });

  describe('shouldPromote', () => {
    it('should return true for high score meeting threshold', () => {
      const score = createHighScore();
      expect(promoter.shouldPromote(score)).toBe(true);
    });

    it('should return false for low score', () => {
      const score = createLowScore();
      expect(promoter.shouldPromote(score)).toBe(false);
    });

    it('should return false when auto-promotion disabled', () => {
      const disabledPromoter = new LearnedPromoter(fileOperations, directoryOperations, {
        config: { enableAutoPromotion: false },
      });
      const score = createHighScore();
      expect(disabledPromoter.shouldPromote(score)).toBe(false);
    });

    it('should return false when confidence below threshold', () => {
      const lowConfidenceScore: InterestingnessScore = {
        score: 0.85,
        indicators: [LearningIndicator.BREAKTHROUGH],
        reasons: ['Detected breakthrough'],
        confidence: 0.3,
      };
      expect(promoter.shouldPromote(lowConfidenceScore)).toBe(false);
    });

    it('should return false when no indicators', () => {
      const noIndicatorsScore: InterestingnessScore = {
        score: 0.85,
        indicators: [],
        reasons: [],
        confidence: 0.8,
      };
      expect(promoter.shouldPromote(noIndicatorsScore)).toBe(false);
    });
  });

  describe('promote', () => {
    it('should promote high-score event', async () => {
      const event = createEvent('Major breakthrough discovered');
      const score = createHighScore();
      const result = await promoter.promote(event, score, 'history/execution');

      expect(result.attempted).toBe(true);
      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
    });

    it('should not promote low-score event', async () => {
      const event = createEvent('Just a question');
      const score = createLowScore();
      const result = await promoter.promote(event, score, 'history/execution');

      expect(result.attempted).toBe(false);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('below threshold');
    });

    it('should create learned directory', async () => {
      const event = createEvent('Breakthrough event');
      const score = createHighScore();
      await promoter.promote(event, score, 'history/execution');

      const exists = await directoryOperations.directoryExists('learned');
      expect(exists).toBe(true);
    });

    it('should write valid JSONL', async () => {
      const event = createEvent('Breakthrough event');
      const score = createHighScore();
      const result = await promoter.promote(event, score, 'history/execution');

      const content = await fileOperations.readFile(result.path!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.originalEvent.content).toBe('Breakthrough event');
      expect(parsed.interestingnessScore.score).toBe(0.85);
    });

    it('should include promotedAt timestamp', async () => {
      const event = createEvent('Breakthrough event');
      const score = createHighScore();
      const result = await promoter.promote(event, score, 'history/execution');

      const content = await fileOperations.readFile(result.path!);
      const parsed: LearnedEvent = JSON.parse(content.trim());

      expect(parsed.promotedAt).toBeDefined();
      expect(new Date(parsed.promotedAt).toISOString()).toBe(parsed.promotedAt);
    });

    it('should include learnedFrom source', async () => {
      const event = createEvent('Breakthrough event');
      const score = createHighScore();
      const result = await promoter.promote(event, score, 'projects/my-project');

      const content = await fileOperations.readFile(result.path!);
      const parsed: LearnedEvent = JSON.parse(content.trim());

      expect(parsed.learnedFrom).toBe('projects/my-project');
    });
  });

  describe('forcePromote', () => {
    it('should promote regardless of score', async () => {
      const event = createEvent('Low score event');
      const score = createLowScore();
      const result = await promoter.forcePromote(event, score, 'history/execution');

      expect(result.attempted).toBe(true);
      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
    });

    it('should write valid JSONL', async () => {
      const event = createEvent('Force promoted event');
      const score = createLowScore();
      const result = await promoter.forcePromote(event, score, 'history/execution');

      const content = await fileOperations.readFile(result.path!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.originalEvent.content).toBe('Force promoted event');
    });
  });

  describe('createLearnedEvent', () => {
    it('should create LearnedEvent with all fields', () => {
      const event = createEvent('Test event');
      const score = createHighScore();
      const learnedEvent = promoter.createLearnedEvent(event, score, 'history/execution');

      expect(learnedEvent.originalEvent).toBe(event);
      expect(learnedEvent.interestingnessScore).toBe(score);
      expect(learnedEvent.learnedFrom).toBe('history/execution');
      expect(learnedEvent.promotedAt).toBeDefined();
    });
  });

  describe('filename caching', () => {
    it('should cache filenames', async () => {
      const event1 = createEvent('Event 1');
      const event2 = createEvent('Event 2');
      const score = createHighScore();

      await promoter.promote(event1, score, 'history/execution');
      expect(promoter.getCachedFilenameCount()).toBeGreaterThan(0);

      await promoter.promote(event2, score, 'history/execution');
      // Should use same file
    });

    it('should reset filename cache', async () => {
      const event = createEvent('Event');
      const score = createHighScore();

      await promoter.promote(event, score, 'history/execution');
      expect(promoter.getCachedFilenameCount()).toBeGreaterThan(0);

      promoter.resetFilenameCache();
      expect(promoter.getCachedFilenameCount()).toBe(0);
    });
  });

  describe('multiple events', () => {
    it('should append multiple events to same file', async () => {
      const event1 = createEvent('Event 1 - breakthrough');
      const event2 = createEvent('Event 2 - another insight');
      const score = createHighScore();

      const result1 = await promoter.promote(event1, score, 'history/execution');
      const result2 = await promoter.promote(event2, score, 'history/execution');

      // Same file path
      expect(result1.path).toBe(result2.path);

      // Check file has 2 lines
      const content = await fileOperations.readFile(result1.path!);
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);
    });
  });

  describe('promotion result reasons', () => {
    it('should explain when auto-promotion disabled', async () => {
      const disabledPromoter = new LearnedPromoter(fileOperations, directoryOperations, {
        config: { enableAutoPromotion: false },
      });

      const event = createEvent('Event');
      const score = createHighScore();
      const result = await disabledPromoter.promote(event, score, 'history/execution');

      expect(result.reason).toContain('disabled');
    });

    it('should explain when score below threshold', async () => {
      const event = createEvent('Event');
      const score = createLowScore();
      const result = await promoter.promote(event, score, 'history/execution');

      expect(result.reason).toContain('below threshold');
    });

    it('should explain when confidence below threshold', async () => {
      const event = createEvent('Event');
      const lowConfidence: InterestingnessScore = {
        score: 0.85,
        indicators: [LearningIndicator.BREAKTHROUGH],
        reasons: ['Detected'],
        confidence: 0.3,
      };
      const result = await promoter.promote(event, lowConfidence, 'history/execution');

      expect(result.reason).toContain('Confidence');
    });

    it('should explain when no indicators', async () => {
      const event = createEvent('Event');
      const noIndicators: InterestingnessScore = {
        score: 0.85,
        indicators: [],
        reasons: [],
        confidence: 0.8,
      };
      const result = await promoter.promote(event, noIndicators, 'history/execution');

      expect(result.reason).toContain('No learning indicators');
    });
  });
});
