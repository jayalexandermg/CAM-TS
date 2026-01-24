 Prompt_27

```
PROMPT 27: Skill Customization System

[CONTEXT]
CAM Enhancement - Phase 8: Skills Enhancement
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 26 (USE WHEN Routing)

Implement a preference system allowing user-specific skill customization.

[TASK]
Create the skill customization system with SYSTEM defaults and USER overrides.

## Part 1: Create src/skills/customization/types.ts
```typescript
export interface SkillPreferences {
  outputFormat?: 'concise' | 'detailed' | 'json' | 'markdown';
  language?: string;
  additionalInstructions?: string[];
  disabled?: boolean;
  priority?: number;  // Affects routing preference
  customKeywords?: string[];  // Additional routing keywords
  timeout?: number;  // Custom timeout in ms
}

export interface UserSkillConfig {
  skillName: string;
  preferences: SkillPreferences;
  updatedAt: Date;
}

export interface SystemDefaults {
  outputFormat: 'detailed';
  language: 'en';
  timeout: 30000;
  priority: 50;
}
```

## Part 2: Create src/skills/customization/SkillPreferences.ts
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { SkillPreferences, UserSkillConfig, SystemDefaults } from './types';

const SYSTEM_DEFAULTS: SystemDefaults = {
  outputFormat: 'detailed',
  language: 'en',
  timeout: 30000,
  priority: 50
};

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
  async setPreferences(
    skillName: string,
    prefs: Partial<SkillPreferences>
  ): Promise<void> {
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

  private async loadUserPreferences(skillName: string): Promise<SkillPreferences> {
    const filePath = this.getPreferencesPath(skillName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return yaml.parse(content) as SkillPreferences;
    } catch {
      return {}; // No user preferences
    }
  }

  private async saveUserPreferences(
    skillName: string,
    prefs: SkillPreferences
  ): Promise<void> {
    const filePath = this.getPreferencesPath(skillName);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, yaml.stringify(prefs));
  }

  private getPreferencesPath(skillName: string): string {
    return path.join(this.userConfigDir, skillName, 'PREFERENCES.yaml');
  }

  private mergeWithDefaults(userPrefs: SkillPreferences): SkillPreferences {
    return {
      outputFormat: userPrefs.outputFormat || SYSTEM_DEFAULTS.outputFormat,
      language: userPrefs.language || SYSTEM_DEFAULTS.language,
      timeout: userPrefs.timeout || SYSTEM_DEFAULTS.timeout,
      priority: userPrefs.priority || SYSTEM_DEFAULTS.priority,
      additionalInstructions: userPrefs.additionalInstructions || [],
      disabled: userPrefs.disabled || false,
      customKeywords: userPrefs.customKeywords || []
    };
  }
}
```

## Part 3: Create src/skills/customization/index.ts
```typescript
export * from './types';
export { SkillPreferencesManager } from './SkillPreferences';
```

## Part 4: Create tests/skills/customization/SkillPreferences.test.ts
Write 12+ tests

[VERIFICATION]
Show me:
1. SkillPreferences.ts content
2. Test output

[SUCCESS CRITERIA]
✅ Preferences persist per skill
✅ SYSTEM defaults + USER overrides pattern works
✅ Prompt modification working
✅ 12+ tests passing
```

end of Prompt_27
