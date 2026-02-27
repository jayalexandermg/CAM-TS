/**
 * SkillTemplate - Skill Template System
 *
 * Provides interfaces, validation, and generation for canonical skill templates.
 * This system ensures all CAM skills follow a standardized structure.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// =========================================================================
// Interfaces
// =========================================================================

/**
 * Input parameter definition for a skill
 */
export interface SkillInput {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** Whether the parameter is required */
  required: boolean;
  /** Description of the parameter */
  description: string;
  /** Default value for optional parameters */
  default?: unknown;
}

/**
 * Output field definition for a skill
 */
export interface SkillOutput {
  /** Field name */
  name: string;
  /** Field type */
  type: string;
  /** Description of what this output contains */
  description: string;
}

/**
 * Complete skill definition parsed from SKILL.md template
 */
export interface TemplateSkillDefinition {
  /** Skill name */
  name: string;
  /** Brief description of what this skill does */
  description: string;
  /** USE WHEN conditions - when the skill should be invoked */
  useWhen: string[];
  /** Comma-separated keywords for intent matching */
  keywords: string[];
  /** List of capabilities this skill provides */
  capabilities: string[];
  /** Input parameter definitions */
  inputs: SkillInput[];
  /** Output field definitions */
  outputs: SkillOutput[];
  /** Workflow references */
  workflows?: string[];
  /** Tool references */
  tools?: string[];
  /** Additional notes, limitations, or considerations */
  notes?: string;
}

/**
 * Skill directory structure information
 */
export interface SkillDirectoryStructure {
  /** Name of the skill */
  skillName: string;
  /** Whether the skill has a Workflows directory */
  hasWorkflows: boolean;
  /** Whether the skill has a Tools directory */
  hasTools: boolean;
  /** Whether the skill has a Data directory */
  hasData: boolean;
}

/**
 * Result of skill validation
 */
