import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PathValidator } from '../../src/memory/path-validator';
import { FileOperations } from '../../src/memory/file-operations';
import { FileOperationError, DestructiveActionBlockedError } from '../../src/exceptions';

describe('FileOperations', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-file-ops');
  let pathValidator: PathValidator;
  let fileOps: FileOperations;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(() => {
    pathValidator = new PathValidator(testBasePath);
    fileOps = new FileOperations(pathValidator);
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(testBasePath, 'read-test.txt');
      await fs.promises.writeFile(filePath, 'Hello, World!');
      const content = await fileOps.readFile('read-test.txt');
      expect(content).toBe('Hello, World!');
    });

    it('should throw for non-existent file', async () => {
      await expect(fileOps.readFile('nonexistent.txt')).rejects.toThrow(FileOperationError);
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      await fileOps.writeFile('write-test.txt', 'Test content');
      const content = await fs.promises.readFile(path.join(testBasePath, 'write-test.txt'), 'utf-8');
      expect(content).toBe('Test content');
    });

    it('should create parent directories', async () => {
      await fileOps.writeFile('nested/dir/file.txt', 'Nested content');
      const content = await fs.promises.readFile(path.join(testBasePath, 'nested/dir/file.txt'), 'utf-8');
      expect(content).toBe('Nested content');
    });

    it('should overwrite existing file', async () => {
      await fileOps.writeFile('overwrite.txt', 'Original');
      await fileOps.writeFile('overwrite.txt', 'Updated');
      const content = await fs.promises.readFile(path.join(testBasePath, 'overwrite.txt'), 'utf-8');
      expect(content).toBe('Updated');
    });
  });

  describe('appendFile', () => {
    it('should append to existing file', async () => {
      const filePath = path.join(testBasePath, 'append-test.txt');
      await fs.promises.writeFile(filePath, 'Line 1');
      await fileOps.appendFile('append-test.txt', 'Line 2');
      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toContain('Line 1');
      expect(content).toContain('Line 2');
    });

    it('should create file if not exists', async () => {
      await fileOps.appendFile('new-append.txt', 'First line');
      const content = await fs.promises.readFile(path.join(testBasePath, 'new-append.txt'), 'utf-8');
      expect(content).toContain('First line');
    });

    it('should ensure newline at end', async () => {
      await fileOps.appendFile('newline-test.txt', 'No newline');
      const content = await fs.promises.readFile(path.join(testBasePath, 'newline-test.txt'), 'utf-8');
      expect(content.endsWith('\n')).toBe(true);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await fs.promises.writeFile(path.join(testBasePath, 'exists-file.txt'), 'test');
      expect(await fileOps.fileExists('exists-file.txt')).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      expect(await fileOps.fileExists('nonexistent-file.txt')).toBe(false);
    });

    it('should return false for directories', async () => {
      await fs.promises.mkdir(path.join(testBasePath, 'a-directory'), { recursive: true });
      expect(await fileOps.fileExists('a-directory')).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const filePath = path.join(testBasePath, 'delete-me.txt');
      await fs.promises.writeFile(filePath, 'delete');
      await fileOps.deleteFile('delete-me.txt');
      const exists = await fs.promises.stat(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should not throw for non-existent file', async () => {
      await expect(fileOps.deleteFile('nonexistent-delete.txt')).resolves.not.toThrow();
    });

    it('should block deletion in history/ directory', async () => {
      await fs.promises.mkdir(path.join(testBasePath, 'history'), { recursive: true });
      await fs.promises.writeFile(path.join(testBasePath, 'history/protected.txt'), 'protected');
      await expect(fileOps.deleteFile('history/protected.txt')).rejects.toThrow(DestructiveActionBlockedError);
    });
  });

  describe('getFileStats', () => {
    it('should return file stats', async () => {
      const filePath = path.join(testBasePath, 'stats-file.txt');
      await fs.promises.writeFile(filePath, 'Line 1\nLine 2\nLine 3');
      const stats = await fileOps.getFileStats('stats-file.txt');
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.lines).toBe(3);
      expect(stats.created instanceof Date || typeof stats.created === "object").toBe(true);
      expect(stats.modified instanceof Date || typeof stats.modified === "object").toBe(true);
    });

    it('should throw for non-existent file', async () => {
      await expect(fileOps.getFileStats('nonexistent-stats.txt')).rejects.toThrow(FileOperationError);
    });
  });

  describe('copyFile', () => {
    it('should copy file', async () => {
      await fs.promises.writeFile(path.join(testBasePath, 'copy-source.txt'), 'Copy me');
      await fileOps.copyFile('copy-source.txt', 'copy-dest.txt');
      const content = await fs.promises.readFile(path.join(testBasePath, 'copy-dest.txt'), 'utf-8');
      expect(content).toBe('Copy me');
    });
  });

  describe('appendJsonLine', () => {
    it('should append JSON line', async () => {
      await fileOps.appendJsonLine('jsonl-test.jsonl', { key: 'value1' });
      await fileOps.appendJsonLine('jsonl-test.jsonl', { key: 'value2' });
      const content = await fs.promises.readFile(path.join(testBasePath, 'jsonl-test.jsonl'), 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[0])).toEqual({ key: 'value1' });
      expect(JSON.parse(lines[1])).toEqual({ key: 'value2' });
    });
  });

  describe('readJsonLines', () => {
    it('should read JSONL file', async () => {
      const filePath = path.join(testBasePath, 'read-jsonl.jsonl');
      await fs.promises.writeFile(filePath, '{"a":1}\n{"a":2}\n');
      const lines = await fileOps.readJsonLines<{ a: number }>('read-jsonl.jsonl');
      expect(lines).toHaveLength(2);
      expect(lines[0].a).toBe(1);
      expect(lines[1].a).toBe(2);
    });
  });
});
