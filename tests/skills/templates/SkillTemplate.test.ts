/**
 * SkillTemplate Tests
 *
 * Tests for the skill template system including validation, parsing, and generation.
 */

import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  SkillTemplate,
  TemplateSkillDefinition,
  SkillGeneratorConfig,
  SKILL_TEMPLATE_MD,
} from '../../../src/skills/templates';

describe('SkillTemplate', () => {
  let template: SkillTemplate;
  let testDir: string;

  beforeEach(() => {
    template = new SkillTemplate();
    testDir = join(tmpdir(), `skill-template-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // Template Rendering Tests
  // =========================================================================

  describe('Template Rendering', () => {
    it('should export SKILL_TEMPLATE_MD as a valid markdown string', () => {
      expect(typeof SKILL_TEMPLATE_MD).toBe('string');
      expect(SKILL_TEMPLATE_MD).toContain('# {SkillName}');
      expect(SKILL_TEMPLATE_MD).toContain('## Description');
      expect(SKILL_TEMPLATE_MD).toContain('## USE WHEN');
      expect(SKILL_TEMPLATE_MD).toContain('## Keywords');
      expect(SKILL_TEMPLATE_MD).toContain('## Capabilities');
      expect(SKILL_TEMPLATE_MD).toContain('## Inputs');
      expect(SKILL_TEMPLATE_MD).toContain('## Outputs');
      expect(SKILL_TEMPLATE_MD).toContain('## Example Usage');
      expect(SKILL_TEMPLATE_MD).toContain('## Workflows');
      expect(SKILL_TEMPLATE_MD).toContain('## Tools');
      expect(SKILL_TEMPLATE_MD).toContain('## Notes');
    });

    it('should render template with all required sections', () => {
      const sections = [
        'Description',
        'USE WHEN',
        'Keywords',
        'Capabilities',
        'Inputs',
        'Outputs',
        'Example Usage',
        'Workflows',
        'Tools',
        'Notes',
      ];

      for (const section of sections) {
        expect(SKILL_TEMPLATE_MD).toContain(`## ${section}`);
      }
    });

    it('should include input/output table structure in template', () => {
      expect(SKILL_TEMPLATE_MD).toContain('| Parameter | Type | Required | Description |');
      expect(SKILL_TEMPLATE_MD).toContain('| Field | Type | Description |');
    });
  });

  // =========================================================================
  // Validation Tests
  // =========================================================================

  describe('validateDefinition', () => {
    it('should validate a complete skill definition', () => {
      const definition: TemplateSkillDefinition = {
        name: 'TestSkill',
        description: 'A test skill for validation',
        useWhen: ['User wants to test', 'Testing is needed'],
        keywords: ['test', 'validate', 'check'],
        capabilities: ['Perform tests', 'Validate data'],
        inputs: [{ name: 'input', type: 'string', required: true, description: 'Test input' }],
        outputs: [{ name: 'result', type: 'boolean', description: 'Test result' }],
        workflows: ['Default'],
        tools: ['execute'],
      };

      const result = template.validateDefinition(definition);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch missing skill name', () => {
      const definition: TemplateSkillDefinition = {
        name: '',
        description: 'A test skill',
        useWhen: ['Test condition'],
        keywords: ['test'],
        capabilities: ['Test capability'],
        inputs: [],
        outputs: [],
      };

      const result = template.validateDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing skill name');
    });

    it('should catch missing description', () => {
      const definition: TemplateSkillDefinition = {
        name: 'TestSkill',
        description: '',
        useWhen: ['Test condition'],
        keywords: ['test'],
        capabilities: ['Test capability'],
        inputs: [],
        outputs: [],
      };

      const result = template.validateDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing description');
    });

    it('should catch missing USE WHEN triggers', () => {
      const definition: TemplateSkillDefinition = {
        name: 'TestSkill',
        description: 'A test skill',
        useWhen: [],
        keywords: ['test'],
        capabilities: ['Test capability'],
        inputs: [],
        outputs: [],
      };

      const result = template.validateDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing USE WHEN triggers');
    });

    it('should catch missing keywords', () => {
      const definition: TemplateSkillDefinition = {
        name: 'TestSkill',
        description: 'A test skill',
        useWhen: ['Test condition'],
        keywords: [],
        capabilities: ['Test capability'],
        inputs: [],
        outputs: [],
      };

      const result = template.validateDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing keywords');
    });

    it('should catch missing capabilities', () => {
      const definition: TemplateSkillDefinition = {
        name: 'TestSkill',
        description: 'A test skill',
        useWhen: ['Test condition'],
        keywords: ['test'],
        capabilities: [],
        inputs: [],
        outputs: [],
      };

      const result = template.validateDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing capabilities');
    });

    it('should warn about missing optional fields', () => {
      const definition: TemplateSkillDefinition = {
        name: 'TestSkill',
        description: 'A test skill',
        useWhen: ['Test condition'],
        keywords: ['test'],
        capabilities: ['Test capability'],
        inputs: [],
        outputs: [],
      };

      const result = template.validateDefinition(definition);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('No inputs defined');
      expect(result.warnings).toContain('No outputs defined');
      expect(result.warnings).toContain('No workflows defined');
      expect(result.warnings).toContain('No tools defined');
    });
  });

  // =========================================================================
  // Structure Validation Tests
  // =========================================================================

  describe('validateStructure', () => {
    it('should validate a valid skill directory structure', async () => {
      const skillPath = join(testDir, 'ValidSkill');
      mkdirSync(skillPath, { recursive: true });
      mkdirSync(join(skillPath, 'Workflows'), { recursive: true });
      mkdirSync(join(skillPath, 'Tools'), { recursive: true });
      writeFileSync(join(skillPath, 'SKILL.md'), '# ValidSkill\n');

      const result = await template.validateStructure(skillPath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing SKILL.md', async () => {
      const skillPath = join(testDir, 'MissingSkillMd');
      mkdirSync(skillPath, { recursive: true });

      const result = await template.validateStructure(skillPath);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required file: SKILL.md');
    });

    it('should detect non-existent directory', async () => {
      const skillPath = join(testDir, 'NonExistent');

      const result = await template.validateStructure(skillPath);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Skill directory does not exist');
    });

    it('should warn about missing optional directories', async () => {
      const skillPath = join(testDir, 'MinimalSkill');
      mkdirSync(skillPath, { recursive: true });
      writeFileSync(join(skillPath, 'SKILL.md'), '# MinimalSkill\n');

      const result = await template.validateStructure(skillPath);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Optional directory not found: Workflows');
      expect(result.warnings).toContain('Optional directory not found: Tools');
      expect(result.warnings).toContain('Optional directory not found: Data');
    });
  });

  // =========================================================================
  // Parsing Tests
  // =========================================================================

  describe('parseContent', () => {
    it('should parse keywords correctly', () => {
      const content = `# TestSkill

## Description
A test skill

## USE WHEN
- Test condition

## Keywords
test, validate, check, verify

## Capabilities
1. Test capability
`;

      const result = template.parseContent(content);

      expect(result.keywords).toEqual(['test', 'validate', 'check', 'verify']);
    });

    it('should extract USE WHEN triggers', () => {
      const content = `# TestSkill

## Description
A test skill

## USE WHEN
- User wants to test something
- Testing is required
- Validation is needed

## Keywords
test

## Capabilities
1. Test capability
`;

      const result = template.parseContent(content);

      expect(result.useWhen).toHaveLength(3);
      expect(result.useWhen).toContain('User wants to test something');
      expect(result.useWhen).toContain('Testing is required');
      expect(result.useWhen).toContain('Validation is needed');
    });

    it('should parse input table correctly', () => {
      const content = `# TestSkill

## Description
A test skill

## USE WHEN
- Test

## Keywords
test

## Capabilities
1. Test

## Inputs
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | The name parameter |
| count | number | no | Optional count |
| enabled | boolean | yes | Whether enabled |
`;

      const result = template.parseContent(content);

      expect(result.inputs).toHaveLength(3);
      expect(result.inputs[0]).toEqual({
        name: 'name',
        type: 'string',
        required: true,
        description: 'The name parameter',
      });
      expect(result.inputs[1]).toEqual({
        name: 'count',
        type: 'number',
        required: false,
        description: 'Optional count',
      });
      expect(result.inputs[2]).toEqual({
        name: 'enabled',
        type: 'boolean',
        required: true,
        description: 'Whether enabled',
      });
    });

    it('should parse output table correctly', () => {
      const content = `# TestSkill

## Description
A test skill

## USE WHEN
- Test

## Keywords
test

## Capabilities
1. Test

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation success status |
| data | object | Result data |
`;

      const result = template.parseContent(content);

      expect(result.outputs).toHaveLength(2);
      expect(result.outputs[0]).toEqual({
        name: 'success',
        type: 'boolean',
        description: 'Operation success status',
      });
      expect(result.outputs[1]).toEqual({
        name: 'data',
        type: 'object',
        description: 'Result data',
      });
    });

    it('should parse workflows and tools', () => {
      const content = `# TestSkill

## Description
A test skill

## USE WHEN
- Test

## Keywords
test

## Capabilities
1. Test

## Workflows
- [Create](./Workflows/Create.md) - Create workflow
- [Update](./Workflows/Update.md) - Update workflow

## Tools
- [execute](./Tools/execute.ts) - Execute tool
- **helper**: Helper tool
`;

      const result = template.parseContent(content);

      expect(result.workflows).toHaveLength(2);
      expect(result.workflows).toContain('Create');
      expect(result.workflows).toContain('Update');
      expect(result.tools).toHaveLength(2);
      expect(result.tools).toContain('execute');
      expect(result.tools).toContain('helper');
    });

    it('should parse notes section', () => {
      const content = `# TestSkill

## Description
A test skill

## USE WHEN
- Test

## Keywords
test

## Capabilities
1. Test

## Notes
This skill has specific limitations to be aware of.
`;

      const result = template.parseContent(content);

      expect(result.notes).toBe('This skill has specific limitations to be aware of.');
    });
  });

  describe('parseSkillMd', () => {
    it('should parse SKILL.md from file path', async () => {
      const skillPath = join(testDir, 'ParseTest');
      mkdirSync(skillPath, { recursive: true });
      writeFileSync(
        join(skillPath, 'SKILL.md'),
        `# ParseTest

## Description
A skill for parsing tests

## USE WHEN
- User wants to parse
- Parsing is needed

## Keywords
parse, extract, read

## Capabilities
1. Parse data
2. Extract information
`
      );

      const result = await template.parseSkillMd(skillPath);

      expect(result.name).toBe('ParseTest');
      expect(result.description).toBe('A skill for parsing tests');
      expect(result.useWhen).toHaveLength(2);
      expect(result.keywords).toEqual(['parse', 'extract', 'read']);
      expect(result.capabilities).toHaveLength(2);
    });

    it('should throw error for missing SKILL.md', async () => {
      const skillPath = join(testDir, 'NoSkillMd');
      mkdirSync(skillPath, { recursive: true });

      await expect(template.parseSkillMd(skillPath)).rejects.toThrow('SKILL.md not found');
    });
  });

  // =========================================================================
  // Generation Tests
  // =========================================================================

  describe('generate', () => {
    it('should create correct directory structure', async () => {
      const config: SkillGeneratorConfig = {
        name: 'GenerateTest',
        description: 'A test skill',
        useWhen: ['Test condition'],
        keywords: ['test'],
        hasWorkflows: true,
        hasTools: true,
        hasData: false,
      };

      const skillPath = await template.generate(config, testDir);

      expect(existsSync(skillPath)).toBe(true);
      expect(existsSync(join(skillPath, 'SKILL.md'))).toBe(true);
      expect(existsSync(join(skillPath, 'Workflows'))).toBe(true);
      expect(existsSync(join(skillPath, 'Tools'))).toBe(true);
      expect(existsSync(join(skillPath, 'Data'))).toBe(false);
    });

    it('should generate valid SKILL.md content', async () => {
      const config: SkillGeneratorConfig = {
        name: 'ContentTest',
        description: 'Testing content generation',
        useWhen: ['User wants to test'],
        keywords: ['test', 'content'],
        hasWorkflows: true,
        hasTools: true,
        hasData: true,
      };

      const skillPath = await template.generate(config, testDir);

      // Parse the generated file
      const result = await template.parseSkillMd(skillPath);

      expect(result.name).toBe('ContentTest');
      expect(result.description).toBe('Testing content generation');
      expect(result.useWhen).toContain('User wants to test');
      expect(result.keywords).toEqual(['test', 'content']);
    });

    it('should handle partial configs (missing optional directories)', async () => {
      const config: SkillGeneratorConfig = {
        name: 'MinimalTest',
        description: 'Minimal skill',
        useWhen: ['Test'],
        keywords: ['minimal'],
        hasWorkflows: false,
        hasTools: false,
        hasData: false,
      };

      const skillPath = await template.generate(config, testDir);

      expect(existsSync(skillPath)).toBe(true);
      expect(existsSync(join(skillPath, 'SKILL.md'))).toBe(true);
      expect(existsSync(join(skillPath, 'Workflows'))).toBe(false);
      expect(existsSync(join(skillPath, 'Tools'))).toBe(false);
      expect(existsSync(join(skillPath, 'Data'))).toBe(false);
    });

    it('should create Data directory when specified', async () => {
      const config: SkillGeneratorConfig = {
        name: 'DataTest',
        description: 'Skill with data',
        useWhen: ['Test'],
        keywords: ['data'],
        hasWorkflows: false,
        hasTools: false,
        hasData: true,
      };

      const skillPath = await template.generate(config, testDir);

      expect(existsSync(join(skillPath, 'Data'))).toBe(true);
    });
  });

  // =========================================================================
  // Directory Structure Tests
  // =========================================================================

  describe('getDirectoryStructure', () => {
    it('should return correct structure info', () => {
      const skillPath = join(testDir, 'StructureTest');
      mkdirSync(skillPath, { recursive: true });
      mkdirSync(join(skillPath, 'Workflows'), { recursive: true });
      mkdirSync(join(skillPath, 'Tools'), { recursive: true });

      const structure = template.getDirectoryStructure(skillPath);

      expect(structure.skillName).toBe('StructureTest');
      expect(structure.hasWorkflows).toBe(true);
      expect(structure.hasTools).toBe(true);
      expect(structure.hasData).toBe(false);
    });

    it('should detect all optional directories', () => {
      const skillPath = join(testDir, 'FullStructure');
      mkdirSync(skillPath, { recursive: true });
      mkdirSync(join(skillPath, 'Workflows'), { recursive: true });
      mkdirSync(join(skillPath, 'Tools'), { recursive: true });
      mkdirSync(join(skillPath, 'Data'), { recursive: true });

      const structure = template.getDirectoryStructure(skillPath);

      expect(structure.hasWorkflows).toBe(true);
      expect(structure.hasTools).toBe(true);
      expect(structure.hasData).toBe(true);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      const result = template.parseContent('');

      expect(result.name).toBe('');
      expect(result.useWhen).toHaveLength(0);
      expect(result.keywords).toHaveLength(0);
    });

    it('should skip template placeholders when parsing', () => {
      // Parse the actual template - placeholders should be skipped
      const result = template.parseContent(SKILL_TEMPLATE_MD);

      expect(result.name).toBe('{SkillName}');
      // Placeholders starting with { should be filtered out
      expect(result.useWhen).toHaveLength(0);
      expect(result.keywords).toHaveLength(0);
      expect(result.capabilities).toHaveLength(0);
    });

    it('should normalize unknown types to string', () => {
      const content = `# TestSkill

## Description
Test

## USE WHEN
- Test

## Keywords
test

## Capabilities
1. Test

## Inputs
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| custom | CustomType | yes | Custom type param |
`;

      const result = template.parseContent(content);

      expect(result.inputs[0].type).toBe('string');
    });
  });
});
