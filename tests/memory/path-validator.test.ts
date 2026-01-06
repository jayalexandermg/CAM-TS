import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PathValidator } from '../../src/memory/path-validator';
import { PathValidationError, SecurityError } from '../../src/exceptions';

describe('PathValidator', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-pv');
  let validator: PathValidator;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(() => {
    validator = new PathValidator(testBasePath);
  });

  describe('constructor', () => {
    it('should resolve tilde to home directory', () => {
      const v = new PathValidator('~/.test-path');
      expect(v.getBasePath()).toContain(os.homedir());
    });

    it('should resolve relative paths to absolute', () => {
      const v = new PathValidator('./test');
      expect(path.isAbsolute(v.getBasePath())).toBe(true);
    });

    it('should ensure base path ends with separator', () => {
      const v = new PathValidator(testBasePath);
      expect(v.getBasePath().endsWith(path.sep)).toBe(true);
    });
  });

  describe('validate', () => {
    it('should accept valid relative paths', () => {
      expect(() => validator.validate('subdir/file.txt')).not.toThrow();
    });

    it('should accept simple filenames', () => {
      expect(() => validator.validate('file.txt')).not.toThrow();
    });

    it('should throw on empty path', () => {
      expect(() => validator.validate('')).toThrow(PathValidationError);
    });

    it('should throw on null-like path', () => {
      expect(() => validator.validate(null as unknown as string)).toThrow(PathValidationError);
    });

    it('should throw on path traversal (../)', () => {
      expect(() => validator.validate('../secret')).toThrow(SecurityError);
    });

    it('should throw on path traversal with backslash', () => {
      expect(() => validator.validate('..\\secret')).toThrow(SecurityError);
    });

    it('should throw on null byte', () => {
      expect(() => validator.validate('file' + String.fromCharCode(0) + '.txt')).toThrow(SecurityError);
    });

    it('should throw on absolute paths (Unix)', () => {
      expect(() => validator.validate('/etc/passwd')).toThrow(PathValidationError);
    });
  });

  describe('isWithinBoundary', () => {
    it('should return true for paths within base', () => {
      const absolutePath = path.join(testBasePath, 'subdir', 'file.txt');
      expect(validator.isWithinBoundary(absolutePath)).toBe(true);
    });

    it('should return true for base path itself', () => {
      expect(validator.isWithinBoundary(testBasePath)).toBe(true);
    });

    it('should return false for paths outside base', () => {
      const outsidePath = path.join(os.tmpdir(), 'other-dir');
      expect(validator.isWithinBoundary(outsidePath)).toBe(false);
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative path to absolute', () => {
      const resolved = validator.resolvePath('subdir/file.txt');
      expect(path.isAbsolute(resolved)).toBe(true);
    });

    it('should throw on path traversal', () => {
      expect(() => validator.resolvePath('../outside')).toThrow(SecurityError);
    });

    it('should throw on absolute paths', () => {
      expect(() => validator.resolvePath('/absolute/path')).toThrow(PathValidationError);
    });

    it('should throw on empty path', () => {
      expect(() => validator.resolvePath('')).toThrow(PathValidationError);
    });
  });

  describe('sanitizePath', () => {
    it('should remove null bytes', () => {
      expect(validator.sanitizePath('file' + String.fromCharCode(0) + '.txt')).toBe('file.txt');
    });

    it('should remove parent directory references', () => {
      expect(validator.sanitizePath('../secret')).toBe('secret');
    });

    it('should normalize path separators', () => {
      expect(validator.sanitizePath('dir\\subdir\\file')).toBe('dir/subdir/file');
    });

    it('should remove leading slashes', () => {
      expect(validator.sanitizePath('/leading/slash')).toBe('leading/slash');
    });

    it('should handle empty string', () => {
      expect(validator.sanitizePath('')).toBe('');
    });
  });

  describe('ensureBasePathExists', () => {
    it('should create base path if not exists', async () => {
      const newPath = path.join(os.tmpdir(), 'new-test-path-' + Date.now());
      const v = new PathValidator(newPath);
      await v.ensureBasePathExists();
      const exists = await fs.promises.stat(newPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      await fs.promises.rm(newPath, { recursive: true, force: true });
    });

    it('should not throw if path already exists', async () => {
      await expect(validator.ensureBasePathExists()).resolves.not.toThrow();
    });
  });

  describe('isSymlink', () => {
    it('should return false for regular files', async () => {
      const filePath = path.join(testBasePath, 'regular.txt');
      await fs.promises.writeFile(filePath, 'test');
      expect(await validator.isSymlink(filePath)).toBe(false);
      await fs.promises.unlink(filePath);
    });

    it('should return false for non-existent paths', async () => {
      expect(await validator.isSymlink('/nonexistent/path')).toBe(false);
    });
  });
});
