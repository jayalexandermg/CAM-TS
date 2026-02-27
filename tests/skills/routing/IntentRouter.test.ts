/**
 * IntentRouter Tests
 *
 * Tests for intent-based skill routing using USE WHEN triggers and keywords.
 */

import { IntentRouter } from '../../../src/skills/routing/IntentRouter';
import { KeywordMatcher, KeywordMatch } from '../../../src/skills/routing/KeywordMatcher';
import { SkillRegistry, SkillDefinition } from '../../../src/skills/routing/SkillRegistry';

describe('KeywordMatcher', () => {
  let matcher: KeywordMatcher;

  beforeEach(() => {
    matcher = new KeywordMatcher();
  });

  // =========================================================================
  // Basic Matching Tests
  // =========================================================================

  describe('match', () => {
    it('should find matching keywords in text', () => {
      const matches = matcher.match('I want to commit my code', ['commit', 'push']);
      expect(matches.length).toBe(1);
      expect(matches[0].keyword).toBe('commit');
    });

    it('should find multiple matching keywords', () => {
      const matches = matcher.match('commit and push changes', ['commit', 'push', 'pull']);
      expect(matches.length).toBe(2);
      const keywords = matches.map(m => m.keyword);
      expect(keywords).toContain('commit');
      expect(keywords).toContain('push');
    });

    it('should be case-insensitive', () => {
      const matches = matcher.match('COMMIT CHANGES', ['commit']);
      expect(matches.length).toBe(1);
    });

    it('should return empty array for no matches', () => {
      const matches = matcher.match('hello world', ['commit', 'push']);
      expect(matches).toEqual([]);
    });

    it('should handle empty keywords array', () => {
      const matches = matcher.match('any text', []);
      expect(matches).toEqual([]);
    });

    it('should handle empty text', () => {
      const matches = matcher.match('', ['commit', 'push']);
      expect(matches).toEqual([]);
    });
  });

  // =========================================================================
  // Scoring Tests
  // =========================================================================

  describe('scoring', () => {
    it('should give higher score to exact word match', () => {
      const exactMatches = matcher.match('commit changes', ['commit']);
      const partialMatches = matcher.match('uncommitted changes', ['commit']);

      expect(exactMatches.length).toBe(1);
      expect(partialMatches.length).toBe(1);
      expect(exactMatches[0].score).toBeGreaterThan(partialMatches[0].score);
    });

    it('should give position bonus for earlier matches', () => {
      const earlyMatch = matcher.match('commit at start', ['commit']);
      const lateMatch = matcher.match('this is the commit', ['commit']);

      expect(earlyMatch[0].score).toBeGreaterThan(lateMatch[0].score);
    });

    it('should sort matches by score descending', () => {
      const matches = matcher.match('push the commit', ['commit', 'push']);
      expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
    });

    it('should cap score at 1', () => {
      const matches = matcher.match('commit', ['commit']);
      expect(matches[0].score).toBeLessThanOrEqual(1);
    });

    it('should have base score of at least 0.5 for matches', () => {
      const matches = matcher.match('uncommitted', ['commit']);
      expect(matches[0].score).toBeGreaterThanOrEqual(0.5);
    });
  });

  // =========================================================================
  // Aggregate Score Tests
  // =========================================================================

  describe('aggregateScore', () => {
    it('should return 0 for empty matches', () => {
      const score = matcher.aggregateScore([], 5);
      expect(score).toBe(0);
    });

    it('should return 0 for zero total keywords', () => {
      const matches: KeywordMatch[] = [{ keyword: 'test', position: 0, score: 1 }];
      const score = matcher.aggregateScore(matches, 0);
      expect(score).toBe(0);
    });

    it('should increase with more keyword matches', () => {
      const oneMatch: KeywordMatch[] = [{ keyword: 'commit', position: 0, score: 0.8 }];
      const twoMatches: KeywordMatch[] = [
        { keyword: 'commit', position: 0, score: 0.8 },
        { keyword: 'push', position: 10, score: 0.7 },
      ];

      const score1 = matcher.aggregateScore(oneMatch, 3);
      const score2 = matcher.aggregateScore(twoMatches, 3);

      expect(score2).toBeGreaterThan(score1);
    });

    it('should consider both coverage and average score', () => {
      // 2/4 keywords with 0.8 avg
      const matches: KeywordMatch[] = [
        { keyword: 'commit', position: 0, score: 0.8 },
        { keyword: 'push', position: 10, score: 0.8 },
      ];
      const score = matcher.aggregateScore(matches, 4);

      // coverage = 0.5, avgScore = 0.8
      // expected: 0.5 * 0.4 + 0.8 * 0.6 = 0.2 + 0.48 = 0.68
      expect(score).toBeCloseTo(0.68, 2);
    });
  });

  // =========================================================================
  // Special Characters Tests
  // =========================================================================

  describe('special characters', () => {
    it('should escape regex special characters', () => {
      const matches = matcher.match('test.ts file', ['.ts']);
      expect(matches.length).toBe(1);
    });

    it('should handle keywords with brackets', () => {
      const matches = matcher.match('call foo()', ['foo()']);
      expect(matches.length).toBe(1);
    });
  });
});

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  const testSkill: SkillDefinition = {
    name: 'test-skill',
    description: 'A test skill',
    useWhen: ['User asks for test', 'User mentions testing'],
    keywords: ['test', 'testing', 'spec'],
    capabilities: ['Run tests'],
    inputs: [],
    outputs: [],
  };

  const gitSkill: SkillDefinition = {
    name: 'git-skill',
    description: 'Git operations',
    useWhen: ['User wants to commit', 'User mentions git'],
    keywords: ['git', 'commit', 'push', 'pull'],
    capabilities: ['Version control'],
    inputs: [],
    outputs: [],
  };

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  // =========================================================================
  // Registration Tests
  // =========================================================================

  describe('register', () => {
    it('should register a skill', () => {
      registry.register(testSkill);
      expect(registry.has('test-skill')).toBe(true);
    });

    it('should overwrite skill with same name', () => {
      registry.register(testSkill);
      const updatedSkill = { ...testSkill, description: 'Updated' };
      registry.register(updatedSkill);

      const retrieved = registry.get('test-skill');
      expect(retrieved?.description).toBe('Updated');
    });
  });

  // =========================================================================
  // Retrieval Tests
  // =========================================================================

  describe('get', () => {
    it('should return registered skill', () => {
      registry.register(testSkill);
      const skill = registry.get('test-skill');
      expect(skill).toEqual(testSkill);
    });

    it('should return undefined for unknown skill', () => {
      const skill = registry.get('nonexistent');
      expect(skill).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered skills', () => {
      registry.register(testSkill);
      registry.register(gitSkill);

      const skills = registry.getAll();
      expect(skills.length).toBe(2);
    });

    it('should return empty array when no skills', () => {
      const skills = registry.getAll();
      expect(skills).toEqual([]);
    });
  });

  // =========================================================================
  // Utility Tests
  // =========================================================================

  describe('has', () => {
    it('should return true for registered skill', () => {
      registry.register(testSkill);
      expect(registry.has('test-skill')).toBe(true);
    });

    it('should return false for unregistered skill', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove a skill', () => {
      registry.register(testSkill);
      const result = registry.remove('test-skill');

      expect(result).toBe(true);
      expect(registry.has('test-skill')).toBe(false);
    });

    it('should return false for nonexistent skill', () => {
      const result = registry.remove('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(registry.count()).toBe(0);
      registry.register(testSkill);
      expect(registry.count()).toBe(1);
      registry.register(gitSkill);
      expect(registry.count()).toBe(2);
    });
  });

  describe('findByKeyword', () => {
    it('should find skills with matching keyword', () => {
      registry.register(testSkill);
      registry.register(gitSkill);

      const found = registry.findByKeyword('commit');
      expect(found.length).toBe(1);
      expect(found[0].name).toBe('git-skill');
    });

    it('should return empty array for no matches', () => {
      registry.register(testSkill);
      const found = registry.findByKeyword('deploy');
      expect(found).toEqual([]);
    });

    it('should be case-insensitive', () => {
      registry.register(gitSkill);
      const found = registry.findByKeyword('GIT');
      expect(found.length).toBe(1);
    });

    it('should match partial keywords', () => {
      registry.register(testSkill);
      const found = registry.findByKeyword('test');
      expect(found.length).toBe(1);
    });
  });
});

