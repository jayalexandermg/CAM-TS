import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { CoreManager, CoreContext } from '../../../src/memory/core';
import { MemoryError } from '../../../src/exceptions';

describe('CoreManager', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-core-manager');
  let coreManager: CoreManager;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up CORE directory before each test
    const corePath = path.join(testBasePath, 'CORE');
    await fs.promises.rm(corePath, { recursive: true, force: true }).catch(() => {});
    coreManager = new CoreManager(testBasePath);
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('initialize', () => {
    it('should create CORE directory on initialization', async () => {
      await coreManager.initialize();
      const corePath = path.join(testBasePath, 'CORE');
      const exists = await fs.promises.stat(corePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create USER.md with template on initialization', async () => {
      await coreManager.initialize();
      const filePath = path.join(testBasePath, 'CORE', 'USER.md');
      const exists = await fs.promises.stat(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toContain('# User Identity');
      expect(content).toContain('## Name');
      expect(content).toContain('## Role');
      expect(content).toContain('## Expertise');
      expect(content).toContain('## Goals');
    });

    it('should create PREFERENCES.md with template on initialization', async () => {
      await coreManager.initialize();
      const filePath = path.join(testBasePath, 'CORE', 'PREFERENCES.md');
      const exists = await fs.promises.stat(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toContain('# User Preferences');
      expect(content).toContain('## Communication Style');
      expect(content).toContain('## Working Style');
      expect(content).toContain('## Technical Preferences');
    });

    it('should create ACTIVE_PROJECTS.md with template on initialization', async () => {
      await coreManager.initialize();
      const filePath = path.join(testBasePath, 'CORE', 'ACTIVE_PROJECTS.md');
      const exists = await fs.promises.stat(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toContain('# Active Projects');
      expect(content).toContain('## Current Focus');
      expect(content).toContain('## Active Projects');
      expect(content).toContain('## Recent Context');
    });

    it('should not overwrite existing CORE files on re-initialization', async () => {
      await coreManager.initialize();

      // Modify USER.md
      const userPath = path.join(testBasePath, 'CORE', 'USER.md');
      const customContent = '# Custom User Content';
      await fs.promises.writeFile(userPath, customContent);

      // Re-initialize
      await coreManager.initialize();

      // Check content is preserved
      const content = await fs.promises.readFile(userPath, 'utf-8');
      expect(content).toBe(customContent);
    });

    it('should set initialized flag after initialization', async () => {
      expect(coreManager.isInitialized()).toBe(false);
      await coreManager.initialize();
      expect(coreManager.isInitialized()).toBe(true);
    });
  });

  // =========================================================================
  // Read Operations Tests
  // =========================================================================

  describe('read operations', () => {
    beforeEach(async () => {
      await coreManager.initialize();
    });

    it('should read USER.md content', async () => {
      const content = await coreManager.readUser();
      expect(content).toContain('# User Identity');
    });

    it('should read PREFERENCES.md content', async () => {
      const content = await coreManager.readPreferences();
      expect(content).toContain('# User Preferences');
    });

    it('should read ACTIVE_PROJECTS.md content', async () => {
      const content = await coreManager.readActiveProjects();
      expect(content).toContain('# Active Projects');
    });

    it('should load all CORE files via loadCore()', async () => {
      const context: CoreContext = await coreManager.loadCore();

      expect(context.user).toContain('# User Identity');
      expect(context.preferences).toContain('# User Preferences');
      expect(context.activeProjects).toContain('# Active Projects');
    });

    it('should get formatted core context via getCoreContext()', async () => {
      const context = await coreManager.getCoreContext();

      expect(context).toContain('## User Identity');
      expect(context).toContain('## User Preferences');
      expect(context).toContain('## Active Projects');
    });

    it('should throw MemoryError when reading non-existent USER.md', async () => {
      // Remove the file
      await fs.promises.unlink(path.join(testBasePath, 'CORE', 'USER.md'));

      await expect(coreManager.readUser()).rejects.toThrow(MemoryError);
    });

    it('should throw MemoryError when reading non-existent PREFERENCES.md', async () => {
      await fs.promises.unlink(path.join(testBasePath, 'CORE', 'PREFERENCES.md'));

      await expect(coreManager.readPreferences()).rejects.toThrow(MemoryError);
    });

    it('should throw MemoryError when reading non-existent ACTIVE_PROJECTS.md', async () => {
      await fs.promises.unlink(path.join(testBasePath, 'CORE', 'ACTIVE_PROJECTS.md'));

      await expect(coreManager.readActiveProjects()).rejects.toThrow(MemoryError);
    });
  });

  // =========================================================================
  // Write Operations Tests
  // =========================================================================

  describe('write operations', () => {
    beforeEach(async () => {
      await coreManager.initialize();
    });

    it('should update USER.md content', async () => {
      const newContent = '# Updated User\n\nNew user content';
      await coreManager.updateUser(newContent);

      const content = await coreManager.readUser();
      expect(content).toBe(newContent);
    });

    it('should update PREFERENCES.md content', async () => {
      const newContent = '# Updated Preferences\n\nNew preferences';
      await coreManager.updatePreferences(newContent);

      const content = await coreManager.readPreferences();
      expect(content).toBe(newContent);
    });

    it('should update ACTIVE_PROJECTS.md content', async () => {
      const newContent = '# Updated Projects\n\nNew projects';
      await coreManager.updateActiveProjects(newContent);

      const content = await coreManager.readActiveProjects();
      expect(content).toBe(newContent);
    });

    it('should persist updates to disk', async () => {
      const newContent = '# Persisted Content';
      await coreManager.updateUser(newContent);

      // Read directly from disk
      const filePath = path.join(testBasePath, 'CORE', 'USER.md');
      const diskContent = await fs.promises.readFile(filePath, 'utf-8');
      expect(diskContent).toBe(newContent);
    });
  });

  // =========================================================================
  // Validation Tests
  // =========================================================================

  describe('validation', () => {
    it('should return true for valid CORE structure', async () => {
      await coreManager.initialize();
      const isValid = await coreManager.validateCore();
      expect(isValid).toBe(true);
    });

    it('should return false when CORE directory is missing', async () => {
      const isValid = await coreManager.validateCore();
      expect(isValid).toBe(false);
    });

    it('should return false when USER.md is missing', async () => {
      await coreManager.initialize();
      await fs.promises.unlink(path.join(testBasePath, 'CORE', 'USER.md'));

      const isValid = await coreManager.validateCore();
      expect(isValid).toBe(false);
    });

    it('should return false when PREFERENCES.md is missing', async () => {
      await coreManager.initialize();
      await fs.promises.unlink(path.join(testBasePath, 'CORE', 'PREFERENCES.md'));

      const isValid = await coreManager.validateCore();
      expect(isValid).toBe(false);
    });

    it('should return false when ACTIVE_PROJECTS.md is missing', async () => {
      await coreManager.initialize();
      await fs.promises.unlink(path.join(testBasePath, 'CORE', 'ACTIVE_PROJECTS.md'));

      const isValid = await coreManager.validateCore();
      expect(isValid).toBe(false);
    });

    it('should check if CORE directory exists via coreExists()', async () => {
      expect(await coreManager.coreExists()).toBe(false);
      await coreManager.initialize();
      expect(await coreManager.coreExists()).toBe(true);
    });
  });

  // =========================================================================
  // Utility Tests
  // =========================================================================

  describe('utility methods', () => {
    it('should return correct CORE path', async () => {
      const corePath = coreManager.getCorePath();
      expect(corePath).toBe(path.join(testBasePath, 'CORE'));
    });

    it('should handle missing CORE directory gracefully in validateCore', async () => {
      // Don't initialize - CORE doesn't exist
      const isValid = await coreManager.validateCore();
      expect(isValid).toBe(false);
    });
  });
});