export interface ValidationResult {
  /** Whether the skill is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings?: string[];
}

/**
 * Configuration for generating a new skill from template
 */
export interface SkillGeneratorConfig {
  /** Skill name (TitleCase) */
  name: string;
  /** Brief description of the skill */
  description: string;
  /** USE WHEN conditions for skill activation */
  useWhen: string[];
  /** Keywords for intent matching */
  keywords: string[];
  /** Whether to create Workflows directory */
  hasWorkflows: boolean;
  /** Whether to create Tools directory */
  hasTools: boolean;
  /** Whether to create Data directory */
  hasData: boolean;
}

// =========================================================================
// Constants
// =========================================================================

/** Name of the skill definition file */
const SKILL_MD = 'SKILL.md';

/** Directories that may exist in a skill */
const SKILL_DIRS = {
  WORKFLOWS: 'Workflows',
  TOOLS: 'Tools',
  DATA: 'Data',
} as const;

// =========================================================================
// SkillTemplate Class
// =========================================================================

/**
 * Skill Template System
 *
 * Provides validation, parsing, and generation for canonical skill templates.
 * Ensures all CAM skills follow a standardized structure.
 */
export class SkillTemplate {
  /**
   * Validate a skill directory structure
   * @param skillPath - Path to the skill directory
   * @returns Validation result with errors and warnings
   */
  async validateStructure(skillPath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if directory exists
    if (!existsSync(skillPath)) {
      errors.push(`Skill directory does not exist: ${skillPath}`);
      return { valid: false, errors, warnings };
    }

    // Check SKILL.md exists
    const skillMdPath = join(skillPath, SKILL_MD);
    if (!existsSync(skillMdPath)) {
      errors.push(`Missing required file: ${SKILL_MD}`);
      return { valid: false, errors, warnings };
    }

    // Check optional directories
    const workflowsPath = join(skillPath, SKILL_DIRS.WORKFLOWS);
    const toolsPath = join(skillPath, SKILL_DIRS.TOOLS);
    const dataPath = join(skillPath, SKILL_DIRS.DATA);

    if (!existsSync(workflowsPath)) {
      warnings.push(`Optional directory not found: ${SKILL_DIRS.WORKFLOWS}`);
    }

    if (!existsSync(toolsPath)) {
      warnings.push(`Optional directory not found: ${SKILL_DIRS.TOOLS}`);
    }

    if (!existsSync(dataPath)) {
      warnings.push(`Optional directory not found: ${SKILL_DIRS.DATA}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Parse SKILL.md into TemplateSkillDefinition
   * @param skillPath - Path to the skill directory containing SKILL.md
   * @returns Parsed skill definition
   * @throws Error if SKILL.md cannot be read or parsed
   */
  async parseSkillMd(skillPath: string): Promise<TemplateSkillDefinition> {
    const skillMdPath = join(skillPath, SKILL_MD);

    if (!existsSync(skillMdPath)) {
      throw new Error(`SKILL.md not found at: ${skillMdPath}`);
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    return this.parseContent(content);
  }

  /**
   * Parse SKILL.md content string into TemplateSkillDefinition
   * @param content - Raw markdown content
   * @returns Parsed skill definition
   */
  parseContent(content: string): TemplateSkillDefinition {
    const definition: TemplateSkillDefinition = {
      name: '',
      description: '',
      useWhen: [],
      keywords: [],
      capabilities: [],
      inputs: [],
      outputs: [],
      workflows: [],
      tools: [],
      notes: undefined,
    };

    const lines = content.split('\n');
    let currentSection = '';
    let isInInputsTable = false;
    let isInOutputsTable = false;
    let inputsHeaderParsed = false;
    let outputsHeaderParsed = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Parse skill name from H1 header
      if (trimmed.startsWith('# ') && !definition.name) {
        definition.name = trimmed.substring(2).trim();
        continue;
      }

      // Check for section headers (H2)
      if (trimmed.startsWith('## ')) {
        currentSection = trimmed.substring(3).trim().toLowerCase();
        isInInputsTable = currentSection === 'inputs';
        isInOutputsTable = currentSection === 'outputs';
        inputsHeaderParsed = false;
        outputsHeaderParsed = false;
        continue;
      }

      // Parse content based on section
      switch (currentSection) {
        case 'description':
          if (trimmed && !trimmed.startsWith('{')) {
            definition.description = trimmed;
          }
          break;

        case 'use when':
          if (trimmed.startsWith('-')) {
            const condition = trimmed.substring(1).trim();
            if (condition && !condition.startsWith('{')) {
              definition.useWhen.push(condition);
            }
          }
          break;

        case 'keywords':
          if (trimmed && !trimmed.startsWith('{')) {
            definition.keywords = trimmed
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean);
          }
          break;

        case 'capabilities':
          if (/^\d+\./.test(trimmed)) {
            const capability = trimmed.replace(/^\d+\.\s*/, '').trim();
            if (capability && !capability.startsWith('{')) {
              definition.capabilities.push(capability);
            }
          }
          break;

        case 'inputs':
          if (isInInputsTable && trimmed.startsWith('|')) {
            // Skip header row and separator
            if (trimmed.includes('Parameter') || trimmed.includes('---')) {
              inputsHeaderParsed = true;
              continue;
            }
            if (inputsHeaderParsed) {
              const input = this.parseInputRow(trimmed);
              if (input && !input.name.startsWith('{')) {
                definition.inputs.push(input);
              }
            }
          }
          break;

        case 'outputs':
          if (isInOutputsTable && trimmed.startsWith('|')) {
            // Skip header row and separator
            if (trimmed.includes('Field') || trimmed.includes('---')) {
              outputsHeaderParsed = true;
              continue;
            }
            if (outputsHeaderParsed) {
              const output = this.parseOutputRow(trimmed);
              if (output && !output.name.startsWith('{')) {
                definition.outputs.push(output);
              }
            }
          }
          break;

        case 'workflows':
          if (trimmed.startsWith('-')) {
            const workflow = this.parseWorkflowOrTool(trimmed);
            if (workflow && !workflow.startsWith('{')) {
              definition.workflows!.push(workflow);
            }
          }
          break;

        case 'tools':
          if (trimmed.startsWith('-')) {
            const tool = this.parseWorkflowOrTool(trimmed);
            if (tool && !tool.startsWith('{')) {
              definition.tools!.push(tool);
            }
          }
          break;

        case 'notes':
          if (trimmed && !trimmed.startsWith('{')) {
            definition.notes = trimmed;
          }
          break;
      }
    }

    // Clean up empty arrays
    if (definition.workflows?.length === 0) {
      definition.workflows = undefined;
    }
    if (definition.tools?.length === 0) {
      definition.tools = undefined;
    }

    return definition;
  }

  /**
   * Generate skill directory from template
   * @param config - Skill generator configuration
   * @param basePath - Base path where skill should be created
   * @returns Path to the created skill directory
   */
  async generate(config: SkillGeneratorConfig, basePath: string): Promise<string> {
    const skillPath = join(basePath, config.name);

    // Create main skill directory
    if (!existsSync(skillPath)) {
      mkdirSync(skillPath, { recursive: true });
    }

    // Create optional directories
    if (config.hasWorkflows) {
      const workflowsPath = join(skillPath, SKILL_DIRS.WORKFLOWS);
      if (!existsSync(workflowsPath)) {
        mkdirSync(workflowsPath, { recursive: true });
      }
    }

    if (config.hasTools) {
      const toolsPath = join(skillPath, SKILL_DIRS.TOOLS);
      if (!existsSync(toolsPath)) {
        mkdirSync(toolsPath, { recursive: true });
      }
    }

    if (config.hasData) {
      const dataPath = join(skillPath, SKILL_DIRS.DATA);
      if (!existsSync(dataPath)) {
        mkdirSync(dataPath, { recursive: true });
      }
    }

    // Generate SKILL.md content
    const skillMd = this.generateSkillMd(config);
    writeFileSync(join(skillPath, SKILL_MD), skillMd);

    return skillPath;
  }

  /**
   * Validate skill definition completeness
   * @param skill - Skill definition to validate
   * @returns Validation result
   */
  validateDefinition(skill: TemplateSkillDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!skill.name || skill.name.trim() === '') {
      errors.push('Missing skill name');
    }

    if (!skill.description || skill.description.trim() === '') {
      errors.push('Missing description');
    }

    if (!skill.useWhen || skill.useWhen.length === 0) {
      errors.push('Missing USE WHEN triggers');
    }

    if (!skill.keywords || skill.keywords.length === 0) {
      errors.push('Missing keywords');
    }

    if (!skill.capabilities || skill.capabilities.length === 0) {
      errors.push('Missing capabilities');
    }

    // Warnings for optional fields
    if (!skill.inputs || skill.inputs.length === 0) {
      warnings.push('No inputs defined');
    }

    if (!skill.outputs || skill.outputs.length === 0) {
      warnings.push('No outputs defined');
    }

    if (!skill.workflows || skill.workflows.length === 0) {
      warnings.push('No workflows defined');
    }

    if (!skill.tools || skill.tools.length === 0) {
      warnings.push('No tools defined');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get directory structure information for a skill
   * @param skillPath - Path to the skill directory
   * @returns Directory structure info
   */
  getDirectoryStructure(skillPath: string): SkillDirectoryStructure {
    const parts = skillPath.split('/');
    const skillName = parts[parts.length - 1] || '';

    return {
      skillName,
      hasWorkflows: existsSync(join(skillPath, SKILL_DIRS.WORKFLOWS)),
      hasTools: existsSync(join(skillPath, SKILL_DIRS.TOOLS)),
      hasData: existsSync(join(skillPath, SKILL_DIRS.DATA)),
    };
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Parse an input table row
   * @param row - Table row string
   * @returns Parsed SkillInput or null
   */
  private parseInputRow(row: string): SkillInput | null {
    const cells = row
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 4) {
      return null;
    }

    const [name, type, required, description] = cells;
    return {
      name: name.trim(),
      type: this.normalizeType(type.trim()),
      required: required.toLowerCase() === 'yes',
      description: description.trim(),
    };
  }

  /**
   * Parse an output table row
   * @param row - Table row string
   * @returns Parsed SkillOutput or null
   */
  private parseOutputRow(row: string): SkillOutput | null {
    const cells = row
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 3) {
      return null;
    }

    const [name, type, description] = cells;
    return {
      name: name.trim(),
      type: type.trim(),
      description: description.trim(),
    };
  }

  /**
   * Normalize type string to valid SkillInput type
   * @param type - Raw type string
   * @returns Normalized type
   */
  private normalizeType(type: string): SkillInput['type'] {
    const normalized = type.toLowerCase();
    if (['string', 'number', 'boolean', 'object', 'array'].includes(normalized)) {
      return normalized as SkillInput['type'];
    }
    return 'string'; // Default to string for unknown types
  }

  /**
   * Parse a workflow or tool line
   * @param line - Markdown list item
   * @returns Extracted name or null
   */
  private parseWorkflowOrTool(line: string): string | null {
    const trimmed = line.substring(1).trim();

    // Try to parse [Name](path) format
    const linkMatch = trimmed.match(/^\[([^\]]+)\]/);
    if (linkMatch) {
      return linkMatch[1];
    }

    // Try to parse **Name**: description format
    const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      return boldMatch[1];
    }

    // Extract text before dash or colon
    const simpleMatch = trimmed.match(/^([^-:]+)/);
    if (simpleMatch) {
      return simpleMatch[1].trim();
    }

    return trimmed || null;
  }

  /**
   * Generate SKILL.md content from config
   * @param config - Generator configuration
   * @returns SKILL.md content string
   */
  private generateSkillMd(config: SkillGeneratorConfig): string {
    const sections: string[] = [];

    // Header
    sections.push(`# ${config.name}`);
    sections.push('');

    // Description
    sections.push('## Description');
    sections.push(config.description);
    sections.push('');

    // USE WHEN
    sections.push('## USE WHEN');
    for (const condition of config.useWhen) {
      sections.push(`- ${condition}`);
    }
    sections.push('');

    // Keywords
    sections.push('## Keywords');
    sections.push(config.keywords.join(', '));
    sections.push('');

    // Capabilities
    sections.push('## Capabilities');
    sections.push(`1. Execute ${config.name} operations`);
    sections.push(`2. Process ${config.name} requests`);
    sections.push(`3. Handle ${config.name} workflows`);
    sections.push('');

    // Inputs
    sections.push('## Inputs');
    sections.push('| Parameter | Type | Required | Description |');
    sections.push('|-----------|------|----------|-------------|');
    sections.push('| input | string | yes | Primary input for the operation |');
    sections.push('| options | object | no | Additional configuration options |');
    sections.push('');

    // Outputs
    sections.push('## Outputs');
    sections.push('| Field | Type | Description |');
    sections.push('|-------|------|-------------|');
    sections.push('| success | boolean | Whether the operation succeeded |');
    sections.push('| result | object | Operation result data |');
    sections.push('');

    // Example Usage
    sections.push('## Example Usage');
    sections.push('```typescript');
    sections.push(`const result = await invoke('${config.name}', {`);
    sections.push("  input: 'example value',");
    sections.push('  options: {}');
    sections.push('});');
    sections.push('```');
    sections.push('');

    // Workflows
    if (config.hasWorkflows) {
      sections.push('## Workflows');
      sections.push(`- [Default](./Workflows/Default.md) - Default workflow for ${config.name}`);
      sections.push('');
    }

    // Tools
    if (config.hasTools) {
      sections.push('## Tools');
      sections.push(`- [execute](./Tools/execute.ts) - Execute ${config.name} operations`);
      sections.push('');
    }

    // Notes
    sections.push('## Notes');
    sections.push(`${config.name} skill notes and considerations.`);
    sections.push('');

    return sections.join('\n');
  }
}
