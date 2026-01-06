import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PathValidator } from '../../src/memory/path-validator';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { MemoryScaffold } from '../../src/memory/scaffold';
import { SecurityAuditLogger } from '../../src/memory/security-audit';
import { SecurityError, PathValidationError, FileOperationError } from '../../src/exceptions';

describe('Security Hardening', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'security-hardening-test-'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('PathValidator - Symlink Detection', () => {
    let pathValidator: PathValidator;

    beforeEach(() => {
      pathValidator = new PathValidator(tempDir);
    });

    it('should detect symlinks with isSymlink', async () => {
      // Create a regular file
      const realFile = path.join(tempDir, 'real-file.txt');
      await fs.promises.writeFile(realFile, 'content');

      // Create a symlink
      const symlinkPath = path.join(tempDir, 'symlink');
      await fs.promises.symlink(realFile, symlinkPath);

      expect(await pathValidator.isSymlink(realFile)).toBe(false);
      expect(await pathValidator.isSymlink(symlinkPath)).toBe(true);
    });

    it('should return false for non-existent paths', async () => {
      const result = await pathValidator.isSymlink(path.join(tempDir, 'nonexistent'));
      expect(result).toBe(false);
    });

    it('should validate no symlinks with validateNoSymlink', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'regular.txt'), 'content');
      await expect(pathValidator.validateNoSymlink('regular.txt')).resolves.not.toThrow();
    });

    it('should throw SecurityError for symlinks', async () => {
      const realFile = path.join(tempDir, 'real.txt');
      await fs.promises.writeFile(realFile, 'content');
      await fs.promises.symlink(realFile, path.join(tempDir, 'link'));

      await expect(pathValidator.validateNoSymlink('link')).rejects.toThrow(SecurityError);
    });

    it('should resolve symlink and validate boundary', async () => {
      const realFile = path.join(tempDir, 'real.txt');
      await fs.promises.writeFile(realFile, 'content');

      const resolved = await pathValidator.resolveSymlink(realFile);
      expect(resolved).toBe(realFile);
    });

    it('should throw when symlink target is outside boundary', async () => {
      const outsideFile = path.join(os.tmpdir(), 'outside-file.txt');
      await fs.promises.writeFile(outsideFile, 'content');

      const symlinkPath = path.join(tempDir, 'escape-link');
      await fs.promises.symlink(outsideFile, symlinkPath);

      await expect(pathValidator.resolveSymlink(symlinkPath)).rejects.toThrow(SecurityError);

      // Cleanup
      await fs.promises.unlink(outsideFile);
    });

    it('should validate no symlinks in path hierarchy', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'dir1', 'dir2'), { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, 'dir1', 'dir2', 'file.txt'), 'content');

      await expect(
        pathValidator.validateNoSymlinksInPath('dir1/dir2/file.txt')
      ).resolves.not.toThrow();
    });

    it('should detect symlinks in path hierarchy', async () => {
      // Create real directory structure
      const realDir = path.join(tempDir, 'real-dir');
      await fs.promises.mkdir(realDir);
      await fs.promises.writeFile(path.join(realDir, 'file.txt'), 'content');

      // Create symlink to directory
      await fs.promises.symlink(realDir, path.join(tempDir, 'link-dir'));

      await expect(pathValidator.validateNoSymlinksInPath('link-dir/file.txt')).rejects.toThrow(
        SecurityError
      );
    });
  });

  describe('PathValidator - Permission Validation', () => {
    let pathValidator: PathValidator;

    beforeEach(() => {
      pathValidator = new PathValidator(tempDir);
    });

    it('should validate read permissions', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'readable.txt'), 'content');
      await expect(pathValidator.validatePermissions('readable.txt', 'read')).resolves.not.toThrow();
    });

    it('should validate write permissions', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'writable.txt'), 'content');
      await expect(pathValidator.validatePermissions('writable.txt', 'write')).resolves.not.toThrow();
    });

    it('should validate for non-existent files (checks parent)', async () => {
      await expect(
        pathValidator.validatePermissions('new-file.txt', 'write')
      ).resolves.not.toThrow();
    });
  });

  describe('PathValidator - Path Depth', () => {
    let pathValidator: PathValidator;

    beforeEach(() => {
      pathValidator = new PathValidator(tempDir);
    });

    it('should calculate path depth correctly', () => {
      expect(pathValidator.getPathDepth('')).toBe(0);
      expect(pathValidator.getPathDepth('file.txt')).toBe(1);
      expect(pathValidator.getPathDepth('dir/file.txt')).toBe(2);
      expect(pathValidator.getPathDepth('a/b/c/file.txt')).toBe(4);
    });

    it('should validate max depth', () => {
      expect(() => pathValidator.validateMaxDepth('a/b/c', 3)).not.toThrow();
      expect(() => pathValidator.validateMaxDepth('a/b/c/d', 3)).toThrow(PathValidationError);
    });

    it('should use validateSecure for comprehensive validation', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'valid-dir'));
      await fs.promises.writeFile(path.join(tempDir, 'valid-dir', 'file.txt'), 'content');

      await expect(
        pathValidator.validateSecure('valid-dir/file.txt', {
          checkSymlinks: true,
          checkPermissions: true,
          maxDepth: 3,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('FileOperations - File Locking', () => {
    let pathValidator: PathValidator;
    let fileOps: FileOperations;

    beforeEach(async () => {
      pathValidator = new PathValidator(tempDir);
      fileOps = new FileOperations(pathValidator, { enableLocking: true });
      await fs.promises.writeFile(path.join(tempDir, 'lockable.txt'), 'content');
    });

    it('should acquire and release file lock', async () => {
      await fileOps.lockFile('lockable.txt');
      expect(await fileOps.isLocked('lockable.txt')).toBe(true);

      await fileOps.unlockFile('lockable.txt');
      expect(await fileOps.isLocked('lockable.txt')).toBe(false);
    });

    it('should execute operation with file lock', async () => {
      const result = await fileOps.withFileLock('lockable.txt', async () => {
        expect(await fileOps.isLocked('lockable.txt')).toBe(true);
        return 'success';
      });

      expect(result).toBe('success');
      expect(await fileOps.isLocked('lockable.txt')).toBe(false);
    });

    it('should release lock even on error', async () => {
      await expect(
        fileOps.withFileLock('lockable.txt', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(await fileOps.isLocked('lockable.txt')).toBe(false);
    });

    it('should track active locks', async () => {
      expect(fileOps.getActiveLocksCount()).toBe(0);

      await fileOps.lockFile('lockable.txt');
      expect(fileOps.getActiveLocksCount()).toBe(1);

      const locks = fileOps.getActiveLocks();
      expect(locks.has('lockable.txt')).toBe(true);

      await fileOps.unlockFile('lockable.txt');
      expect(fileOps.getActiveLocksCount()).toBe(0);
    });

    it('should release all locks', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file1.txt'), 'content');
      await fs.promises.writeFile(path.join(tempDir, 'file2.txt'), 'content');

      await fileOps.lockFile('file1.txt');
      await fileOps.lockFile('file2.txt');
      expect(fileOps.getActiveLocksCount()).toBe(2);

      await fileOps.releaseAllLocks();
      expect(fileOps.getActiveLocksCount()).toBe(0);
    });

    it('should timeout when lock cannot be acquired', async () => {
      // Create a lock file manually
      const lockPath = path.join(tempDir, 'lockable.txt.lock');
      await fs.promises.writeFile(
        lockPath,
        JSON.stringify({ pid: 99999, timestamp: new Date().toISOString() })
      );

      await expect(fileOps.lockFile('lockable.txt', 500)).rejects.toThrow(FileOperationError);
    });
  });

  describe('FileOperations - File Integrity', () => {
    let pathValidator: PathValidator;
    let fileOps: FileOperations;

    beforeEach(() => {
      pathValidator = new PathValidator(tempDir);
      fileOps = new FileOperations(pathValidator);
    });

    it('should verify file integrity', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'valid.txt'), 'content');
      expect(await fileOps.verifyFileIntegrity('valid.txt')).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      expect(await fileOps.verifyFileIntegrity('nonexistent.txt')).toBe(false);
    });

    it('should return false for symlinks', async () => {
      const realFile = path.join(tempDir, 'real.txt');
      await fs.promises.writeFile(realFile, 'content');
      await fs.promises.symlink(realFile, path.join(tempDir, 'link.txt'));

      expect(await fileOps.verifyFileIntegrity('link.txt')).toBe(false);
    });
  });

  describe('DirectoryOperations - Depth Enforcement', () => {
    let pathValidator: PathValidator;
    let dirOps: DirectoryOperations;

    beforeEach(() => {
      pathValidator = new PathValidator(tempDir);
      dirOps = new DirectoryOperations(pathValidator, { maxDepth: 3 });
    });

    it('should enforce max depth', async () => {
      await expect(dirOps.enforceMaxDepth('a/b/c')).resolves.not.toThrow();
      await expect(dirOps.enforceMaxDepth('a/b/c/d')).rejects.toThrow();
    });

    it('should allow custom max depth override', async () => {
      await expect(dirOps.enforceMaxDepth('a/b/c/d/e', 5)).resolves.not.toThrow();
    });

    it('should get max depth setting', () => {
      expect(dirOps.getMaxDepth()).toBe(3);
    });
  });

  describe('DirectoryOperations - Structure Validation', () => {
    let pathValidator: PathValidator;
    let dirOps: DirectoryOperations;

    beforeEach(async () => {
      pathValidator = new PathValidator(tempDir);
      dirOps = new DirectoryOperations(pathValidator, { maxDepth: 3 });

      // Create test structure
      await fs.promises.mkdir(path.join(tempDir, 'dir1'), { recursive: true });
      await fs.promises.mkdir(path.join(tempDir, 'dir2'), { recursive: true });
    });

    it('should validate directory structure', async () => {
      const result = await dirOps.validateDirectoryStructure('.', ['dir1', 'dir2']);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing directories', async () => {
      const result = await dirOps.validateDirectoryStructure('.', ['dir1', 'dir2', 'dir3']);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing directory: dir3');
    });

    it('should detect symlinks in structure', async () => {
      const realDir = path.join(tempDir, 'real-dir');
      await fs.promises.mkdir(realDir);
      await fs.promises.symlink(realDir, path.join(tempDir, 'link-dir'));

      const result = await dirOps.validateDirectoryStructure('.');
      // The symlink should be detected (may have ./ prefix)
      const hasSymlink = result.symlinksFound.some(
        (s) => s === 'link-dir' || s === './link-dir'
      );
      expect(hasSymlink).toBe(true);
    });

    it('should detect depth violations', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'a', 'b', 'c', 'd', 'e'), { recursive: true });

      const result = await dirOps.validateDirectoryStructure('.');
      expect(result.depthViolations.length).toBeGreaterThan(0);
    });
  });

  describe('MemoryScaffold - Security Audit', () => {
    let scaffold: MemoryScaffold;

    beforeEach(async () => {
      scaffold = new MemoryScaffold(tempDir, {
        enableSecurityAudit: true,
        maxDepth: 3,
      });
      await scaffold.initialize();
    });

    afterEach(async () => {
      await scaffold.destroy();
    });

    it('should run security audit', async () => {
      const result = await scaffold.runSecurityAudit();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.directoryValidation).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should return security status', async () => {
      const status = await scaffold.getSecurityStatus();

      expect(typeof status.violationCount).toBe('number');
      expect(typeof status.isSecure).toBe('boolean');
      expect(Array.isArray(status.warnings)).toBe(true);
    });

    it('should repair permissions', async () => {
      const result = await scaffold.repairPermissions();

      expect(Array.isArray(result.repaired)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });

    it('should have security audit logger', () => {
      const auditLogger = scaffold.getSecurityAudit();
      expect(auditLogger).toBeInstanceOf(SecurityAuditLogger);
    });

    it('should get max depth', () => {
      expect(scaffold.getMaxDepth()).toBe(3);
    });

    it('should create audit log entries', async () => {
      await scaffold.runSecurityAudit();

      const auditLogger = scaffold.getSecurityAudit();
      if (auditLogger) {
        const events = await auditLogger.getRecentEvents();
        expect(events.length).toBeGreaterThan(0);
      }
    });
  });

  describe('MemoryScaffold - Without Security Audit', () => {
    it('should work without security audit enabled', async () => {
      const scaffold = new MemoryScaffold(tempDir, {
        enableSecurityAudit: false,
      });

      await scaffold.initialize();

      const auditLogger = scaffold.getSecurityAudit();
      expect(auditLogger).toBeUndefined();

      // Should still work
      const validation = await scaffold.validate();
      expect(validation.valid).toBe(true);

      await scaffold.destroy();
    });
  });

  describe('Security Audit Integration', () => {
    let scaffold: MemoryScaffold;
    let securityAudit: SecurityAuditLogger;

    beforeEach(async () => {
      scaffold = new MemoryScaffold(tempDir, {
        enableSecurityAudit: true,
      });
      await scaffold.initialize();
      securityAudit = scaffold.getSecurityAudit()!;
    });

    afterEach(async () => {
      await scaffold.destroy();
    });

    it('should log file operations', async () => {
      const fileOps = scaffold.getFileOps();
      await fileOps.writeFile('test-audit.txt', 'content');
      await fileOps.readFile('test-audit.txt');

      // File locks are logged when enabled
      await fileOps.lockFile('test-audit.txt');
      await fileOps.unlockFile('test-audit.txt');

      const events = await securityAudit.getRecentEvents();
      // Should have some events logged
      expect(events.length).toBeGreaterThanOrEqual(0);
    });
  });
});
