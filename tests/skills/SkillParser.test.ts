import { SkillParser } from '../../src/skills/SkillParser';
import { SkillDefinition } from '../../src/skills/types';

describe('SkillParser', () => {
  // =========================================================================
  // parseSkillFile Tests
  // =========================================================================

  describe('parseSkillFile', () => {
    it('should parse a valid SKILL.md file', () => {
      const content = `# Test Skill

## Description
This is a test skill.

## USE WHEN
- User asks about testing
- User mentions "test"

## Capabilities
- Capability 1
- Capability 2

## Workflows
- **workflow-1**: First workflow
- **workflow-2**: Second workflow

## Tools
- **tool-1**: First tool
- **tool-2**: Second tool

## Context
Additional context here.

## Examples
### Example 1
**User:** Test input
**Response:** Test output
`;

      const definition = SkillParser.parseSkillFile(content);

      expect(definition.name).toBe('Test Skill');
      expect(definition.description).toBe('This is a test skill.');
      expect(definition.useWhen).toEqual(['User asks about testing', 'User mentions "test"']);
      expect(definition.capabilities).toEqual(['Capability 1', 'Capability 2']);
      expect(definition.workflows).toEqual([
        { name: 'workflow-1', description: 'First workflow' },
        { name: 'workflow-2', description: 'Second workflow' },
      ]);
      expect(definition.tools).toEqual([
        { name: 'tool-1', description: 'First tool' },
        { name: 'tool-2', description: 'Second tool' },
      ]);
      expect(definition.context).toBe('Additional context here.');
      expect(definition.examples).toEqual([{ user: 'Test input', response: 'Test output' }]);
    });

    it('should parse skill name from H1 header', () => {
      const content = `# My Amazing Skill

## Description
Description here.

## USE WHEN
- Some condition

## Capabilities
- Cap 1

## Workflows
- **wf**: Workflow

## Tools
- **tool**: Tool
`;

      const definition = SkillParser.parseSkillFile(content);
      expect(definition.name).toBe('My Amazing Skill');
    });

    it('should handle missing optional sections', () => {
      const content = `# Minimal Skill

## Description
A minimal skill.

## USE WHEN
- Some condition

## Capabilities
- One capability

## Workflows
- **wf**: Workflow

## Tools
- **tool**: Tool
`;

      const definition = SkillParser.parseSkillFile(content);

      expect(definition.name).toBe('Minimal Skill');
      expect(definition.description).toBe('A minimal skill.');
      expect(definition.context).toBeUndefined();
      expect(definition.examples).toBeUndefined();
    });

    it('should parse multiple USE WHEN conditions', () => {
      const content = `# Multi Condition Skill

## Description
Has many conditions.

## USE WHEN
- Condition one
- Condition two
- Condition three

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T
`;

      const definition = SkillParser.parseSkillFile(content);
      expect(definition.useWhen).toHaveLength(3);
      expect(definition.useWhen[0]).toBe('Condition one');
      expect(definition.useWhen[1]).toBe('Condition two');
      expect(definition.useWhen[2]).toBe('Condition three');
    });

    it('should parse multiple examples', () => {
      const content = `# Example Skill

## Description
Has examples.

## USE WHEN
- Condition

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T

## Examples
### Example 1
**User:** First user input
**Response:** First response

### Example 2
**User:** Second user input
**Response:** Second response
`;

      const definition = SkillParser.parseSkillFile(content);
      expect(definition.examples).toHaveLength(2);
      expect(definition.examples![0].user).toBe('First user input');
      expect(definition.examples![0].response).toBe('First response');
      expect(definition.examples![1].user).toBe('Second user input');
      expect(definition.examples![1].response).toBe('Second response');
    });

    it('should handle workflows without bold formatting', () => {
      const content = `# Plain Skill

## Description
Plain formatting.

## USE WHEN
- Cond

## Capabilities
- Cap

## Workflows
- simple-workflow: Simple workflow description

## Tools
- simple-tool: Simple tool description
`;

      const definition = SkillParser.parseSkillFile(content);
      expect(definition.workflows).toEqual([
        { name: 'simple-workflow', description: 'Simple workflow description' },
      ]);
      expect(definition.tools).toEqual([
        { name: 'simple-tool', description: 'Simple tool description' },
      ]);
    });

    it('should handle empty description gracefully', () => {
      const content = `# Empty Description

## Description

## USE WHEN
- Cond

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T
`;

      const definition = SkillParser.parseSkillFile(content);
      expect(definition.description).toBe('');
    });

    it('should parse multiline context', () => {
      const content = `# Context Skill

## Description
Has context.

## USE WHEN
- Cond

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T

## Context
Line one of context.
Line two of context.
Line three of context.
`;

      const definition = SkillParser.parseSkillFile(content);
      expect(definition.context).toContain('Line one of context.');
      expect(definition.context).toContain('Line two of context.');
    });
  });

  // =========================================================================
  // generateSkillFile Tests
  // =========================================================================

  describe('generateSkillFile', () => {
    it('should generate valid SKILL.md content', () => {
      const definition: SkillDefinition = {
        name: 'Generated Skill',
        description: 'A generated skill.',
        useWhen: ['User requests generation'],
        capabilities: ['Generate things'],
        workflows: [{ name: 'gen-workflow', description: 'Generation workflow' }],
        tools: [{ name: 'gen-tool', description: 'Generation tool' }],
      };

      const content = SkillParser.generateSkillFile(definition);

      expect(content).toContain('# Generated Skill');
      expect(content).toContain('## Description');
      expect(content).toContain('A generated skill.');
      expect(content).toContain('## USE WHEN');
      expect(content).toContain('- User requests generation');
      expect(content).toContain('## Capabilities');
      expect(content).toContain('- Generate things');
      expect(content).toContain('## Workflows');
      expect(content).toContain('- **gen-workflow**: Generation workflow');
      expect(content).toContain('## Tools');
      expect(content).toContain('- **gen-tool**: Generation tool');
    });

    it('should include optional context when provided', () => {
      const definition: SkillDefinition = {
        name: 'Context Skill',
        description: 'Skill with context.',
        useWhen: ['Cond'],
        capabilities: ['Cap'],
        workflows: [{ name: 'wf', description: 'W' }],
        tools: [{ name: 't', description: 'T' }],
        context: 'This is the context.',
      };

      const content = SkillParser.generateSkillFile(definition);

      expect(content).toContain('## Context');
      expect(content).toContain('This is the context.');
    });

    it('should include examples when provided', () => {
      const definition: SkillDefinition = {
        name: 'Example Skill',
        description: 'Skill with examples.',
        useWhen: ['Cond'],
        capabilities: ['Cap'],
        workflows: [{ name: 'wf', description: 'W' }],
        tools: [{ name: 't', description: 'T' }],
        examples: [
          { user: 'Example user input', response: 'Example response' },
        ],
      };

      const content = SkillParser.generateSkillFile(definition);

      expect(content).toContain('## Examples');
      expect(content).toContain('### Example 1');
      expect(content).toContain('**User:** Example user input');
      expect(content).toContain('**Response:** Example response');
    });

    it('should be parseable after generation (round-trip)', () => {
      const original: SkillDefinition = {
        name: 'Round Trip Skill',
        description: 'Tests round trip.',
        useWhen: ['Condition 1', 'Condition 2'],
        capabilities: ['Cap 1', 'Cap 2'],
        workflows: [
          { name: 'wf-1', description: 'Workflow 1' },
          { name: 'wf-2', description: 'Workflow 2' },
        ],
        tools: [
          { name: 'tool-1', description: 'Tool 1' },
          { name: 'tool-2', description: 'Tool 2' },
        ],
        context: 'Context info.',
        examples: [
          { user: 'Input 1', response: 'Output 1' },
          { user: 'Input 2', response: 'Output 2' },
        ],
      };

      const content = SkillParser.generateSkillFile(original);
      const parsed = SkillParser.parseSkillFile(content);

      expect(parsed.name).toBe(original.name);
      expect(parsed.description).toBe(original.description);
      expect(parsed.useWhen).toEqual(original.useWhen);
      expect(parsed.capabilities).toEqual(original.capabilities);
      expect(parsed.workflows).toEqual(original.workflows);
      expect(parsed.tools).toEqual(original.tools);
      expect(parsed.context).toBe(original.context);
      expect(parsed.examples).toEqual(original.examples);
    });
  });

  // =========================================================================
  // validateStructure Tests
  // =========================================================================

  describe('validateStructure', () => {
    it('should validate a complete valid SKILL.md', () => {
      const content = `# Valid Skill

## Description
A valid skill.

## USE WHEN
- Some condition

## Capabilities
- Cap 1

## Workflows
- **wf**: Workflow

## Tools
- **t**: Tool
`;

      const result = SkillParser.validateStructure(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for empty content', () => {
      const result = SkillParser.validateStructure('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SKILL.md content is empty');
    });

    it('should return error for missing skill name', () => {
      const content = `## Description
A skill without name.

## USE WHEN
- Condition

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T
`;

      const result = SkillParser.validateStructure(content);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing skill name (# header)');
    });

    it('should return error for missing description section', () => {
      const content = `# Missing Description

## USE WHEN
- Condition

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T
`;

      const result = SkillParser.validateStructure(content);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('DESCRIPTION'))).toBe(true);
    });

    it('should return error for missing USE WHEN section', () => {
      const content = `# No Use When

## Description
A description.

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T
`;

      const result = SkillParser.validateStructure(content);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('USE WHEN'))).toBe(true);
    });

    it('should return warning for missing capabilities', () => {
      const content = `# No Capabilities

## Description
A description.

## USE WHEN
- Condition

## Capabilities

## Workflows
- **wf**: W

## Tools
- **t**: T
`;

      const result = SkillParser.validateStructure(content);

      expect(result.warnings).toContain('No capabilities defined');
    });

    it('should return warning for missing workflows', () => {
      const content = `# No Workflows

## Description
A description.

## USE WHEN
- Condition

## Capabilities
- Cap

## Workflows

## Tools
- **t**: T
`;

      const result = SkillParser.validateStructure(content);

      expect(result.warnings).toContain('No workflows defined');
    });

    it('should return warning for missing tools', () => {
      const content = `# No Tools

## Description
A description.

## USE WHEN
- Condition

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
`;

      const result = SkillParser.validateStructure(content);

      expect(result.warnings).toContain('No tools defined');
    });

    it('should return error for empty USE WHEN conditions', () => {
      const content = `# Empty Use When

## Description
A description.

## USE WHEN

## Capabilities
- Cap

## Workflows
- **wf**: W

## Tools
- **t**: T
`;

      const result = SkillParser.validateStructure(content);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('USE WHEN'))).toBe(true);
    });
  });
});
