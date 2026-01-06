import { PathValidator } from './path-validator';
import { DirectoryOperations, DirectoryValidationResult } from './directory-operations';
import { FileOperations } from './file-operations';
import { SecurityAuditLogger, SecurityEventType } from './security-audit';
import { MemoryError, ErrorCodes } from '../exceptions';

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  errors: string[];
  directories: number;
  files: number;
}

export interface SecurityAuditResult {
  passed: boolean;
  timestamp: Date;
  findings: string[];
  directoryValidation: DirectoryValidationResult;
  symlinksBlocked: number;
  permissionIssues: number;
  recommendations: string[];
}

export interface SecurityStatus {
  lastAuditTime?: Date;
  violationCount: number;
  warnings: string[];
  isSecure: boolean;
}

export interface MemoryScaffoldOptions {
  enableSecurityAudit?: boolean;
  auditLogPath?: string;
  maxDepth?: number;
}

const MEMORY_DIRECTORIES = [
  'context',
  'projects',
  'agents',
  'sessions',
  'history',
  'history/raw-outputs',
  'history/learnings',
  'history/sessions',
  'history/research',
  'history/decisions',
  'history/execution',
  'skills',
  'index',
  'backups',
  'meta',
  'meta/verification',
];

const INITIAL_FILES: Record<string, string> = {
  'context/user.md': `# User Context

## Preferences

## Working Style

## Communication

`,
  'context/system.md': `# System Context

## Environment

## Capabilities

## Constraints

`,
  'projects/current.md': `# Current Projects

## Active

## Backlog

`,
  'agents/orchestrator.md': `# Orchestrator State

## Current Mode

## Active Tasks

## Context

`,
  'meta/version.md': `# Memory System Version

version: 1.0.0
created: ${new Date().toISOString()}
format: infinite-aura-ts

`,
};

export class MemoryScaffold {
  private readonly basePath: string;
  private readonly pathValidator: PathValidator;
  private readonly directoryOps: DirectoryOperations;
  private readonly fileOps: FileOperations;
  private readonly securityAudit?: SecurityAuditLogger;
  private readonly maxDepth: number;
  private initialized: boolean = false;
  private lastAuditTime?: Date;
  private violationCount: number = 0;
  private warnings: string[] = [];

