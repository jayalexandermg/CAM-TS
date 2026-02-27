/**
 * SkillPreferencesManager - Manages skill customization preferences
 *
 * Provides a preference system allowing user-specific skill customization
 * with SYSTEM defaults and USER overrides.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { SkillPreferences, SYSTEM_DEFAULTS } from './types';

export class SkillPreferencesManager {
  private userConfigDir: string;
  private cache: Map<string, SkillPreferences> = new Map();

  constructor(userConfigDir?: string) {
    this.userConfigDir = userConfigDir || './config/skill-customizations';
  }

  /**
   * Get preferences for a skill (merged: system defaults + user overrides)
   */
  async getPreferences(skillName: string): Promise<SkillPreferences> {
    if (this.cache.has(skillName)) {
      return this.cache.get(skillName)!;
    }

    const userPrefs = await this.loadUserPreferences(skillName);
    const merged = this.mergeWithDefaults(userPrefs);

    this.cache.set(skillName, merged);
    return merged;
  }

  /**
   * Set user preferences for a skill
   */
  async setPreferences(skillName: string, prefs: Partial<SkillPreferences>): Promise<void> {
    const existing = await this.loadUserPreferences(skillName);
    const updated = { ...existing, ...prefs };

    await this.saveUserPreferences(skillName, updated);
    this.cache.delete(skillName); // Invalidate cache
  }

  /**
   * Reset skill to system defaults
   */
  async resetPreferences(skillName: string): Promise<void> {
    const filePath = this.getPreferencesPath(skillName);
    await fs.unlink(filePath).catch(() => {}); // Ignore if not exists
    this.cache.delete(skillName);
  }

  /**
   * Apply preferences to a skill prompt
   */
  applyToPrompt(basePrompt: string, prefs: SkillPreferences): string {
    let modified = basePrompt;

    // Add format instructions
    if (prefs.outputFormat === 'concise') {
      modified += '\n\nProvide a concise response, focusing on key points only.';
    } else if (prefs.outputFormat === 'json') {
      modified += '\n\nRespond in valid JSON format.';
    } else if (prefs.outputFormat === 'markdown') {
      modified += '\n\nFormat the response using Markdown syntax.';
    }

    // Add language instruction
    if (prefs.language && prefs.language !== 'en') {
      modified += `\n\nRespond in ${prefs.language}.`;
    }

    // Add custom instructions
    if (prefs.additionalInstructions?.length) {
      modified += '\n\nAdditional instructions:';
      for (const instruction of prefs.additionalInstructions) {
        modified += `\n- ${instruction}`;
      }
    }

    return modified;
  }

  /**
   * Check if skill is disabled
   */
  async isDisabled(skillName: string): Promise<boolean> {
    const prefs = await this.getPreferences(skillName);
    return prefs.disabled === true;
  }

  /**
   * Get effective priority for a skill (used in routing)
   */
  async getPriority(skillName: string): Promise<number> {
    const prefs = await this.getPreferences(skillName);
    return prefs.priority ?? SYSTEM_DEFAULTS.priority;
  }

  /**
   * Get custom keywords for a skill (used in routing)
   */
  async getCustomKeywords(skillName: string): Promise<string[]> {
    const prefs = await this.getPreferences(skillName);
    return prefs.customKeywords ?? [];
  }

  /**
   * Get timeout for a skill
   */
  async getTimeout(skillName: string): Promise<number> {
    const prefs = await this.getPreferences(skillName);
    return prefs.timeout ?? SYSTEM_DEFAULTS.timeout;
  }

  /**
   * Clear the preferences cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Load user preferences from YAML file
   */
  private async loadUserPreferences(skillName: string): Promise<SkillPreferences> {
    const filePath = this.getPreferencesPath(skillName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = yaml.parse(content);
      return parsed ?? {}; // Handle empty file (parses to null)
    } catch {
      return {}; // No user preferences
    }
  }

  /**
   * Save user preferences to YAML file
   */
  private async saveUserPreferences(skillName: string, prefs: SkillPreferences): Promise<void> {
    const filePath = this.getPreferencesPath(skillName);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, yaml.stringify(prefs));
  }

  /**
   * Get path to preferences file for a skill
   */
  private getPreferencesPath(skillName: string): string {
    return path.join(this.userConfigDir, skillName, 'PREFERENCES.yaml');
  }

  /**
   * Merge user preferences with system defaults
   */
  private mergeWithDefaults(userPrefs: SkillPreferences): SkillPreferences {
    return {
      outputFormat: userPrefs.outputFormat ?? SYSTEM_DEFAULTS.outputFormat,
      language: userPrefs.language ?? SYSTEM_DEFAULTS.language,
      timeout: userPrefs.timeout ?? SYSTEM_DEFAULTS.timeout,
      priority: userPrefs.priority ?? SYSTEM_DEFAULTS.priority,
      additionalInstructions: userPrefs.additionalInstructions ?? [],
      disabled: userPrefs.disabled ?? false,
      customKeywords: userPrefs.customKeywords ?? [],
    };
  }
}
