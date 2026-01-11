/**
 * Skill System Types
 *
 * Type definitions for the skill management system.
 * Skills are self-contained units with definitions, workflows, tools, and reference docs.
 */

/**
 * Workflow reference within a skill definition
 */
export interface SkillWorkflow {
  /** Workflow name */
  name: string;
  /** Brief description of what this workflow does */
  description: string;
}

/**
 * Tool reference within a skill definition
 */
export interface SkillTool {
  /** Tool name */
  name: string;
  /** Brief description of what this tool does */
  description: string;
}

/**
 * Example interaction for a skill
 */
export interface SkillExample {
  /** Example user request */
  user: string;
  /** Example response using this skill */
  response: string;
}

/**
 * Skill definition parsed from SKILL.md
 */
export interface SkillDefinition {
  /** Skill name (from header) */
  name: string;
  /** Brief description of what this skill does */
  description: string;
  /** USE WHEN conditions - natural language conditions for activation */
  useWhen: string[];
  /** List of capabilities this skill provides */
  capabilities: string[];
  /** Workflow references */
  workflows: SkillWorkflow[];
  /** Tool references */
  tools: SkillTool[];
  /** Additional context loaded when skill activates */
  context?: string;
  /** Example interactions */
  examples?: SkillExample[];
}

/**
 * Complete skill with definition and file references
 */
export interface Skill {
  /** Skill name (directory name) */
  name: string;
  /** Absolute path to skill directory */
  path: string;
  /** Parsed skill definition from SKILL.md */
  definition: SkillDefinition;
  /** List of workflow file paths (relative to skill directory) */
  workflows: string[];
  /** List of tool file paths (relative to skill directory) */
  tools: string[];
  /** List of reference file paths (relative to skill directory) */
  reference: string[];
}

/**
 * Validation result for skill structure
 */
export interface SkillValidationResult {
  /** Whether the skill is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}

/**
 * Options for creating a new skill
 */
export interface CreateSkillOptions {
  /** Whether to create example workflow file */
  createExampleWorkflow?: boolean;
  /** Whether to create example tool file */
  createExampleTool?: boolean;
  /** Whether to create example reference file */
  createExampleReference?: boolean;
}

/**
 * Skill directory structure constants
 */
export const SKILL_STRUCTURE = {
  /** Skill definition file name */
  DEFINITION_FILE: 'SKILL.md',
  /** Workflows subdirectory name */
  WORKFLOWS_DIR: 'Workflows',
  /** Tools subdirectory name */
  TOOLS_DIR: 'Tools',
  /** Reference subdirectory name */
  REFERENCE_DIR: 'Reference',
} as const;

/**
 * Skills directory name within memory
 */
export const SKILLS_DIR = 'SKILLS';
