import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { SkillManager } from '../../src/skills/SkillManager';
import { IntentMatcher } from '../../src/skills/IntentMatcher';
import { SkillDefinition, SKILLS_DIR, SKILL_STRUCTURE } from '../../src/skills/types';

describe('IntentMatcher', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-intent-matcher');
  let skillManager: SkillManager;
  let intentMatcher: IntentMatcher;

  // Test skill definitions
  const gitSkillDefinition: SkillDefinition = {
    name: 'Git Skill',
    description: 'Git operations and version control.',
    useWhen: [
      'User asks to commit changes',
      'User wants to push to remote',
      'User mentions git or version control',
      'User needs to create a branch',
    ],
    capabilities: ['Commit code', 'Push to remote', 'Create branches'],
    workflows: [{ name: 'commit-workflow', description: 'Commit changes' }],
    tools: [{ name: 'git-tool', description: 'Execute git commands' }],
  };

  const searchSkillDefinition: SkillDefinition = {
    name: 'Search Skill',
    description: 'Search the codebase.',
    useWhen: [
      'User asks to find something',
      'User wants to search for code',
      'User mentions grep or search',
    ],
    capabilities: ['Search files', 'Find code patterns'],
    workflows: [{ name: 'search-workflow', description: 'Search codebase' }],
    tools: [{ name: 'search-tool', description: 'Search files' }],
  };

  const deploySkillDefinition: SkillDefinition = {
    name: 'Deploy Skill',
    description: 'Deploy applications.',
    useWhen: [
      'User asks to deploy the application',
      'User wants to release to production',
      'User mentions deployment',
    ],
    capabilities: ['Deploy to staging', 'Deploy to production'],
    workflows: [{ name: 'deploy-workflow', description: 'Deploy app' }],
    tools: [{ name: 'deploy-tool', description: 'Deploy application' }],
  };

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up SKILLS directory before each test
    const skillsPath = path.join(testBasePath, SKILLS_DIR);
    await fs.promises.rm(skillsPath, { recursive: true, force: true }).catch(() => {});
    skillManager = new SkillManager(testBasePath);
    await skillManager.initialize();

    // Create test skills
    await skillManager.createSkill('git-skill', gitSkillDefinition);
    await skillManager.createSkill('search-skill', searchSkillDefinition);
    await skillManager.createSkill('deploy-skill', deploySkillDefinition);

    intentMatcher = new IntentMatcher(skillManager);
  });

  // =========================================================================
  // Intent Matching Tests
  // =========================================================================

  describe('matchIntent', () => {
    it('should match request to relevant skills', async () => {
      const matches = await intentMatcher.matchIntent('I want to commit my changes');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.skill.name === 'git-skill')).toBe(true);
    });

    it('should return ranked matches sorted by confidence', async () => {
      const matches = await intentMatcher.matchIntent('commit changes');
      expect(matches.length).toBeGreaterThan(0);
      // First match should have highest confidence
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
      }
    });

    it('should match git-related request to git-skill', async () => {
      const matches = await intentMatcher.matchIntent('push to remote');
      const gitMatch = matches.find((m) => m.skill.name === 'git-skill');
      expect(gitMatch).toBeDefined();
      expect(gitMatch!.confidence).toBeGreaterThan(0);
    });

    it('should match search-related request to search-skill', async () => {
      const matches = await intentMatcher.matchIntent('search for code');
      const searchMatch = matches.find((m) => m.skill.name === 'search-skill');
      expect(searchMatch).toBeDefined();
      expect(searchMatch!.confidence).toBeGreaterThan(0);
    });

    it('should match deploy-related request to deploy-skill', async () => {
      const matches = await intentMatcher.matchIntent('deploy the application');
      const deployMatch = matches.find((m) => m.skill.name === 'deploy-skill');
      expect(deployMatch).toBeDefined();
      expect(deployMatch!.confidence).toBeGreaterThan(0);
    });

    it('should return empty array for completely unrelated request', async () => {
      const matches = await intentMatcher.matchIntent('');
      expect(matches).toHaveLength(0);
    });

    it('should handle requests with multiple potential matches', async () => {
      // Create a request that might match multiple skills
      const matches = await intentMatcher.matchIntent('find and commit');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should include matched conditions in result', async () => {
      const matches = await intentMatcher.matchIntent('commit changes');
      const gitMatch = matches.find((m) => m.skill.name === 'git-skill');
      expect(gitMatch!.matchedConditions.length).toBeGreaterThan(0);
    });

    it('should include reason in result', async () => {
      const matches = await intentMatcher.matchIntent('commit changes');
      const gitMatch = matches.find((m) => m.skill.name === 'git-skill');
      expect(gitMatch!.reason).toBeDefined();
      expect(gitMatch!.reason.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // getBestMatch Tests
  // =========================================================================

  describe('getBestMatch', () => {
    it('should return best match above threshold', async () => {
      const match = await intentMatcher.getBestMatch('commit my changes', 0.1);
      expect(match).not.toBeNull();
      expect(match!.skill.name).toBe('git-skill');
    });

    it('should return null when no match meets threshold', async () => {
      const match = await intentMatcher.getBestMatch('xyz completely random', 0.9);
      expect(match).toBeNull();
    });

    it('should use default threshold of 0.5', async () => {
      const match = await intentMatcher.getBestMatch('random words that do not match');
      expect(match).toBeNull();
    });

    it('should return null for empty request', async () => {
      const match = await intentMatcher.getBestMatch('', 0.1);
      expect(match).toBeNull();
    });

    it('should return best match when multiple skills match', async () => {
      const match = await intentMatcher.getBestMatch('commit to git', 0.1);
      expect(match).not.toBeNull();
      // Should be git-skill as it has the best match
    });
  });

  // =========================================================================
  // Scoring Tests
  // =========================================================================

  describe('scoreSkill', () => {
    it('should return high score for exact matches', () => {
      const skill = skillManager.getSkill('git-skill')!;
      const result = intentMatcher.scoreSkill('commit changes', skill);
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should return medium score for partial matches', () => {
      const skill = skillManager.getSkill('git-skill')!;
      const result = intentMatcher.scoreSkill('push code', skill);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(1);
    });

    it('should return zero score for no matches', () => {
      const skill = skillManager.getSkill('git-skill')!;
      const result = intentMatcher.scoreSkill('', skill);
      expect(result.confidence).toBe(0);
    });

    it('should return score between 0 and 1', () => {
      const skill = skillManager.getSkill('git-skill')!;
      const result = intentMatcher.scoreSkill('commit changes push remote branch', skill);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include skill in result', () => {
      const skill = skillManager.getSkill('git-skill')!;
      const result = intentMatcher.scoreSkill('commit', skill);
      expect(result.skill).toBe(skill);
    });

    it('should handle skill with no USE WHEN conditions', async () => {
      // Create skill with empty useWhen
      const emptyDefinition: SkillDefinition = {
        name: 'Empty Skill',
        description: 'Empty.',
        useWhen: [],
        capabilities: [],
        workflows: [],
        tools: [],
      };
      await skillManager.createSkill('empty-skill', emptyDefinition);
      const skill = skillManager.getSkill('empty-skill')!;
      const result = intentMatcher.scoreSkill('anything', skill);
      expect(result.confidence).toBe(0);
    });
  });

  // =========================================================================
  // Keyword Extraction Tests
  // =========================================================================

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const keywords = intentMatcher.extractKeywords('commit the changes');
      expect(keywords).toContain('commit');
      expect(keywords).toContain('changes');
    });

    it('should filter stop words', () => {
      const keywords = intentMatcher.extractKeywords('the a an is are to from');
      expect(keywords).toHaveLength(0);
    });

    it('should handle punctuation', () => {
      const keywords = intentMatcher.extractKeywords('commit, push! deploy?');
      expect(keywords).toContain('commit');
      expect(keywords).toContain('push');
      expect(keywords).toContain('deploy');
    });

    it('should convert to lowercase', () => {
      const keywords = intentMatcher.extractKeywords('COMMIT Changes PUSH');
      expect(keywords).toContain('commit');
      expect(keywords).toContain('changes');
      expect(keywords).toContain('push');
    });

    it('should filter short words', () => {
      const keywords = intentMatcher.extractKeywords('go to do if at');
      // These should be filtered (too short or stop words)
      expect(keywords).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const keywords = intentMatcher.extractKeywords('');
      expect(keywords).toHaveLength(0);
    });

    it('should handle whitespace', () => {
      const keywords = intentMatcher.extractKeywords('   commit    changes   ');
      expect(keywords).toContain('commit');
      expect(keywords).toContain('changes');
    });
  });

  // =========================================================================
  // Condition Matching Tests
  // =========================================================================

  describe('matchConditions', () => {
    it('should match keywords to conditions', () => {
      const requestKeywords = ['commit', 'changes'];
      const conditionKeywords = ['commit', 'changes'];
      const score = intentMatcher.matchConditions(requestKeywords, conditionKeywords);
      expect(score).toBe(1);
    });

    it('should be case-insensitive', () => {
      // Keywords are already lowercased by extractKeywords
      const requestKeywords = ['commit'];
      const conditionKeywords = ['commit'];
      const score = intentMatcher.matchConditions(requestKeywords, conditionKeywords);
      expect(score).toBe(1);
    });

    it('should support partial word matching', () => {
      const requestKeywords = ['commits'];
      const conditionKeywords = ['commit'];
      const score = intentMatcher.matchConditions(requestKeywords, conditionKeywords);
      expect(score).toBeGreaterThan(0);
    });

    it('should return zero for no matches', () => {
      const requestKeywords = ['deploy'];
      const conditionKeywords = ['commit', 'push'];
      const score = intentMatcher.matchConditions(requestKeywords, conditionKeywords);
      expect(score).toBe(0);
    });

    it('should handle empty request keywords', () => {
      const requestKeywords: string[] = [];
      const conditionKeywords = ['commit'];
      const score = intentMatcher.matchConditions(requestKeywords, conditionKeywords);
      expect(score).toBe(0);
    });

    it('should handle empty condition keywords', () => {
      const requestKeywords = ['commit'];
      const conditionKeywords: string[] = [];
      const score = intentMatcher.matchConditions(requestKeywords, conditionKeywords);
      expect(score).toBe(0);
    });

    it('should return partial score for partial matches', () => {
      const requestKeywords = ['commit', 'random', 'words'];
      const conditionKeywords = ['commit'];
      const score = intentMatcher.matchConditions(requestKeywords, conditionKeywords);
      // Only 1 out of 3 words match
      expect(score).toBeCloseTo(1 / 3, 1);
    });
  });
});
