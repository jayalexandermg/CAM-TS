# Prompt_29

```
PROMPT 29: Agent Profile Format

[CONTEXT]
CAM Enhancement - Phase 9: Base Agents Expansion
Repository: /home/ubuntu/github_repos/CAM-TS

PAI uses structured MD files with YAML frontmatter for agent definitions.

[TASK]
Define and implement the standard agent profile format.

## Part 1: Create src/agents/profiles/ProfileSchema.ts
```typescript
export interface AgentProfile {
  // Frontmatter fields
  name: string;
  description: string;
  model?: string;
  color?: string;
  voiceId?: string;
  permissions: string[];
  skills: string[];
  traits?: string[];

  // Parsed from markdown body
  systemPrompt: string;
  capabilities: string[];
  constraints: string[];
  contextFile?: string;
}

export interface ProfileFrontmatter {
  name: string;
  description: string;
  model?: string;
  color?: string;
  voiceId?: string;
  permissions?: string[];
  skills?: string[];
  traits?: string[];
}

export interface ProfileValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ProfileSchema {
  /**
   * Validate profile frontmatter
   */
  validateFrontmatter(frontmatter: ProfileFrontmatter): ProfileValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!frontmatter.name || frontmatter.name.trim() === '') {
      errors.push('Profile must have a name');
    }
    if (!frontmatter.description || frontmatter.description.trim() === '') {
      errors.push('Profile must have a description');
    }
    if (!frontmatter.permissions || frontmatter.permissions.length === 0) {
      warnings.push('Profile has no permissions defined');
    }
    if (!frontmatter.skills || frontmatter.skills.length === 0) {
      warnings.push('Profile has no skills linked');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get default permissions for agent type
   */
  getDefaultPermissions(agentType: string): string[] {
    const defaults: Record<string, string[]> = {
      default: ['memory_read', 'memory_write'],
      engineer: ['file_read', 'file_write', 'code_execute', 'memory_read', 'memory_write'],
      researcher: ['web_search', 'memory_read', 'memory_write', 'file_read'],
      coordinator: ['agent_spawn', 'memory_read', 'memory_write'],
      security: ['file_read', 'code_execute', 'memory_read']
    };
    return defaults[agentType.toLowerCase()] || defaults.default;
  }
}
```

## Part 2: Create src/agents/profiles/ProfileLoader.ts
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { AgentProfile, ProfileFrontmatter, ProfileSchema, ProfileValidation } from './ProfileSchema';

export class ProfileLoader {
  private schema: ProfileSchema;
  private profilesDir: string;
  private cache: Map<string, AgentProfile> = new Map();

  constructor(profilesDir?: string) {
    this.schema = new ProfileSchema();
    this.profilesDir = profilesDir || './src/agents/definitions';
  }

  /**
   * Load a single profile from file
   */
  async load(profilePath: string): Promise<AgentProfile> {
    const content = await fs.readFile(profilePath, 'utf-8');
    return this.parse(content);
  }

  /**
   * Parse profile content (frontmatter + markdown)
   */
  parse(content: string): AgentProfile {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error('Invalid profile format: missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]) as ProfileFrontmatter;
    const markdownBody = frontmatterMatch[2];

    // Validate frontmatter
    const validation = this.schema.validateFrontmatter(frontmatter);
    if (!validation.valid) {
      throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);
    }

    // Parse markdown sections
    const capabilities = this.parseSection(markdownBody, 'Capabilities');
    const constraints = this.parseSection(markdownBody, 'Constraints');

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      model: frontmatter.model,
      color: frontmatter.color,
      voiceId: frontmatter.voiceId,
      permissions: frontmatter.permissions || [],
      skills: frontmatter.skills || [],
      traits: frontmatter.traits,
      systemPrompt: markdownBody.trim(),
      capabilities,
      constraints,
      contextFile: `${frontmatter.name}Context.md`
    };
  }

  /**
   * Load all profiles from directory
   */
  async loadAll(): Promise<Map<string, AgentProfile>> {
    const files = await fs.readdir(this.profilesDir);
    const profiles = new Map<string, AgentProfile>();

    for (const file of files) {
      if (file.endsWith('.md') && !file.includes('Context')) {
        const profilePath = path.join(this.profilesDir, file);
        const profile = await this.load(profilePath);
        profiles.set(profile.name, profile);
        this.cache.set(profile.name, profile);
      }
    }

    return profiles;
  }

  /**
   * Get cached profile by name
   */
  get(name: string): AgentProfile | undefined {
    return this.cache.get(name);
  }

  /**
   * List available profile names
   */
  async listProfiles(): Promise<string[]> {
    const files = await fs.readdir(this.profilesDir);
    return files
      .filter(f => f.endsWith('.md') && !f.includes('Context'))
      .map(f => f.replace('.md', ''));
  }

  private parseSection(markdown: string, sectionName: string): string[] {
    const sectionRegex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = markdown.match(sectionRegex);

    if (!match) return [];

    // Parse numbered or bulleted list
    const items = match[1].match(/^[\d\-\*]\.\s*(.+)$/gm) || [];
    return items.map(item => item.replace(/^[\d\-\*]\.\s*/, '').trim());
  }
}
```

## Part 3: Create src/agents/profiles/index.ts
```typescript
export { ProfileSchema, AgentProfile, ProfileFrontmatter, ProfileValidation } from './ProfileSchema';
export { ProfileLoader } from './ProfileLoader';
```

## Part 4: Create docs/agent-profile-format.md
Document the profile format with examples.

## Part 5: Convert existing 4 agents to new format
Create src/agents/definitions/ with:
- Default.md
- Researcher.md
- Coder.md
- Coordinator.md

Example Default.md:
```markdown
---
name: Default
description: General-purpose assistant for standard tasks
model: claude-3-5-sonnet
color: "#6366F1"
permissions:
  - memory_read
  - memory_write
skills:
  - CoreSkill
  - Analysis
  - Communication
---

# Default Agent

You are a helpful general-purpose assistant capable of handling a wide variety of tasks.

## Capabilities
1. Answer questions clearly and accurately
2. Help with writing and editing
3. Provide analysis and recommendations
4. Remember context from our conversation

## Constraints
- Stay within scope of the current task
- Ask for clarification when needed
- Acknowledge limitations honestly
```

## Part 6: Create tests/agents/profiles/ProfileLoader.test.ts
Write 15+ tests

[VERIFICATION]
Show me:
1. ProfileSchema.ts content
2. ProfileLoader.ts content
3. All 4 converted agent profiles
4. Test output

[SUCCESS CRITERIA]
✅ Profile format documented
✅ ProfileLoader parses frontmatter correctly
✅ Existing 4 agents converted to new format
✅ 15+ tests passing
```

end of Prompt_29