  constructor(basePath: string = '~/.infinite-aura-ts/memory/', options?: MemoryScaffoldOptions) {
    this.pathValidator = new PathValidator(basePath);
    this.basePath = this.pathValidator.getBasePath();
    this.maxDepth = options?.maxDepth ?? 3;

    // Initialize security audit if enabled
    if (options?.enableSecurityAudit !== false) {
      this.securityAudit = new SecurityAuditLogger({
        basePath: this.basePath,
        auditLogPath: options?.auditLogPath ?? 'meta/security-audit.jsonl',
        enabled: true,
      });
    }

    this.directoryOps = new DirectoryOperations(this.pathValidator, {
      securityAudit: this.securityAudit,
      maxDepth: this.maxDepth,
    });

    this.fileOps = new FileOperations(this.pathValidator, {
      securityAudit: this.securityAudit,
      enableLocking: true,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.pathValidator.ensureBasePathExists();

      for (const dir of MEMORY_DIRECTORIES) {
        await this.directoryOps.createDirectory(dir);
      }

      for (const [filePath, content] of Object.entries(INITIAL_FILES)) {
        const exists = await this.fileOps.fileExists(filePath);
        if (!exists) {
          await this.fileOps.writeFile(filePath, content);
        }
      }

      for (const dir of MEMORY_DIRECTORIES) {
        const gitkeepPath = `${dir}/.gitkeep`;
        const files = await this.directoryOps.listFiles(dir).catch(() => []);
        if (files.length === 0) {
          await this.fileOps.writeFile(gitkeepPath, '');
        }
      }

      this.initialized = true;
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(
        `Failed to initialize memory scaffold: ${err.message}`,
        ErrorCodes.MEMORY_INIT_ERROR,
        { basePath: this.basePath, error: err.message }
      );
    }
  }

  async validate(): Promise<ValidationResult> {
    const missing: string[] = [];
    const errors: string[] = [];
    let directories = 0;
    let files = 0;

    for (const dir of MEMORY_DIRECTORIES) {
      try {
        const exists = await this.directoryOps.directoryExists(dir);
        if (!exists) {
          missing.push(`directory: ${dir}`);
        } else {
          directories++;
        }
      } catch (error) {
        const err = error as Error;
        errors.push(`Error checking directory ${dir}: ${err.message}`);
      }
    }

    for (const filePath of Object.keys(INITIAL_FILES)) {
      try {
        const exists = await this.fileOps.fileExists(filePath);
        if (!exists) {
          missing.push(`file: ${filePath}`);
        } else {
          files++;
        }
      } catch (error) {
        const err = error as Error;
        errors.push(`Error checking file ${filePath}: ${err.message}`);
      }
    }

    return {
      valid: missing.length === 0 && errors.length === 0,
      missing,
      errors,
      directories,
      files,
    };
  }

  getPathValidator(): PathValidator {
    return this.pathValidator;
  }

  getDirectoryOps(): DirectoryOperations {
    return this.directoryOps;
  }

  getFileOps(): FileOperations {
    return this.fileOps;
  }

  getBasePath(): string {
    return this.basePath;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async destroy(): Promise<void> {
    const fsModule = await import('fs');
    await fsModule.promises.rm(this.basePath, { recursive: true, force: true });
    this.initialized = false;
  }

  // =========================================================================
  // Security Audit Methods
  // =========================================================================

  /**
   * Run a comprehensive security audit
   */
  async runSecurityAudit(): Promise<SecurityAuditResult> {
    const findings: string[] = [];
    const recommendations: string[] = [];

    // Log audit start
    if (this.securityAudit) {
      await this.securityAudit.logSecurityEvent(
        SecurityEventType.SECURITY_AUDIT,
        'info',
        'Starting security audit',
        { action: 'audit_start' }
      );
    }

    // Validate directory structure
    const directoryValidation = await this.directoryOps.validateDirectoryStructure(
      '.',
      MEMORY_DIRECTORIES
    );

    // Collect findings
    if (directoryValidation.symlinksFound.length > 0) {
      findings.push(`Symlinks detected: ${directoryValidation.symlinksFound.join(', ')}`);
      recommendations.push('Remove symbolic links from the memory directory');
    }

    if (directoryValidation.permissionIssues.length > 0) {
      findings.push(`Permission issues: ${directoryValidation.permissionIssues.join(', ')}`);
      recommendations.push('Fix file/directory permissions (should be readable/writable)');
    }

    if (directoryValidation.depthViolations.length > 0) {
      findings.push(`Depth violations: ${directoryValidation.depthViolations.join(', ')}`);
      recommendations.push(`Restructure directories to not exceed ${this.maxDepth} levels`);
    }

    if (directoryValidation.issues.length > 0) {
      findings.push(...directoryValidation.issues);
      recommendations.push('Run initialize() to create missing directories');
    }

    const passed = findings.length === 0;
    this.lastAuditTime = new Date();

    if (!passed) {
      this.violationCount += findings.length;
      this.warnings = findings.slice(0, 5); // Keep last 5 warnings
    }

    // Log audit completion
    if (this.securityAudit) {
      await this.securityAudit.logSecurityAuditRun(passed, findings);
    }

    return {
      passed,
      timestamp: this.lastAuditTime,
      findings,
      directoryValidation,
      symlinksBlocked: directoryValidation.symlinksFound.length,
      permissionIssues: directoryValidation.permissionIssues.length,
      recommendations,
    };
  }

  /**
   * Get current security status
   */
  async getSecurityStatus(): Promise<SecurityStatus> {
    return {
      lastAuditTime: this.lastAuditTime,
      violationCount: this.violationCount,
      warnings: this.warnings,
      isSecure: this.violationCount === 0 && this.warnings.length === 0,
    };
  }

  /**
   * Repair permissions on memory directories
   */
  async repairPermissions(): Promise<{ repaired: string[]; failed: string[] }> {
    const repaired: string[] = [];
    const failed: string[] = [];
    const fsModule = await import('fs');

    for (const dir of MEMORY_DIRECTORIES) {
      try {
        const absolutePath = this.pathValidator.resolvePath(dir);
        await fsModule.promises.chmod(absolutePath, 0o755);
        repaired.push(dir);
      } catch (error) {
        const err = error as Error;
        failed.push(`${dir}: ${err.message}`);
      }
    }

    if (this.securityAudit) {
      await this.securityAudit.logSecurityEvent(
        SecurityEventType.SECURITY_AUDIT,
        failed.length > 0 ? 'warning' : 'info',
        `Permission repair completed: ${repaired.length} repaired, ${failed.length} failed`,
        {
          action: 'repair_permissions',
          extra: { repaired, failed },
        }
      );
    }

    return { repaired, failed };
  }

  /**
   * Get security audit logger
   */
  getSecurityAudit(): SecurityAuditLogger | undefined {
    return this.securityAudit;
  }

  /**
   * Get max depth setting
   */
  getMaxDepth(): number {
    return this.maxDepth;
  }
}
