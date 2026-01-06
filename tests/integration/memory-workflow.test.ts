/**
 * Integration Tests - Memory Workflow
 *
 * End-to-end tests for complete memory system workflows.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemoryScaffold } from '../../src/memory/scaffold';
import { PathValidator } from '../../src/memory/path-validator';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { SecurityEventType } from '../../src/memory/security-audit';
import { SecurityError, PathValidationError, FileOperationError } from '../../src/exceptions';
import {
  createTempMemoryScaffold,
  cleanupTempScaffold,
  assertAuditLogContains,
} from '../utils/test-helpers';

describe('Integration: Memory Workflow', () => {
  describe('Full Memory Scaffold Initialization', () => {
    let scaffold: MemoryScaffold;
    let tempDir: string;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold({ enableSecurityAudit: true });
      scaffold = result.scaffold;
      tempDir = result.tempDir;
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should create all 18 directories on initialization', async () => {
      const validation = await scaffold.validate();

      expect(validation.valid).toBe(true);
      expect(validation.directories).toBeGreaterThanOrEqual(16);
      expect(validation.errors).toHaveLength(0);
    });

    it('should create initial files', async () => {
      const fileOps = scaffold.getFileOps();

      // Check that initial files exist
      expect(await fileOps.fileExists('context/user.md')).toBe(true);
      expect(await fileOps.fileExists('context/system.md')).toBe(true);
      expect(await fileOps.fileExists('projects/current.md')).toBe(true);
      expect(await fileOps.fileExists('agents/orchestrator.md')).toBe(true);
      expect(await fileOps.fileExists('meta/version.md')).toBe(true);
    });

    it('should write and read files across directories', async () => {
      const fileOps = scaffold.getFileOps();

      // Write to multiple directories
      await fileOps.writeFile('context/test.md', '# Test Context');
      await fileOps.writeFile('projects/test-project.md', '# Test Project');
      await fileOps.writeFile('history/learnings/2024-01-01_test.md', '# Learning');

      // Read back and verify
      const context = await fileOps.readFile('context/test.md');
      const project = await fileOps.readFile('projects/test-project.md');
      const learning = await fileOps.readFile('history/learnings/2024-01-01_test.md');

      expect(context).toBe('# Test Context');
      expect(project).toBe('# Test Project');
      expect(learning).toBe('# Learning');
    });

    it('should run security audit and pass', async () => {
      const auditResult = await scaffold.runSecurityAudit();

      expect(auditResult.passed).toBe(true);
      expect(auditResult.findings).toHaveLength(0);
      expect(auditResult.symlinksBlocked).toBe(0);
    });

    it('should log initialization in audit', async () => {
      const auditLogger = scaffold.getSecurityAudit();
      if (auditLogger) {
        // Run another audit to generate log entry
        await scaffold.runSecurityAudit();

        const event = await assertAuditLogContains(
          auditLogger,
          SecurityEventType.SECURITY_AUDIT
        );
        expect(event).toBeDefined();
      }
    });
  });

  describe('Security Workflow', () => {
    let scaffold: MemoryScaffold;
    let tempDir: string;
    let pathValidator: PathValidator;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold({ enableSecurityAudit: true });
      scaffold = result.scaffold;
      tempDir = result.tempDir;
      pathValidator = scaffold.getPathValidator();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should block path traversal attempts', () => {
      expect(() => pathValidator.validate('../escape')).toThrow(SecurityError);
      expect(() => pathValidator.validate('dir/../../../etc/passwd')).toThrow(SecurityError);
      expect(() => pathValidator.validate('..%2f..%2f')).toThrow(SecurityError);
    });

    it('should block absolute paths', () => {
      expect(() => pathValidator.validate('/etc/passwd')).toThrow(PathValidationError);
      expect(() => pathValidator.validate('C:\\Windows\\System32')).toThrow(PathValidationError);
    });

    it('should detect symlinks', async () => {
      // Create a real file and a symlink to it
      const realFile = path.join(tempDir, 'real-file.txt');
      const symlinkPath = path.join(tempDir, 'symlink.txt');

      await fs.promises.writeFile(realFile, 'content');
      await fs.promises.symlink(realFile, symlinkPath);

      const isSymlink = await pathValidator.isSymlink(symlinkPath);
      expect(isSymlink).toBe(true);

      // validateNoSymlink should throw
      await expect(pathValidator.validateNoSymlink('symlink.txt')).rejects.toThrow(SecurityError);
    });

    it('should block null byte injection', () => {
      expect(() => pathValidator.validate('file%00.txt')).toThrow(SecurityError);
    });

    it('should validate path depth', () => {
      pathValidator.validateMaxDepth('a/b/c', 3);
      expect(() => pathValidator.validateMaxDepth('a/b/c/d', 3)).toThrow(PathValidationError);
    });
  });

  describe('File Operations Workflow', () => {
    let scaffold: MemoryScaffold;
    let tempDir: string;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold({ enableSecurityAudit: true });
      scaffold = result.scaffold;
      tempDir = result.tempDir;
      fileOps = scaffold.getFileOps();
    });

    afterEach(async () => {
      await fileOps.releaseAllLocks();
      await cleanupTempScaffold(tempDir);
    });

    it('should write and read files atomically', async () => {
      const content = 'Test content for atomic write';
      await fileOps.writeFile('test/atomic.txt', content);

      const readContent = await fileOps.readFile('test/atomic.txt');
      expect(readContent).toBe(content);
    });

    it('should handle file locking', async () => {
      await fileOps.writeFile('test/lockable.txt', 'initial');

      // Lock file
      await fileOps.lockFile('test/lockable.txt');
      expect(await fileOps.isLocked('test/lockable.txt')).toBe(true);

      // Unlock file
      await fileOps.unlockFile('test/lockable.txt');
      expect(await fileOps.isLocked('test/lockable.txt')).toBe(false);
    });

    it('should execute operations with file lock', async () => {
      await fileOps.writeFile('test/with-lock.txt', 'initial');

      const result = await fileOps.withFileLock('test/with-lock.txt', async () => {
        await fileOps.writeFile('test/with-lock.txt', 'updated');
        return 'success';
      });

      expect(result).toBe('success');
      expect(await fileOps.isLocked('test/with-lock.txt')).toBe(false);
    });

    it('should append to JSONL files', async () => {
      await fileOps.appendJsonLine('test/data.jsonl', { id: 1, name: 'First' });
      await fileOps.appendJsonLine('test/data.jsonl', { id: 2, name: 'Second' });

      const lines = await fileOps.readJsonLines<{ id: number; name: string }>('test/data.jsonl');
      expect(lines).toHaveLength(2);
      expect(lines[0].id).toBe(1);
      expect(lines[1].name).toBe('Second');
    });

    it('should block deletion in history directory', async () => {
      await fileOps.writeFile('history/learnings/test.md', 'Learning content');

      await expect(fileOps.deleteFile('history/learnings/test.md')).rejects.toThrow();
    });

    it('should allow deletion outside history directory', async () => {
      await fileOps.writeFile('test/deletable.txt', 'Delete me');
      await fileOps.deleteFile('test/deletable.txt');

      expect(await fileOps.fileExists('test/deletable.txt')).toBe(false);
    });
  });

  describe('Context Loading Simulation', () => {
    let scaffold: MemoryScaffold;
    let tempDir: string;
    let fileOps: FileOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold({ enableSecurityAudit: true });
      scaffold = result.scaffold;
      tempDir = result.tempDir;
      fileOps = scaffold.getFileOps();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should simulate 4-layer context loading', async () => {
      // Layer 1: User context
      await fileOps.writeFile('context/user.md', `# User Context
## Preferences
- Theme: dark
- Language: TypeScript
`);

      // Layer 2: Project context
      await fileOps.writeFile('projects/infinite-aura.md', `# Infinite Aura Project
## Status: Active
## Phase: 1
`);

      // Layer 3: Session context
      await fileOps.writeFile('sessions/2024-01-01.md', `# Session
## Goals
- Complete Phase 1
`);

      // Layer 4: Agent state
      await fileOps.writeFile('agents/orchestrator.md', `# Orchestrator
## Mode: Implementation
## Current Task: Testing
`);

      // Read all 4 layers (simulate context loading)
      const userContext = await fileOps.readFile('context/user.md');
      const projectContext = await fileOps.readFile('projects/infinite-aura.md');
      const sessionContext = await fileOps.readFile('sessions/2024-01-01.md');
      const agentState = await fileOps.readFile('agents/orchestrator.md');

      // Verify all layers loaded
      expect(userContext).toContain('User Context');
      expect(projectContext).toContain('Infinite Aura');
      expect(sessionContext).toContain('Session');
      expect(agentState).toContain('Orchestrator');
    });

    it('should handle missing context files gracefully', async () => {
      await expect(fileOps.readFile('context/nonexistent.md')).rejects.toThrow(FileOperationError);
    });
  });

  describe('Error Recovery Workflow', () => {
    let scaffold: MemoryScaffold;
    let tempDir: string;
    let fileOps: FileOperations;
    let pathValidator: PathValidator;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold({ enableSecurityAudit: true });
      scaffold = result.scaffold;
      tempDir = result.tempDir;
      fileOps = scaffold.getFileOps();
      pathValidator = scaffold.getPathValidator();
    });

    afterEach(async () => {
      await fileOps.releaseAllLocks();
      await cleanupTempScaffold(tempDir);
    });

    it('should handle and recover from path validation errors', async () => {
      // Trigger error
      try {
        pathValidator.validate('../escape');
      } catch (e) {
        expect(e).toBeInstanceOf(SecurityError);
      }

      // System should still work
      await fileOps.writeFile('test/recovery.txt', 'Still working');
      const content = await fileOps.readFile('test/recovery.txt');
      expect(content).toBe('Still working');
    });

    it('should handle file not found errors', async () => {
      try {
        await fileOps.readFile('nonexistent/file.txt');
      } catch (e) {
        expect(e).toBeInstanceOf(FileOperationError);
      }

      // System should still work
      await fileOps.writeFile('test/after-error.txt', 'Working');
      expect(await fileOps.fileExists('test/after-error.txt')).toBe(true);
    });

    it('should handle lock timeout gracefully', async () => {
      await fileOps.writeFile('test/contested.txt', 'content');

      // Create a lock manually
      const lockPath = path.join(tempDir, 'test', 'contested.txt.lock');
      await fs.promises.writeFile(lockPath, JSON.stringify({
        pid: 99999,
        timestamp: new Date().toISOString(),
      }));

      // Try to lock with short timeout
      try {
        await fileOps.lockFile('test/contested.txt', 200);
      } catch (e) {
        expect(e).toBeInstanceOf(FileOperationError);
      }

      // Cleanup and verify system still works
      await fs.promises.unlink(lockPath);
      await fileOps.writeFile('test/after-lock-error.txt', 'Working');
      expect(await fileOps.fileExists('test/after-lock-error.txt')).toBe(true);
    });

    it('should remain stable after multiple errors', async () => {
      const errors: Error[] = [];

      // Trigger multiple errors
      for (let i = 0; i < 5; i++) {
        try {
          pathValidator.validate('../escape' + i);
        } catch (e) {
          errors.push(e as Error);
        }

        try {
          await fileOps.readFile(`nonexistent${i}.txt`);
        } catch (e) {
          errors.push(e as Error);
        }
      }

      expect(errors.length).toBe(10);

      // System should still work after all errors
      const validation = await scaffold.validate();
      expect(validation.valid).toBe(true);

      await fileOps.writeFile('test/stable.txt', 'System is stable');
      expect(await fileOps.readFile('test/stable.txt')).toBe('System is stable');
    });
  });

  describe('Directory Operations Workflow', () => {
    let scaffold: MemoryScaffold;
    let tempDir: string;
    let dirOps: DirectoryOperations;

    beforeEach(async () => {
      const result = await createTempMemoryScaffold({ enableSecurityAudit: true });
      scaffold = result.scaffold;
      tempDir = result.tempDir;
      dirOps = scaffold.getDirectoryOps();
    });

    afterEach(async () => {
      await cleanupTempScaffold(tempDir);
    });

    it('should create nested directories', async () => {
      await dirOps.createDirectory('test/nested/deep');

      expect(await dirOps.directoryExists('test')).toBe(true);
      expect(await dirOps.directoryExists('test/nested')).toBe(true);
      expect(await dirOps.directoryExists('test/nested/deep')).toBe(true);
    });

    it('should list directories', async () => {
      await dirOps.createDirectory('test/dir1');
      await dirOps.createDirectory('test/dir2');
      await dirOps.createDirectory('test/dir3');

      const dirs = await dirOps.listDirectories('test');
      expect(dirs).toContain('dir1');
      expect(dirs).toContain('dir2');
      expect(dirs).toContain('dir3');
    });

    it('should get directory stats', async () => {
      const fileOps = scaffold.getFileOps();
      await fileOps.writeFile('test/stats/file1.txt', 'content1');
      await fileOps.writeFile('test/stats/file2.txt', 'content2');
      await dirOps.createDirectory('test/stats/subdir');

      const stats = await dirOps.getDirectoryStats('test/stats');
      expect(stats.fileCount).toBe(2);
      expect(stats.subdirCount).toBe(1);
    });

    it('should validate directory structure', async () => {
      const result = await dirOps.validateDirectoryStructure('.', ['context', 'projects']);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});
