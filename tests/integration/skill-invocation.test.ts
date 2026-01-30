/**
 * Skill Invocation Integration Tests
 *
 * End-to-end tests for skill management and invocation including:
 * - Skill initialization and discovery
 * - Skill creation, update, and deletion
 * - Skill validation
 * - Skill routing and matching
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SkillManager } from '../../src/skills/SkillManager';
import { SkillParser } from '../../src/skills/SkillParser';
import { SkillDefinition } from '../../src/skills/types';
import { cleanupTempScaffold } from '../utils/test-helpers';

describe('Skill Invocation Integration', () => {
  let tempDir: string;
  let skillManager: SkillManager;

  // Test fixture: skill definition
  const testSkillDefinition: SkillDefinition = {
    name: 'Test Skill',
    description: 'A skill for testing purposes',
    useWhen: [
      'User asks for testing help',
      'User mentions "test" or "testing"',
      'User wants to verify functionality',
    ],
    capabilities: ['Run tests', 'Validate outputs', 'Generate test cases'],
    workflows: [],
    tools: [],
    context: 'This skill handles all testing-related tasks.',
  };

  const researchSkillDefinition: SkillDefinition = {
    name: 'Research Skill',
    description: 'A skill for research and analysis',
    useWhen: [
      'User asks for research',
      'User needs information gathering',
      'User wants analysis',
    ],
    capabilities: ['Search documentation', 'Analyze data', 'Summarize findings'],
    workflows: [],
    tools: [],
    context: 'This skill handles research and analysis tasks.',
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-test-'));
    skillManager = new SkillManager(tempDir);
    await skillManager.initialize();
  });

  afterEach(async () => {
    await cleanupTempScaffold(tempDir);
  });

  describe('Skill Initialization', () => {
    it('should initialize skill manager and create SKILLS directory', async () => {
      expect(skillManager.isInitialized()).toBe(true);

      const skillsPath = skillManager.getSkillsPath();
      const exists = await fs
        .stat(skillsPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create example skill on first initialization', async () => {
      const skills = skillManager.listSkills();
      const exampleSkill = skills.find((s) => s.name === 'example-skill');

      expect(exampleSkill).toBeDefined();
      expect(exampleSkill?.definition.name).toBe('Example Skill');
    });

    it('should load skills from existing SKILLS directory', async () => {
      // Create a second skill manager to verify loading
      const skillManager2 = new SkillManager(tempDir);
      await skillManager2.initialize();

      expect(skillManager2.getSkillCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Skill Creation', () => {
    it('should create a new skill with valid definition', async () => {
      await skillManager.createSkill('test-skill', testSkillDefinition);

      const skill = skillManager.getSkill('test-skill');
      expect(skill).toBeDefined();
      expect(skill?.definition.name).toBe('Test Skill');
      expect(skill?.definition.capabilities).toHaveLength(3);
    });

    it('should create skill with example workflow', async () => {
      await skillManager.createSkill('workflow-skill', testSkillDefinition, {
        createExampleWorkflow: true,
      });

      const skill = skillManager.getSkill('workflow-skill');
      expect(skill?.workflows.length).toBeGreaterThanOrEqual(1);
    });

    it('should create skill with example tool', async () => {
      await skillManager.createSkill('tool-skill', testSkillDefinition, {
        createExampleTool: true,
      });

      const skill = skillManager.getSkill('tool-skill');
      expect(skill?.tools.length).toBeGreaterThanOrEqual(1);
    });

    it('should create skill with example reference', async () => {
      await skillManager.createSkill('ref-skill', testSkillDefinition, {
        createExampleReference: true,
      });

      const skill = skillManager.getSkill('ref-skill');
      expect(skill?.reference.length).toBeGreaterThanOrEqual(1);
    });

    it('should create skill with all example files', async () => {
      await skillManager.createSkill('full-skill', testSkillDefinition, {
        createExampleWorkflow: true,
        createExampleTool: true,
        createExampleReference: true,
      });

      const skill = skillManager.getSkill('full-skill');
      expect(skill?.workflows.length).toBeGreaterThanOrEqual(1);
      expect(skill?.tools.length).toBeGreaterThanOrEqual(1);
      expect(skill?.reference.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject empty skill name', async () => {
      await expect(
        skillManager.createSkill('', testSkillDefinition)
      ).rejects.toThrow('cannot be empty');
    });

    it('should reject invalid skill name format', async () => {
      await expect(
        skillManager.createSkill('Invalid Name', testSkillDefinition)
      ).rejects.toThrow('must start with lowercase');

      await expect(
        skillManager.createSkill('123-skill', testSkillDefinition)
      ).rejects.toThrow('must start with lowercase');
    });

    it('should reject duplicate skill name', async () => {
      await skillManager.createSkill('unique-skill', testSkillDefinition);

      await expect(
        skillManager.createSkill('unique-skill', testSkillDefinition)
      ).rejects.toThrow('already exists');
    });
  });

  describe('Skill Update', () => {
    it('should update existing skill definition', async () => {
      await skillManager.createSkill('update-skill', testSkillDefinition);

      const updatedDefinition: SkillDefinition = {
        ...testSkillDefinition,
        name: 'Updated Test Skill',
        description: 'An updated skill description',
      };

      await skillManager.updateSkill('update-skill', updatedDefinition);

      const skill = skillManager.getSkill('update-skill');
      expect(skill?.definition.name).toBe('Updated Test Skill');
      expect(skill?.definition.description).toBe('An updated skill description');
    });

    it('should reject update for non-existent skill', async () => {
      await expect(
        skillManager.updateSkill('nonexistent-skill', testSkillDefinition)
      ).rejects.toThrow('does not exist');
    });
  });

  describe('Skill Deletion', () => {
    it('should delete existing skill', async () => {
      await skillManager.createSkill('delete-skill', testSkillDefinition);
      expect(skillManager.skillExists('delete-skill')).toBe(true);

      await skillManager.deleteSkill('delete-skill');

      expect(skillManager.skillExists('delete-skill')).toBe(false);
    });

    it('should reject deletion of non-existent skill', async () => {
      await expect(skillManager.deleteSkill('nonexistent')).rejects.toThrow(
        'does not exist'
      );
    });

    it('should remove skill directory on deletion', async () => {
      await skillManager.createSkill('dir-delete-skill', testSkillDefinition);

      const skillPath = path.join(
        skillManager.getSkillsPath(),
        'dir-delete-skill'
      );
      const existsBefore = await fs
        .stat(skillPath)
        .then(() => true)
        .catch(() => false);
      expect(existsBefore).toBe(true);

      await skillManager.deleteSkill('dir-delete-skill');

      const existsAfter = await fs
        .stat(skillPath)
        .then(() => true)
        .catch(() => false);
      expect(existsAfter).toBe(false);
    });
  });

  describe('Skill Validation', () => {
    it('should validate valid skill structure', async () => {
      await skillManager.createSkill('valid-skill', testSkillDefinition, {
        createExampleWorkflow: true,
        createExampleTool: true,
        createExampleReference: true,
      });

      const result = await skillManager.validateSkill('valid-skill');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing directories as warnings', async () => {
      await skillManager.createSkill('minimal-skill', testSkillDefinition);

      // Remove subdirectories
      const skillPath = path.join(
        skillManager.getSkillsPath(),
        'minimal-skill'
      );
      await fs.rm(path.join(skillPath, 'workflows'), {
        recursive: true,
        force: true,
      });

      const result = await skillManager.validateSkill('minimal-skill');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('workflows'))).toBe(true);
    });

    it('should detect missing skill directory', async () => {
      const result = await skillManager.validateSkill('nonexistent-skill');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Skill Parser', () => {
    it('should parse valid SKILL.md content', () => {
      const content = `# Test Skill

## Description
A test skill for parsing validation.

## USE WHEN
- User asks for test
- User mentions testing

## Capabilities
- Run tests
- Generate reports

## Context
Testing context information.
`;

      const definition = SkillParser.parseSkillFile(content);

      expect(definition.name).toBe('Test Skill');
      expect(definition.description).toBe('A test skill for parsing validation.');
      expect(definition.useWhen).toHaveLength(2);
      expect(definition.capabilities).toHaveLength(2);
    });

    it('should generate valid SKILL.md content', () => {
      const content = SkillParser.generateSkillFile(testSkillDefinition);

      expect(content).toContain('# Test Skill');
      expect(content).toContain('## Description');
      expect(content).toContain('## USE WHEN');
      expect(content).toContain('## Capabilities');
    });

    it('should validate skill file structure', () => {
      const validContent = `# Valid Skill

## Description
Description here.

## USE WHEN
- Condition 1

## Capabilities
- Capability 1

## Workflows
- **example-workflow**: Example workflow description

## Tools
- **example-tool**: Example tool description
`;

      const result = SkillParser.validateStructure(validContent);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required sections', () => {
      const invalidContent = `# Incomplete Skill

## Description
Only has description.
`;

      const result = SkillParser.validateStructure(invalidContent);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Skills Management', () => {
    it('should manage multiple skills simultaneously', async () => {
      await skillManager.createSkill('skill-a', testSkillDefinition);
      await skillManager.createSkill('skill-b', researchSkillDefinition);

      expect(skillManager.getSkillCount()).toBeGreaterThanOrEqual(3); // Including example
      expect(skillManager.skillExists('skill-a')).toBe(true);
      expect(skillManager.skillExists('skill-b')).toBe(true);
    });

    it('should list all skills', async () => {
      await skillManager.createSkill('list-skill-1', testSkillDefinition);
      await skillManager.createSkill('list-skill-2', researchSkillDefinition);

      const skills = skillManager.listSkills();

      expect(skills.length).toBeGreaterThanOrEqual(3);
      expect(skills.map((s) => s.name)).toContain('list-skill-1');
      expect(skills.map((s) => s.name)).toContain('list-skill-2');
    });

    it('should reload skills after external changes', async () => {
      await skillManager.createSkill('reload-skill', testSkillDefinition);

      // Simulate external modification
      const skillPath = path.join(skillManager.getSkillsPath(), 'reload-skill');
      const definitionPath = path.join(skillPath, 'SKILL.md');
      const newContent = `# Modified Skill

## Description
Modified description.

## USE WHEN
- Modified condition

## Capabilities
- Modified capability
`;
      await fs.writeFile(definitionPath, newContent);

      // Reload skills
      await skillManager.loadSkills();

      const skill = skillManager.getSkill('reload-skill');
      expect(skill?.definition.name).toBe('Modified Skill');
    });
  });

  describe('Skill Directory Structure', () => {
    it('should create proper directory structure for skill', async () => {
      await skillManager.createSkill('structure-skill', testSkillDefinition, {
        createExampleWorkflow: true,
        createExampleTool: true,
        createExampleReference: true,
      });

      const skillPath = path.join(
        skillManager.getSkillsPath(),
        'structure-skill'
      );

      // Check directories exist (using capitalized names from SKILL_STRUCTURE)
      const dirs = ['Workflows', 'Tools', 'Reference'];
      for (const dir of dirs) {
        const dirPath = path.join(skillPath, dir);
        const exists = await fs
          .stat(dirPath)
          .then((s) => s.isDirectory())
          .catch(() => false);
        expect(exists).toBe(true);
      }

      // Check SKILL.md exists
      const definitionExists = await fs
        .stat(path.join(skillPath, 'SKILL.md'))
        .then(() => true)
        .catch(() => false);
      expect(definitionExists).toBe(true);
    });

    it('should preserve skill files through update', async () => {
      await skillManager.createSkill('preserve-skill', testSkillDefinition, {
        createExampleWorkflow: true,
      });

      const skill = skillManager.getSkill('preserve-skill');
      const workflowCount = skill?.workflows.length ?? 0;

      // Update skill
      await skillManager.updateSkill('preserve-skill', {
        ...testSkillDefinition,
        name: 'Updated Skill',
      });

      const updatedSkill = skillManager.getSkill('preserve-skill');
      expect(updatedSkill?.workflows.length).toBe(workflowCount);
    });
  });
});
