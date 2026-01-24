/**
 * Skill Templates Module
 *
 * Provides canonical skill template, validation, parsing, and generation.
 * All CAM skills should follow the structure defined by this module.
 */

export {
  SkillTemplate,
  SkillInput,
  SkillOutput,
  TemplateSkillDefinition,
  SkillDirectoryStructure,
  ValidationResult,
  SkillGeneratorConfig,
} from './SkillTemplate';

/**
 * Canonical SKILL.md template content.
 * Use this as a reference when creating new skills.
 */
export const SKILL_TEMPLATE_MD = `# {SkillName}

## Description
{Brief description of what this skill does - 1-2 sentences}

## USE WHEN
- {Trigger condition 1 - when should this skill be invoked}
- {Trigger condition 2}
- {Trigger condition 3}

## Keywords
{comma-separated keywords for intent matching}

## Capabilities
1. {Capability 1 - specific thing this skill can do}
2. {Capability 2}
3. {Capability 3}

## Inputs
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| {param1}  | string | yes | {description} |
| {param2}  | number | no | {description with default value} |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| {field1} | string | {what this output contains} |
| {field2} | boolean | {what this indicates} |

## Example Usage
\`\`\`typescript
const result = await invoke('{SkillName}', {
  param1: 'example value',
  param2: 42
});
\`\`\`

## Workflows
- [{Workflow1}](./Workflows/Workflow1.md) - {brief description}

## Tools
- [{Tool1}](./Tools/Tool1.ts) - {brief description}

## Notes
{Any additional notes, limitations, or considerations}
`;
