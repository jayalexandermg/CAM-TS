/**
 * SkillGenerator - Skill Scaffolding Generator
 *
 * Generates complete skill directory structure with SKILL.md definition,
 * workflow documentation, TypeScript tool stubs, and proper exports.
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// =========================================================================
// Types
// =========================================================================

/**
 * Configuration for generating a new skill
 */
export interface SkillConfig {
  /** Skill name in TitleCase (e.g., MySkill, DataAnalyzer) */
  name: string;
  /** Brief description of the skill's purpose */
  description: string;
  /** Skill category for organization */
  category?: string;
  /** Skill author name */
  author?: string;
  /** Semantic version string */
  version?: string;
  /** Required permissions */
  permissions?: string[];
  /** Activation conditions */
  use_when?: string[];
}

/**
 * Result of skill generation
 */
export interface GenerationResult {
  /** Whether generation succeeded */
  success: boolean;
  /** Path to created skill directory */
  path: string;
  /** List of created files */
  files: string[];
  /** Any errors encountered */
  errors: string[];
}

// =========================================================================
// Constants
// =========================================================================

/** Regex pattern for TitleCase validation */
const TITLE_CASE_REGEX = /^[A-Z][a-zA-Z0-9]*$/;

/** Default values for optional config fields */
const DEFAULTS = {
  version: '1.0.0',
  author: 'CAM User',
  category: 'general',
  permissions: ['file_read'],
} as const;

// =========================================================================
// SkillGenerator Class
// =========================================================================

/**
 * Generates complete skill directory structure with all required files.
 *
 * Creates:
 * - SKILL.md with YAML frontmatter
 * - Workflows/Default.md with workflow template
 * - Tools/index.ts with TypeScript interfaces and stubs
 * - index.ts with skill exports
 */
export class SkillGenerator {
  private readonly basePath: string;

  /**
   * Create a new SkillGenerator
   * @param basePath - Base path for skills directory (e.g., 'src/skills')
   */
  constructor(basePath: string) {
    this.basePath = basePath;
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  /**
   * Generate a new skill from configuration
   * @param config - Skill configuration
   * @returns Generation result with success status, path, and files created
   */
  generate(config: SkillConfig): GenerationResult {
    const files: string[] = [];

    // Validate configuration
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      return {
        success: false,
        path: '',
        files: [],
        errors: validationErrors,
      };
    }

    // Check if skill already exists
    const skillPath = join(this.basePath, config.name);
    if (existsSync(skillPath)) {
      return {
        success: false,
        path: skillPath,
        files: [],
        errors: [`Skill '${config.name}' already exists at ${skillPath}`],
      };
    }

    // Apply defaults
    const fullConfig = this.applyDefaults(config);

    try {
      // Create directory structure
      this.createDirectories(skillPath);

      // Generate files
      const skillMdPath = join(skillPath, 'SKILL.md');
      writeFileSync(skillMdPath, this.generateSkillMd(fullConfig));
      files.push('SKILL.md');

      const workflowPath = join(skillPath, 'Workflows', 'Default.md');
      writeFileSync(workflowPath, this.generateWorkflowMd(fullConfig));
      files.push('Workflows/Default.md');

      const toolsIndexPath = join(skillPath, 'Tools', 'index.ts');
      writeFileSync(toolsIndexPath, this.generateToolsIndex(fullConfig));
      files.push('Tools/index.ts');

      const indexPath = join(skillPath, 'index.ts');
      writeFileSync(indexPath, this.generateIndex(fullConfig));
      files.push('index.ts');

      return {
        success: true,
        path: skillPath,
        files,
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        path: skillPath,
        files,
        errors: [`Failed to generate skill: ${message}`],
      };
    }
  }

  // =========================================================================
  // Validation
  // =========================================================================

  /**
   * Validate skill configuration
   * @param config - Configuration to validate
   * @returns Array of validation error messages
   */
  private validateConfig(config: SkillConfig): string[] {
    const errors: string[] = [];

    // Check required fields
    if (!config.name || config.name.trim() === '') {
      errors.push('Skill name is required');
      return errors;
    }

    if (!config.description || config.description.trim() === '') {
      errors.push('Skill description is required');
      return errors;
    }

    // Check for spaces first (before regex)
    if (config.name.includes(' ')) {
      errors.push(
        `Invalid skill name '${config.name}': name must be TitleCase (e.g., MySkill, DataAnalyzer), spaces not allowed`
      );
      return errors;
    }

    // Check for all lowercase
    if (config.name === config.name.toLowerCase()) {
      errors.push(
        `Invalid skill name '${config.name}': name must be TitleCase (e.g., MySkill, DataAnalyzer), not lowercase`
      );
      return errors;
    }

    // Check for all uppercase (more than 1 char)
    if (config.name.length > 1 && config.name === config.name.toUpperCase()) {
      errors.push(
        `Invalid skill name '${config.name}': name must be TitleCase (e.g., MySkill, DataAnalyzer), not UPPERCASE`
      );
      return errors;
    }

    // Validate TitleCase pattern (starts with uppercase, followed by alphanumeric)
    if (!TITLE_CASE_REGEX.test(config.name)) {
      errors.push(
        `Invalid skill name '${config.name}': name must be TitleCase starting with uppercase letter (e.g., MySkill, DataAnalyzer)`
      );
    }

    return errors;
  }

