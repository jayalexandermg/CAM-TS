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
      warnings,
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
      security: ['file_read', 'code_execute', 'memory_read'],
    };
    return defaults[agentType.toLowerCase()] || defaults.default;
  }
}
