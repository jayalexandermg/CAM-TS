 Prompt_28

```
PROMPT 28: CreateSkill Workflow

[CONTEXT]
CAM Enhancement - Phase 8: Skills Enhancement
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 27 (Skill Customization)

Create a skill that generates new skills from templates.

[TASK]
Implement the CreateSkill skill for automated skill scaffolding.

## Part 1: Create src/skills/CreateSkill/SKILL.md
```markdown
# CreateSkill

## Description
Generates new CAM skills from templates with validation and canonicalization.

## USE WHEN
- User wants to create a new skill
- User says "create skill", "new skill", "add skill"
- User needs to scaffold a skill structure

## Keywords
create, new, skill, scaffold, generate, add, template

## Capabilities
1. Generate skill directory structure
2. Create SKILL.md from template
3. Validate skill name and structure
4. Canonicalize skill names to TitleCase
5. Generate initial test file

## Inputs
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | Name of the skill to create |
| description | string | yes | Brief description of what the skill does |
| useWhen | string[] | yes | Trigger conditions for the skill |
| keywords | string[] | no | Keywords for intent matching |
| hasWorkflows | boolean | no | Include Workflows/ directory (default: false) |
| hasTools | boolean | no | Include Tools/ directory (default: false) |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| path | string | Path to created skill directory |
| files | string[] | List of created files |
| valid | boolean | Whether validation passed |

## Example Usage
```typescript
const result = await invoke('CreateSkill', {
  name: 'DataAnalysis',
  description: 'Analyzes datasets and provides insights',
  useWhen: ['User wants to analyze data', 'User has a CSV or dataset'],
  keywords: ['analyze', 'data', 'statistics', 'insights'],
  hasTools: true
});
```
```

## Part 2: Create src/skills/CreateSkill/Tools/SkillGenerator.ts
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { SkillTemplate, SkillGeneratorConfig, ValidationResult } from '../../templates/SkillTemplate';

export interface GenerationResult {
  success: boolean;
  path: string;
  files: string[];
  errors: string[];
}

export class SkillGenerator {
  private template: SkillTemplate;
  private skillsDir: string;

  constructor(skillsDir?: string) {
    this.template = new SkillTemplate();
    this.skillsDir = skillsDir || './src/skills';
  }

  /**
   * Generate a new skill from configuration
   */
  async generate(config: SkillGeneratorConfig): Promise<GenerationResult> {
    const errors: string[] = [];
    const files: string[] = [];

    // Canonicalize name
    const canonicalName = this.canonicalize(config.name);
    const skillPath = path.join(this.skillsDir, canonicalName);

    // Check if skill already exists
    try {
      await fs.access(skillPath);
      return {
        success: false,
        path: skillPath,
        files: [],
        errors: [`Skill "${canonicalName}" already exists at ${skillPath}`]
      };
    } catch {
      // Directory doesn't exist, continue
    }

    try {
      // Create directories
      await fs.mkdir(skillPath, { recursive: true });
      files.push(skillPath);

      if (config.hasWorkflows) {
        await fs.mkdir(path.join(skillPath, 'Workflows'), { recursive: true });
        files.push(path.join(skillPath, 'Workflows'));
      }

      if (config.hasTools) {
        await fs.mkdir(path.join(skillPath, 'Tools'), { recursive: true });
        files.push(path.join(skillPath, 'Tools'));
      }

      if (config.hasData) {
        await fs.mkdir(path.join(skillPath, 'Data'), { recursive: true });
        files.push(path.join(skillPath, 'Data'));
      }

      // Generate SKILL.md
      const skillMd = this.renderSkillMd(config, canonicalName);
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      await fs.writeFile(skillMdPath, skillMd);
      files.push(skillMdPath);

      // Generate index.ts
      const indexTs = this.renderIndexTs(canonicalName);
      const indexPath = path.join(skillPath, 'index.ts');
      await fs.writeFile(indexPath, indexTs);
      files.push(indexPath);

      // Validate generated skill
      const validation = await this.validate(skillPath);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }

      return {
        success: errors.length === 0,
        path: skillPath,
        files,
        errors
      };
    } catch (error) {
      return {
        success: false,
        path: skillPath,
        files,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Validate a skill directory
   */
  async validate(skillPath: string): Promise<ValidationResult> {
    return this.template.validateStructure(skillPath);
  }

  /**
   * Canonicalize skill name to TitleCase
   */
  canonicalize(name: string): string {
    // Remove special characters
    const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, '');

    // Convert to TitleCase
    return cleaned
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private renderSkillMd(config: SkillGeneratorConfig, canonicalName: string): string {
    return `# ${canonicalName}

## Description
${config.description}

## USE WHEN
${config.useWhen.map(t => `- ${t}`).join('\n')}

## Keywords
${(config.keywords || []).join(', ')}

## Capabilities
1. [Describe capability 1]
2. [Describe capability 2]

## Inputs
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| [param] | [type] | [yes/no] | [description] |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| [field] | [type] | [description] |

## Example Usage
\`\`\`typescript
const result = await invoke('${canonicalName}', {
  // parameters
});
\`\`\`

${config.hasWorkflows ? '## Workflows\n- [WorkflowName](./Workflows/WorkflowName.md)\n' : ''}
${config.hasTools ? '## Tools\n- [ToolName](./Tools/ToolName.ts)\n' : ''}
`;
  }

  private renderIndexTs(canonicalName: string): string {
    return `// ${canonicalName} Skill
// Auto-generated by CreateSkill

export const skillName = '${canonicalName}';

export async function invoke(params: Record<string, unknown>): Promise<unknown> {
  // TODO: Implement skill logic
  throw new Error('${canonicalName} skill not yet implemented');
}
`;
  }
}
```

## Part 3: Create src/skills/CreateSkill/Workflows/CreateNewSkill.md
Document the workflow steps

## Part 4: Create src/skills/CreateSkill/index.ts
Export skill entry point

## Part 5: Create tests/skills/CreateSkill/CreateSkill.test.ts
Write 15+ tests

[VERIFICATION]
Show me:
1. SKILL.md content
2. SkillGenerator.ts content
3. Generated example skill structure
4. Test output

[SUCCESS CRITERIA]
✅ CreateSkill generates valid skill structure
✅ Name canonicalization works (e.g., "data analysis" → "DataAnalysis")
✅ Generated skills load correctly
✅ 15+ tests passing
```

end of Prompt_28
