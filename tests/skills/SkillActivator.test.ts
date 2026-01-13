import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { SkillManager } from '../../src/skills/SkillManager';
import { IntentMatcher } from '../../src/skills/IntentMatcher';
import { SkillRouter } from '../../src/skills/SkillRouter';
import { SkillActivator } from '../../src/skills/SkillActivator';
import { SkillDefinition, SKILLS_DIR } from '../../src/skills/types';
import { CoreManager } from '../../src/memory/core';
import { PrepromptInjector, PrepromptHydrator } from '../../src/context';
import { MemoryError } from '../../src/exceptions';

describe('SkillActivator', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-skill-activator-' + Date.now());
  let skillManager: SkillManager;
  let intentMatcher: IntentMatcher;
  let skillRouter: SkillRouter;
  let coreManager: CoreManager;
  let prepromptInjector: PrepromptInjector;
  let prepromptHydrator: PrepromptHydrator;
  let skillActivator: SkillActivator;

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
    context: 'This skill handles all git-related operations.',
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

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up directories
    const skillsPath = path.join(testBasePath, SKILLS_DIR);
    const corePath = path.join(testBasePath, 'CORE');
    await fs.promises.rm(skillsPath, { recursive: true, force: true }).catch(() => {});
    await fs.promises.rm(corePath, { recursive: true, force: true }).catch(() => {});

    // Initialize managers
    skillManager = new SkillManager(testBasePath);
    coreManager = new CoreManager(testBasePath);
    prepromptInjector = new PrepromptInjector();

    await skillManager.initialize();
    await coreManager.initialize();

    // Create test skills
    await skillManager.createSkill('git-skill', gitSkillDefinition);
    await skillManager.createSkill('search-skill', searchSkillDefinition);
    await skillManager.createSkill('deploy-skill', deploySkillDefinition);

    // Create hydrator and activator
    prepromptHydrator = new PrepromptHydrator(coreManager, skillManager, prepromptInjector);
    intentMatcher = new IntentMatcher(skillManager);
    skillRouter = new SkillRouter(intentMatcher);
    skillActivator = new SkillActivator(skillManager, skillRouter, prepromptHydrator);
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create activator with all dependencies', () => {
      expect(skillActivator).toBeDefined();
      expect(skillActivator.getSkillManager()).toBe(skillManager);
      expect(skillActivator.getSkillRouter()).toBe(skillRouter);
      expect(skillActivator.getPrepromptHydrator()).toBe(prepromptHydrator);
    });

    it('should initialize with no active skills', () => {
      expect(skillActivator.getActiveSkillCount()).toBe(0);
      expect(skillActivator.hasActiveSkill()).toBe(false);
    });
  });

  // =========================================================================
  // Activation from Request Tests
  // =========================================================================

  describe('activateFromRequest', () => {
    it('should activate skill based on routing', async () => {
      const result = await skillActivator.activateFromRequest('commit my changes', {
        minConfidence: 0.1,
      });
      expect(result.activated).toBe(true);
      expect(result.skill).not.toBeNull();
      expect(result.skill!.name).toBe('git-skill');
    });

    it('should return activation result with confidence', async () => {
      const result = await skillActivator.activateFromRequest('commit changes', {
        minConfidence: 0.1,
      });
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return activation result with reason', async () => {
      const result = await skillActivator.activateFromRequest('commit changes', {
        minConfidence: 0.1,
      });
      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('should handle no match', async () => {
      const result = await skillActivator.activateFromRequest('');
      expect(result.activated).toBe(false);
      expect(result.skill).toBeNull();
    });

    it('should handle low confidence match', async () => {
      const result = await skillActivator.activateFromRequest('random words', {
        minConfidence: 0.9,
      });
      expect(result.activated).toBe(false);
    });

    it('should set task context from request', async () => {
      await skillActivator.activateFromRequest('commit my changes', { minConfidence: 0.1 });
      const context = skillActivator.getSkillContext('git-skill');
      expect(context?.taskDescription).toBe('commit my changes');
    });

    it('should track skill as active after activation', async () => {
      await skillActivator.activateFromRequest('commit changes', { minConfidence: 0.1 });
      expect(skillActivator.isSkillActive('git-skill')).toBe(true);
    });

    it('should respect preferred skill option', async () => {
      const result = await skillActivator.activateFromRequest('commit and search', {
        minConfidence: 0.1,
        preferredSkill: 'search-skill',
      });
      if (result.skill) {
        expect(result.skill.name).toBe('search-skill');
      }
    });
  });

  // =========================================================================
  // Direct Activation Tests
  // =========================================================================

  describe('activateSkill', () => {
    it('should activate skill by name', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(skillActivator.isSkillActive('git-skill')).toBe(true);
    });

    it('should load skill context into Layer 2', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(prepromptHydrator.hasLayer2()).toBe(true);
    });

    it('should track activation time', async () => {
      const before = new Date();
      await skillActivator.activateSkill('git-skill');
      const after = new Date();

      const activeSkill = skillActivator.getActiveSkill('git-skill');
      expect(activeSkill!.activatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(activeSkill!.activatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store context when provided', async () => {
      await skillActivator.activateSkill('git-skill', { taskDescription: 'Test task' });
      const context = skillActivator.getSkillContext('git-skill');
      expect(context?.taskDescription).toBe('Test task');
    });

    it('should throw error for non-existent skill', async () => {
      await expect(skillActivator.activateSkill('nonexistent-skill')).rejects.toThrow(MemoryError);
    });

    it('should handle already active skill', async () => {
      await skillActivator.activateSkill('git-skill');
      await skillActivator.activateSkill('git-skill'); // Should not throw
      expect(skillActivator.getActiveSkillCount()).toBe(1);
    });

    it('should update context for already active skill', async () => {
      await skillActivator.activateSkill('git-skill', { taskDescription: 'Original' });
      await skillActivator.activateSkill('git-skill', { taskDescription: 'Updated' });
      const context = skillActivator.getSkillContext('git-skill');
      expect(context?.taskDescription).toBe('Updated');
    });

    it('should deactivate previous skill when activating new one', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(skillActivator.isSkillActive('git-skill')).toBe(true);

      await skillActivator.activateSkill('search-skill');
      expect(skillActivator.isSkillActive('git-skill')).toBe(false);
      expect(skillActivator.isSkillActive('search-skill')).toBe(true);
    });

    it('should allow multiple active skills with force option', async () => {
      await skillActivator.activateSkill('git-skill');
      // With force: true, we skip deactivation and allow multiple active skills
      await skillActivator.activateSkill('search-skill', undefined, { force: true });
      // Both skills should be active now
      expect(skillActivator.getActiveSkillCount()).toBe(2);
      expect(skillActivator.isSkillActive('git-skill')).toBe(true);
      expect(skillActivator.isSkillActive('search-skill')).toBe(true);
    });

    it('should include workflows in active skill', async () => {
      await skillActivator.activateSkill('git-skill');
      const activeSkill = skillActivator.getActiveSkill('git-skill');
      expect(activeSkill!.workflows).toBeDefined();
      expect(activeSkill!.workflows.length).toBeGreaterThanOrEqual(0);
    });

    it('should include tools in active skill', async () => {
      await skillActivator.activateSkill('git-skill');
      const activeSkill = skillActivator.getActiveSkill('git-skill');
      expect(activeSkill!.tools).toBeDefined();
      expect(activeSkill!.tools.length).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Deactivation Tests
  // =========================================================================

  describe('deactivateSkill', () => {
    it('should deactivate active skill', async () => {
      await skillActivator.activateSkill('git-skill');
      await skillActivator.deactivateSkill('git-skill');
      expect(skillActivator.isSkillActive('git-skill')).toBe(false);
    });

    it('should clear Layer 2 context', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(prepromptHydrator.hasLayer2()).toBe(true);

      await skillActivator.deactivateSkill('git-skill');
      expect(prepromptHydrator.hasLayer2()).toBe(false);
    });

    it('should handle deactivating non-active skill', async () => {
      await skillActivator.deactivateSkill('git-skill'); // Should not throw
      expect(skillActivator.isSkillActive('git-skill')).toBe(false);
    });

    it('should remove from active skills', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(skillActivator.getActiveSkillCount()).toBe(1);

      await skillActivator.deactivateSkill('git-skill');
      expect(skillActivator.getActiveSkillCount()).toBe(0);
    });
  });

  describe('deactivateAll', () => {
    it('should deactivate all active skills', async () => {
      await skillActivator.activateSkill('git-skill');
      await skillActivator.deactivateAll();
      expect(skillActivator.getActiveSkillCount()).toBe(0);
    });

    it('should clear Layer 2 context', async () => {
      await skillActivator.activateSkill('git-skill');
      await skillActivator.deactivateAll();
      expect(prepromptHydrator.hasLayer2()).toBe(false);
    });

    it('should handle no active skills', async () => {
      await skillActivator.deactivateAll(); // Should not throw
      expect(skillActivator.getActiveSkillCount()).toBe(0);
    });
  });

  // =========================================================================
  // Active Skill Queries Tests
  // =========================================================================

  describe('getActiveSkills', () => {
    it('should return empty array when no skills active', () => {
      expect(skillActivator.getActiveSkills()).toHaveLength(0);
    });

    it('should return all active skills', async () => {
      await skillActivator.activateSkill('git-skill');
      const activeSkills = skillActivator.getActiveSkills();
      expect(activeSkills).toHaveLength(1);
      expect(activeSkills[0].skill.name).toBe('git-skill');
    });
  });

  describe('getActiveSkill', () => {
    it('should return undefined for non-active skill', () => {
      expect(skillActivator.getActiveSkill('git-skill')).toBeUndefined();
    });

    it('should return active skill details', async () => {
      await skillActivator.activateSkill('git-skill');
      const activeSkill = skillActivator.getActiveSkill('git-skill');
      expect(activeSkill).toBeDefined();
      expect(activeSkill!.skill.name).toBe('git-skill');
    });
  });

  describe('isSkillActive', () => {
    it('should return false for non-active skill', () => {
      expect(skillActivator.isSkillActive('git-skill')).toBe(false);
    });

    it('should return true for active skill', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(skillActivator.isSkillActive('git-skill')).toBe(true);
    });
  });

  describe('getActiveSkillCount', () => {
    it('should return 0 when no skills active', () => {
      expect(skillActivator.getActiveSkillCount()).toBe(0);
    });

    it('should return count of active skills', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(skillActivator.getActiveSkillCount()).toBe(1);
    });
  });

  describe('hasActiveSkill', () => {
    it('should return false when no skills active', () => {
      expect(skillActivator.hasActiveSkill()).toBe(false);
    });

    it('should return true when skill is active', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(skillActivator.hasActiveSkill()).toBe(true);
    });
  });

  describe('getPrimaryActiveSkillName', () => {
    it('should return null when no skills active', () => {
      expect(skillActivator.getPrimaryActiveSkillName()).toBeNull();
    });

    it('should return name of active skill', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(skillActivator.getPrimaryActiveSkillName()).toBe('git-skill');
    });
  });

  // =========================================================================
  // Context Management Tests
  // =========================================================================

  describe('updateSkillContext', () => {
    it('should update context for active skill', async () => {
      await skillActivator.activateSkill('git-skill', { taskDescription: 'Original' });
      await skillActivator.updateSkillContext('git-skill', { taskDescription: 'Updated' });
      const context = skillActivator.getSkillContext('git-skill');
      expect(context?.taskDescription).toBe('Updated');
    });

    it('should throw error for non-active skill', async () => {
      await expect(
        skillActivator.updateSkillContext('git-skill', { taskDescription: 'Test' })
      ).rejects.toThrow(MemoryError);
    });

    it('should update Layer 2 context', async () => {
      await skillActivator.activateSkill('git-skill');
      await skillActivator.updateSkillContext('git-skill', { taskDescription: 'New task' });
      const layer2Content = prepromptHydrator.getLayer2Content();
      expect(layer2Content).toContain('New task');
    });
  });

  describe('getSkillContext', () => {
    it('should return undefined for non-active skill', () => {
      expect(skillActivator.getSkillContext('git-skill')).toBeUndefined();
    });

    it('should return context for active skill', async () => {
      await skillActivator.activateSkill('git-skill', { taskDescription: 'Test' });
      const context = skillActivator.getSkillContext('git-skill');
      expect(context?.taskDescription).toBe('Test');
    });
  });

  // =========================================================================
  // Workflow and Tool Access Tests
  // =========================================================================

  describe('getActiveWorkflows', () => {
    it('should return empty array for non-active skill', () => {
      expect(skillActivator.getActiveWorkflows('git-skill')).toHaveLength(0);
    });

    it('should return workflows for active skill', async () => {
      await skillActivator.activateSkill('git-skill');
      const workflows = skillActivator.getActiveWorkflows('git-skill');
      expect(workflows).toBeDefined();
    });
  });

  describe('getActiveTools', () => {
    it('should return empty array for non-active skill', () => {
      expect(skillActivator.getActiveTools('git-skill')).toHaveLength(0);
    });

    it('should return tools for active skill', async () => {
      await skillActivator.activateSkill('git-skill');
      const tools = skillActivator.getActiveTools('git-skill');
      expect(tools).toBeDefined();
    });
  });

  describe('getAllActiveWorkflows', () => {
    it('should return empty array when no skills active', () => {
      expect(skillActivator.getAllActiveWorkflows()).toHaveLength(0);
    });

    it('should return all workflows from active skills', async () => {
      await skillActivator.activateSkill('git-skill');
      const workflows = skillActivator.getAllActiveWorkflows();
      expect(workflows).toBeDefined();
    });
  });

  describe('getAllActiveTools', () => {
    it('should return empty array when no skills active', () => {
      expect(skillActivator.getAllActiveTools()).toHaveLength(0);
    });

    it('should return all tools from active skills', async () => {
      await skillActivator.activateSkill('git-skill');
      const tools = skillActivator.getAllActiveTools();
      expect(tools).toBeDefined();
    });
  });

  // =========================================================================
  // Context Loading Tests (Layer 2 Integration)
  // =========================================================================

  describe('Layer 2 integration', () => {
    it('should load skill definition into Layer 2', async () => {
      await skillActivator.activateSkill('git-skill');
      const layer2Content = prepromptHydrator.getLayer2Content();
      expect(layer2Content).toContain('Git Skill');
    });

    it('should include skill description in Layer 2', async () => {
      await skillActivator.activateSkill('git-skill');
      const layer2Content = prepromptHydrator.getLayer2Content();
      expect(layer2Content).toContain('Git operations');
    });

    it('should include task context in Layer 2', async () => {
      await skillActivator.activateSkill('git-skill', {
        taskDescription: 'Commit all pending changes',
      });
      const layer2Content = prepromptHydrator.getLayer2Content();
      expect(layer2Content).toContain('Commit all pending changes');
    });

    it('should include relevant memory in Layer 2', async () => {
      await skillActivator.activateSkill('git-skill', {
        relevantMemory: ['Previous commit message', 'Branch history'],
      });
      const layer2Content = prepromptHydrator.getLayer2Content();
      expect(layer2Content).toContain('Previous commit message');
    });

    it('should clear Layer 2 on deactivation', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(prepromptHydrator.hasLayer2()).toBe(true);

      await skillActivator.deactivateSkill('git-skill');
      expect(prepromptHydrator.hasLayer2()).toBe(false);
    });

    it('should update active skill name in hydrator', async () => {
      await skillActivator.activateSkill('git-skill');
      expect(prepromptHydrator.getActiveSkillName()).toBe('git-skill');
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration', () => {
    it('should work with SkillRouter', async () => {
      const result = await skillActivator.activateFromRequest('commit changes', {
        minConfidence: 0.1,
      });
      expect(result.activated).toBe(true);
      expect(skillActivator.isSkillActive('git-skill')).toBe(true);
    });

    it('should work with SkillManager', async () => {
      await skillActivator.activateSkill('git-skill');
      const skill = skillManager.getSkill('git-skill');
      const activeSkill = skillActivator.getActiveSkill('git-skill');
      expect(activeSkill!.skill).toBe(skill);
    });

    it('should work with PrepromptHydrator', async () => {
      await prepromptHydrator.loadLayer1();
      await skillActivator.activateSkill('git-skill', { taskDescription: 'Test' });

      const context = prepromptHydrator.getHydratedContext();
      expect(context).toContain('Test');
    });

    it('should handle full activation/deactivation cycle', async () => {
      // Initial state
      expect(skillActivator.hasActiveSkill()).toBe(false);

      // Activate
      await skillActivator.activateSkill('git-skill', { taskDescription: 'Step 1' });
      expect(skillActivator.hasActiveSkill()).toBe(true);
      expect(prepromptHydrator.hasLayer2()).toBe(true);

      // Update context
      await skillActivator.updateSkillContext('git-skill', { taskDescription: 'Step 2' });
      expect(skillActivator.getSkillContext('git-skill')?.taskDescription).toBe('Step 2');

      // Deactivate
      await skillActivator.deactivateSkill('git-skill');
      expect(skillActivator.hasActiveSkill()).toBe(false);
      expect(prepromptHydrator.hasLayer2()).toBe(false);
    });

    it('should handle switching between skills', async () => {
      // Activate first skill
      await skillActivator.activateSkill('git-skill', { taskDescription: 'Git work' });
      expect(skillActivator.isSkillActive('git-skill')).toBe(true);

      // Switch to second skill
      await skillActivator.activateSkill('search-skill', { taskDescription: 'Search work' });
      expect(skillActivator.isSkillActive('git-skill')).toBe(false);
      expect(skillActivator.isSkillActive('search-skill')).toBe(true);

      // Verify Layer 2 updated
      const layer2Content = prepromptHydrator.getLayer2Content();
      expect(layer2Content).toContain('Search Skill');
      expect(layer2Content).toContain('Search work');
    });
  });

  // =========================================================================
  // Getter Tests
  // =========================================================================

  describe('getters', () => {
    it('should return SkillManager', () => {
      expect(skillActivator.getSkillManager()).toBe(skillManager);
    });

    it('should return SkillRouter', () => {
      expect(skillActivator.getSkillRouter()).toBe(skillRouter);
    });

    it('should return PrepromptHydrator', () => {
      expect(skillActivator.getPrepromptHydrator()).toBe(prepromptHydrator);
    });
  });
});
