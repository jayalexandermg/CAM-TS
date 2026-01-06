import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { PathValidationError, SecurityError, FileOperationError, ErrorCodes } from '../exceptions';
import { SecurityPatterns } from '../exceptions/security-patterns';

export class PathValidator {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = this.resolveBasePath(basePath);
  }

  private resolveBasePath(inputPath: string): string {
    let resolved = inputPath;
    if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(1));
    }
    resolved = path.resolve(resolved);
    if (!resolved.endsWith(path.sep)) {
      resolved += path.sep;
    }
    return resolved;
  }

  getBasePath(): string {
    return this.basePath;
  }

  validate(inputPath: string): void {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new PathValidationError('Path must be a non-empty string', ErrorCodes.INVALID_PATH, {
        path: inputPath,
      });
    }

    const traversalResult = SecurityPatterns.detectPathTraversal(inputPath);
    if (traversalResult.detected) {
      throw new SecurityError(
        `Path traversal attempt detected: ${traversalResult.message}`,
        ErrorCodes.PATH_TRAVERSAL,
        { path: inputPath, violations: traversalResult.violations }
      );
    }

    const nullByteResult = SecurityPatterns.detectNullByte(inputPath);
    if (nullByteResult.detected) {
      throw new SecurityError(
        `Null byte injection detected: ${nullByteResult.message}`,
        ErrorCodes.NULL_BYTE_INJECTION,
        { path: inputPath, violations: nullByteResult.violations }
      );
    }

    const absoluteResult = SecurityPatterns.detectAbsolutePath(inputPath);
    if (absoluteResult.detected) {
      throw new PathValidationError(
        'Absolute paths are not allowed; use relative paths within the memory boundary',
        ErrorCodes.INVALID_PATH,
        { path: inputPath, violations: absoluteResult.violations }
      );
    }

    const specialResult = SecurityPatterns.detectSpecialFile(inputPath);
    if (specialResult.detected) {
      throw new SecurityError(
        `Special file reference detected: ${specialResult.message}`,
        ErrorCodes.SYMLINK_DETECTED,
        { path: inputPath, violations: specialResult.violations }
      );
    }

    const resolved = this.resolvePath(inputPath);
    if (!this.isWithinBoundary(resolved)) {
      throw new PathValidationError(
        `Path is outside the allowed boundary: ${this.basePath}`,
        ErrorCodes.INVALID_PATH,
        { path: inputPath, resolved, basePath: this.basePath }
      );
    }
  }

  isWithinBoundary(absolutePath: string): boolean {
    const normalized = path.resolve(absolutePath);
    const normalizedBase = path.resolve(this.basePath);
    return (
      normalized === normalizedBase ||
      normalized.startsWith(normalizedBase + path.sep) ||
      normalized.startsWith(normalizedBase)
    );
  }

  resolvePath(relativePath: string): string {
    if (!relativePath || typeof relativePath !== 'string') {
      throw new PathValidationError('Path must be a non-empty string', ErrorCodes.INVALID_PATH, {
        path: relativePath,
      });
    }

    const traversalResult = SecurityPatterns.detectPathTraversal(relativePath);
    if (traversalResult.detected) {
      throw new SecurityError(
        `Path traversal attempt detected: ${traversalResult.message}`,
        ErrorCodes.PATH_TRAVERSAL,
        { path: relativePath, violations: traversalResult.violations }
      );
    }

    const absoluteResult = SecurityPatterns.detectAbsolutePath(relativePath);
    if (absoluteResult.detected) {
      throw new PathValidationError('Absolute paths are not allowed', ErrorCodes.INVALID_PATH, {
        path: relativePath,
      });
    }

    const resolved = path.resolve(this.basePath, relativePath);

    if (!this.isWithinBoundary(resolved)) {
      throw new PathValidationError(
        `Resolved path is outside the allowed boundary`,
        ErrorCodes.INVALID_PATH,
        { path: relativePath, resolved, basePath: this.basePath }
      );
    }

    return resolved;
  }

  sanitizePath(inputPath: string): string {
    if (!inputPath || typeof inputPath !== 'string') {
      return '';
    }

    let sanitized = inputPath;
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/\x00/g, '');
    sanitized = sanitized.replace(/%00/gi, '');
    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[<>:"|?*]/g, '');
    sanitized = sanitized.replace(/\\/g, '/');
    sanitized = sanitized.replace(/\/+/g, '/');
    sanitized = sanitized.replace(/^\/+/, '');
    sanitized = sanitized.replace(/\/+$/, '');

    return sanitized;
  }

  async ensureBasePathExists(): Promise<void> {
    try {
      await fs.promises.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw new PathValidationError(
          `Failed to create base path: ${err.message}`,
          ErrorCodes.INVALID_PATH,
          { path: this.basePath, error: err.message }
        );
      }
    }
  }

  async isSymlink(absolutePath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.lstat(absolutePath);
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  }

  async validateNoSymlink(relativePath: string): Promise<void> {
    const resolved = this.resolvePath(relativePath);
    const isLink = await this.isSymlink(resolved);
    if (isLink) {
      throw new SecurityError('Symbolic links are not allowed', ErrorCodes.SYMLINK_DETECTED, {
        path: relativePath,
        resolved,
      });
    }
  }

  /**
   * Resolve symlink to its real path and validate within boundary
   */
  async resolveSymlink(absolutePath: string): Promise<string> {
    try {
      const realPath = await fs.promises.realpath(absolutePath);
      if (!this.isWithinBoundary(realPath)) {
        throw new SecurityError(
          'Symlink target is outside the allowed boundary',
          ErrorCodes.SYMLINK_DETECTED,
          { path: absolutePath, realPath, basePath: this.basePath }
        );
      }
      return realPath;
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return absolutePath; // Path doesn't exist, return as-is
      }
      throw new SecurityError(
        `Failed to resolve symlink: ${err.message}`,
        ErrorCodes.SYMLINK_DETECTED,
        { path: absolutePath, error: err.message }
      );
    }
  }

  /**
   * Validate that no component in the path hierarchy is a symlink
   */
  async validateNoSymlinksInPath(relativePath: string): Promise<void> {
    const resolved = this.resolvePath(relativePath);
    const parts = resolved.replace(this.basePath, '').split(path.sep).filter(Boolean);

    let currentPath = this.basePath;
    for (const part of parts) {
      currentPath = path.join(currentPath, part);

      try {
        const stats = await fs.promises.lstat(currentPath);
        if (stats.isSymbolicLink()) {
          throw new SecurityError(
            `Symbolic link detected in path hierarchy: ${part}`,
            ErrorCodes.SYMLINK_DETECTED,
            { path: relativePath, symlinkComponent: currentPath }
          );
        }
      } catch (error) {
        if (error instanceof SecurityError) {
          throw error;
        }
        // Path component doesn't exist yet, which is fine
        break;
      }
    }
  }

  /**
   * Validate file/directory permissions
   */
  async validatePermissions(
    relativePath: string,
    mode: 'read' | 'write' | 'readwrite' = 'readwrite'
  ): Promise<void> {
    const resolved = this.resolvePath(relativePath);

    try {
      let accessMode: number;
      switch (mode) {
        case 'read':
          accessMode = fs.constants.R_OK;
          break;
        case 'write':
          accessMode = fs.constants.W_OK;
          break;
        case 'readwrite':
          accessMode = fs.constants.R_OK | fs.constants.W_OK;
          break;
      }

      await fs.promises.access(resolved, accessMode);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        // File doesn't exist, check parent directory permissions
        const parentDir = path.dirname(resolved);
        try {
          await fs.promises.access(parentDir, fs.constants.W_OK);
        } catch {
          throw new FileOperationError(
            `Insufficient permissions for parent directory: ${parentDir}`,
            ErrorCodes.FILE_WRITE_ERROR,
            { path: relativePath, parentDir, mode }
          );
        }
        return; // Parent is writable, file can be created
      }
      throw new FileOperationError(
        `Insufficient permissions for ${mode} access: ${relativePath}`,
        ErrorCodes.FILE_READ_ERROR,
        { path: relativePath, resolved, mode, error: err.message }
      );
    }
  }

  /**
   * Get the depth of a path (number of directory levels)
   */
  getPathDepth(relativePath: string): number {
    const sanitized = this.sanitizePath(relativePath);
    if (!sanitized) return 0;
    return sanitized.split('/').filter(Boolean).length;
  }

  /**
   * Validate path depth doesn't exceed maximum
   */
  validateMaxDepth(relativePath: string, maxDepth: number = 3): void {
    const depth = this.getPathDepth(relativePath);
    if (depth > maxDepth) {
      throw new PathValidationError(
        `Path depth ${depth} exceeds maximum allowed depth of ${maxDepth}`,
        ErrorCodes.INVALID_PATH,
        { path: relativePath, depth, maxDepth }
      );
    }
  }

  /**
   * Enhanced validate that includes symlink and permission checks
   */
  async validateSecure(
    relativePath: string,
    options: { checkSymlinks?: boolean; checkPermissions?: boolean; maxDepth?: number } = {}
  ): Promise<void> {
    // Run basic validation first
    this.validate(relativePath);

    // Check max depth if specified
    if (options.maxDepth !== undefined) {
      this.validateMaxDepth(relativePath, options.maxDepth);
    }

    // Check for symlinks in path hierarchy
    if (options.checkSymlinks !== false) {
      await this.validateNoSymlinksInPath(relativePath);
    }

    // Check permissions
    if (options.checkPermissions !== false) {
      await this.validatePermissions(relativePath, 'readwrite');
    }
  }
}