  // =========================================================================
  // Defaults
  // =========================================================================

  /**
   * Apply default values to configuration
   * @param config - Original configuration
   * @returns Configuration with defaults applied
   */
  private applyDefaults(config: SkillConfig): Required<SkillConfig> {
    return {
      name: config.name,
      description: config.description,
      category: config.category ?? DEFAULTS.category,
      author: config.author ?? DEFAULTS.author,
      version: config.version ?? DEFAULTS.version,
      permissions: config.permissions ?? [...DEFAULTS.permissions],
      use_when: config.use_when ?? [`use ${config.name.toLowerCase()}`],
    };
  }

  // =========================================================================
  // Directory Creation
  // =========================================================================

  /**
   * Create skill directory structure
   * @param skillPath - Path to skill directory
   */
  private createDirectories(skillPath: string): void {
    mkdirSync(skillPath, { recursive: true });
    mkdirSync(join(skillPath, 'Workflows'), { recursive: true });
    mkdirSync(join(skillPath, 'Tools'), { recursive: true });
  }

  // =========================================================================
  // File Generation
  // =========================================================================

  /**
   * Generate SKILL.md content with YAML frontmatter
   * @param config - Full skill configuration
   * @returns SKILL.md file content
   */
  private generateSkillMd(config: Required<SkillConfig>): string {
    const frontmatter = [
      '---',
      `name: ${config.name}`,
      `description: ${config.description}`,
      `version: '${config.version}'`,
      `author: ${config.author}`,
      `category: ${config.category}`,
      'permissions:',
      ...config.permissions.map((p) => `  - ${p}`),
      'use_when:',
      ...config.use_when.map((u) => `  - ${u}`),
      '---',
    ].join('\n');

    const body = `
# ${config.name}

## Description

${config.description}

## USE WHEN

${config.use_when.map((u) => `- ${u}`).join('\n')}

## Capabilities

- Execute ${config.name} operations
- Process ${config.name} requests

## Workflows

- **Default**: Default workflow for ${config.name}

## Tools

- **execute**: Execute ${config.name} operations

## Context

${config.name} skill context is loaded when activated.
`;

    return frontmatter + body;
  }

  /**
   * Generate Workflows/Default.md content
   * @param config - Full skill configuration
   * @returns Workflow markdown content
   */
  private generateWorkflowMd(config: Required<SkillConfig>): string {
    return `# Default Workflow

## Purpose

Execute the default ${config.name} workflow.

## Steps

1. **Receive Input**
   - Accept input parameters from user request

2. **Validate Input**
   - Verify required parameters are present
   - Check parameter types and formats

3. **Process Request**
   - Execute ${config.name} logic
   - Handle any errors gracefully

4. **Return Result**
   - Format and return the result

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| input | string | Yes | - | Primary input for the operation |
| options | object | No | {} | Additional options |

## Output Format

\`\`\`typescript
interface ${config.name}Output {
  success: boolean;
  result: unknown;
  error?: string;
}
\`\`\`
`;
  }

  /**
   * Generate Tools/index.ts content
   * @param config - Full skill configuration
   * @returns TypeScript file content
   */
  private generateToolsIndex(config: Required<SkillConfig>): string {
    return `/**
 * ${config.name} Tools
 *
 * TypeScript interfaces and functions for ${config.name} skill.
 */

// =========================================================================
// Types
// =========================================================================

/**
 * Options for ${config.name} operations
 */
export interface ${config.name}Options {
  /** Primary input for the operation */
  input: string;
  /** Additional configuration options */
  config?: Record<string, unknown>;
}

/**
 * Result of ${config.name} operations
 */
export interface ${config.name}Result {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data */
  data?: unknown;
  /** Error message if failed */
  error?: string;
}

// =========================================================================
// Functions
// =========================================================================

/**
 * Execute ${config.name} operation
 * @param options - Operation options
 * @returns Operation result
 */
export async function execute(options: ${config.name}Options): Promise<${config.name}Result> {
  // TODO: Implement ${config.name} logic
  return {
    success: true,
    data: {
      input: options.input,
      processed: true,
    },
  };
}
`;
  }

  /**
   * Generate index.ts content
   * @param config - Full skill configuration
   * @returns TypeScript file content
   */
  private generateIndex(config: Required<SkillConfig>): string {
    return `/**
 * ${config.name} Skill
 *
 * ${config.description}
 */

export * from './Tools';
`;
  }
}