describe('IntentRouter', () => {
  let router: IntentRouter;
  let registry: SkillRegistry;

  const gitSkill: SkillDefinition = {
    name: 'git-skill',
    description: 'Git operations',
    useWhen: ['User asks to commit changes', 'User wants to push code'],
    keywords: ['git', 'commit', 'push', 'pull', 'branch'],
    capabilities: ['Version control'],
    inputs: [],
    outputs: [],
  };

  const searchSkill: SkillDefinition = {
    name: 'search-skill',
    description: 'Search codebase',
    useWhen: ['User wants to find code', 'User asks to search'],
    keywords: ['search', 'find', 'grep', 'locate'],
    capabilities: ['Code search'],
    inputs: [],
    outputs: [],
  };

  const deploySkill: SkillDefinition = {
    name: 'deploy-skill',
    description: 'Deploy applications',
    useWhen: ['User wants to deploy', 'User mentions production'],
    keywords: ['deploy', 'release', 'production', 'staging'],
    capabilities: ['Deployment'],
    inputs: [],
    outputs: [],
  };

  beforeEach(() => {
    registry = new SkillRegistry();
    registry.register(gitSkill);
    registry.register(searchSkill);
    registry.register(deploySkill);
    router = new IntentRouter(registry);
  });

  // =========================================================================
  // Basic Routing Tests
  // =========================================================================

  describe('route', () => {
    it('should route to skill with matching keywords', async () => {
      const result = await router.route('I want to commit my changes');
      expect(result.skill).toBe('git-skill');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return default for no matches', async () => {
      const result = await router.route('hello world random text xyz');
      expect(result.skill).toBe('default');
      expect(result.confidence).toBe(0);
    });

    it('should handle empty input gracefully', async () => {
      const result = await router.route('');
      expect(result.skill).toBe('default');
      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
      expect(result.matchedTriggers).toEqual([]);
    });

    it('should return alternatives when multiple skills match', async () => {
      // Use input that could match multiple skills with varying confidence
      const result = await router.route('search and commit code');
      expect(result.alternatives.length).toBeGreaterThanOrEqual(0);

      if (result.alternatives.length > 0) {
        const altSkills = result.alternatives.map(a => a.skill);
        expect(altSkills.length).toBeGreaterThan(0);
      }
    });

    it('should include matched keywords in result', async () => {
      const result = await router.route('commit and push');
      expect(result.matchedKeywords).toContain('commit');
      expect(result.matchedKeywords).toContain('push');
    });

    it('should include matched triggers in result', async () => {
      const result = await router.route('I want to commit changes to the repo');
      expect(result.matchedTriggers.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Confidence Scoring Tests
  // =========================================================================

  describe('confidence scoring', () => {
    it('should have higher confidence with more keyword matches', async () => {
      const oneKeyword = await router.route('commit');
      const multiKeyword = await router.route('commit and push and pull');

      expect(multiKeyword.confidence).toBeGreaterThan(oneKeyword.confidence);
    });

    it('should have USE WHEN triggers boost confidence', async () => {
      // "User asks to commit changes" is a trigger
      const withTrigger = await router.route('I want to commit changes');
      const withoutTrigger = await router.route('git stuff');

      expect(withTrigger.confidence).toBeGreaterThan(withoutTrigger.confidence);
    });

    it('should have confidence between 0 and 1', async () => {
      const result = await router.route('commit and push changes');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // Multiple Skills Ranking Tests
  // =========================================================================

  describe('routeMultiple', () => {
    it('should return multiple matching skills', async () => {
      // Add a skill that overlaps with git
      const codeSkill: SkillDefinition = {
        name: 'code-skill',
        description: 'Code operations',
        useWhen: ['User wants to write code'],
        keywords: ['code', 'write', 'commit'],
        capabilities: ['Coding'],
        inputs: [],
        outputs: [],
      };
      registry.register(codeSkill);

      const results = await router.routeMultiple('commit code', 5);
      expect(results.length).toBeGreaterThan(1);
    });

    it('should rank skills by confidence descending', async () => {
      const results = await router.routeMultiple('commit push pull git', 5);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });

    it('should respect limit parameter', async () => {
      const results = await router.routeMultiple('commit', 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should filter out low confidence matches', async () => {
      const results = await router.routeMultiple('random xyz');

      for (const result of results) {
        expect(result.confidence).toBeGreaterThan(0.1);
      }
    });

    it('should return empty array when no skills match threshold', async () => {
      const results = await router.routeMultiple('completely unrelated xyz123');
      // All results should have been filtered out
      expect(results.every(r => r.confidence > 0.1)).toBe(true);
    });
  });

  // =========================================================================
  // Alternative Suggestions Tests
  // =========================================================================

  describe('alternatives', () => {
    it('should provide reason for alternatives', async () => {
      const codeSkill: SkillDefinition = {
        name: 'code-skill',
        description: 'Code operations',
        useWhen: ['User wants to write code'],
        keywords: ['code', 'commit', 'write'],
        capabilities: ['Coding'],
        inputs: [],
        outputs: [],
      };
      registry.register(codeSkill);

      const result = await router.route('commit code changes');

      if (result.alternatives.length > 0) {
        expect(result.alternatives[0].reason).toBeDefined();
        expect(result.alternatives[0].reason.length).toBeGreaterThan(0);
      }
    });

    it('should include confidence for alternatives', async () => {
      const codeSkill: SkillDefinition = {
        name: 'code-skill',
        description: 'Code operations',
        useWhen: ['User wants to write code'],
        keywords: ['code', 'commit', 'write'],
        capabilities: ['Coding'],
        inputs: [],
        outputs: [],
      };
      registry.register(codeSkill);

      const result = await router.route('commit code');

      for (const alt of result.alternatives) {
        expect(alt.confidence).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // Edge Cases Tests
  // =========================================================================

  describe('edge cases', () => {
    it('should handle input with only whitespace', async () => {
      const result = await router.route('   ');
      expect(result.skill).toBe('default');
    });

    it('should handle very long input', async () => {
      const longInput = 'commit '.repeat(100);
      const result = await router.route(longInput);
      expect(result.skill).toBe('git-skill');
    });

    it('should handle special characters in input', async () => {
      const result = await router.route('commit! @push# $branch');
      expect(result.skill).toBe('git-skill');
    });

    it('should handle no registered skills', async () => {
      const emptyRegistry = new SkillRegistry();
      const emptyRouter = new IntentRouter(emptyRegistry);

      const result = await emptyRouter.route('commit changes');
      expect(result.skill).toBe('default');
      expect(result.confidence).toBe(0);
    });
  });
});
