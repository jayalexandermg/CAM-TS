/**
 * Tests for RelevanceScorer extension methods (for two-layer hydration)
 */
import { RelevanceScorer } from '../../src/context/relevance-scorer';
import { ScoredContext } from '../../src/context/preprompt-hydrator-types';

describe('RelevanceScorer Extensions', () => {
  let scorer: RelevanceScorer;

  beforeEach(() => {
    scorer = new RelevanceScorer();
  });

  // =========================================================================
  // scoreContext Tests
  // =========================================================================

  describe('scoreContext', () => {
    it('should return 0 for empty context', () => {
      expect(scorer.scoreContext('', 'test query')).toBe(0);
    });

    it('should return 0 for empty query', () => {
      expect(scorer.scoreContext('some context', '')).toBe(0);
    });

    it('should return 0 for null/undefined inputs', () => {
      expect(scorer.scoreContext(null as unknown as string, 'query')).toBe(0);
      expect(scorer.scoreContext('context', null as unknown as string)).toBe(0);
    });

    it('should score based on keyword overlap', () => {
      const context = 'This is a context about TypeScript programming and testing';
      const query = 'TypeScript testing';
      const score = scorer.scoreContext(context, query);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return higher score for more keyword matches', () => {
      const context = 'TypeScript programming with Jest testing framework and React components';
      const queryFew = 'Python Django'; // No matches
      const queryMore = 'TypeScript Jest testing'; // Multiple matches
      const scoreFew = scorer.scoreContext(context, queryFew);
      const scoreMore = scorer.scoreContext(context, queryMore);
      expect(scoreMore).toBeGreaterThan(scoreFew);
    });

    it('should be case insensitive', () => {
      const context = 'TYPESCRIPT programming';
      const query = 'typescript';
      const score = scorer.scoreContext(context, query);
      expect(score).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // rankContexts Tests
  // =========================================================================

  describe('rankContexts', () => {
    it('should return empty array for empty input', () => {
      expect(scorer.rankContexts([], 'query')).toEqual([]);
    });

    it('should handle single context', () => {
      const contexts = ['TypeScript programming'];
      const result = scorer.rankContexts(contexts, 'TypeScript');
      expect(result).toHaveLength(1);
      expect(result[0].context).toBe('TypeScript programming');
      expect(result[0].score).toBeGreaterThan(0);
    });

    it('should rank contexts by score descending', () => {
      const contexts = [
        'JavaScript basics', // Lower match
        'TypeScript programming with advanced features', // Higher match
        'TypeScript and JavaScript comparison', // Medium match
      ];
      const result = scorer.rankContexts(contexts, 'TypeScript advanced');

      // Should be sorted by score descending
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
      }
    });

    it('should handle contexts with equal scores', () => {
      const contexts = ['hello world', 'hello world'];
      const result = scorer.rankContexts(contexts, 'hello');
      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(result[1].score);
    });

    it('should include all contexts in result', () => {
      const contexts = ['context1', 'context2', 'context3'];
      const result = scorer.rankContexts(contexts, 'irrelevant');
      expect(result).toHaveLength(3);
    });

    it('should return ScoredContext objects', () => {
      const contexts = ['test context'];
      const result = scorer.rankContexts(contexts, 'test');
      expect(result[0]).toHaveProperty('context');
      expect(result[0]).toHaveProperty('score');
      expect(typeof result[0].context).toBe('string');
      expect(typeof result[0].score).toBe('number');
    });
  });

  // =========================================================================
  // filterByScore Tests
  // =========================================================================

  describe('filterByScore', () => {
    it('should filter contexts below threshold', () => {
      const contexts: ScoredContext[] = [
        { context: 'high relevance', score: 0.8 },
        { context: 'low relevance', score: 0.1 },
        { context: 'medium relevance', score: 0.5 },
      ];
      const result = scorer.filterByScore(contexts, 0.4);
      expect(result).toHaveLength(2);
      expect(result).toContain('high relevance');
      expect(result).toContain('medium relevance');
      expect(result).not.toContain('low relevance');
    });

    it('should use default threshold of 0.3', () => {
      const contexts: ScoredContext[] = [
        { context: 'high', score: 0.5 },
        { context: 'low', score: 0.2 },
        { context: 'at threshold', score: 0.3 },
      ];
      const result = scorer.filterByScore(contexts);
      expect(result).toHaveLength(2);
      expect(result).toContain('high');
      expect(result).toContain('at threshold');
      expect(result).not.toContain('low');
    });

    it('should return all contexts if all above threshold', () => {
      const contexts: ScoredContext[] = [
        { context: 'a', score: 0.9 },
        { context: 'b', score: 0.8 },
        { context: 'c', score: 0.7 },
      ];
      const result = scorer.filterByScore(contexts, 0.5);
      expect(result).toHaveLength(3);
    });

    it('should return empty array if all below threshold', () => {
      const contexts: ScoredContext[] = [
        { context: 'a', score: 0.1 },
        { context: 'b', score: 0.2 },
      ];
      const result = scorer.filterByScore(contexts, 0.5);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      expect(scorer.filterByScore([])).toEqual([]);
    });

    it('should include contexts exactly at threshold', () => {
      const contexts: ScoredContext[] = [{ context: 'at threshold', score: 0.3 }];
      const result = scorer.filterByScore(contexts, 0.3);
      expect(result).toHaveLength(1);
    });
  });
});
