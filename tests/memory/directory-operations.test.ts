import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PathValidator } from '../../src/memory/path-validator';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { FileOperationError } from '../../src/exceptions';

describe('DirectoryOperations', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-dir-ops');
  let pathValidator: PathValidator;
  let dirOps: DirectoryOperations;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(() => {
    pathValidator = new PathValidator(testBasePath);
    dirOps = new DirectoryOperations(pathValidator);
  });

  describe('createDirectory', () => {
    it('should create a new directory', async () => {
      await dirOps.createDirectory('new-dir');
      const exists = await fs.promises.stat(path.join(testBasePath, 'new-dir')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create nested directories', async () => {
      await dirOps.createDirectory('nested/deep/dir');
      const exists = await fs.promises.stat(path.join(testBasePath, 'nested/deep/dir')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should be idempotent', async () => {
      await dirOps.createDirectory('idempotent-dir');
      await expect(dirOps.createDirectory('idempotent-dir')).resolves.not.toThrow();
    });
  });

  describe('ensureDirectory', () => {
    it('should be alias for createDirectory', async () => {
      await dirOps.ensureDirectory('ensure-dir');
      const exists = await fs.promises.stat(path.join(testBasePath, 'ensure-dir')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('directoryExists', () => {
    it('should return true for existing directory', async () => {
      await fs.promises.mkdir(path.join(testBasePath, 'exists-dir'), { recursive: true });
      expect(await dirOps.directoryExists('exists-dir')).toBe(true);
    });

    it('should return false for non-existent directory', async () => {
      expect(await dirOps.directoryExists('nonexistent')).toBe(false);
    });

    it('should return false for files', async () => {
      const filePath = path.join(testBasePath, 'a-file.txt');
      await fs.promises.writeFile(filePath, 'test');
      expect(await dirOps.directoryExists('a-file.txt')).toBe(false);
    });
  });

  describe('listDirectories', () => {
    it('should list subdirectories', async () => {
      const base = path.join(testBasePath, 'list-test');
      await fs.promises.mkdir(path.join(base, 'subdir1'), { recursive: true });
      await fs.promises.mkdir(path.join(base, 'subdir2'), { recursive: true });
      await fs.promises.writeFile(path.join(base, 'file.txt'), 'test');

      const dirs = await dirOps.listDirectories('list-test');
      expect(dirs).toContain('subdir1');
      expect(dirs).toContain('subdir2');
      expect(dirs).not.toContain('file.txt');
    });

    it('should throw for non-existent directory', async () => {
      await expect(dirOps.listDirectories('nonexistent-list')).rejects.toThrow(FileOperationError);
    });
  });

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      const base = path.join(testBasePath, 'list-files-test');
      await fs.promises.mkdir(base, { recursive: true });
      await fs.promises.writeFile(path.join(base, 'file1.txt'), 'test');
      await fs.promises.writeFile(path.join(base, 'file2.md'), 'test');
      await fs.promises.mkdir(path.join(base, 'subdir'));

      const files = await dirOps.listFiles('list-files-test');
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.md');
      expect(files).not.toContain('subdir');
    });
  });

  describe('getDirectoryStats', () => {
    it('should return stats for directory', async () => {
      const base = path.join(testBasePath, 'stats-test');
      await fs.promises.mkdir(base, { recursive: true });
      await fs.promises.writeFile(path.join(base, 'file.txt'), 'hello');
      await fs.promises.mkdir(path.join(base, 'subdir'));

      const stats = await dirOps.getDirectoryStats('stats-test');
      expect(stats.fileCount).toBe(1);
      expect(stats.subdirCount).toBe(1);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.created instanceof Date || typeof stats.created === "object").toBe(true);
      expect(stats.modified instanceof Date || typeof stats.modified === "object").toBe(true);
    });

    it('should throw for non-existent directory', async () => {
      await expect(dirOps.getDirectoryStats('nonexistent-stats')).rejects.toThrow(FileOperationError);
    });
  });

  describe('removeDirectory', () => {
    it('should remove empty directory', async () => {
      const dirPath = path.join(testBasePath, 'remove-empty');
      await fs.promises.mkdir(dirPath, { recursive: true });
      await dirOps.removeDirectory('remove-empty');
      const exists = await fs.promises.stat(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should remove directory recursively', async () => {
      const dirPath = path.join(testBasePath, 'remove-recursive');
      await fs.promises.mkdir(path.join(dirPath, 'subdir'), { recursive: true });
      await fs.promises.writeFile(path.join(dirPath, 'file.txt'), 'test');

      await dirOps.removeDirectory('remove-recursive', true);
      const exists = await fs.promises.stat(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should not throw for non-existent directory', async () => {
      await expect(dirOps.removeDirectory('nonexistent-remove')).resolves.not.toThrow();
    });
  });
});
