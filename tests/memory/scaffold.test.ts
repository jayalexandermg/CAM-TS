import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { MemoryScaffold } from '../../src/memory/scaffold';

describe('MemoryScaffold', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-scaffold-' + Date.now());
  let scaffold: MemoryScaffold;

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(() => {
    scaffold = new MemoryScaffold(testBasePath);
  });

  describe('constructor', () => {
    it('should create scaffold with default path', () => {
      const s = new MemoryScaffold();
      expect(s.getBasePath()).toContain('.infinite-aura-ts');
    });

    it('should create scaffold with custom path', () => {
      expect(scaffold.getBasePath()).toContain('infinite-aura-test-scaffold');
    });
  });

  describe('initialize', () => {
    it('should create all required directories', async () => {
      await scaffold.initialize();

      const expectedDirs = [
        'context',
        'projects',
        'agents',
        'sessions',
        'history',
        'history/raw-outputs',
        'history/learnings',
        'history/sessions',
        'history/research',
        'history/decisions',
        'history/execution',
        'skills',
        'index',
        'backups',
        'meta',
        'meta/verification',
      ];

      for (const dir of expectedDirs) {
        const fullPath = path.join(testBasePath, dir);
        const exists = await fs.promises.stat(fullPath).then(s => s.isDirectory()).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should create initial files', async () => {
      await scaffold.initialize();

      const expectedFiles = [
        'context/user.md',
        'context/system.md',
        'projects/current.md',
        'agents/orchestrator.md',
        'meta/version.md',
      ];

      for (const file of expectedFiles) {
        const fullPath = path.join(testBasePath, file);
        const exists = await fs.promises.stat(fullPath).then(s => s.isFile()).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should be idempotent', async () => {
      await scaffold.initialize();
      await expect(scaffold.initialize()).resolves.not.toThrow();
    });

    it('should set initialized flag', async () => {
      expect(scaffold.isInitialized()).toBe(false);
      await scaffold.initialize();
      expect(scaffold.isInitialized()).toBe(true);
    });
  });

  describe('validate', () => {
    it('should return valid result after initialization', async () => {
      await scaffold.initialize();
      const result = await scaffold.validate();
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should return missing items before initialization', async () => {
      const newScaffold = new MemoryScaffold(path.join(os.tmpdir(), 'empty-scaffold-' + Date.now()));
      const result = await newScaffold.validate();
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it('should count directories and files', async () => {
      await scaffold.initialize();
      const result = await scaffold.validate();
      expect(result.directories).toBeGreaterThanOrEqual(16);
      expect(result.files).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getters', () => {
    it('should return PathValidator', () => {
      expect(scaffold.getPathValidator()).toBeDefined();
    });

    it('should return DirectoryOperations', () => {
      expect(scaffold.getDirectoryOps()).toBeDefined();
    });

    it('should return FileOperations', () => {
      expect(scaffold.getFileOps()).toBeDefined();
    });

    it('should return basePath', () => {
      expect(scaffold.getBasePath()).toContain('infinite-aura-test-scaffold');
    });
  });

  describe('integration', () => {
    it('should write and read files through scaffold', async () => {
      await scaffold.initialize();
      const fileOps = scaffold.getFileOps();

      await fileOps.writeFile('context/test.md', '# Test Content');
      const content = await fileOps.readFile('context/test.md');
      expect(content).toBe('# Test Content');
    });

    it('should create directories through scaffold', async () => {
      await scaffold.initialize();
      const dirOps = scaffold.getDirectoryOps();

      await dirOps.createDirectory('custom/nested/dir');
      const exists = await dirOps.directoryExists('custom/nested/dir');
      expect(exists).toBe(true);
    });

    it('should append to JSONL files', async () => {
      await scaffold.initialize();
      const fileOps = scaffold.getFileOps();

      await fileOps.appendJsonLine('history/sessions/log.jsonl', { event: 'start' });
      await fileOps.appendJsonLine('history/sessions/log.jsonl', { event: 'end' });

      const lines = await fileOps.readJsonLines<{ event: string }>('history/sessions/log.jsonl');
      expect(lines).toHaveLength(2);
      expect(lines[0].event).toBe('start');
      expect(lines[1].event).toBe('end');
    });
  });

  describe('destroy', () => {
    it('should remove all files and directories', async () => {
      const destroyPath = path.join(os.tmpdir(), 'destroy-test-' + Date.now());
      const destroyScaffold = new MemoryScaffold(destroyPath);
      await destroyScaffold.initialize();
      await destroyScaffold.destroy();

      const exists = await fs.promises.stat(destroyPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
      expect(destroyScaffold.isInitialized()).toBe(false);
    });
  });

  // =========================================================================
  // CORE Manager Integration Tests
  // =========================================================================

  describe('CORE integration', () => {
    it('should initialize CORE directory on scaffold initialization', async () => {
      await scaffold.initialize();
      const corePath = path.join(testBasePath, 'CORE');
      const exists = await fs.promises.stat(corePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should provide access to CoreManager via getCore()', async () => {
      await scaffold.initialize();
      const coreManager = scaffold.getCore();
      expect(coreManager).toBeDefined();
    });

    it('should have valid CORE structure after initialization', async () => {
      await scaffold.initialize();
      const coreManager = scaffold.getCore();
      const isValid = await coreManager.validateCore();
      expect(isValid).toBe(true);
    });

    it('should create CORE files on initialization', async () => {
      await scaffold.initialize();
      const coreFiles = [
        path.join(testBasePath, 'CORE', 'USER.md'),
        path.join(testBasePath, 'CORE', 'PREFERENCES.md'),
        path.join(testBasePath, 'CORE', 'ACTIVE_PROJECTS.md'),
      ];

      for (const file of coreFiles) {
        const exists = await fs.promises.stat(file).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should allow reading and writing CORE files through scaffold', async () => {
      await scaffold.initialize();
      const coreManager = scaffold.getCore();

      const newContent = '# Custom User\n\nName: Test User';
      await coreManager.updateUser(newContent);

      const content = await coreManager.readUser();
      expect(content).toBe(newContent);
    });

    it('should load CORE context through scaffold', async () => {
      // Use a fresh scaffold to avoid state from previous tests
      const freshPath = path.join(os.tmpdir(), 'core-context-test-' + Date.now());
      const freshScaffold = new MemoryScaffold(freshPath);

      try {
        await freshScaffold.initialize();
        const coreManager = freshScaffold.getCore();

        const context = await coreManager.loadCore();
        expect(context.user).toContain('# User Identity');
        expect(context.preferences).toContain('# User Preferences');
        expect(context.activeProjects).toContain('# Active Projects');
      } finally {
        await freshScaffold.destroy();
      }
    });
  });

  // =========================================================================
  // Memory Pipeline Integration Tests
  // =========================================================================

  describe('pipeline integration', () => {
    it('should initialize 3-tier pipeline on scaffold initialization', async () => {
      await scaffold.initialize();

      const tierDirs = [
        path.join(testBasePath, 'work'),
        path.join(testBasePath, 'learning'),
        path.join(testBasePath, 'archive'),
      ];

      for (const dir of tierDirs) {
        const exists = await fs.promises.stat(dir).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should provide access to MemoryPipeline via getPipeline()', async () => {
      await scaffold.initialize();
      const pipeline = scaffold.getPipeline();
      expect(pipeline).toBeDefined();
    });

    it('should have valid tier structure after initialization', async () => {
      await scaffold.initialize();
      const pipeline = scaffold.getPipeline();
      const result = await pipeline.validateTiers();
      expect(result.valid).toBe(true);
    });

    it('should create tier subdirectories on initialization', async () => {
      await scaffold.initialize();

      const subdirs = [
        // CAPTURE tier
        path.join(testBasePath, 'work', 'INBOX'),
        path.join(testBasePath, 'work', 'SCRATCHPAD'),
        path.join(testBasePath, 'work', 'OBSERVATIONS'),
        // SYNTHESIS tier
        path.join(testBasePath, 'learning', 'PATTERNS'),
        path.join(testBasePath, 'learning', 'INSIGHTS'),
        // APPLICATION tier
        path.join(testBasePath, 'archive', 'KNOWLEDGE'),
        path.join(testBasePath, 'archive', 'PROCEDURES'),
      ];

      for (const dir of subdirs) {
        const exists = await fs.promises.stat(dir).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should allow content promotion through scaffold', async () => {
      await scaffold.initialize();
      const pipeline = scaffold.getPipeline();
      const fileOps = scaffold.getFileOps();

      // Create a file in CAPTURE tier
      await fileOps.writeFile('work/INBOX/note.md', '# Raw Note');

      // Promote to SYNTHESIS tier
      const result = await pipeline.promote(
        'work/INBOX/note.md',
        'learning/PATTERNS/pattern.md',
        '# Processed Pattern'
      );

      expect(result.success).toBe(true);

      // Verify new file exists
      const content = await fileOps.readFile('learning/PATTERNS/pattern.md');
      expect(content).toBe('# Processed Pattern');
    });
  });
});
