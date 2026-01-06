import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileOperationError, DestructiveActionBlockedError, ErrorCodes } from '../exceptions';
import { PathValidator } from './path-validator';
import { PolicyIds } from '../guardrails/policies';
import { SecurityAuditLogger } from './security-audit';

export interface FileStats {
  size: number;
  created: Date;
  modified: Date;
  lines: number;
  path: string;
}

export interface FileOperationsOptions {
  securityAudit?: SecurityAuditLogger;
  enableLocking?: boolean;
}

export class FileOperations {
  private readonly pathValidator: PathValidator;
  private readonly basePath: string;
  private readonly securityAudit?: SecurityAuditLogger;
  private readonly enableLocking: boolean;
  private readonly activeLocks: Map<string, { timestamp: Date; lockFile: string }> = new Map();

  constructor(pathValidator: PathValidator, options?: FileOperationsOptions) {
    this.pathValidator = pathValidator;
    this.basePath = pathValidator.getBasePath();
    this.securityAudit = options?.securityAudit;
    this.enableLocking = options?.enableLocking ?? false;
  }

  async readFile(relativePath: string): Promise<string> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      const content = await fs.promises.readFile(absolutePath, 'utf-8');
      return content;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new FileOperationError(`File not found: ${relativePath}`, ErrorCodes.FILE_NOT_FOUND, {
          path: relativePath,
          absolutePath,
        });
      }
      throw new FileOperationError(
        `Failed to read file: ${err.message}`,
        ErrorCodes.FILE_READ_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    const dir = path.dirname(absolutePath);
    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw new FileOperationError(
          `Failed to create parent directory: ${err.message}`,
          ErrorCodes.FILE_WRITE_ERROR,
          { path: relativePath, directory: dir, error: err.message }
        );
      }
    }

    const tempPath = `${absolutePath}.${crypto.randomBytes(8).toString('hex')}.tmp`;

    try {
      await fs.promises.writeFile(tempPath, content, 'utf-8');
      await fs.promises.rename(tempPath, absolutePath);
    } catch (error) {
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      const err = error as NodeJS.ErrnoException;
      throw new FileOperationError(
        `Failed to write file: ${err.message}`,
        ErrorCodes.FILE_WRITE_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  async appendFile(relativePath: string, content: string): Promise<void> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    const dir = path.dirname(absolutePath);
    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw new FileOperationError(
          `Failed to create parent directory: ${err.message}`,
          ErrorCodes.FILE_WRITE_ERROR,
          { path: relativePath, directory: dir, error: err.message }
        );
      }
    }

    let appendContent = content;
    if (!appendContent.endsWith('\n')) {
      appendContent += '\n';
    }

    try {
      await fs.promises.appendFile(absolutePath, appendContent, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      throw new FileOperationError(
        `Failed to append to file: ${err.message}`,
        ErrorCodes.FILE_APPEND_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      const stats = await fs.promises.stat(absolutePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    if (this.isInHistoryDirectory(relativePath)) {
      throw new DestructiveActionBlockedError(
        'delete',
        relativePath,
        PolicyIds.APPEND_ONLY_HISTORY,
        { reason: 'Files in history/ directory cannot be deleted (append-only)' }
      );
    }

    try {
      await fs.promises.unlink(absolutePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return;
      }
      throw new FileOperationError(
        `Failed to delete file: ${err.message}`,
        ErrorCodes.FILE_WRITE_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  async getFileStats(relativePath: string): Promise<FileStats> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      const stats = await fs.promises.stat(absolutePath);

      if (!stats.isFile()) {
        throw new FileOperationError(
          `Path is not a file: ${relativePath}`,
          ErrorCodes.FILE_READ_ERROR,
          { path: relativePath, absolutePath }
        );
      }

      const content = await fs.promises.readFile(absolutePath, 'utf-8');
      const lines = content.split('\n').length;

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        lines,
        path: relativePath,
      };
    } catch (error) {
      if (error instanceof FileOperationError) {
        throw error;
      }
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new FileOperationError(`File not found: ${relativePath}`, ErrorCodes.FILE_NOT_FOUND, {
          path: relativePath,
          absolutePath,
        });
      }
      throw new FileOperationError(
        `Failed to get file stats: ${err.message}`,
        ErrorCodes.FILE_READ_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  private isInHistoryDirectory(relativePath: string): boolean {
    const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
    return normalized.startsWith('history/') || normalized === 'history';
  }

  async copyFile(sourceRelativePath: string, destRelativePath: string): Promise<void> {
    this.pathValidator.validate(sourceRelativePath);
    this.pathValidator.validate(destRelativePath);

    const sourcePath = this.pathValidator.resolvePath(sourceRelativePath);
    const destPath = this.pathValidator.resolvePath(destRelativePath);

    const destDir = path.dirname(destPath);
    try {
      await fs.promises.mkdir(destDir, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw new FileOperationError(
          `Failed to create destination directory: ${err.message}`,
          ErrorCodes.FILE_WRITE_ERROR,
          { source: sourceRelativePath, dest: destRelativePath, error: err.message }
        );
      }
    }

    try {
      await fs.promises.copyFile(sourcePath, destPath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      throw new FileOperationError(
        `Failed to copy file: ${err.message}`,
        ErrorCodes.FILE_WRITE_ERROR,
        { source: sourceRelativePath, dest: destRelativePath, error: err.message }
      );
    }
  }

  async appendJsonLine(relativePath: string, data: object): Promise<void> {
    const jsonLine = JSON.stringify(data);
    await this.appendFile(relativePath, jsonLine);
  }

  async readJsonLines<T>(relativePath: string): Promise<T[]> {
    const content = await this.readFile(relativePath);
    const lines = content.split('\n').filter((line) => line.trim());
    return lines.map((line) => JSON.parse(line) as T);
  }

  // =========================================================================
  // File Locking
  // =========================================================================

  /**
   * Create a lock file for exclusive access
   */
  async lockFile(relativePath: string, timeoutMs: number = 5000): Promise<void> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);
    const lockPath = `${absolutePath}.lock`;

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to create lock file exclusively
        await fs.promises.writeFile(
          lockPath,
          JSON.stringify({
            pid: process.pid,
            timestamp: new Date().toISOString(),
            path: relativePath,
          }),
          { flag: 'wx' }
        );

        // Lock acquired
        this.activeLocks.set(relativePath, {
          timestamp: new Date(),
          lockFile: lockPath,
        });

        if (this.securityAudit) {
          await this.securityAudit.logFileLock(relativePath, true);
        }
        return;
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'EEXIST') {
          // Lock exists, check if it's stale (older than 60 seconds)
          try {
            const lockContent = await fs.promises.readFile(lockPath, 'utf-8');
            const lockData = JSON.parse(lockContent);
            const lockAge = Date.now() - new Date(lockData.timestamp).getTime();
            if (lockAge > 60000) {
              // Stale lock, remove it
              await fs.promises.unlink(lockPath);
              continue;
            }
          } catch {
            // Can't read lock file, try to remove it
            try {
              await fs.promises.unlink(lockPath);
            } catch {
              // Ignore
            }
          }
          // Wait and retry
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }
        throw new FileOperationError(
          `Failed to acquire lock: ${err.message}`,
          ErrorCodes.FILE_WRITE_ERROR,
          { path: relativePath, lockPath, error: err.message }
        );
      }
    }

    throw new FileOperationError(
      `Timeout waiting for file lock: ${relativePath}`,
      ErrorCodes.FILE_WRITE_ERROR,
      { path: relativePath, timeoutMs }
    );
  }

  /**
   * Release a file lock
   */
  async unlockFile(relativePath: string): Promise<void> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);
    const lockPath = `${absolutePath}.lock`;

    try {
      await fs.promises.unlink(lockPath);
      this.activeLocks.delete(relativePath);

      if (this.securityAudit) {
        await this.securityAudit.logFileLock(relativePath, false);
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        throw new FileOperationError(
          `Failed to release lock: ${err.message}`,
          ErrorCodes.FILE_WRITE_ERROR,
          { path: relativePath, lockPath, error: err.message }
        );
      }
      // Lock doesn't exist, that's fine
      this.activeLocks.delete(relativePath);
    }
  }

  /**
   * Check if a file is locked
   */
  async isLocked(relativePath: string): Promise<boolean> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);
    const lockPath = `${absolutePath}.lock`;

    try {
      await fs.promises.access(lockPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute an operation with a file lock
   */
  async withFileLock<T>(
    relativePath: string,
    operation: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    await this.lockFile(relativePath, timeoutMs);
    try {
      return await operation();
    } finally {
      await this.unlockFile(relativePath);
    }
  }

  // =========================================================================
  // File Integrity
  // =========================================================================

  /**
   * Verify file integrity (exists, within boundary, no symlinks)
   */
  async verifyFileIntegrity(relativePath: string): Promise<boolean> {
    try {
      this.pathValidator.validate(relativePath);

      // Check symlinks in path
      await this.pathValidator.validateNoSymlinksInPath(relativePath);

      // Check file exists
      const exists = await this.fileExists(relativePath);
      if (!exists) {
        return false;
      }

      // Check permissions
      await this.pathValidator.validatePermissions(relativePath, 'read');

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Log access attempt (for audit trail)
   */
  private async logAccess(
    relativePath: string,
    action: string,
    allowed: boolean,
    reason?: string
  ): Promise<void> {
    if (this.securityAudit) {
      await this.securityAudit.logAccessAttempt(relativePath, action, allowed, reason);
    }
  }

  /**
   * Get active locks count
   */
  getActiveLocksCount(): number {
    return this.activeLocks.size;
  }

  /**
   * Get all active locks
   */
  getActiveLocks(): Map<string, { timestamp: Date; lockFile: string }> {
    return new Map(this.activeLocks);
  }

  /**
   * Release all locks (cleanup)
   */
  async releaseAllLocks(): Promise<void> {
    const locks = [...this.activeLocks.keys()];
    for (const relativePath of locks) {
      try {
        await this.unlockFile(relativePath);
      } catch {
        // Ignore errors during cleanup
      }
    }
  }
}
