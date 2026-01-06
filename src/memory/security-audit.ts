/**
 * Infinite Aura - Security Audit Logger
 *
 * Logs security events, violations, and access attempts for audit trail.
 * Uses JSONL format for append-only audit logs.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { GuardrailViolation } from '../guardrails/types';

// ============================================================================
// Types
// ============================================================================

export enum SecurityEventType {
  ACCESS_ATTEMPT = 'ACCESS_ATTEMPT',
  VIOLATION = 'VIOLATION',
  BOUNDARY_CHECK = 'BOUNDARY_CHECK',
  SYMLINK_DETECTED = 'SYMLINK_DETECTED',
  PERMISSION_CHECK = 'PERMISSION_CHECK',
  FILE_LOCK = 'FILE_LOCK',
  FILE_UNLOCK = 'FILE_UNLOCK',
  SECURITY_AUDIT = 'SECURITY_AUDIT',
  INITIALIZATION = 'INITIALIZATION',
}

export type SecuritySeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  path?: string;
  action?: string;
  allowed?: boolean;
  details?: Record<string, unknown>;
}

export interface SecurityAuditLoggerOptions {
  auditLogPath?: string;
  basePath: string;
  enabled?: boolean;
  maxEventSize?: number;
}

// ============================================================================
// Security Audit Logger
// ============================================================================

export class SecurityAuditLogger {
  private readonly auditLogPath: string;
  private readonly basePath: string;
  private readonly enabled: boolean;
  private readonly maxEventSize: number;
  private eventCount: number = 0;

  constructor(options: SecurityAuditLoggerOptions) {
    this.basePath = options.basePath;
    this.auditLogPath = path.join(
      this.basePath,
      options.auditLogPath ?? 'meta/security-audit.jsonl'
    );
    this.enabled = options.enabled ?? true;
    this.maxEventSize = options.maxEventSize ?? 10000;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Ensure audit log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    const dir = path.dirname(this.auditLogPath);
    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        // Silently fail - don't break operations due to audit logging
        console.error(`Failed to create audit log directory: ${err.message}`);
      }
    }
  }

  /**
   * Append event to audit log
   */
  private async appendToLog(event: SecurityEvent): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.ensureLogDirectory();
      const line = JSON.stringify(event) + '\n';
      await fs.promises.appendFile(this.auditLogPath, line, 'utf-8');
      this.eventCount++;
    } catch (error) {
      // Silently fail - don't break operations due to audit logging
      const err = error as Error;
      console.error(`Failed to write audit log: ${err.message}`);
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    message: string,
    details?: {
      path?: string;
      action?: string;
      allowed?: boolean;
      extra?: Record<string, unknown>;
    }
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      path: details?.path,
      action: details?.action,
      allowed: details?.allowed,
      details: details?.extra,
    };

    await this.appendToLog(event);
    return event;
  }

  /**
   * Log a guardrail violation
   */
  async logViolation(violation: GuardrailViolation): Promise<SecurityEvent> {
    return this.logSecurityEvent(
      SecurityEventType.VIOLATION,
      this.mapViolationSeverity(violation.severity),
      violation.message,
      {
        path: violation.context.path as string | undefined,
        action: violation.context.operation as string | undefined,
        allowed: false,
        extra: {
          policyId: violation.policyId,
          context: violation.context,
        },
      }
    );
  }

  /**
   * Log a file system access attempt
   */
  async logAccessAttempt(
    filePath: string,
    action: string,
    allowed: boolean,
    reason?: string
  ): Promise<SecurityEvent> {
    return this.logSecurityEvent(
      SecurityEventType.ACCESS_ATTEMPT,
      allowed ? 'info' : 'warning',
      allowed
        ? `Access allowed: ${action} on ${filePath}`
        : `Access denied: ${action} on ${filePath}${reason ? ` - ${reason}` : ''}`,
      {
        path: filePath,
        action,
        allowed,
        extra: reason ? { reason } : undefined,
      }
    );
  }

  /**
   * Log symlink detection
   */
  async logSymlinkDetected(filePath: string, target?: string): Promise<SecurityEvent> {
    return this.logSecurityEvent(
      SecurityEventType.SYMLINK_DETECTED,
      'warning',
      `Symlink detected: ${filePath}`,
      {
        path: filePath,
        action: 'symlink_check',
        allowed: false,
        extra: target ? { target } : undefined,
      }
    );
  }

  /**
   * Log file lock operation
   */
  async logFileLock(filePath: string, acquired: boolean): Promise<SecurityEvent> {
    return this.logSecurityEvent(
      acquired ? SecurityEventType.FILE_LOCK : SecurityEventType.FILE_UNLOCK,
      'info',
      acquired ? `File lock acquired: ${filePath}` : `File lock released: ${filePath}`,
      {
        path: filePath,
        action: acquired ? 'lock' : 'unlock',
        allowed: true,
      }
    );
  }

  /**
   * Log security audit run
   */
  async logSecurityAuditRun(passed: boolean, findings: string[]): Promise<SecurityEvent> {
    return this.logSecurityEvent(
      SecurityEventType.SECURITY_AUDIT,
      passed ? 'info' : 'warning',
      passed ? 'Security audit passed' : `Security audit found ${findings.length} issue(s)`,
      {
        action: 'security_audit',
        allowed: passed,
        extra: { findings },
      }
    );
  }

  /**
   * Get recent security events
   */
  async getRecentEvents(limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const content = await fs.promises.readFile(this.auditLogPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      const events = lines.map((line) => JSON.parse(line) as SecurityEvent);
      return events.slice(-limit);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: SecurityEventType, limit: number = 100): Promise<SecurityEvent[]> {
    const events = await this.getRecentEvents(limit * 2);
    return events.filter((e) => e.type === type).slice(-limit);
  }

  /**
   * Get violation events only
   */
  async getViolations(limit: number = 100): Promise<SecurityEvent[]> {
    return this.getEventsByType(SecurityEventType.VIOLATION, limit);
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.eventCount;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get audit log path
   */
  getAuditLogPath(): string {
    return this.auditLogPath;
  }

  /**
   * Map violation severity to security severity
   */
  private mapViolationSeverity(severity: 'low' | 'medium' | 'high' | 'critical'): SecuritySeverity {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      case 'critical':
        return 'critical';
      default:
        return 'warning';
    }
  }

  /**
   * Clear audit log (for testing only)
   */
  async clearLog(): Promise<void> {
    try {
      await fs.promises.unlink(this.auditLogPath);
      this.eventCount = 0;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
