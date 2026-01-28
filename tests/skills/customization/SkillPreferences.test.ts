/**
 * SkillPreferencesManager Tests
 *
 * Tests for the skill customization system with SYSTEM defaults and USER overrides.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { SkillPreferencesManager } from '../../../src/skills/customization/SkillPreferences';
import { SkillPreferences, SYSTEM_DEFAULTS } from '../../../src/skills/customization/types';

describe('SkillPreferencesManager', () => {
  let manager: SkillPreferencesManager;
  const testConfigDir = './test-config-skill-prefs';

  beforeEach(async () => {
    manager = new SkillPreferencesManager(testConfigDir);
    // Ensure clean state
    await fs.rm(testConfigDir, { recursive: true, force: true }).catch(() => {});
  });

  afterEach(async () => {
    // Cleanup test files
    await fs.rm(testConfigDir, { recursive: true, force: true }).catch(() => {});
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should use provided config directory', () => {
      const customDir = './custom-config';
      const customManager = new SkillPreferencesManager(customDir);
      expect(customManager).toBeDefined();
    });

    it('should use default config directory when not provided', () => {
      const defaultManager = new SkillPreferencesManager();
      expect(defaultManager).toBeDefined();
    });
  });

  // =========================================================================
  // getPreferences Tests
  // =========================================================================

  describe('getPreferences', () => {
    it('should return system defaults when no user preferences exist', async () => {
      const prefs = await manager.getPreferences('nonexistent-skill');

      expect(prefs.outputFormat).toBe(SYSTEM_DEFAULTS.outputFormat);
      expect(prefs.language).toBe(SYSTEM_DEFAULTS.language);
      expect(prefs.timeout).toBe(SYSTEM_DEFAULTS.timeout);
      expect(prefs.priority).toBe(SYSTEM_DEFAULTS.priority);
      expect(prefs.disabled).toBe(false);
      expect(prefs.additionalInstructions).toEqual([]);
      expect(prefs.customKeywords).toEqual([]);
    });

    it('should merge user preferences with system defaults', async () => {
      // Create user preferences
      await manager.setPreferences('test-skill', {
        outputFormat: 'concise',
        language: 'es',
      });

      const prefs = await manager.getPreferences('test-skill');

      expect(prefs.outputFormat).toBe('concise');
      expect(prefs.language).toBe('es');
      expect(prefs.timeout).toBe(SYSTEM_DEFAULTS.timeout);
      expect(prefs.priority).toBe(SYSTEM_DEFAULTS.priority);
    });

    it('should cache preferences after first load', async () => {
      await manager.setPreferences('cached-skill', { outputFormat: 'json' });

      // First call loads from file
      const prefs1 = await manager.getPreferences('cached-skill');

      // Manually delete file to verify cache
      const filePath = path.join(testConfigDir, 'cached-skill', 'PREFERENCES.yaml');
      await fs.unlink(filePath);

      // Second call should return cached value
      const prefs2 = await manager.getPreferences('cached-skill');

      expect(prefs1).toEqual(prefs2);
      expect(prefs2.outputFormat).toBe('json');
    });

    it('should handle empty preferences file gracefully', async () => {
      const skillDir = path.join(testConfigDir, 'empty-skill');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'PREFERENCES.yaml'), '');

      const prefs = await manager.getPreferences('empty-skill');

      expect(prefs.outputFormat).toBe(SYSTEM_DEFAULTS.outputFormat);
    });
  });

  // =========================================================================
  // setPreferences Tests
  // =========================================================================

  describe('setPreferences', () => {
    it('should persist preferences to YAML file', async () => {
      await manager.setPreferences('persisted-skill', {
        outputFormat: 'markdown',
        language: 'fr',
        priority: 75,
      });

      const filePath = path.join(testConfigDir, 'persisted-skill', 'PREFERENCES.yaml');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = yaml.parse(content);

      expect(parsed.outputFormat).toBe('markdown');
      expect(parsed.language).toBe('fr');
      expect(parsed.priority).toBe(75);
    });

    it('should merge with existing preferences', async () => {
      await manager.setPreferences('merge-skill', {
        outputFormat: 'json',
        language: 'de',
      });

      // Clear cache to force reload
      manager.clearCache();

      await manager.setPreferences('merge-skill', {
        priority: 100,
      });

      // Clear cache again to get fresh data
      manager.clearCache();
      const prefs = await manager.getPreferences('merge-skill');

      expect(prefs.outputFormat).toBe('json');
      expect(prefs.language).toBe('de');
      expect(prefs.priority).toBe(100);
    });

    it('should invalidate cache after setting preferences', async () => {
      await manager.setPreferences('cache-invalidate-skill', { outputFormat: 'json' });
      const prefs1 = await manager.getPreferences('cache-invalidate-skill');

      await manager.setPreferences('cache-invalidate-skill', { outputFormat: 'concise' });
      const prefs2 = await manager.getPreferences('cache-invalidate-skill');

      expect(prefs1.outputFormat).toBe('json');
      expect(prefs2.outputFormat).toBe('concise');
    });

    it('should create directory structure if not exists', async () => {
      await manager.setPreferences('new-skill-deep', {
        outputFormat: 'markdown',
      });

      const skillDir = path.join(testConfigDir, 'new-skill-deep');
      const stat = await fs.stat(skillDir);

      expect(stat.isDirectory()).toBe(true);
    });
  });

  // =========================================================================
  // resetPreferences Tests
  // =========================================================================

  describe('resetPreferences', () => {
    it('should delete preferences file', async () => {
      await manager.setPreferences('reset-skill', { outputFormat: 'json' });

      const filePath = path.join(testConfigDir, 'reset-skill', 'PREFERENCES.yaml');
      expect(await fs.stat(filePath).catch(() => null)).not.toBeNull();

      await manager.resetPreferences('reset-skill');

      expect(await fs.stat(filePath).catch(() => null)).toBeNull();
    });

    it('should return system defaults after reset', async () => {
      await manager.setPreferences('reset-defaults-skill', {
        outputFormat: 'concise',
        language: 'ja',
      });

      await manager.resetPreferences('reset-defaults-skill');
      const prefs = await manager.getPreferences('reset-defaults-skill');

      expect(prefs.outputFormat).toBe(SYSTEM_DEFAULTS.outputFormat);
      expect(prefs.language).toBe(SYSTEM_DEFAULTS.language);
    });

    it('should not throw for nonexistent skill', async () => {
      await expect(manager.resetPreferences('nonexistent-reset')).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // applyToPrompt Tests
  // =========================================================================

  describe('applyToPrompt', () => {
    const basePrompt = 'Complete this task.';

    it('should add concise format instruction', () => {
      const prefs: SkillPreferences = { outputFormat: 'concise' };
      const result = manager.applyToPrompt(basePrompt, prefs);

      expect(result).toContain('concise response');
      expect(result).toContain('key points only');
    });

    it('should add json format instruction', () => {
      const prefs: SkillPreferences = { outputFormat: 'json' };
      const result = manager.applyToPrompt(basePrompt, prefs);

      expect(result).toContain('valid JSON format');
    });

    it('should add markdown format instruction', () => {
      const prefs: SkillPreferences = { outputFormat: 'markdown' };
      const result = manager.applyToPrompt(basePrompt, prefs);

      expect(result).toContain('Markdown syntax');
    });

    it('should not modify prompt for detailed format (default)', () => {
      const prefs: SkillPreferences = { outputFormat: 'detailed' };
      const result = manager.applyToPrompt(basePrompt, prefs);

      expect(result).toBe(basePrompt);
    });

    it('should add language instruction for non-English', () => {
      const prefs: SkillPreferences = { language: 'es' };
      const result = manager.applyToPrompt(basePrompt, prefs);

      expect(result).toContain('Respond in es');
    });

    it('should not add language instruction for English', () => {
      const prefs: SkillPreferences = { language: 'en' };
      const result = manager.applyToPrompt(basePrompt, prefs);

      expect(result).toBe(basePrompt);
    });

    it('should add additional instructions', () => {
      const prefs: SkillPreferences = {
        additionalInstructions: ['Be brief', 'Use examples'],
      };
      const result = manager.applyToPrompt(basePrompt, prefs);

      expect(result).toContain('Additional instructions:');
      expect(result).toContain('- Be brief');
      expect(result).toContain('- Use examples');
    });

    it('should combine multiple preferences', () => {
      const prefs: SkillPreferences = {
        outputFormat: 'concise',
        language: 'fr',
        additionalInstructions: ['Include code'],
      };
      const result = manager.applyToPrompt(basePrompt, prefs);

      expect(result).toContain('concise response');
      expect(result).toContain('Respond in fr');
      expect(result).toContain('- Include code');
    });
  });

  // =========================================================================
  // isDisabled Tests
  // =========================================================================

  describe('isDisabled', () => {
    it('should return false by default', async () => {
      const disabled = await manager.isDisabled('enabled-skill');
      expect(disabled).toBe(false);
    });

    it('should return true when skill is disabled', async () => {
      await manager.setPreferences('disabled-skill', { disabled: true });
      const disabled = await manager.isDisabled('disabled-skill');
      expect(disabled).toBe(true);
    });

    it('should return false when explicitly enabled', async () => {
      await manager.setPreferences('explicitly-enabled', { disabled: false });
      const disabled = await manager.isDisabled('explicitly-enabled');
      expect(disabled).toBe(false);
    });
  });

  // =========================================================================
  // getPriority Tests
  // =========================================================================

  describe('getPriority', () => {
    it('should return system default priority when not set', async () => {
      const priority = await manager.getPriority('no-priority-skill');
      expect(priority).toBe(SYSTEM_DEFAULTS.priority);
    });

    it('should return user-defined priority', async () => {
      await manager.setPreferences('high-priority-skill', { priority: 90 });
      const priority = await manager.getPriority('high-priority-skill');
      expect(priority).toBe(90);
    });

    it('should allow zero priority', async () => {
      await manager.setPreferences('zero-priority', { priority: 0 });
      const priority = await manager.getPriority('zero-priority');
      expect(priority).toBe(0);
    });
  });

  // =========================================================================
  // getCustomKeywords Tests
  // =========================================================================

  describe('getCustomKeywords', () => {
    it('should return empty array by default', async () => {
      const keywords = await manager.getCustomKeywords('no-keywords-skill');
      expect(keywords).toEqual([]);
    });

    it('should return user-defined keywords', async () => {
      await manager.setPreferences('keywords-skill', {
        customKeywords: ['deploy', 'release', 'ship'],
      });
      const keywords = await manager.getCustomKeywords('keywords-skill');
      expect(keywords).toEqual(['deploy', 'release', 'ship']);
    });
  });

  // =========================================================================
  // getTimeout Tests
  // =========================================================================

  describe('getTimeout', () => {
    it('should return system default timeout when not set', async () => {
      const timeout = await manager.getTimeout('no-timeout-skill');
      expect(timeout).toBe(SYSTEM_DEFAULTS.timeout);
    });

    it('should return user-defined timeout', async () => {
      await manager.setPreferences('fast-skill', { timeout: 5000 });
      const timeout = await manager.getTimeout('fast-skill');
      expect(timeout).toBe(5000);
    });

    it('should return zero timeout if set', async () => {
      await manager.setPreferences('no-timeout', { timeout: 0 });
      const timeout = await manager.getTimeout('no-timeout');
      expect(timeout).toBe(0);
    });
  });

  // =========================================================================
  // clearCache Tests
  // =========================================================================

  describe('clearCache', () => {
    it('should force reload from file after clear', async () => {
      await manager.setPreferences('cache-clear-skill', { outputFormat: 'json' });
      await manager.getPreferences('cache-clear-skill');

      // Manually update file
      const filePath = path.join(testConfigDir, 'cache-clear-skill', 'PREFERENCES.yaml');
      await fs.writeFile(filePath, yaml.stringify({ outputFormat: 'concise' }));

      // Before clear, should get cached value
      const beforeClear = await manager.getPreferences('cache-clear-skill');
      expect(beforeClear.outputFormat).toBe('json');

      manager.clearCache();

      // After clear, should get new file value
      const afterClear = await manager.getPreferences('cache-clear-skill');
      expect(afterClear.outputFormat).toBe('concise');
    });
  });

  // =========================================================================
  // SYSTEM_DEFAULTS Tests
  // =========================================================================

  describe('SYSTEM_DEFAULTS', () => {
    it('should have correct default values', () => {
      expect(SYSTEM_DEFAULTS.outputFormat).toBe('detailed');
      expect(SYSTEM_DEFAULTS.language).toBe('en');
      expect(SYSTEM_DEFAULTS.timeout).toBe(30000);
      expect(SYSTEM_DEFAULTS.priority).toBe(50);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration', () => {
    it('should handle full workflow: set, get, reset', async () => {
      // Set initial preferences
      await manager.setPreferences('workflow-skill', {
        outputFormat: 'markdown',
        language: 'de',
        priority: 80,
        customKeywords: ['analyze', 'examine'],
      });

      // Verify they're persisted
      let prefs = await manager.getPreferences('workflow-skill');
      expect(prefs.outputFormat).toBe('markdown');
      expect(prefs.language).toBe('de');
      expect(prefs.priority).toBe(80);
      expect(prefs.customKeywords).toEqual(['analyze', 'examine']);

      // Update some preferences
      await manager.setPreferences('workflow-skill', {
        outputFormat: 'json',
        disabled: true,
      });

      // Verify update merged correctly
      prefs = await manager.getPreferences('workflow-skill');
      expect(prefs.outputFormat).toBe('json');
      expect(prefs.language).toBe('de'); // Still preserved
      expect(prefs.disabled).toBe(true);

      // Reset to defaults
      await manager.resetPreferences('workflow-skill');

      // Verify defaults are restored
      prefs = await manager.getPreferences('workflow-skill');
      expect(prefs.outputFormat).toBe(SYSTEM_DEFAULTS.outputFormat);
      expect(prefs.language).toBe(SYSTEM_DEFAULTS.language);
      expect(prefs.disabled).toBe(false);
    });
  });
});
