import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  SecurityAuditLogger,
  SecurityEventType,
  SecurityEvent,
} from '../../src/memory/security-audit';

describe('SecurityAuditLogger', () => {
  let tempDir: string;
  let auditLogger: SecurityAuditLogger;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'security-audit-test-'));
    await fs.promises.mkdir(path.join(tempDir, 'meta'), { recursive: true });

    auditLogger = new SecurityAuditLogger({
      basePath: tempDir,
      auditLogPath: 'meta/security-audit.jsonl',
      enabled: true,
    });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const logger = new SecurityAuditLogger({ basePath: tempDir });
      expect(logger.isEnabled()).toBe(true);
      expect(logger.getAuditLogPath()).toContain('security-audit.jsonl');
    });

    it('should create with custom audit log path', () => {
      const logger = new SecurityAuditLogger({
        basePath: tempDir,
        auditLogPath: 'custom/audit.jsonl',
      });
      expect(logger.getAuditLogPath()).toContain('custom/audit.jsonl');
    });

    it('should respect enabled flag', () => {
      const logger = new SecurityAuditLogger({
        basePath: tempDir,
        enabled: false,
      });
      expect(logger.isEnabled()).toBe(false);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event', async () => {
      const event = await auditLogger.logSecurityEvent(
        SecurityEventType.ACCESS_ATTEMPT,
        'info',
        'Test access attempt',
        { path: '/test/path', action: 'read', allowed: true }
      );

      expect(event.id).toMatch(/^evt_/);
      expect(event.type).toBe(SecurityEventType.ACCESS_ATTEMPT);
      expect(event.severity).toBe('info');
      expect(event.message).toBe('Test access attempt');
      expect(event.path).toBe('/test/path');
      expect(event.action).toBe('read');
      expect(event.allowed).toBe(true);
    });

    it('should include timestamp in ISO format', async () => {
      const event = await auditLogger.logSecurityEvent(
        SecurityEventType.BOUNDARY_CHECK,
        'warning',
        'Boundary check'
      );

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should write to audit log file', async () => {
      await auditLogger.logSecurityEvent(
        SecurityEventType.VIOLATION,
        'error',
        'Security violation'
      );

      const logPath = auditLogger.getAuditLogPath();
      const content = await fs.promises.readFile(logPath, 'utf-8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.type).toBe(SecurityEventType.VIOLATION);
      expect(parsed.severity).toBe('error');
    });

    it('should not log when disabled', async () => {
      const disabledLogger = new SecurityAuditLogger({
        basePath: tempDir,
        auditLogPath: 'meta/disabled-audit.jsonl',
        enabled: false,
      });

      await disabledLogger.logSecurityEvent(
        SecurityEventType.ACCESS_ATTEMPT,
        'info',
        'Should not be logged'
      );

      const logPath = path.join(tempDir, 'meta/disabled-audit.jsonl');
      await expect(fs.promises.access(logPath)).rejects.toThrow();
    });
  });

  describe('logAccessAttempt', () => {
    it('should log allowed access attempt', async () => {
      const event = await auditLogger.logAccessAttempt('/test/file.txt', 'read', true);

      expect(event.type).toBe(SecurityEventType.ACCESS_ATTEMPT);
      expect(event.severity).toBe('info');
      expect(event.allowed).toBe(true);
      expect(event.message).toContain('Access allowed');
    });

    it('should log denied access attempt', async () => {
      const event = await auditLogger.logAccessAttempt(
        '/test/file.txt',
        'write',
        false,
        'Permission denied'
      );

      expect(event.type).toBe(SecurityEventType.ACCESS_ATTEMPT);
      expect(event.severity).toBe('warning');
      expect(event.allowed).toBe(false);
      expect(event.message).toContain('Access denied');
      expect(event.message).toContain('Permission denied');
    });
  });

  describe('logViolation', () => {
    it('should log guardrail violation', async () => {
      const event = await auditLogger.logViolation({
        policyId: 'test-policy',
        message: 'Test violation',
        severity: 'high',
        timestamp: new Date(),
        context: { path: '/test/path', operation: 'delete' },
      });

      expect(event.type).toBe(SecurityEventType.VIOLATION);
      expect(event.severity).toBe('error');
      expect(event.allowed).toBe(false);
      expect(event.details?.policyId).toBe('test-policy');
    });

    it('should map violation severity correctly', async () => {
      const lowEvent = await auditLogger.logViolation({
        policyId: 'test',
        message: 'Low severity',
        severity: 'low',
        timestamp: new Date(),
        context: {},
      });
      expect(lowEvent.severity).toBe('info');

      const criticalEvent = await auditLogger.logViolation({
        policyId: 'test',
        message: 'Critical severity',
        severity: 'critical',
        timestamp: new Date(),
        context: {},
      });
      expect(criticalEvent.severity).toBe('critical');
    });
  });

  describe('logSymlinkDetected', () => {
    it('should log symlink detection', async () => {
      const event = await auditLogger.logSymlinkDetected('/test/symlink', '/real/target');

      expect(event.type).toBe(SecurityEventType.SYMLINK_DETECTED);
      expect(event.severity).toBe('warning');
      expect(event.path).toBe('/test/symlink');
      expect(event.details?.target).toBe('/real/target');
    });
  });

  describe('logFileLock', () => {
    it('should log file lock acquired', async () => {
      const event = await auditLogger.logFileLock('/test/file.txt', true);

      expect(event.type).toBe(SecurityEventType.FILE_LOCK);
      expect(event.message).toContain('lock acquired');
    });

    it('should log file lock released', async () => {
      const event = await auditLogger.logFileLock('/test/file.txt', false);

      expect(event.type).toBe(SecurityEventType.FILE_UNLOCK);
      expect(event.message).toContain('lock released');
    });
  });

  describe('logSecurityAuditRun', () => {
    it('should log successful audit', async () => {
      const event = await auditLogger.logSecurityAuditRun(true, []);

      expect(event.type).toBe(SecurityEventType.SECURITY_AUDIT);
      expect(event.severity).toBe('info');
      expect(event.message).toContain('passed');
    });

    it('should log failed audit with findings', async () => {
      const findings = ['Issue 1', 'Issue 2'];
      const event = await auditLogger.logSecurityAuditRun(false, findings);

      expect(event.type).toBe(SecurityEventType.SECURITY_AUDIT);
      expect(event.severity).toBe('warning');
      expect(event.message).toContain('2 issue(s)');
      expect(event.details?.findings).toEqual(findings);
    });
  });

  describe('getRecentEvents', () => {
    it('should return empty array when no events', async () => {
      const events = await auditLogger.getRecentEvents();
      expect(events).toEqual([]);
    });

    it('should return logged events', async () => {
      await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', 'Event 1');
      await auditLogger.logSecurityEvent(SecurityEventType.VIOLATION, 'error', 'Event 2');
      await auditLogger.logSecurityEvent(SecurityEventType.BOUNDARY_CHECK, 'warning', 'Event 3');

      const events = await auditLogger.getRecentEvents();
      expect(events).toHaveLength(3);
      expect(events[0].message).toBe('Event 1');
      expect(events[2].message).toBe('Event 3');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', `Event ${i}`);
      }

      const events = await auditLogger.getRecentEvents(5);
      expect(events).toHaveLength(5);
      expect(events[4].message).toBe('Event 9');
    });
  });

  describe('getEventsByType', () => {
    it('should filter events by type', async () => {
      await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', 'Access 1');
      await auditLogger.logSecurityEvent(SecurityEventType.VIOLATION, 'error', 'Violation 1');
      await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', 'Access 2');

      const accessEvents = await auditLogger.getEventsByType(SecurityEventType.ACCESS_ATTEMPT);
      expect(accessEvents).toHaveLength(2);
      expect(accessEvents[0].message).toBe('Access 1');
      expect(accessEvents[1].message).toBe('Access 2');
    });
  });

  describe('getViolations', () => {
    it('should return only violation events', async () => {
      await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', 'Access');
      await auditLogger.logSecurityEvent(SecurityEventType.VIOLATION, 'error', 'Violation 1');
      await auditLogger.logSecurityEvent(SecurityEventType.VIOLATION, 'error', 'Violation 2');

      const violations = await auditLogger.getViolations();
      expect(violations).toHaveLength(2);
      expect(violations.every((v) => v.type === SecurityEventType.VIOLATION)).toBe(true);
    });
  });

  describe('getEventCount', () => {
    it('should track event count', async () => {
      expect(auditLogger.getEventCount()).toBe(0);

      await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', 'Event 1');
      expect(auditLogger.getEventCount()).toBe(1);

      await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', 'Event 2');
      expect(auditLogger.getEventCount()).toBe(2);
    });
  });

  describe('clearLog', () => {
    it('should clear audit log', async () => {
      await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', 'Event');
      expect(auditLogger.getEventCount()).toBe(1);

      await auditLogger.clearLog();
      expect(auditLogger.getEventCount()).toBe(0);

      const events = await auditLogger.getRecentEvents();
      expect(events).toEqual([]);
    });

    it('should not throw when log does not exist', async () => {
      await expect(auditLogger.clearLog()).resolves.not.toThrow();
    });
  });

  describe('JSONL format', () => {
    it('should write valid JSONL format', async () => {
      await auditLogger.logSecurityEvent(SecurityEventType.ACCESS_ATTEMPT, 'info', 'Event 1');
      await auditLogger.logSecurityEvent(SecurityEventType.VIOLATION, 'error', 'Event 2');

      const content = await fs.promises.readFile(auditLogger.getAuditLogPath(), 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);

      // Each line should be valid JSON
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });

      const event1 = JSON.parse(lines[0]) as SecurityEvent;
      const event2 = JSON.parse(lines[1]) as SecurityEvent;

      expect(event1.message).toBe('Event 1');
      expect(event2.message).toBe('Event 2');
    });
  });
});
