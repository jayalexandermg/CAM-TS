 Prompt_25

```
PROMPT 25: Skill Template System

[CONTEXT]
CAM Enhancement - Phase 8: Skills Enhancement
Repository: /home/ubuntu/github_repos/CAM-TS

PAI has a standardized skill structure. This prompt creates the canonical skill template for all CAM skills.

[TASK]
Create the skill template system with standard structure and validation.

## Part 1: Create Directory Structure
```bash
mkdir -p src/skills/templates
mkdir -p src/skills/routing
mkdir -p src/skills/customization
mkdir -p src/skills/CreateSkill
```

## Part 2: Create src/skills/templates/SKILL_TEMPLATE.md
```markdown
# {SkillName}

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
```

## Part 3: Create src/skills/templates/SkillTemplate.ts
```typescript
export interface SkillDefinition {
  name: string;
  description: string;
  useWhen: string[];
  keywords: string[];
  capabilities: string[];
  inputs: SkillInput[];
  outputs: SkillOutput[];
  workflows?: string[];
  tools?: string[];
  notes?: string;
}

export interface SkillInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface SkillOutput {
  name: string;
  type: string;
  description: string;
}

export interface SkillDirectoryStructure {
  skillName: string;
  hasWorkflows: boolean;
  hasTools: boolean;
  hasData: boolean;
}

export class SkillTemplate {
  /**
   * Validate a skill directory structure
   */
  async validateStructure(skillPath: string): Promise<ValidationResult> {
    // Check SKILL.md exists
    // Check optional Workflows/ directory
    // Check optional Tools/ directory
    // Check optional Data/ directory
  }

  /**
   * Parse SKILL.md into SkillDefinition
   */
  async parseSkillMd(skillPath: string): Promise<SkillDefinition> {
    // Read SKILL.md
    // Parse sections
    // Extract USE WHEN triggers
    // Extract keywords
    // Return structured definition
  }

  /**
   * Generate skill directory from template
   */
  async generate(config: SkillGeneratorConfig): Promise<string> {
    // Create directories
    // Render SKILL.md from template
    // Return created path
  }

  /**
   * Validate skill definition completeness
   */
  validateDefinition(skill: SkillDefinition): ValidationResult {
    const errors: string[] = [];
    if (!skill.name) errors.push('Missing skill name');
    if (!skill.description) errors.push('Missing description');
    if (skill.useWhen.length === 0) errors.push('Missing USE WHEN triggers');
    if (skill.keywords.length === 0) errors.push('Missing keywords');
    // ... more validations
    return { valid: errors.length === 0, errors };
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface SkillGeneratorConfig {
  name: string;
  description: string;
  useWhen: string[];
  keywords: string[];
  hasWorkflows: boolean;
  hasTools: boolean;
  hasData: boolean;
}
```

## Part 4: Create src/skills/templates/index.ts
```typescript
export * from './SkillTemplate';
export { SKILL_TEMPLATE_MD } from './SKILL_TEMPLATE.md'; // Export as string constant
```

## Part 5: Create tests/skills/templates/SkillTemplate.test.ts
Write 12+ tests:
- Template renders correctly with all fields
- Validation catches missing required fields
- Structure validation detects missing SKILL.md
- Keywords parsed correctly
- USE WHEN triggers extracted
- Input/output tables parsed
- Generate creates correct directory structure
- Partial configs handled (missing optional fields)

[VERIFICATION]
Show me:
1. SKILL_TEMPLATE.md content
2. SkillTemplate.ts content
3. Test output: pnpm test tests/skills/templates/
4. Generated example skill structure

[SUCCESS CRITERIA]
✅ SKILL_TEMPLATE.md comprehensive template created
✅ SkillTemplate.ts implements validation and parsing
✅ All interfaces exported
✅ 12+ tests passing
✅ Template renders valid markdown
```

end of Prompt_25
