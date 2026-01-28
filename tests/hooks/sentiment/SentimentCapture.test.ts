import * as fs from 'fs/promises';
import { ExplicitRatingCapture } from '../../../src/hooks/sentiment/ExplicitRatingCapture.hook';
import { ImplicitSentimentCapture } from '../../../src/hooks/sentiment/ImplicitSentimentCapture.hook';
import {
  ExplicitRating,
  ImplicitSentiment,
  SentimentData,
} from '../../../src/hooks/sentiment/types';

jest.mock('fs/promises');

const mockedFs = jest.mocked(fs);

describe('ExplicitRatingCapture', () => {
  let capture: ExplicitRatingCapture;
  const testStoragePath = './test-data/ratings.jsonl';

  beforeEach(() => {
    capture = new ExplicitRatingCapture(testStoragePath);
    jest.clearAllMocks();
  });

  describe('capture()', () => {
    it('should capture X/10 format', () => {
      const result = capture.capture('I give this 8/10');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(8);
      expect(result?.original).toBe('I give this 8/10');
    });

    it('should capture X / 10 format with spaces', () => {
      const result = capture.capture('Rating: 7 / 10');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(7);
    });

    it('should capture "X out of 10" format', () => {
      const result = capture.capture('I rate this 9 out of 10');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(9);
    });

    it('should capture "rate this X" format', () => {
      const result = capture.capture('I rate this 6');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(6);
    });

    it('should capture "rate X" format', () => {
      const result = capture.capture('I rate 5');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(5);
    });

    it('should capture "X stars" format', () => {
      const result = capture.capture('5 stars!');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(5);
    });

    it('should capture "X star" singular format', () => {
      const result = capture.capture('1 star');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(1);
    });

    it('should capture "score: X" format', () => {
      const result = capture.capture('My score: 8');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(8);
    });

    it('should capture "score X" format without colon', () => {
      const result = capture.capture('score 7');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(7);
    });

    it('should capture "rating: X" format', () => {
      const result = capture.capture('rating: 10');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(10);
    });

    it('should return null for ratings outside 1-10 range', () => {
      expect(capture.capture('I give this 0/10')).toBeNull();
      expect(capture.capture('I give this 11/10')).toBeNull();
      expect(capture.capture('15 stars')).toBeNull();
    });

    it('should return null when no rating pattern found', () => {
      const result = capture.capture('This was great!');
      expect(result).toBeNull();
    });

    it('should infer targetType as session when text contains "session"', () => {
      const result = capture.capture('This session was 8/10');
      expect(result?.targetType).toBe('session');
    });

    it('should infer targetType as agent when text contains "agent"', () => {
      const result = capture.capture('The agent gets 9/10');
      expect(result?.targetType).toBe('agent');
    });

    it('should infer targetType as skill when text contains "skill"', () => {
      const result = capture.capture('This skill deserves 7/10');
      expect(result?.targetType).toBe('skill');
    });

    it('should default targetType to response', () => {
      const result = capture.capture('8/10');
      expect(result?.targetType).toBe('response');
    });

    it('should include timestamp in captured rating', () => {
      const before = new Date();
      const result = capture.capture('8/10');
      const after = new Date();

      expect(result?.timestamp).toBeDefined();
      expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(result?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('store()', () => {
    it('should create directory and append rating to file', async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.appendFile.mockResolvedValue(undefined);

      const rating: ExplicitRating = {
        value: 8,
        original: '8/10',
        targetType: 'response',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      await capture.store(rating);

      expect(mockedFs.mkdir).toHaveBeenCalledWith('./test-data', {
        recursive: true,
      });
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        testStoragePath,
        JSON.stringify(rating) + '\n'
      );
    });
  });

  describe('getAll()', () => {
    it('should return all stored ratings', async () => {
      const ratings = [
        {
          value: 8,
          original: '8/10',
          targetType: 'response',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          value: 9,
          original: '9/10',
          targetType: 'agent',
          timestamp: '2024-01-15T11:00:00Z',
        },
      ];
      mockedFs.readFile.mockResolvedValue(
        ratings.map((r) => JSON.stringify(r)).join('\n')
      );

      const result = await capture.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(8);
      expect(result[1].value).toBe(9);
    });

    it('should return empty array when file does not exist', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await capture.getAll();

      expect(result).toEqual([]);
    });

    it('should handle empty lines in file', async () => {
      const content = '{"value":8}\n\n{"value":9}\n';
      mockedFs.readFile.mockResolvedValue(content);

      const result = await capture.getAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('getAverage()', () => {
    it('should calculate average of all ratings', async () => {
      const ratings = [
        {
          value: 8,
          original: '8/10',
          targetType: 'response',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          value: 6,
          original: '6/10',
          targetType: 'response',
          timestamp: '2024-01-15T11:00:00Z',
        },
        {
          value: 10,
          original: '10/10',
          targetType: 'response',
          timestamp: '2024-01-15T12:00:00Z',
        },
      ];
      mockedFs.readFile.mockResolvedValue(
        ratings.map((r) => JSON.stringify(r)).join('\n')
      );

      const average = await capture.getAverage();

      expect(average).toBe(8); // (8 + 6 + 10) / 3
    });

    it('should return 0 when no ratings exist', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const average = await capture.getAverage();

      expect(average).toBe(0);
    });
  });
});

describe('ImplicitSentimentCapture', () => {
  let capture: ImplicitSentimentCapture;
  const testStoragePath = './test-data/sentiment.jsonl';

  beforeEach(() => {
    capture = new ImplicitSentimentCapture(testStoragePath);
    jest.clearAllMocks();
  });

  describe('analyze()', () => {
    it('should detect positive sentiment from positive words', () => {
      const result = capture.analyze('This is great and awesome!');

      expect(result.score).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.indicators).toContain('great');
      expect(result.indicators).toContain('awesome');
    });

    it('should detect negative sentiment from negative words', () => {
      const result = capture.analyze('This is terrible and broken');

      expect(result.score).toBeLessThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.indicators).toContain('[-]terrible');
      expect(result.indicators).toContain('[-]broken');
    });

    it('should return neutral score for mixed sentiment', () => {
      const result = capture.analyze('This is great but also broken');

      expect(result.indicators).toContain('great');
      expect(result.indicators).toContain('[-]broken');
      // Score should be 0 since 1 positive - 1 negative = 0
      expect(result.score).toBe(0);
    });

    it('should return zero score and confidence for neutral text', () => {
      const result = capture.analyze('The weather is cloudy today');

      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.indicators).toHaveLength(0);
    });

    it('should detect "thank you" as positive', () => {
      const result = capture.analyze('Thank you so much!');

      expect(result.score).toBeGreaterThan(0);
      expect(result.indicators).toContain('thank you');
    });

    it('should detect "thanks" as positive', () => {
      const result = capture.analyze('Thanks for your help');

      expect(result.score).toBeGreaterThan(0);
      expect(result.indicators).toContain('thanks');
    });

    it('should detect emoji sentiment 👍', () => {
      const result = capture.analyze('Good job! 👍');

      expect(result.indicators).toContain('👍');
    });

    it('should detect emoji sentiment 👎', () => {
      const result = capture.analyze('Not happy 👎');

      expect(result.indicators).toContain('[-]👎');
    });

    it('should detect "doesn\'t work" as negative', () => {
      const result = capture.analyze("This doesn't work at all");

      expect(result.score).toBeLessThan(0);
      expect(result.indicators).toContain("[-]doesn't work");
    });

    it('should detect "not working" as negative', () => {
      const result = capture.analyze('The feature is not working');

      expect(result.score).toBeLessThan(0);
      expect(result.indicators).toContain('[-]not working');
    });

    it('should be case insensitive', () => {
      const result = capture.analyze('GREAT and AWESOME');

      expect(result.indicators).toContain('great');
      expect(result.indicators).toContain('awesome');
    });

    it('should cap confidence at 1.0', () => {
      const result = capture.analyze(
        'great awesome perfect excellent amazing love fantastic wonderful brilliant superb'
      );

      expect(result.confidence).toBe(1);
    });

    it('should include original text in result', () => {
      const text = 'This is awesome!';
      const result = capture.analyze(text);

      expect(result.text).toBe(text);
    });

    it('should include timestamp in result', () => {
      const before = new Date();
      const result = capture.analyze('Great!');
      const after = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should calculate correct score with multiple indicators', () => {
      // 3 positive, 1 negative = (3-1)/4 = 0.5
      const result = capture.analyze('great awesome perfect but broken');

      expect(result.score).toBe(0.5);
    });
  });

  describe('store()', () => {
    it('should store sentiment with sufficient confidence', async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.appendFile.mockResolvedValue(undefined);

      const sentiment: ImplicitSentiment = {
        score: 1,
        confidence: 0.4,
        indicators: ['great', 'awesome'],
        text: 'This is great and awesome!',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      await capture.store(sentiment);

      expect(mockedFs.mkdir).toHaveBeenCalledWith('./test-data', {
        recursive: true,
      });
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        testStoragePath,
        JSON.stringify(sentiment) + '\n'
      );
    });

    it('should not store low-confidence sentiment', async () => {
      const sentiment: ImplicitSentiment = {
        score: 0,
        confidence: 0.1,
        indicators: [],
        text: 'neutral text',
        timestamp: new Date(),
      };

      await capture.store(sentiment);

      expect(mockedFs.mkdir).not.toHaveBeenCalled();
      expect(mockedFs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('getTrend()', () => {
    it('should calculate average and detect improving trend', async () => {
      const sentiments = [
        {
          score: -0.5,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          score: -0.3,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T11:00:00Z',
        },
        {
          score: 0.3,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T12:00:00Z',
        },
        {
          score: 0.5,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T13:00:00Z',
        },
      ];
      mockedFs.readFile.mockResolvedValue(
        sentiments.map((s) => JSON.stringify(s)).join('\n')
      );

      const result = await capture.getTrend();

      expect(result.trend).toBe('improving');
    });

    it('should detect declining trend', async () => {
      const sentiments = [
        {
          score: 0.5,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          score: 0.3,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T11:00:00Z',
        },
        {
          score: -0.3,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T12:00:00Z',
        },
        {
          score: -0.5,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T13:00:00Z',
        },
      ];
      mockedFs.readFile.mockResolvedValue(
        sentiments.map((s) => JSON.stringify(s)).join('\n')
      );

      const result = await capture.getTrend();

      expect(result.trend).toBe('declining');
    });

    it('should detect stable trend', async () => {
      const sentiments = [
        {
          score: 0.5,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          score: 0.4,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T11:00:00Z',
        },
        {
          score: 0.5,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T12:00:00Z',
        },
        {
          score: 0.45,
          confidence: 0.4,
          indicators: [],
          text: '',
          timestamp: '2024-01-15T13:00:00Z',
        },
      ];
      mockedFs.readFile.mockResolvedValue(
        sentiments.map((s) => JSON.stringify(s)).join('\n')
      );

      const result = await capture.getTrend();

      expect(result.trend).toBe('stable');
    });

    it('should return stable trend when file does not exist', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await capture.getTrend();

      expect(result.average).toBe(0);
      expect(result.trend).toBe('stable');
    });

    it('should return stable trend when fewer than 2 sentiments', async () => {
      mockedFs.readFile.mockResolvedValue(
        JSON.stringify({ score: 0.5, confidence: 0.4 })
      );

      const result = await capture.getTrend();

      expect(result.trend).toBe('stable');
    });

    it('should respect limit parameter', async () => {
      const sentiments = Array.from({ length: 200 }, (_, i) => ({
        score: i < 100 ? -0.5 : 0.5,
        confidence: 0.4,
        indicators: [],
        text: '',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
      }));
      mockedFs.readFile.mockResolvedValue(
        sentiments.map((s) => JSON.stringify(s)).join('\n')
      );

      // With limit=50, should only look at last 50 (all positive)
      const result = await capture.getTrend(50);

      expect(result.average).toBe(0.5);
    });
  });
});

describe('Type definitions', () => {
  it('should allow creating ExplicitRating with required fields', () => {
    const rating: ExplicitRating = {
      value: 8,
      original: '8/10',
      targetType: 'response',
      timestamp: new Date(),
    };

    expect(rating.value).toBe(8);
  });

  it('should allow creating ExplicitRating with optional fields', () => {
    const rating: ExplicitRating = {
      value: 8,
      original: '8/10',
      targetType: 'agent',
      targetId: 'agent-123',
      comment: 'Very helpful',
      timestamp: new Date(),
    };

    expect(rating.targetId).toBe('agent-123');
    expect(rating.comment).toBe('Very helpful');
  });

  it('should allow creating ImplicitSentiment', () => {
    const sentiment: ImplicitSentiment = {
      score: 0.5,
      confidence: 0.8,
      indicators: ['great', 'awesome'],
      text: 'This is great and awesome!',
      timestamp: new Date(),
    };

    expect(sentiment.score).toBe(0.5);
    expect(sentiment.confidence).toBe(0.8);
  });

  it('should allow creating SentimentData', () => {
    const data: SentimentData = {
      explicit: [],
      implicit: [],
      averageExplicit: 7.5,
      averageImplicit: 0.3,
      totalRatings: 10,
    };

    expect(data.averageExplicit).toBe(7.5);
    expect(data.totalRatings).toBe(10);
  });
});
