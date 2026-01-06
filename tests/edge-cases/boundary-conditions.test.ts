/**
 * Edge Case Tests - Boundary Conditions
 *
 * Tests for edge cases, boundary conditions, and error paths.
 */

import { PathValidator } from '../../src/memory/path-validator';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { FileNamingConvention } from '../../src/memory/file-naming';
import { SecurityPatterns } from '../../src/exceptions/security-patterns';
import {
  PathValidationError,
  FileOperationError,
  ValidationError,
} from '../../src/exceptions';
import {
  createTempMemoryScaffold,
  cleanupTempScaffold,
  createLargeContent,
} from '../utils/test-helpers';

describe('Edge Cases: Boundary Conditions', () => {
  describe('Empty Inputs', () => {
    let tempDir: string;
    let pathValidator: PathValidator;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      pathValidator = result.scaffold.getPathValidator();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should handle empty string path', () => {
      expect(() => pathValidator.validate('')).toThrow(PathValidationError);
    });

    it('should handle whitespace-only path', () => {
      // Whitespace-only paths are technically valid strings and will be processed
      // as a path named with spaces. The validator allows them through.
      expect(() => pathValidator.validate('   ')).not.toThrow();
    });

    it('should handle path sanitization of empty string', () => {
      const result = pathValidator.sanitizePath('');
      expect(result).toBe('');
    });

    it('should handle null/undefined in SecurityPatterns', () => {
      const nullResult = SecurityPatterns.detectPathTraversal(null);
      expect(nullResult.detected).toBe(false);

      const undefinedResult = SecurityPatterns.detectPathTraversal(undefined);
      expect(undefinedResult.detected).toBe(false);
    });

    it('should handle empty filename parts in FileNamingConvention', () => {
      const naming = new FileNamingConvention();
      expect(() => naming.generateFilename('', 'desc', 'md')).toThrow(ValidationError);
      expect(() => naming.generateFilename('TYPE', '', 'md')).toThrow(ValidationError);
      expect(() => naming.generateFilename('TYPE', 'desc', '')).toThrow(ValidationError);
    });
  });

  describe('Extreme Path Lengths', () => {
    let tempDir: string;
    let pathValidator: PathValidator;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      pathValidator = result.scaffold.getPathValidator();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should handle very long paths (1000+ chars)', () => {
      const longPath = 'a'.repeat(1000) + '.txt';
      // Should not throw during validation (actual file creation may fail)
      expect(() => pathValidator.validate(longPath)).not.toThrow();
    });

    it('should handle path with many segments', () => {
      const manySegments = Array(50).fill('dir').join('/') + '/file.txt';
      // Validation should pass (depth check is separate)
      pathValidator.validate(manySegments);
    });

    it('should handle maximum depth correctly', () => {
      const depth3 = 'a/b/c';
      const depth4 = 'a/b/c/d';

      pathValidator.validateMaxDepth(depth3, 3);
      expect(() => pathValidator.validateMaxDepth(depth4, 3)).toThrow(PathValidationError);
    });
  });

  describe('Special Characters', () => {
    let tempDir: string;
    let pathValidator: PathValidator;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      pathValidator = result.scaffold.getPathValidator();
      fileOps = result.scaffold.getFileOps();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should sanitize dangerous characters', () => {
      const dangerous = 'file<>:"|?*.txt';
      const sanitized = pathValidator.sanitizePath(dangerous);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain(':');
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('?');
      expect(sanitized).not.toContain('*');
    });

    it('should handle unicode characters in paths', async () => {
      const unicodePath = 'test/unicode-日本語.txt';
      await fileOps.writeFile(unicodePath, 'Unicode content');
      const content = await fileOps.readFile(unicodePath);
      expect(content).toBe('Unicode content');
    });

    it('should handle spaces in paths', async () => {
      const spacePath = 'test/file with spaces.txt';
      await fileOps.writeFile(spacePath, 'Space content');
      const content = await fileOps.readFile(spacePath);
      expect(content).toBe('Space content');
    });

    it('should handle dashes and underscores', async () => {
      const dashPath = 'test/file-with-dashes_and_underscores.txt';
      await fileOps.writeFile(dashPath, 'Dash content');
      expect(await fileOps.fileExists(dashPath)).toBe(true);
    });

    it('should convert special chars in FileNamingConvention', () => {
      const naming = new FileNamingConvention();
      const kebab = naming.toKebabCase('Hello World! Test @#$');
      expect(kebab).toBe('hello-world-test');
    });
  });

  describe('Large Files', () => {
    let tempDir: string;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      fileOps = result.scaffold.getFileOps();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should handle 1MB file', async () => {
      const content = createLargeContent(1024 * 1024); // 1MB
      await fileOps.writeFile('test/large-1mb.txt', content);

      const readContent = await fileOps.readFile('test/large-1mb.txt');
      expect(readContent.length).toBe(content.length);
    });

    it('should handle file with many lines', async () => {
      const lines = Array(10000)
        .fill(0)
        .map((_, i) => `Line ${i}`)
        .join('\n');
      await fileOps.writeFile('test/many-lines.txt', lines);

      const stats = await fileOps.getFileStats('test/many-lines.txt');
      expect(stats.lines).toBe(10000);
    });

    it('should append many JSONL entries', async () => {
      for (let i = 0; i < 100; i++) {
        await fileOps.appendJsonLine('test/many-entries.jsonl', { index: i });
      }

      const entries = await fileOps.readJsonLines<{ index: number }>('test/many-entries.jsonl');
      expect(entries.length).toBe(100);
      expect(entries[99].index).toBe(99);
    });
  });

  describe('Concurrent Operations', () => {
    let tempDir: string;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      fileOps = result.scaffold.getFileOps();
    });

    afterEach(async () => {
      await fileOps.releaseAllLocks();
      await cleanupTempScaffold(tempDir);
    });

    it('should handle multiple simultaneous reads', async () => {
      await fileOps.writeFile('test/concurrent-read.txt', 'Concurrent content');

      const reads = await Promise.all([
        fileOps.readFile('test/concurrent-read.txt'),
        fileOps.readFile('test/concurrent-read.txt'),
        fileOps.readFile('test/concurrent-read.txt'),
        fileOps.readFile('test/concurrent-read.txt'),
        fileOps.readFile('test/concurrent-read.txt'),
      ]);

      expect(reads).toHaveLength(5);
      reads.forEach((content) => {
        expect(content).toBe('Concurrent content');
      });
    });

    it('should serialize writes with locking', async () => {
      await fileOps.writeFile('test/serial-write.txt', '0');

      const results: string[] = [];

      // Simulate concurrent writes with locks
      await Promise.all([
        fileOps.withFileLock('test/serial-write.txt', async () => {
          const current = await fileOps.readFile('test/serial-write.txt');
          results.push(current);
          await fileOps.writeFile('test/serial-write.txt', current + '1');
        }),
        fileOps.withFileLock('test/serial-write.txt', async () => {
          const current = await fileOps.readFile('test/serial-write.txt');
          results.push(current);
          await fileOps.writeFile('test/serial-write.txt', current + '2');
        }),
      ]);

      // Final content should have both writes
      const final = await fileOps.readFile('test/serial-write.txt');
      expect(final.length).toBe(3); // '0' + one of '12' or '21'
    });

    it('should handle lock contention', async () => {
      await fileOps.writeFile('test/contention.txt', 'initial');

      // Acquire lock
      await fileOps.lockFile('test/contention.txt');

      // Try to acquire same lock with very short timeout
      await expect(fileOps.lockFile('test/contention.txt', 100)).rejects.toThrow(
        FileOperationError
      );

      // Release lock
      await fileOps.unlockFile('test/contention.txt');

      // Now should be able to lock
      await fileOps.lockFile('test/contention.txt');
      await fileOps.unlockFile('test/contention.txt');
    });
  });

  describe('File System Edge Cases', () => {
    let tempDir: string;
    let fileOps: FileOperations;
    let dirOps: DirectoryOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold();
      tempDir = result.tempDir;
      fileOps = result.scaffold.getFileOps();
      dirOps = result.scaffold.getDirectoryOps();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should handle non-existent file read', async () => {
      await expect(fileOps.readFile('nonexistent/path/file.txt')).rejects.toThrow(
        FileOperationError
      );
    });

    it('should handle non-existent directory listing', async () => {
      await expect(dirOps.listDirectories('nonexistent/path')).rejects.toThrow(FileOperationError);
    });

    it('should handle reading directory as file', async () => {
      await dirOps.createDirectory('test/is-dir');
      await expect(fileOps.readFile('test/is-dir')).rejects.toThrow();
    });

    it('should handle file stats for non-existent file', async () => {
      await expect(fileOps.getFileStats('nonexistent.txt')).rejects.toThrow(FileOperationError);
    });

    it('should handle directory stats for non-existent directory', async () => {
      await expect(dirOps.getDirectoryStats('nonexistent')).rejects.toThrow(FileOperationError);
    });

    it('should idempotently create existing directory', async () => {
      await dirOps.createDirectory('test/idempotent');
      await dirOps.createDirectory('test/idempotent'); // Should not throw
      expect(await dirOps.directoryExists('test/idempotent')).toBe(true);
    });

    it('should not throw when deleting non-existent file', async () => {
      await expect(fileOps.deleteFile('nonexistent.txt')).resolves.not.toThrow();
    });
  });

  describe('Security Pattern Edge Cases', () => {
    it('should detect various path traversal encodings', () => {
      const patterns = [
        '../',
        '..\\',
        '%2e%2e%2f',
        '%2e%2e/',
        '..%2f',
        '%2e%2e%5c',
        '..;',
      ];

      patterns.forEach((pattern) => {
        const result = SecurityPatterns.detectPathTraversal(pattern);
        expect(result.detected).toBe(true);
      });
    });

    it('should detect command injection patterns', () => {
      const patterns = [';', '|', '&', '$(', '`', '${', '> /', '\n', '\r'];

      patterns.forEach((pattern) => {
        const result = SecurityPatterns.detectCommandInjection(`test${pattern}cmd`);
        expect(result.detected).toBe(true);
      });
    });

    it('should detect null byte patterns', () => {
      const patterns = ['%00', '\\0'];

      patterns.forEach((pattern) => {
        const result = SecurityPatterns.detectNullByte(`file${pattern}.txt`);
        expect(result.detected).toBe(true);
      });
    });

    it('should detect absolute paths', () => {
      const patterns = ['/etc/passwd', 'C:\\Windows', '\\\\server\\share', 'file:///path'];

      patterns.forEach((pattern) => {
        const result = SecurityPatterns.detectAbsolutePath(pattern);
        expect(result.detected).toBe(true);
      });
    });

    it('should detect special files', () => {
      const patterns = ['/dev/null', '/proc/self', '/etc/passwd', 'CON', 'NUL', 'COM1'];

      patterns.forEach((pattern) => {
        const result = SecurityPatterns.detectSpecialFile(pattern);
        expect(result.detected).toBe(true);
      });
    });

    it('should detect dangerous protocols', () => {
      const patterns = [
        'javascript:alert(1)',
        'data:text/html',
        'vbscript:msgbox',
        'file:///etc/passwd',
      ];

      patterns.forEach((pattern) => {
        const result = SecurityPatterns.detectDangerousProtocol(pattern);
        expect(result.detected).toBe(true);
      });
    });

    it('should run all checks with checkAll', () => {
      const results = SecurityPatterns.checkAll('../test%00|cmd');

      expect(results.pathTraversal.detected).toBe(true);
      expect(results.nullByte.detected).toBe(true);
      expect(results.commandInjection.detected).toBe(true);
    });

    it('should detect any violation with hasAnyViolation', () => {
      expect(SecurityPatterns.hasAnyViolation('../test')).toBe(true);
      expect(SecurityPatterns.hasAnyViolation('safe/path')).toBe(false);
    });
  });

  describe('FileNamingConvention Edge Cases', () => {
    let naming: FileNamingConvention;

    beforeEach(() => {
      naming = new FileNamingConvention();
    });

    it('should handle numbers in description', () => {
      const kebab = naming.toKebabCase('Test 123 Numbers');
      expect(kebab).toBe('test-123-numbers');
    });

    it('should handle consecutive spaces', () => {
      const kebab = naming.toKebabCase('Multiple   Spaces');
      expect(kebab).toBe('multiple-spaces');
    });

    it('should parse valid filename', () => {
      const filename = '2024-01-15_143022_LEARNING_test-description.md';
      const parsed = naming.parseFilename(filename);

      expect(parsed.date).toBe('2024-01-15');
      expect(parsed.time).toBe('143022');
      expect(parsed.type).toBe('LEARNING');
      expect(parsed.description).toBe('test-description');
      expect(parsed.extension).toBe('md');
    });

    it('should throw for invalid filename format', () => {
      expect(() => naming.parseFilename('invalid-filename.txt')).toThrow(ValidationError);
    });

    it('should generate timestamp in correct format', () => {
      const timestamp = naming.generateTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}_\d{6}$/);
    });

    it('should validate generated filenames', () => {
      const filename = naming.generateFilename('TEST', 'description', 'md');
      expect(naming.isValidFilename(filename)).toBe(true);
    });
  });
});
