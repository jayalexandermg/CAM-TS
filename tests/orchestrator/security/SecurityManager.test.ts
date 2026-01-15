import { SecurityManager } from '../../../src/orchestrator/security/SecurityManager';

describe('SecurityManager', () => {
  let manager: SecurityManager;

  beforeEach(() => {
    manager = new SecurityManager({
      maxInputLength: 1000,
      maxOutputLength: 5000,
      maxAgentsPerSession: 5,
      maxConcurrentAgents: 3,
    });
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const defaultManager = new SecurityManager();
      const config = defaultManager.getConfig();
      expect(config.maxInputLength).toBe(10000);
      expect(config.maxOutputLength).toBe(50000);
      expect(config.maxAgentsPerSession).toBe(10);
      expect(config.maxConcurrentAgents).toBe(5);
      expect(config.maxTaskDuration).toBe(300000);
      expect(config.allowedFileExtensions).toEqual(['.txt', '.md', '.json']);
      expect(config.blockedPatterns).toEqual([]);
    });

    it('should merge partial config with defaults', () => {
      const customManager = new SecurityManager({
        maxInputLength: 500,
      });
      const config = customManager.getConfig();
      expect(config.maxInputLength).toBe(500);
      expect(config.maxOutputLength).toBe(50000); // default
    });
  });

  describe('validateInput', () => {
    it('should validate normal input as valid', () => {
      const result = manager.validateInput('Hello, world!');
      expect(result.valid).toBe(true);
    });

    it('should detect SQL injection', () => {
      const result = manager.validateInput('SELECT * FROM users');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential SQL injection');
    });

    it('should detect script injection', () => {
      const result = manager.validateInput('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential script injection');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input', () => {
      const result = manager.sanitizeInput('  Hello\0World  ');
      expect(result).toBe('HelloWorld');
    });

    it('should truncate long input', () => {
      const longInput = 'a'.repeat(2000);
      const result = manager.sanitizeInput(longInput);
      expect(result.length).toBe(1000);
    });
  });

  describe('sanitizeOutput', () => {
    it('should redact sensitive keys', () => {
      const result = manager.sanitizeOutput({ password: 'secret' });
      expect(result).toEqual({ password: '[REDACTED]' });
    });

    it('should redact tokens in strings', () => {
      const result = manager.sanitizeOutput('token: abc123');
      expect(result).toBe('token: [REDACTED]');
    });
  });

  describe('agent tracking', () => {
    it('should allow agent creation when under limits', () => {
      expect(manager.canCreateAgent('session-1')).toBe(true);
    });

    it('should track agent creation', () => {
      manager.trackAgentCreated();
      const usage = manager.getResourceUsage();
      expect(usage.agentCount).toBe(1);
      expect(usage.activeAgents).toBe(1);
    });

    it('should track agent completion', () => {
      manager.trackAgentCreated();
      manager.trackAgentCompleted();
      const usage = manager.getResourceUsage();
      expect(usage.agentCount).toBe(1);
      expect(usage.activeAgents).toBe(0);
    });

    it('should deny agent creation when concurrent limit reached', () => {
      manager.trackAgentCreated();
      manager.trackAgentCreated();
      manager.trackAgentCreated();
      expect(manager.canCreateAgent('session-1')).toBe(false);
    });

    it('should allow agent creation after completion frees slot', () => {
      manager.trackAgentCreated();
      manager.trackAgentCreated();
      manager.trackAgentCreated();
      expect(manager.canCreateAgent('session-1')).toBe(false);
      manager.trackAgentCompleted();
      expect(manager.canCreateAgent('session-1')).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('getResourceUsage', () => {
    it('should return current resource usage', () => {
      const usage = manager.getResourceUsage();
      expect(usage).toEqual({
        agentCount: 0,
        activeAgents: 0,
        sessionCount: 0,
      });
    });
  });
});
