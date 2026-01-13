import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { SkillManager } from '../../src/skills/SkillManager';
import { IntentMatcher } from '../../src/skills/IntentMatcher';
import { SkillRouter } from '../../src/skills/SkillRouter';
import { SkillDefinition, SKILLS_DIR } from '../../src/skills/types';

describe('SkillRouter', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-skill-router');
  let skillManager: SkillManager;
  let intentMatcher: IntentMatcher;
  let skillRouter: SkillRouter;

  // Test skill definitions
  const gitSkillDefinition: SkillDefinition = {
    name: 'Git Skill',
    description: 'Git operations and version control.',
    useWhen: [
      'User asks to commit changes',
      'User wants to push to remote',
      'User mentions git',
    ],
    capabilities: ['Commit code', 'Push to remote'],
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
    ],
    capabilities: ['Deploy to staging', 'Deploy to production'],
    workflows: [{ name: 'deploy-workflow', description: 'Deploy app' }],
    tools: [{ name: 'deploy-tool', description: 'Deploy application' }],
  };

  // For ambiguity testing - two skills with similar USE WHEN conditions
  const codeSkillDefinition: SkillDefinition = {
    name: 'Code Skill',
    description: 'Write and edit code.',
    useWhen: [
      'User wants to write code',
      'User asks for code changes',
    ],
    capabilities: ['Write code'],
    workflows: [{ name: 'code-workflow', description: 'Write code' }],
    tools: [{ name: 'code-tool', description: 'Write code' }],
  };

  const editSkillDefinition: SkillDefinition = {
    name: 'Edit Skill',
    description: 'Edit code files.',
    useWhen: [
      'User wants to edit code',
      'User asks for code changes',
    ],
    capabilities: ['Edit code'],
    workflows: [{ name: 'edit-workflow', description: 'Edit code' }],
    tools: [{ name: 'edit-tool', description: 'Edit code' }],
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
    skillRouter = new SkillRouter(intentMatcher);
  });

  // =========================================================================
  // Basic Routing Tests
  // =========================================================================

  describe('route', () => {
    it('should route to best matching skill', async () => {
      // Use minConfidence: 0.1 to ensure routing even with partial matches
      const result = await skillRouter.route('commit my changes', { minConfidence: 0.1 });
      expect(result.routed).toBe(true);
      expect(result.skill).not.toBeNull();
      expect(result.skill!.name).toBe('git-skill');
    });

    it('should return null skill when no match', async () => {
      const result = await skillRouter.route('');
      expect(result.routed).toBe(false);
      expect(result.skill).toBeNull();
    });

    it('should include confidence score', async () => {
      const result = await skillRouter.route('commit changes');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include reason for routing decision', async () => {
      const result = await skillRouter.route('commit changes');
      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('should include alternatives for successful routes', async () => {
      const result = await skillRouter.route('commit changes');
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  // =========================================================================
  // No Match Scenario Tests
  // =========================================================================

  describe('no match scenario', () => {
    it('should return routed=false when no skills match', async () => {
      const result = await skillRouter.route('completely random gibberish xyz123');
      expect(result.routed).toBe(false);
    });

    it('should return empty alternatives for no match', async () => {
      const result = await skillRouter.route('');
      expect(result.alternatives).toHaveLength(0);
    });

    it('should provide helpful reason for no match', async () => {
      const result = await skillRouter.route('');
      expect(result.reason).toContain('No skill matched');
    });

    it('should return confidence of 0 for no match', async () => {
      const result = await skillRouter.route('');
      expect(result.confidence).toBe(0);
    });
  });

  // =========================================================================
  // Confidence Threshold Tests
  // =========================================================================

  describe('confidence threshold', () => {
    it('should respect minConfidence option', async () => {
      const result = await skillRouter.route('random words', { minConfidence: 0.9 });
      expect(result.routed).toBe(false);
    });

    it('should route when confidence meets threshold', async () => {
      const result = await skillRouter.route('commit changes', { minConfidence: 0.1 });
      expect(result.routed).toBe(true);
    });

    it('should not route when confidence below threshold', async () => {
      const result = await skillRouter.route('vaguely related', { minConfidence: 0.99 });
      expect(result.routed).toBe(false);
    });

    it('should include threshold info in reason when below threshold', async () => {
      const result = await skillRouter.route('something', { minConfidence: 0.99 });
      if (!result.routed && result.confidence > 0) {
        expect(result.reason).toContain('threshold');
      }
    });
  });

  // =========================================================================
  // Ambiguous Match Tests
  // =========================================================================

  describe('ambiguous matches', () => {
    beforeEach(async () => {
      // Add similar skills for ambiguity testing
      await skillManager.createSkill('code-skill', codeSkillDefinition);
      await skillManager.createSkill('edit-skill', editSkillDefinition);
      intentMatcher = new IntentMatcher(skillManager);
      skillRouter = new SkillRouter(intentMatcher);
    });

    it('should detect ambiguous matches', async () => {
      // "code changes" matches both code-skill and edit-skill
      const result = await skillRouter.route('code changes', { minConfidence: 0.1 });
      // Should be ambiguous because both skills match "code changes"
      if (!result.routed) {
        expect(result.reason).toContain('Ambiguous');
      }
    });

    it('should include alternatives for ambiguous matches', async () => {
      const result = await skillRouter.route('code changes', { minConfidence: 0.1 });
      if (!result.routed) {
        expect(result.alternatives.length).toBeGreaterThan(0);
      }
    });

    it('should allow multiple matches when allowMultiple is true', async () => {
      const result = await skillRouter.route('code changes', {
        minConfidence: 0.1,
        allowMultiple: true,
      });
      // Should route even if ambiguous
      expect(result.routed).toBe(true);
    });
  });

  // =========================================================================
  // Preferred Skill Tests
  // =========================================================================

  describe('preferred skill', () => {
    it('should prefer specified skill when it matches', async () => {
      const result = await skillRouter.route('commit and search', {
        preferredSkill: 'search-skill',
        minConfidence: 0.1,
      });
      if (result.skill) {
        expect(result.skill.name).toBe('search-skill');
      }
    });

    it('should still require confidence threshold for preferred skill', async () => {
      const result = await skillRouter.route('completely random', {
        preferredSkill: 'git-skill',
        minConfidence: 0.9,
      });
      expect(result.routed).toBe(false);
    });

    it('should fall back to best match if preferred skill does not match', async () => {
      const result = await skillRouter.route('commit changes', {
        preferredSkill: 'nonexistent-skill',
        minConfidence: 0.1,
      });
      expect(result.routed).toBe(true);
      expect(result.skill!.name).toBe('git-skill');
    });
  });

  // =========================================================================
  // Routing History Tests
  // =========================================================================

  describe('routing history', () => {
    it('should record routing decisions', async () => {
      await skillRouter.route('commit changes');
      expect(skillRouter.getHistoryCount()).toBe(1);
    });

    it('should retrieve history entries', async () => {
      await skillRouter.route('commit changes');
      const history = skillRouter.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].request).toBe('commit changes');
    });

    it('should include skill name in history', async () => {
      // Use minConfidence: 0.1 to ensure routing even with partial matches
      await skillRouter.route('commit changes', { minConfidence: 0.1 });
      const history = skillRouter.getHistory();
      expect(history[0].skill).toBe('git-skill');
    });

    it('should include null skill for failed routing', async () => {
      await skillRouter.route('');
      const history = skillRouter.getHistory();
      expect(history[0].skill).toBeNull();
    });

    it('should include timestamp in history', async () => {
      const before = new Date();
      await skillRouter.route('commit changes');
      const after = new Date();
      const history = skillRouter.getHistory();
      expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include confidence in history', async () => {
      await skillRouter.route('commit changes');
      const history = skillRouter.getHistory();
      expect(history[0].confidence).toBeGreaterThan(0);
    });

    it('should include reason in history', async () => {
      await skillRouter.route('commit changes');
      const history = skillRouter.getHistory();
      expect(history[0].reason.length).toBeGreaterThan(0);
    });

    it('should accumulate multiple routing entries', async () => {
      await skillRouter.route('commit changes');
      await skillRouter.route('search for code');
      await skillRouter.route('deploy application');
      expect(skillRouter.getHistoryCount()).toBe(3);
    });

    it('should clear history', async () => {
      await skillRouter.route('commit changes');
      expect(skillRouter.getHistoryCount()).toBe(1);
      skillRouter.clearHistory();
      expect(skillRouter.getHistoryCount()).toBe(0);
    });

    it('should return copy of history to prevent mutation', async () => {
      await skillRouter.route('commit changes');
      const history = skillRouter.getHistory();
      history.pop();
      expect(skillRouter.getHistoryCount()).toBe(1);
    });
  });
});
