import * as fs from 'fs';
import * as path from 'path';
import { FileOperationError, ValidationError, ErrorCodes } from '../exceptions';
import { PathValidator } from './path-validator';
import { SecurityAuditLogger, SecurityEventType } from './security-audit';

export interface DirectoryStats {
  size: number;
  fileCount: number;
  subdirCount: number;
  created: Date;
  modified: Date;
  path: string;
}

export interface DirectoryValidationResult {
  valid: boolean;
  issues: string[];
  symlinksFound: string[];
  permissionIssues: string[];
  depthViolations: string[];
}

export interface DirectoryOperationsOptions {
  securityAudit?: SecurityAuditLogger;
  maxDepth?: number;
}

export class DirectoryOperations {
  private readonly pathValidator: PathValidator;
  private readonly basePath: string;
  private readonly securityAudit?: SecurityAuditLogger;
  private readonly maxDepth: number;

  constructor(pathValidator: PathValidator, options?: DirectoryOperationsOptions) {
    this.pathValidator = pathValidator;
    this.basePath = pathValidator.getBasePath();
    this.securityAudit = options?.securityAudit;
    this.maxDepth = options?.maxDepth ?? 3;
  }

  async createDirectory(relativePath: string): Promise<void> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      await fs.promises.mkdir(absolutePath, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw new FileOperationError(
          `Failed to create directory: ${err.message}`,
          ErrorCodes.FILE_WRITE_ERROR,
          { path: relativePath, absolutePath, error: err.message }
        );
      }
    }
  }

  async ensureDirectory(relativePath: string): Promise<void> {
    return this.createDirectory(relativePath);
  }

  async directoryExists(relativePath: string): Promise<boolean> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      const stats = await fs.promises.stat(absolutePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async listDirectories(relativePath: string): Promise<string[]> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      const entries = await fs.promises.readdir(absolutePath, {
        withFileTypes: true,
      });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new FileOperationError(
          `Directory not found: ${relativePath}`,
          ErrorCodes.DIRECTORY_NOT_FOUND,
          { path: relativePath, absolutePath }
        );
      }
      throw new FileOperationError(
        `Failed to list directories: ${err.message}`,
        ErrorCodes.FILE_READ_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  async listFiles(relativePath: string): Promise<string[]> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      const entries = await fs.promises.readdir(absolutePath, {
        withFileTypes: true,
      });
      return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new FileOperationError(
          `Directory not found: ${relativePath}`,
          ErrorCodes.DIRECTORY_NOT_FOUND,
          { path: relativePath, absolutePath }
        );
      }
      throw new FileOperationError(
        `Failed to list files: ${err.message}`,
        ErrorCodes.FILE_READ_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  async getDirectoryStats(relativePath: string): Promise<DirectoryStats> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      const stats = await fs.promises.stat(absolutePath);

      if (!stats.isDirectory()) {
        throw new FileOperationError(
          `Path is not a directory: ${relativePath}`,
          ErrorCodes.FILE_READ_ERROR,
          { path: relativePath, absolutePath }
        );
      }

      const entries = await fs.promises.readdir(absolutePath, {
        withFileTypes: true,
      });

      let fileCount = 0;
      let subdirCount = 0;
      let totalSize = 0;

      for (const entry of entries) {
        const entryPath = path.join(absolutePath, entry.name);
        if (entry.isFile()) {
          fileCount++;
          try {
            const fileStats = await fs.promises.stat(entryPath);
            totalSize += fileStats.size;
          } catch {
            // Skip files we can't stat
          }
        } else if (entry.isDirectory()) {
          subdirCount++;
        }
      }

      return {
        size: totalSize,
        fileCount,
        subdirCount,
        created: stats.birthtime,
        modified: stats.mtime,
        path: relativePath,
      };
    } catch (error) {
      if (error instanceof FileOperationError) {
        throw error;
      }
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new FileOperationError(
          `Directory not found: ${relativePath}`,
          ErrorCodes.DIRECTORY_NOT_FOUND,
          { path: relativePath, absolutePath }
        );
      }
      throw new FileOperationError(
        `Failed to get directory stats: ${err.message}`,
        ErrorCodes.FILE_READ_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  async removeDirectory(relativePath: string, recursive: boolean = false): Promise<void> {
    this.pathValidator.validate(relativePath);
    const absolutePath = this.pathValidator.resolvePath(relativePath);

    try {
      if (recursive) {
        await fs.promises.rm(absolutePath, { recursive: true, force: true });
      } else {
        await fs.promises.rmdir(absolutePath);
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return;
      }
      throw new FileOperationError(
        `Failed to remove directory: ${err.message}`,
        ErrorCodes.FILE_WRITE_ERROR,
        { path: relativePath, absolutePath, error: err.message }
      );
    }
  }

  // =========================================================================
  // Security Validation
  // =========================================================================

  /**
   * Enforce maximum directory depth (C7 constraint)
   */
  async enforceMaxDepth(relativePath: string, maxDepth?: number): Promise<void> {
    const depth = maxDepth ?? this.maxDepth;
    const pathDepth = this.pathValidator.getPathDepth(relativePath);

    if (pathDepth > depth) {
      if (this.securityAudit) {
        await this.securityAudit.logSecurityEvent(
          SecurityEventType.VIOLATION,
          'warning',
          `Directory depth violation: ${relativePath} (depth: ${pathDepth}, max: ${depth})`,
          { path: relativePath, extra: { pathDepth, maxDepth: depth } }
        );
      }

      throw new ValidationError(
        `Directory depth ${pathDepth} exceeds maximum allowed depth of ${depth}`,
        ErrorCodes.VALIDATION_FAILED,
        { path: relativePath, pathDepth, maxDepth: depth }
      );
    }
  }

  /**
   * Validate entire directory structure for security issues
   */
  async validateDirectoryStructure(
    relativePath: string = '',
    expectedDirs?: string[]
  ): Promise<DirectoryValidationResult> {
    const issues: string[] = [];
    const symlinksFound: string[] = [];
    const permissionIssues: string[] = [];
    const depthViolations: string[] = [];

    const dirsToCheck = expectedDirs ?? [];

    // Check expected directories exist
    for (const dir of dirsToCheck) {
      try {
        const exists = await this.directoryExists(dir);
        if (!exists) {
          issues.push(`Missing directory: ${dir}`);
        }
      } catch (error) {
        const err = error as Error;
        issues.push(`Error checking directory ${dir}: ${err.message}`);
      }
    }

    // Scan for symlinks and permission issues
    await this.scanDirectoryTree(
      relativePath || '.',
      symlinksFound,
      permissionIssues,
      depthViolations,
      0
    );

    const valid =
      issues.length === 0 &&
      symlinksFound.length === 0 &&
      permissionIssues.length === 0 &&
      depthViolations.length === 0;

    if (this.securityAudit) {
      await this.securityAudit.logSecurityEvent(
        SecurityEventType.SECURITY_AUDIT,
        valid ? 'info' : 'warning',
        valid
          ? 'Directory structure validation passed'
          : 'Directory structure validation found issues',
        {
          path: relativePath,
          extra: {
            issueCount: issues.length,
            symlinksCount: symlinksFound.length,
            permissionIssuesCount: permissionIssues.length,
            depthViolationsCount: depthViolations.length,
          },
        }
      );
    }

    return {
      valid,
      issues,
      symlinksFound,
      permissionIssues,
      depthViolations,
    };
  }

  /**
   * Recursively scan directory tree for security issues
   */
  private async scanDirectoryTree(
    relativePath: string,
    symlinksFound: string[],
    permissionIssues: string[],
    depthViolations: string[],
    currentDepth: number
  ): Promise<void> {
    // Check depth
    if (currentDepth > this.maxDepth) {
      depthViolations.push(`${relativePath} (depth: ${currentDepth})`);
    }

    try {
      const absolutePath = this.pathValidator.resolvePath(relativePath);

      // Check for symlink
      const isSymlink = await this.pathValidator.isSymlink(absolutePath);
      if (isSymlink) {
        symlinksFound.push(relativePath);
        return; // Don't follow symlinks
      }

      // Check permissions
      try {
        await fs.promises.access(absolutePath, fs.constants.R_OK | fs.constants.W_OK);
      } catch {
        permissionIssues.push(relativePath);
      }

      // List subdirectories and recurse
      const entries = await fs.promises.readdir(absolutePath, { withFileTypes: true });
      for (const entry of entries) {
        const subPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        // Check if entry is a symlink first
        if (entry.isSymbolicLink()) {
          symlinksFound.push(subPath);
          continue; // Don't follow symlinks
        }

        // Recurse into directories
        if (entry.isDirectory()) {
          await this.scanDirectoryTree(
            subPath,
            symlinksFound,
            permissionIssues,
            depthViolations,
            currentDepth + 1
          );
        }
      }
    } catch (error) {
      // Directory might not exist or be inaccessible
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        permissionIssues.push(`${relativePath}: ${err.message}`);
      }
    }
  }

  /**
   * Get max depth setting
   */
  getMaxDepth(): number {
    return this.maxDepth;
  }
}
