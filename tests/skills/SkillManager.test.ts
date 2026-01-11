import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { SkillManager } from '../../src/skills/SkillManager';
import { SkillDefinition, SKILL_STRUCTURE, SKILLS_DIR } from '../../src/skills/types';
import { MemoryError } from '../../src/exceptions';

describe('SkillManager', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-skill-manager');
  let skillManager: SkillManager;

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
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('initialize', () => {
    it('should create SKILLS directory on initialization', async () => {
      await skillManager.initialize();
      const skillsPath = path.join(testBasePath, SKILLS_DIR);
      const exists = await fs.promises
        .stat(skillsPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create example-skill on initialization', async () => {
      await skillManager.initialize();
      const examplePath = path.join(testBasePath, SKILLS_DIR, 'example-skill');
      const exists = await fs.promises
        .stat(examplePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create example-skill with SKILL.md', async () => {
      await skillManager.initialize();
      const definitionPath = path.join(
        testBasePath,
        SKILLS_DIR,
        'example-skill',
        SKILL_STRUCTURE.DEFINITION_FILE
      );
      const exists = await fs.promises
        .stat(definitionPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.promises.readFile(definitionPath, 'utf-8');
      expect(content).toContain('# Example Skill');
    });

    it('should create example-skill subdirectories', async () => {
      await skillManager.initialize();
      const basePath = path.join(testBasePath, SKILLS_DIR, 'example-skill');

      const workflowsExists = await fs.promises
        .stat(path.join(basePath, SKILL_STRUCTURE.WORKFLOWS_DIR))
        .then(() => true)
        .catch(() => false);
      const toolsExists = await fs.promises
        .stat(path.join(basePath, SKILL_STRUCTURE.TOOLS_DIR))
        .then(() => true)
        .catch(() => false);
      const referenceExists = await fs.promises
        .stat(path.join(basePath, SKILL_STRUCTURE.REFERENCE_DIR))
        .then(() => true)
        .catch(() => false);

      expect(workflowsExists).toBe(true);
      expect(toolsExists).toBe(true);
      expect(referenceExists).toBe(true);
    });

    it('should set initialized flag after initialization', async () => {
      expect(skillManager.isInitialized()).toBe(false);
      await skillManager.initialize();
      expect(skillManager.isInitialized()).toBe(true);
    });

    it('should not overwrite existing example-skill on re-initialization', async () => {
      await skillManager.initialize();

      // Modify the example skill
      const definitionPath = path.join(
        testBasePath,
        SKILLS_DIR,
        'example-skill',
        SKILL_STRUCTURE.DEFINITION_FILE
      );
      const customContent = '# Custom Example\n\n## Description\nCustomized.';
      await fs.promises.writeFile(definitionPath, customContent);

      // Re-initialize
      const newManager = new SkillManager(testBasePath);
      await newManager.initialize();

      // Check content is NOT preserved (will still be custom since we don't overwrite)
      const content = await fs.promises.readFile(definitionPath, 'utf-8');
      expect(content).toBe(customContent);
    });
  });

  // =========================================================================
  // Loading Tests
  // =========================================================================

  describe('loadSkills', () => {
    it('should load example skill after initialization', async () => {
      await skillManager.initialize();
      const skills = skillManager.listSkills();
      expect(skills.length).toBeGreaterThanOrEqual(1);
      expect(skills.some((s) => s.name === 'example-skill')).toBe(true);
    });

    it('should get skill by name', async () => {
      await skillManager.initialize();
      const skill = skillManager.getSkill('example-skill');
      expect(skill).toBeDefined();
      expect(skill!.name).toBe('example-skill');
    });

    it('should return undefined for non-existent skill', async () => {
      await skillManager.initialize();
      const skill = skillManager.getSkill('non-existent');
      expect(skill).toBeUndefined();
    });

    it('should check skill existence correctly', async () => {
      await skillManager.initialize();
      expect(skillManager.skillExists('example-skill')).toBe(true);
      expect(skillManager.skillExists('non-existent')).toBe(false);
    });

    it('should load skill definition correctly', async () => {
      await skillManager.initialize();
      const skill = skillManager.getSkill('example-skill');
      expect(skill!.definition.name).toBe('Example Skill');
      expect(skill!.definition.useWhen.length).toBeGreaterThan(0);
    });

    it('should load workflow files list', async () => {
      await skillManager.initialize();
      const skill = skillManager.getSkill('example-skill');
      expect(skill!.workflows.length).toBeGreaterThan(0);
    });

    it('should load tool files list', async () => {
      await skillManager.initialize();
      const skill = skillManager.getSkill('example-skill');
      expect(skill!.tools.length).toBeGreaterThan(0);
    });

    it('should load reference files list', async () => {
      await skillManager.initialize();
      const skill = skillManager.getSkill('example-skill');
      expect(skill!.reference.length).toBeGreaterThan(0);
    });

    it('should handle missing SKILLS directory gracefully', async () => {
      await skillManager.loadSkills();
      expect(skillManager.listSkills()).toHaveLength(0);
    });

    it('should skip invalid skills during bulk load', async () => {
      await skillManager.initialize();

      // Create an invalid skill directory (no SKILL.md)
      const invalidPath = path.join(testBasePath, SKILLS_DIR, 'invalid-skill');
      await fs.promises.mkdir(invalidPath, { recursive: true });

      // Reload skills
      await skillManager.loadSkills();

      // Should have example-skill but not invalid-skill
      expect(skillManager.skillExists('example-skill')).toBe(true);
      expect(skillManager.skillExists('invalid-skill')).toBe(false);
    });
  });

  // =========================================================================
  // CRUD Operations Tests
  // =========================================================================

  describe('createSkill', () => {
    const testDefinition: SkillDefinition = {
      name: 'Test Skill',
      description: 'A test skill.',
      useWhen: ['User asks for testing'],
      capabilities: ['Test things'],
      workflows: [{ name: 'test-workflow', description: 'Test workflow' }],
      tools: [{ name: 'test-tool', description: 'Test tool' }],
    };

    it('should create a new skill', async () => {
      await skillManager.initialize();
      await skillManager.createSkill('test-skill', testDefinition);

      expect(skillManager.skillExists('test-skill')).toBe(true);
    });

    it('should create skill directory structure', async () => {
      await skillManager.initialize();
      await skillManager.createSkill('test-skill', testDefinition);

      const skillPath = path.join(testBasePath, SKILLS_DIR, 'test-skill');
      const exists = await fs.promises
        .stat(skillPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const workflowsExists = await fs.promises
        .stat(path.join(skillPath, SKILL_STRUCTURE.WORKFLOWS_DIR))
        .then(() => true)
        .catch(() => false);
      expect(workflowsExists).toBe(true);
    });

    it('should create SKILL.md with correct content', async () => {
      await skillManager.initialize();
      await skillManager.createSkill('test-skill', testDefinition);

      const definitionPath = path.join(
        testBasePath,
        SKILLS_DIR,
        'test-skill',
        SKILL_STRUCTURE.DEFINITION_FILE
      );
      const content = await fs.promises.readFile(definitionPath, 'utf-8');
      expect(content).toContain('# Test Skill');
      expect(content).toContain('A test skill.');
    });

    it('should throw error for empty skill name', async () => {
      await skillManager.initialize();
      await expect(skillManager.createSkill('', testDefinition)).rejects.toThrow(MemoryError);
    });

    it('should throw error for invalid skill name format', async () => {
      await skillManager.initialize();
      await expect(skillManager.createSkill('Invalid Name', testDefinition)).rejects.toThrow(
        MemoryError
      );
      await expect(skillManager.createSkill('UPPERCASE', testDefinition)).rejects.toThrow(
        MemoryError
      );
      await expect(skillManager.createSkill('123start', testDefinition)).rejects.toThrow(
        MemoryError
      );
    });

    it('should throw error for duplicate skill', async () => {
      await skillManager.initialize();
      await skillManager.createSkill('test-skill', testDefinition);
      await expect(skillManager.createSkill('test-skill', testDefinition)).rejects.toThrow(
        MemoryError
      );
    });

    it('should create example workflow when requested', async () => {
      await skillManager.initialize();
      await skillManager.createSkill('test-skill', testDefinition, {
        createExampleWorkflow: true,
      });

      const workflowPath = path.join(
        testBasePath,
        SKILLS_DIR,
        'test-skill',
        SKILL_STRUCTURE.WORKFLOWS_DIR,
        'example-workflow.md'
      );
      const exists = await fs.promises
        .stat(workflowPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('updateSkill', () => {
    const originalDefinition: SkillDefinition = {
      name: 'Original Skill',
      description: 'Original description.',
      useWhen: ['Original condition'],
      capabilities: ['Original capability'],
      workflows: [{ name: 'original-workflow', description: 'Original' }],
      tools: [{ name: 'original-tool', description: 'Original' }],
    };

    const updatedDefinition: SkillDefinition = {
      name: 'Updated Skill',
      description: 'Updated description.',
      useWhen: ['Updated condition'],
      capabilities: ['Updated capability'],
      workflows: [{ name: 'updated-workflow', description: 'Updated' }],
      tools: [{ name: 'updated-tool', description: 'Updated' }],
    };

    it('should update an existing skill', async () => {
      await skillManager.initialize();
      await skillManager.createSkill('update-skill', originalDefinition);
      await skillManager.updateSkill('update-skill', updatedDefinition);

      const skill = skillManager.getSkill('update-skill');
      expect(skill!.definition.name).toBe('Updated Skill');
      expect(skill!.definition.description).toBe('Updated description.');
    });

    it('should throw error for non-existent skill', async () => {
      await skillManager.initialize();
      await expect(skillManager.updateSkill('non-existent', updatedDefinition)).rejects.toThrow(
        MemoryError
      );
    });
  });

  describe('deleteSkill', () => {
    it('should delete an existing skill', async () => {
      await skillManager.initialize();

      const definition: SkillDefinition = {
        name: 'Delete Me',
        description: 'To be deleted.',
        useWhen: ['Never'],
        capabilities: ['None'],
        workflows: [{ name: 'wf', description: 'W' }],
        tools: [{ name: 't', description: 'T' }],
      };

      await skillManager.createSkill('delete-skill', definition);
      expect(skillManager.skillExists('delete-skill')).toBe(true);

      await skillManager.deleteSkill('delete-skill');
      expect(skillManager.skillExists('delete-skill')).toBe(false);
    });

    it('should remove skill directory', async () => {
      await skillManager.initialize();

      const definition: SkillDefinition = {
        name: 'Delete Me',
        description: 'To be deleted.',
        useWhen: ['Never'],
        capabilities: ['None'],
        workflows: [{ name: 'wf', description: 'W' }],
        tools: [{ name: 't', description: 'T' }],
      };

      await skillManager.createSkill('delete-skill', definition);
      await skillManager.deleteSkill('delete-skill');

      const skillPath = path.join(testBasePath, SKILLS_DIR, 'delete-skill');
      const exists = await fs.promises
        .stat(skillPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it('should throw error for non-existent skill', async () => {
      await skillManager.initialize();
      await expect(skillManager.deleteSkill('non-existent')).rejects.toThrow(MemoryError);
    });
  });

  // =========================================================================
  // Validation Tests
  // =========================================================================

  describe('validateSkill', () => {
    it('should validate a valid skill', async () => {
      await skillManager.initialize();
      const result = await skillManager.validateSkill('example-skill');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-existent skill', async () => {
      await skillManager.initialize();
      const result = await skillManager.validateSkill('non-existent');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('does not exist'))).toBe(true);
    });

    it('should return error for missing SKILL.md', async () => {
      await skillManager.initialize();

      // Create skill directory without SKILL.md
      const skillPath = path.join(testBasePath, SKILLS_DIR, 'no-definition');
      await fs.promises.mkdir(skillPath, { recursive: true });

      const result = await skillManager.validateSkill('no-definition');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('SKILL.md'))).toBe(true);
    });

    it('should return warnings for missing subdirectories', async () => {
      await skillManager.initialize();

      // Create skill with only SKILL.md (no subdirectories)
      const skillPath = path.join(testBasePath, SKILLS_DIR, 'minimal-skill');
      await fs.promises.mkdir(skillPath, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillPath, SKILL_STRUCTURE.DEFINITION_FILE),
        `# Minimal Skill

## Description
A minimal skill.

## USE WHEN
- Condition

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T
`
      );

      const result = await skillManager.validateSkill('minimal-skill');
      expect(result.warnings.some((w) => w.includes('Workflows'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('Tools'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('Reference'))).toBe(true);
    });
  });

  // =========================================================================
  // Utility Tests
  // =========================================================================

  describe('utility methods', () => {
    it('should return correct skills path', async () => {
      const skillsPath = skillManager.getSkillsPath();
      expect(skillsPath).toBe(path.join(testBasePath, SKILLS_DIR));
    });

    it('should return correct skill count', async () => {
      await skillManager.initialize();
      expect(skillManager.getSkillCount()).toBeGreaterThanOrEqual(1);
    });

    it('should return empty list when not initialized', () => {
      expect(skillManager.listSkills()).toHaveLength(0);
    });
  });
});
