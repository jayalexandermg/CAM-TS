import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { MemoryPipeline, MemoryTier } from '../../../src/memory/pipeline';

describe('MemoryPipeline', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-memory-pipeline');
  let pipeline: MemoryPipeline;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up tier directories before each test
    for (const tier of ['work', 'learning', 'archive']) {
      const tierPath = path.join(testBasePath, tier);
      await fs.promises.rm(tierPath, { recursive: true, force: true }).catch(() => {});
    }
    pipeline = new MemoryPipeline(testBasePath);
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('initialize', () => {
    it('should create work/ directory (CAPTURE tier)', async () => {
      await pipeline.initialize();
      const workPath = path.join(testBasePath, 'work');
      const exists = await fs.promises.stat(workPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create learning/ directory (SYNTHESIS tier)', async () => {
      await pipeline.initialize();
      const learningPath = path.join(testBasePath, 'learning');
      const exists = await fs.promises.stat(learningPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create archive/ directory (APPLICATION tier)', async () => {
      await pipeline.initialize();
      const archivePath = path.join(testBasePath, 'archive');
      const exists = await fs.promises.stat(archivePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create CAPTURE tier subdirectories', async () => {
      await pipeline.initialize();
      const subdirs = ['INBOX', 'SCRATCHPAD', 'OBSERVATIONS'];

      for (const subdir of subdirs) {
        const subdirPath = path.join(testBasePath, 'work', subdir);
        const exists = await fs.promises.stat(subdirPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should create SYNTHESIS tier subdirectories', async () => {
      await pipeline.initialize();
      const subdirs = ['PATTERNS', 'INSIGHTS', 'LEARNINGS', 'DECISIONS'];

      for (const subdir of subdirs) {
        const subdirPath = path.join(testBasePath, 'learning', subdir);
        const exists = await fs.promises.stat(subdirPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should create APPLICATION tier subdirectories', async () => {
      await pipeline.initialize();
      const subdirs = ['KNOWLEDGE', 'PROCEDURES', 'REFERENCE', 'ARCHIVE'];

      for (const subdir of subdirs) {
        const subdirPath = path.join(testBasePath, 'archive', subdir);
        const exists = await fs.promises.stat(subdirPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should set initialized flag after initialization', async () => {
      expect(pipeline.isInitialized()).toBe(false);
      await pipeline.initialize();
      expect(pipeline.isInitialized()).toBe(true);
    });
  });

  // =========================================================================
  // Tier Operations Tests
  // =========================================================================

  describe('tier operations', () => {
    it('should return CAPTURE tier for work/ directory', () => {
      expect(pipeline.getTier('work')).toBe(MemoryTier.CAPTURE);
    });

    it('should return CAPTURE tier for work/INBOX directory', () => {
      expect(pipeline.getTier('work/INBOX')).toBe(MemoryTier.CAPTURE);
    });

    it('should return SYNTHESIS tier for learning/ directory', () => {
      expect(pipeline.getTier('learning')).toBe(MemoryTier.SYNTHESIS);
    });

    it('should return SYNTHESIS tier for learning/PATTERNS directory', () => {
      expect(pipeline.getTier('learning/PATTERNS')).toBe(MemoryTier.SYNTHESIS);
    });

    it('should return APPLICATION tier for archive/ directory', () => {
      expect(pipeline.getTier('archive')).toBe(MemoryTier.APPLICATION);
    });

    it('should return APPLICATION tier for archive/KNOWLEDGE directory', () => {
      expect(pipeline.getTier('archive/KNOWLEDGE')).toBe(MemoryTier.APPLICATION);
    });

    it('should return ROOT tier for non-tier directories', () => {
      expect(pipeline.getTier('CORE')).toBe(MemoryTier.ROOT);
      expect(pipeline.getTier('CONTEXT')).toBe(MemoryTier.ROOT);
      expect(pipeline.getTier('PROJECTS')).toBe(MemoryTier.ROOT);
    });

    it('should return correct tier path', () => {
      expect(pipeline.getTierPath(MemoryTier.CAPTURE)).toBe('work');
      expect(pipeline.getTierPath(MemoryTier.SYNTHESIS)).toBe('learning');
      expect(pipeline.getTierPath(MemoryTier.APPLICATION)).toBe('archive');
      expect(pipeline.getTierPath(MemoryTier.ROOT)).toBe('');
    });

    it('should return correct tier subdirectories', () => {
      expect(pipeline.getTierSubdirectories(MemoryTier.CAPTURE)).toEqual([
        'INBOX',
        'SCRATCHPAD',
        'OBSERVATIONS',
      ]);
      expect(pipeline.getTierSubdirectories(MemoryTier.SYNTHESIS)).toEqual([
        'PATTERNS',
        'INSIGHTS',
        'LEARNINGS',
        'DECISIONS',
      ]);
      expect(pipeline.getTierSubdirectories(MemoryTier.APPLICATION)).toEqual([
        'KNOWLEDGE',
        'PROCEDURES',
        'REFERENCE',
        'ARCHIVE',
      ]);
      expect(pipeline.getTierSubdirectories(MemoryTier.ROOT)).toEqual([]);
    });

    it('should return all tiers excluding ROOT', () => {
      const tiers = pipeline.getAllTiers();
      expect(tiers).toEqual([MemoryTier.CAPTURE, MemoryTier.SYNTHESIS, MemoryTier.APPLICATION]);
      expect(tiers).not.toContain(MemoryTier.ROOT);
    });
  });

  // =========================================================================
  // Tier Navigation Tests
  // =========================================================================

  describe('tier navigation', () => {
    it('should get next tier from CAPTURE', () => {
      expect(pipeline.getNextTier(MemoryTier.CAPTURE)).toBe(MemoryTier.SYNTHESIS);
    });

    it('should get next tier from SYNTHESIS', () => {
      expect(pipeline.getNextTier(MemoryTier.SYNTHESIS)).toBe(MemoryTier.APPLICATION);
    });

    it('should return null for next tier from APPLICATION', () => {
      expect(pipeline.getNextTier(MemoryTier.APPLICATION)).toBeNull();
    });

    it('should return CAPTURE for next tier from ROOT', () => {
      expect(pipeline.getNextTier(MemoryTier.ROOT)).toBe(MemoryTier.CAPTURE);
    });

    it('should return null for previous tier from CAPTURE', () => {
      expect(pipeline.getPreviousTier(MemoryTier.CAPTURE)).toBeNull();
    });

    it('should get previous tier from SYNTHESIS', () => {
      expect(pipeline.getPreviousTier(MemoryTier.SYNTHESIS)).toBe(MemoryTier.CAPTURE);
    });

    it('should get previous tier from APPLICATION', () => {
      expect(pipeline.getPreviousTier(MemoryTier.APPLICATION)).toBe(MemoryTier.SYNTHESIS);
    });
  });

  // =========================================================================
  // Content Promotion Tests
  // =========================================================================

  describe('content promotion', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should promote content from CAPTURE to SYNTHESIS', async () => {
      const sourceFile = 'work/INBOX/note.md';
      const targetFile = 'learning/PATTERNS/pattern.md';
      const content = '# Promoted Content';

      // Create source file
      const sourcePath = path.join(testBasePath, sourceFile);
      await fs.promises.writeFile(sourcePath, 'Original content');

      // Promote
      const result = await pipeline.promote(sourceFile, targetFile, content);

      expect(result.success).toBe(true);
      expect(result.sourceTier).toBe(MemoryTier.CAPTURE);
      expect(result.targetTier).toBe(MemoryTier.SYNTHESIS);

      // Verify target file exists with new content
      const targetPath = path.join(testBasePath, targetFile);
      const targetContent = await fs.promises.readFile(targetPath, 'utf-8');
      expect(targetContent).toBe(content);

      // Verify source file is deleted
      const sourceExists = await fs.promises.stat(sourcePath).then(() => true).catch(() => false);
      expect(sourceExists).toBe(false);
    });

    it('should promote content from SYNTHESIS to APPLICATION', async () => {
      const sourceFile = 'learning/INSIGHTS/insight.md';
      const targetFile = 'archive/KNOWLEDGE/knowledge.md';
      const content = '# Knowledge Entry';

      // Create source file
      const sourcePath = path.join(testBasePath, sourceFile);
      await fs.promises.writeFile(sourcePath, 'Insight content');

      // Promote
      const result = await pipeline.promote(sourceFile, targetFile, content);

      expect(result.success).toBe(true);
      expect(result.sourceTier).toBe(MemoryTier.SYNTHESIS);
      expect(result.targetTier).toBe(MemoryTier.APPLICATION);
    });

    it('should handle promotion when source file does not exist', async () => {
      const sourceFile = 'work/INBOX/nonexistent.md';
      const targetFile = 'learning/PATTERNS/new.md';
      const content = '# New Content';

      const result = await pipeline.promote(sourceFile, targetFile, content);

      expect(result.success).toBe(true);

      // Target should still be created
      const targetPath = path.join(testBasePath, targetFile);
      const exists = await fs.promises.stat(targetPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  // =========================================================================
  // Tier Content Tests
  // =========================================================================

  describe('getTierContent', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should return empty array for empty tier', async () => {
      const content = await pipeline.getTierContent(MemoryTier.CAPTURE);
      expect(content).toEqual([]);
    });

    it('should return files from tier root and subdirectories', async () => {
      // Create some test files
      await fs.promises.writeFile(path.join(testBasePath, 'work/INBOX/file1.md'), 'content1');
      await fs.promises.writeFile(path.join(testBasePath, 'work/SCRATCHPAD/file2.md'), 'content2');

      const content = await pipeline.getTierContent(MemoryTier.CAPTURE);

      expect(content).toContain('work/INBOX/file1.md');
      expect(content).toContain('work/SCRATCHPAD/file2.md');
    });

    it('should return empty array for ROOT tier', async () => {
      const content = await pipeline.getTierContent(MemoryTier.ROOT);
      expect(content).toEqual([]);
    });
  });

  // =========================================================================
  // Validation Tests
  // =========================================================================

  describe('validation', () => {
    it('should pass validation after initialization', async () => {
      await pipeline.initialize();
      const result = await pipeline.validateTiers();

      expect(result.valid).toBe(true);
      expect(result.missingTiers).toEqual([]);
      expect(result.missingDirectories).toEqual([]);
    });

    it('should fail validation when tiers are missing', async () => {
      const result = await pipeline.validateTiers();

      expect(result.valid).toBe(false);
      expect(result.missingTiers).toContain(MemoryTier.CAPTURE);
      expect(result.missingTiers).toContain(MemoryTier.SYNTHESIS);
      expect(result.missingTiers).toContain(MemoryTier.APPLICATION);
    });

    it('should report missing subdirectories', async () => {
      // Create only tier root directories
      await fs.promises.mkdir(path.join(testBasePath, 'work'), { recursive: true });
      await fs.promises.mkdir(path.join(testBasePath, 'learning'), { recursive: true });
      await fs.promises.mkdir(path.join(testBasePath, 'archive'), { recursive: true });

      const result = await pipeline.validateTiers();

      expect(result.valid).toBe(false);
      expect(result.missingDirectories).toContain('work/INBOX');
      expect(result.missingDirectories).toContain('learning/PATTERNS');
      expect(result.missingDirectories).toContain('archive/KNOWLEDGE');
    });

    it('should check if specific tier exists', async () => {
      expect(await pipeline.tierExists(MemoryTier.CAPTURE)).toBe(false);

      await fs.promises.mkdir(path.join(testBasePath, 'work'), { recursive: true });

      expect(await pipeline.tierExists(MemoryTier.CAPTURE)).toBe(true);
    });

    it('should return false for ROOT tier existence check', async () => {
      expect(await pipeline.tierExists(MemoryTier.ROOT)).toBe(false);
    });
  });

  // =========================================================================
  // Path Normalization Tests
  // =========================================================================

  describe('path normalization', () => {
    it('should handle paths with backslashes', () => {
      expect(pipeline.getTier('work\\INBOX')).toBe(MemoryTier.CAPTURE);
    });

    it('should handle paths with leading/trailing slashes', () => {
      expect(pipeline.getTier('/work/INBOX/')).toBe(MemoryTier.CAPTURE);
    });

    it('should handle nested paths within tiers', () => {
      expect(pipeline.getTier('work/INBOX/subfolder/file.md')).toBe(MemoryTier.CAPTURE);
    });
  });
});
