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

// =========================================================================
// Intent Matching Types
// =========================================================================

/**
 * Result of matching a request against a skill
 */
export interface IntentMatch {
  /** The matched skill */
  skill: Skill;
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  /** List of USE WHEN conditions that matched */
  matchedConditions: string[];
  /** Human-readable reason for the match */
  reason: string;
}

// =========================================================================
// Routing Types
// =========================================================================

/**
 * Options for routing a request
 */
export interface RoutingOptions {
  /** Minimum confidence threshold (default: 0.5) */
  minConfidence?: number;
  /** Allow multiple skill matches (default: false) */
  allowMultiple?: boolean;
  /** Prefer a specific skill if it matches */
  preferredSkill?: string;
}

/**
 * Result of routing a request to a skill
 */
export interface RoutingResult {
  /** The matched skill (or null if no match) */
  skill: Skill | null;
  /** Confidence score of the match */
  confidence: number;
  /** Alternative skill matches */
  alternatives: IntentMatch[];
  /** Whether routing was successful */
  routed: boolean;
  /** Human-readable reason for the routing decision */
  reason: string;
}

/**
 * Record of a routing decision
 */
export interface RoutingEntry {
  /** When the routing occurred */
  timestamp: Date;
  /** The user's request */
  request: string;
  /** The skill that was selected (or null) */
  skill: string | null;
  /** Confidence score */
  confidence: number;
  /** Reason for the routing decision */
  reason: string;
}

// =========================================================================
// Skill Activation Types
// =========================================================================

/**
 * Context provided when activating a skill
 */
export interface SkillContext {
  /** Description of the current task */
  taskDescription?: string;
  /** Relevant memory snippets to include */
  relevantMemory?: string[];
  /** Additional user context */
  userContext?: string;
}

/**
 * An active skill with its activation state
 */
export interface ActiveSkill {
  /** The active skill */
  skill: Skill;
  /** When the skill was activated */
  activatedAt: Date;
  /** Context provided during activation */
  context?: SkillContext;
  /** List of available workflow files */
  workflows: string[];
  /** List of available tool files */
  tools: string[];
}

/**
 * Result of attempting to activate a skill
 */
export interface ActivationResult {
  /** Whether activation was successful */
  activated: boolean;
  /** The activated skill (or null if failed) */
  skill: Skill | null;
  /** Human-readable reason for the result */
  reason: string;
  /** Confidence score from routing (if applicable) */
  confidence: number;
}

/**
 * Options for skill activation
 */
export interface ActivationOptions {
  /** Minimum confidence threshold for automatic activation */
  minConfidence?: number;
  /** Whether to force activation even if another skill is active */
  force?: boolean;
  /** Preferred skill to activate if ambiguous */
  preferredSkill?: string;
}
