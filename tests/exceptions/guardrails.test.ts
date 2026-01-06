import {
  InfiniteAuraError,
  GuardrailViolationError,
  ToolAccessDeniedError,
  FileSystemBoundaryError,
  DestructiveActionBlockedError,
  RateLimitExceededError,
  AppendOnlyViolationError,
  TextOnlyViolationError,
  ErrorCodes,
} from '../../src/exceptions';

describe('Guardrails Exception Classes', () => {
  describe('GuardrailViolationError', () => {
    it('should create with required fields', () => {
      const error = new GuardrailViolationError(
        'Policy violated',
        'test-policy',
        'medium'
      );

      expect(error.name).toBe('GuardrailViolationError');
      expect(error.message).toBe('Policy violated');
      expect(error.policyId).toBe('test-policy');
      expect(error.severity).toBe('medium');
      expect(error.code).toBe(ErrorCodes.GUARDRAIL_VIOLATION);
    });

    it('should use default severity', () => {
      const error = new GuardrailViolationError('Test', 'policy-1');

      expect(error.severity).toBe('medium');
    });

    it('should handle all severity levels', () => {
      const low = new GuardrailViolationError('Low', 'p1', 'low');
      const med = new GuardrailViolationError('Med', 'p2', 'medium');
      const high = new GuardrailViolationError('High', 'p3', 'high');
      const crit = new GuardrailViolationError('Crit', 'p4', 'critical');

      expect(low.severity).toBe('low');
      expect(med.severity).toBe('medium');
      expect(high.severity).toBe('high');
      expect(crit.severity).toBe('critical');
    });

    it('should extend InfiniteAuraError', () => {
      const error = new GuardrailViolationError('Test', 'policy');

      expect(error).toBeInstanceOf(InfiniteAuraError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should serialize with policyId and severity', () => {
      const error = new GuardrailViolationError('Test', 'my-policy', 'high');
      const json = error.toJSON();

      expect(json.policyId).toBe('my-policy');
      expect(json.severity).toBe('high');
      expect(json.name).toBe('GuardrailViolationError');
    });

    it('should include policyId and severity in details', () => {
      const error = new GuardrailViolationError(
        'Test',
        'policy-id',
        'critical',
        ErrorCodes.GUARDRAIL_VIOLATION,
        { extra: 'data' }
      );

      expect(error.details.policyId).toBe('policy-id');
      expect(error.details.severity).toBe('critical');
      expect(error.details.extra).toBe('data');
    });
  });

  describe('ToolAccessDeniedError', () => {
    it('should create with tool name and reason', () => {
      const error = new ToolAccessDeniedError(
        'dangerous_tool',
        'Tool is blocked',
        'tool-policy'
      );

      expect(error.name).toBe('ToolAccessDeniedError');
      expect(error.toolName).toBe('dangerous_tool');
      expect(error.message).toContain('dangerous_tool');
      expect(error.message).toContain('Tool is blocked');
      expect(error.code).toBe(ErrorCodes.TOOL_ACCESS_DENIED);
    });

    it('should extend GuardrailViolationError', () => {
      const error = new ToolAccessDeniedError('tool', 'reason', 'policy');

      expect(error).toBeInstanceOf(GuardrailViolationError);
      expect(error).toBeInstanceOf(InfiniteAuraError);
    });

    it('should default to high severity', () => {
      const error = new ToolAccessDeniedError('tool', 'reason', 'policy');

      expect(error.severity).toBe('high');
    });

    it('should allow custom severity', () => {
      const error = new ToolAccessDeniedError(
        'tool',
        'reason',
        'policy',
        'critical'
      );

      expect(error.severity).toBe('critical');
    });

    it('should include toolName in details', () => {
      const error = new ToolAccessDeniedError('my-tool', 'blocked', 'policy');

      expect(error.details.toolName).toBe('my-tool');
    });
  });

  describe('FileSystemBoundaryError', () => {
    it('should create with path and allowed paths', () => {
      const error = new FileSystemBoundaryError(
        '/etc/passwd',
        ['~/.infinite-aura-ts'],
        'fs-boundary-policy'
      );

      expect(error.name).toBe('FileSystemBoundaryError');
      expect(error.attemptedPath).toBe('/etc/passwd');
      expect(error.allowedPaths).toEqual(['~/.infinite-aura-ts']);
      expect(error.code).toBe(ErrorCodes.FILESYSTEM_BOUNDARY);
    });

    it('should extend GuardrailViolationError', () => {
      const error = new FileSystemBoundaryError('/path', ['/allowed'], 'policy');

      expect(error).toBeInstanceOf(GuardrailViolationError);
    });

    it('should always be critical severity', () => {
      const error = new FileSystemBoundaryError('/path', ['/allowed'], 'policy');

      expect(error.severity).toBe('critical');
    });

    it('should include path info in details', () => {
      const error = new FileSystemBoundaryError(
        '/secret',
        ['/home', '/tmp'],
        'policy'
      );

      expect(error.details.attemptedPath).toBe('/secret');
      expect(error.details.allowedPaths).toEqual(['/home', '/tmp']);
    });

    it('should format message with path', () => {
      const error = new FileSystemBoundaryError('/etc/shadow', ['/safe'], 'policy');

      expect(error.message).toContain('/etc/shadow');
      expect(error.message).toContain('outside allowed boundaries');
    });
  });

  describe('DestructiveActionBlockedError', () => {
    it('should create with action and target', () => {
      const error = new DestructiveActionBlockedError(
        'delete',
        '/important/file.txt',
        'destructive-policy'
      );

      expect(error.name).toBe('DestructiveActionBlockedError');
      expect(error.action).toBe('delete');
      expect(error.target).toBe('/important/file.txt');
      expect(error.code).toBe(ErrorCodes.DESTRUCTIVE_ACTION_BLOCKED);
    });

    it('should extend GuardrailViolationError', () => {
      const error = new DestructiveActionBlockedError('rm', '/file', 'policy');

      expect(error).toBeInstanceOf(GuardrailViolationError);
    });

    it('should always be critical severity', () => {
      const error = new DestructiveActionBlockedError('truncate', '/db', 'policy');

      expect(error.severity).toBe('critical');
    });

    it('should format message with action and target', () => {
      const error = new DestructiveActionBlockedError('rmdir', '/data', 'policy');

      expect(error.message).toContain('rmdir');
      expect(error.message).toContain('/data');
      expect(error.message).toContain('blocked');
    });

    it('should include action and target in details', () => {
      const error = new DestructiveActionBlockedError(
        'overwrite',
        '/config.yaml',
        'policy'
      );

      expect(error.details.action).toBe('overwrite');
      expect(error.details.target).toBe('/config.yaml');
    });
  });

  describe('RateLimitExceededError', () => {
    it('should create with rate limit info', () => {
      const error = new RateLimitExceededError(
        'read',
        100,
        60000,
        150,
        'rate-limit-policy'
      );

      expect(error.name).toBe('RateLimitExceededError');
      expect(error.limit).toBe(100);
      expect(error.windowMs).toBe(60000);
      expect(error.current).toBe(150);
      expect(error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    });

    it('should extend GuardrailViolationError', () => {
      const error = new RateLimitExceededError('op', 10, 1000, 15, 'policy');

      expect(error).toBeInstanceOf(GuardrailViolationError);
    });

    it('should be medium severity', () => {
      const error = new RateLimitExceededError('write', 50, 60000, 75, 'policy');

      expect(error.severity).toBe('medium');
    });

    it('should format message with rate info', () => {
      const error = new RateLimitExceededError('api_call', 100, 60000, 150, 'policy');

      expect(error.message).toContain('api_call');
      expect(error.message).toContain('150/100');
      expect(error.message).toContain('60000ms');
    });

    it('should include rate info in details', () => {
      const error = new RateLimitExceededError('op', 10, 5000, 20, 'policy');

      expect(error.details.operation).toBe('op');
      expect(error.details.limit).toBe(10);
      expect(error.details.windowMs).toBe(5000);
      expect(error.details.current).toBe(20);
    });
  });

  describe('AppendOnlyViolationError', () => {
    it('should create with path and operation', () => {
      const error = new AppendOnlyViolationError(
        'history/session-123.md',
        'modify',
        'append-only-policy'
      );

      expect(error.name).toBe('AppendOnlyViolationError');
      expect(error.targetPath).toBe('history/session-123.md');
      expect(error.attemptedOperation).toBe('modify');
      expect(error.code).toBe(ErrorCodes.APPEND_ONLY_VIOLATION);
    });

    it('should extend GuardrailViolationError', () => {
      const error = new AppendOnlyViolationError('/path', 'delete', 'policy');

      expect(error).toBeInstanceOf(GuardrailViolationError);
    });

    it('should always be critical severity', () => {
      const error = new AppendOnlyViolationError('/path', 'truncate', 'policy');

      expect(error.severity).toBe('critical');
    });

    it('should format message with path and operation', () => {
      const error = new AppendOnlyViolationError(
        'history/old.log',
        'delete',
        'policy'
      );

      expect(error.message).toContain('history/old.log');
      expect(error.message).toContain('delete');
      expect(error.message).toContain('Append-only');
    });
  });

  describe('TextOnlyViolationError', () => {
    it('should create with path and detected type', () => {
      const error = new TextOnlyViolationError(
        'data/image.png',
        'image/png',
        'text-only-policy'
      );

      expect(error.name).toBe('TextOnlyViolationError');
      expect(error.filePath).toBe('data/image.png');
      expect(error.detectedType).toBe('image/png');
      expect(error.code).toBe(ErrorCodes.TEXT_ONLY_VIOLATION);
    });

    it('should extend GuardrailViolationError', () => {
      const error = new TextOnlyViolationError('file.bin', 'binary', 'policy');

      expect(error).toBeInstanceOf(GuardrailViolationError);
    });

    it('should be high severity', () => {
      const error = new TextOnlyViolationError('file.exe', 'executable', 'policy');

      expect(error.severity).toBe('high');
    });

    it('should format message with path and type', () => {
      const error = new TextOnlyViolationError('doc.pdf', 'application/pdf', 'policy');

      expect(error.message).toContain('doc.pdf');
      expect(error.message).toContain('application/pdf');
      expect(error.message).toContain('Text-only');
    });

    it('should include file info in details', () => {
      const error = new TextOnlyViolationError('data.bin', 'binary', 'policy');

      expect(error.details.filePath).toBe('data.bin');
      expect(error.details.detectedType).toBe('binary');
    });
  });
});
