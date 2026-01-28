/**
 * Skill Customization Types
 *
 * Type definitions for the skill customization system.
 * Supports SYSTEM defaults with USER overrides for skill preferences.
 */

/**
 * User-customizable preferences for a skill
 */
export interface SkillPreferences {
  /** Output format preference */
  outputFormat?: 'concise' | 'detailed' | 'json' | 'markdown';
  /** Response language (ISO 639-1 code) */
  language?: string;
  /** Additional instructions to append to skill prompts */
  additionalInstructions?: string[];
  /** Whether the skill is disabled */
  disabled?: boolean;
  /** Priority for routing (higher = preferred) */
  priority?: number;
  /** Additional keywords for routing */
  customKeywords?: string[];
  /** Custom timeout in milliseconds */
  timeout?: number;
}

/**
 * User-specific skill configuration
 */
export interface UserSkillConfig {
  /** Name of the skill being configured */
  skillName: string;
  /** User preferences for this skill */
  preferences: SkillPreferences;
  /** When the configuration was last updated */
  updatedAt: Date;
}

/**
 * System default values for skill preferences
 */
export interface SystemDefaults {
  /** Default output format */
  outputFormat: 'detailed';
  /** Default language */
  language: 'en';
  /** Default timeout in milliseconds */
  timeout: 30000;
  /** Default priority */
  priority: 50;
}

/**
 * System defaults constant
 */
export const SYSTEM_DEFAULTS: SystemDefaults = {
  outputFormat: 'detailed',
  language: 'en',
  timeout: 30000,
  priority: 50,
};
