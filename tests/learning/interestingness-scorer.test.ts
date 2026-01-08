import { EventType, HookEvent } from '../../src/hooks';
import { InterestingnessScorer, LearningIndicator } from '../../src/learning';

describe('InterestingnessScorer', () => {
  let scorer: InterestingnessScorer;

  beforeEach(() => {
    scorer = new InterestingnessScorer();
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

  describe('constructor', () => {
    it('should create scorer with default config', () => {
      const config = scorer.getConfig();
      expect(config.minScoreForPromotion).toBe(0.7);
      expect(config.enableAutoPromotion).toBe(true);
    });

    it('should accept custom config', () => {
      const customScorer = new InterestingnessScorer({
        config: {
          minScoreForPromotion: 0.5,
          enableAutoPromotion: false,
        },
      });
      const config = customScorer.getConfig();
      expect(config.minScoreForPromotion).toBe(0.5);
      expect(config.enableAutoPromotion).toBe(false);
    });

    it('should accept custom indicator detection', () => {
      const customScorer = new InterestingnessScorer({
        indicatorDetection: {
          [LearningIndicator.DECISION]: {
            keywords: ['custom-decided', 'custom-chose'],
          },
        },
      });
      const detection = customScorer.getIndicatorDetection();
      expect(detection[LearningIndicator.DECISION].keywords).toContain('custom-decided');
    });
  });

  describe('score', () => {
    it('should return an InterestingnessScore object', () => {
      const event = createEvent('Test event');
      const score = scorer.score(event);

      expect(score).toHaveProperty('score');
      expect(score).toHaveProperty('indicators');
      expect(score).toHaveProperty('reasons');
      expect(score).toHaveProperty('confidence');
    });

    it('should return score between 0 and 1', () => {
      const event = createEvent('Test event');
      const score = scorer.score(event);

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
    });

    it('should return confidence between 0 and 1', () => {
      const event = createEvent('Test event');
      const score = scorer.score(event);

      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });

    it('should return 0 score when no indicators detected', () => {
      const event = createEvent('Simple text with no indicators');
      const score = scorer.score(event);

      expect(score.score).toBe(0);
      expect(score.indicators).toHaveLength(0);
    });
  });

  describe('DECISION indicator detection', () => {
    it('should detect "decided" keyword', () => {
      const event = createEvent('We decided to use TypeScript');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.DECISION);
    });

    it('should detect "chose" keyword', () => {
      const event = createEvent('I chose React over Vue');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.DECISION);
    });

    it('should detect "selected" keyword', () => {
      const event = createEvent('We selected the best option');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.DECISION);
    });

    it('should detect decision tag in metadata', () => {
      const event = createEvent('Made a choice', { tags: ['decision'] });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.DECISION);
    });
  });

  describe('BREAKTHROUGH indicator detection', () => {
    it('should detect "discovered" keyword', () => {
      const event = createEvent('I discovered a new pattern');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.BREAKTHROUGH);
    });

    it('should detect "realized" keyword', () => {
      const event = createEvent('I realized the issue was in the config');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.BREAKTHROUGH);
    });

    it('should detect "breakthrough" keyword', () => {
      const event = createEvent('This is a major breakthrough');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.BREAKTHROUGH);
    });

    it('should detect "insight" keyword', () => {
      const event = createEvent('New insight into the problem');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.BREAKTHROUGH);
    });

    it('should detect insight tag in metadata', () => {
      const event = createEvent('Found something', { tags: ['insight'] });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.BREAKTHROUGH);
    });
  });

  describe('FAILURE indicator detection', () => {
    it('should detect "failed" keyword', () => {
      const event = createEvent('The build failed');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.FAILURE);
    });

    it('should detect "error" keyword', () => {
      const event = createEvent('Got an error in the code');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.FAILURE);
    });

    it('should detect "bug" keyword', () => {
      const event = createEvent('Found a bug in the authentication');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.FAILURE);
    });

    it('should detect error metadata flag', () => {
      const event = createEvent('Something happened', { error: true });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.FAILURE);
    });

    it('should detect exception metadata flag', () => {
      const event = createEvent('Something happened', { exception: 'Error message' });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.FAILURE);
    });
  });

  describe('PATTERN indicator detection', () => {
    it('should detect "pattern" keyword', () => {
      const event = createEvent('I noticed a pattern in the data');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.PATTERN);
    });

    it('should detect "recurring" keyword', () => {
      const event = createEvent('This is a recurring issue');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.PATTERN);
    });

    it('should detect "always" keyword', () => {
      const event = createEvent('It always happens on Mondays');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.PATTERN);
    });

    it('should detect "trend" keyword', () => {
      const event = createEvent('Seeing a trend in user behavior');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.PATTERN);
    });
  });

  describe('USER_FEEDBACK indicator detection', () => {
    it('should detect "user said" keyword', () => {
      const event = createEvent('The user said they prefer dark mode');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.USER_FEEDBACK);
    });

    it('should detect "feedback" keyword', () => {
      const event = createEvent('Got feedback from the team');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.USER_FEEDBACK);
    });

    it('should detect userFeedback metadata flag', () => {
      const event = createEvent('Input received', { userFeedback: true });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.USER_FEEDBACK);
    });

    it('should detect feedback tag in metadata', () => {
      const event = createEvent('Got input', { tags: ['feedback'] });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.USER_FEEDBACK);
    });
  });

  describe('CONSTRAINT indicator detection', () => {
    it('should detect "limitation" keyword', () => {
      const event = createEvent('Found a limitation in the API');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.CONSTRAINT);
    });

    it('should detect "constraint" keyword', () => {
      const event = createEvent('Time constraint is a problem');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.CONSTRAINT);
    });

    it('should detect "can\'t" keyword', () => {
      const event = createEvent("We can't do that because of limits");
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.CONSTRAINT);
    });

    it('should detect "blocked" keyword', () => {
      const event = createEvent('Progress is blocked by dependencies');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.CONSTRAINT);
    });
  });

  describe('OPTIMIZATION indicator detection', () => {
    it('should detect "improved" keyword', () => {
      const event = createEvent('Improved performance by 30%');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.OPTIMIZATION);
    });

    it('should detect "optimized" keyword', () => {
      const event = createEvent('Optimized the database queries');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.OPTIMIZATION);
    });

    it('should detect "faster" keyword', () => {
      const event = createEvent('The new approach is 2x faster');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.OPTIMIZATION);
    });

    it('should detect optimization tag in metadata', () => {
      const event = createEvent('Performance work', { tags: ['optimization'] });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.OPTIMIZATION);
    });
  });

  describe('QUESTION indicator detection', () => {
    it('should detect "why" keyword', () => {
      const event = createEvent('Why does this happen?');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.QUESTION);
    });

    it('should detect "how" keyword', () => {
      const event = createEvent('How do we solve this?');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.QUESTION);
    });

    it('should detect "what if" keyword', () => {
      const event = createEvent('What if we tried a different approach?');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.QUESTION);
    });

    it('should detect question tag in metadata', () => {
      const event = createEvent('Need to investigate', { tags: ['question'] });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.QUESTION);
    });
  });

  describe('HYPOTHESIS indicator detection', () => {
    it('should detect "hypothesis" keyword', () => {
      const event = createEvent('My hypothesis is that caching helps');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.HYPOTHESIS);
    });

    it('should detect "theory" keyword', () => {
      const event = createEvent('The theory is that users prefer simplicity');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.HYPOTHESIS);
    });

    it('should detect "might" keyword', () => {
      const event = createEvent('This might be the root cause');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.HYPOTHESIS);
    });

    it('should detect hypothesis tag in metadata', () => {
      const event = createEvent('Testing idea', { tags: ['hypothesis'] });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.HYPOTHESIS);
    });
  });

  describe('VALIDATION indicator detection', () => {
    it('should detect "confirmed" keyword', () => {
      const event = createEvent('Confirmed that the fix works');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.VALIDATION);
    });

    it('should detect "validated" keyword', () => {
      const event = createEvent('Validated the hypothesis');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.VALIDATION);
    });

    it('should detect "verified" keyword', () => {
      const event = createEvent('Verified the solution works');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.VALIDATION);
    });

    it('should detect validation tag in metadata', () => {
      const event = createEvent('Test passed', { tags: ['validation'] });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.VALIDATION);
    });
  });

  describe('score calculation', () => {
    it('should use indicator weights for scoring', () => {
      // USER_FEEDBACK has highest weight (0.95)
      const feedbackEvent = createEvent('User feedback received', { userFeedback: true });
      const feedbackScore = scorer.score(feedbackEvent);

      // QUESTION has lower weight (0.6)
      const questionEvent = createEvent('Question: why does this happen?');
      const questionScore = scorer.score(questionEvent);

      expect(feedbackScore.score).toBeGreaterThan(questionScore.score);
    });

    it('should average weights for multiple indicators', () => {
      const event = createEvent('I discovered a new pattern');
      const score = scorer.score(event);

      // Has both BREAKTHROUGH (0.9) and PATTERN (0.85)
      expect(score.indicators).toContain(LearningIndicator.BREAKTHROUGH);
      expect(score.indicators).toContain(LearningIndicator.PATTERN);
      expect(score.score).toBeGreaterThan(0.8);
      expect(score.score).toBeLessThanOrEqual(0.9);
    });

    it('should cap score at 1.0', () => {
      const customScorer = new InterestingnessScorer({
        config: {
          indicatorWeights: {
            [LearningIndicator.BREAKTHROUGH]: 2.0, // Artificially high
          },
        },
      });

      const event = createEvent('Major breakthrough');
      const score = customScorer.score(event);

      expect(score.score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('reasons generation', () => {
    it('should include reason for keyword match', () => {
      const event = createEvent('We decided to proceed');
      const score = scorer.score(event);

      expect(score.reasons.some((r) => r.includes("keyword: 'decided'"))).toBe(true);
    });

    it('should include reason for tag match', () => {
      const event = createEvent('Some event', { tags: ['decision'] });
      const score = scorer.score(event);

      expect(score.reasons.some((r) => r.includes("tag: 'decision'"))).toBe(true);
    });

    it('should include reason for metadata flag match', () => {
      const event = createEvent('Error occurred', { error: true });
      const score = scorer.score(event);

      expect(score.reasons.some((r) => r.includes('error metadata'))).toBe(true);
    });

    it('should include "no indicators" reason when none detected', () => {
      const event = createEvent('Simple text');
      const score = scorer.score(event);

      expect(score.reasons).toContain('No learning indicators detected');
    });
  });

  describe('confidence calculation', () => {
    it('should have low confidence when no indicators', () => {
      const event = createEvent('Simple text');
      const score = scorer.score(event);

      expect(score.confidence).toBeLessThan(0.2);
    });

    it('should have higher confidence with multiple indicators', () => {
      const singleEvent = createEvent('Made a decision');
      const multiEvent = createEvent('Decided after discovering a pattern');

      const singleScore = scorer.score(singleEvent);
      const multiScore = scorer.score(multiEvent);

      expect(multiScore.confidence).toBeGreaterThan(singleScore.confidence);
    });

    it('should have higher confidence with longer content', () => {
      const shortEvent = createEvent('Decided');
      const longEvent = createEvent(
        'After careful consideration of all the options, we decided to go with the first approach because it seemed more maintainable'
      );

      const shortScore = scorer.score(shortEvent);
      const longScore = scorer.score(longEvent);

      expect(longScore.confidence).toBeGreaterThan(shortScore.confidence);
    });

    it('should have higher confidence with tag matches', () => {
      const noTagEvent = createEvent('Made a decision');
      const tagEvent = createEvent('Made a choice', { tags: ['decision'] });

      const noTagScore = scorer.score(noTagEvent);
      const tagScore = scorer.score(tagEvent);

      expect(tagScore.confidence).toBeGreaterThan(noTagScore.confidence);
    });
  });

  describe('shouldPromote', () => {
    it('should return true when score meets threshold', () => {
      const score = {
        score: 0.8,
        indicators: [LearningIndicator.BREAKTHROUGH],
        reasons: ['Detected breakthrough'],
        confidence: 0.7,
      };

      expect(scorer.shouldPromote(score)).toBe(true);
    });

    it('should return false when score below threshold', () => {
      const score = {
        score: 0.5,
        indicators: [LearningIndicator.QUESTION],
        reasons: ['Detected question'],
        confidence: 0.7,
      };

      expect(scorer.shouldPromote(score)).toBe(false);
    });

    it('should return false when confidence below threshold', () => {
      const score = {
        score: 0.8,
        indicators: [LearningIndicator.BREAKTHROUGH],
        reasons: ['Detected breakthrough'],
        confidence: 0.3,
      };

      expect(scorer.shouldPromote(score)).toBe(false);
    });

    it('should return false when auto-promotion disabled', () => {
      const disabledScorer = new InterestingnessScorer({
        config: { enableAutoPromotion: false },
      });

      const score = {
        score: 0.9,
        indicators: [LearningIndicator.BREAKTHROUGH],
        reasons: ['Detected breakthrough'],
        confidence: 0.9,
      };

      expect(disabledScorer.shouldPromote(score)).toBe(false);
    });
  });

  describe('getHighestWeightedIndicator', () => {
    it('should return undefined for empty list', () => {
      expect(scorer.getHighestWeightedIndicator([])).toBeUndefined();
    });

    it('should return single indicator when only one', () => {
      const indicators = [LearningIndicator.DECISION];
      expect(scorer.getHighestWeightedIndicator(indicators)).toBe(LearningIndicator.DECISION);
    });

    it('should return highest weighted indicator', () => {
      const indicators = [LearningIndicator.QUESTION, LearningIndicator.USER_FEEDBACK];
      // USER_FEEDBACK (0.95) > QUESTION (0.6)
      expect(scorer.getHighestWeightedIndicator(indicators)).toBe(LearningIndicator.USER_FEEDBACK);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const event = createEvent('');
      const score = scorer.score(event);

      expect(score.score).toBe(0);
      expect(score.indicators).toHaveLength(0);
    });

    it('should handle content with only special characters', () => {
      const event = createEvent('!@#$%^&*()');
      const score = scorer.score(event);

      expect(score.score).toBe(0);
      expect(score.indicators).toHaveLength(0);
    });

    it('should handle very long content', () => {
      const longContent = 'discovered pattern '.repeat(100);
      const event = createEvent(longContent);
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.BREAKTHROUGH);
      expect(score.indicators).toContain(LearningIndicator.PATTERN);
    });

    it('should handle null/undefined metadata values', () => {
      const event = createEvent('Test', {
        tags: null,
        learningIndicators: undefined,
      });
      const score = scorer.score(event);

      expect(score).toBeDefined();
    });

    it('should handle non-array tags', () => {
      const event = createEvent('Test', { tags: 'single-tag' });
      const score = scorer.score(event);

      expect(score).toBeDefined();
    });

    it('should be case insensitive for keywords', () => {
      const event = createEvent('DECIDED TO USE TYPESCRIPT');
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.DECISION);
    });

    it('should detect learningIndicators metadata array', () => {
      const event = createEvent('Some event', {
        learningIndicators: ['decision', 'breakthrough'],
      });
      const score = scorer.score(event);

      expect(score.indicators).toContain(LearningIndicator.DECISION);
      expect(score.indicators).toContain(LearningIndicator.BREAKTHROUGH);
    });
  });
});
