import {
  PolicyIds,
  FILE_SYSTEM_BOUNDARY,
  PATH_TRAVERSAL_PREVENTION,
  DESTRUCTIVE_OPERATIONS,
  APPEND_ONLY_HISTORY,
  TEXT_ONLY_ENFORCEMENT,
  COMMAND_INJECTION_PREVENTION,
  RATE_LIMITING,
  DEFAULT_POLICIES,
  CRITICAL_POLICIES,
  OPTIONAL_POLICIES,
  ALLOWED_TEXT_EXTENSIONS,
  DEFAULT_RATE_LIMITS,
  DEFAULT_GUARDRAILS_CONFIG,
  getPolicyById,
  getPoliciesBySeverity,
  getEnabledPolicies,
  isCriticalPolicy,
} from '../../src/guardrails/policies';
import { GuardrailPolicy } from '../../src/guardrails/types';

describe('Guardrail Policies', () => {
  describe('PolicyIds', () => {
    it('should define all required policy IDs', () => {
      expect(PolicyIds.FILE_SYSTEM_BOUNDARY).toBe('file-system-boundary');
      expect(PolicyIds.PATH_TRAVERSAL_PREVENTION).toBe('path-traversal-prevention');
      expect(PolicyIds.DESTRUCTIVE_OPERATIONS).toBe('destructive-operations');
      expect(PolicyIds.APPEND_ONLY_HISTORY).toBe('append-only-history');
      expect(PolicyIds.TEXT_ONLY_ENFORCEMENT).toBe('text-only-enforcement');
      expect(PolicyIds.COMMAND_INJECTION_PREVENTION).toBe('command-injection-prevention');
      expect(PolicyIds.RATE_LIMITING).toBe('rate-limiting');
    });

    it('should have 7 policy IDs', () => {
      expect(Object.keys(PolicyIds).length).toBe(7);
    });
  });

  describe('FILE_SYSTEM_BOUNDARY policy', () => {
    it('should have correct structure', () => {
      expect(FILE_SYSTEM_BOUNDARY.id).toBe(PolicyIds.FILE_SYSTEM_BOUNDARY);
      expect(FILE_SYSTEM_BOUNDARY.name).toBe('File System Boundary');
      expect(FILE_SYSTEM_BOUNDARY.enabled).toBe(true);
      expect(FILE_SYSTEM_BOUNDARY.severity).toBe('critical');
      expect(FILE_SYSTEM_BOUNDARY.action).toBe('block');
    });

    it('should have description', () => {
      expect(FILE_SYSTEM_BOUNDARY.description.length).toBeGreaterThan(0);
      expect(FILE_SYSTEM_BOUNDARY.description).toContain('.infinite-aura-ts');
    });
  });

  describe('PATH_TRAVERSAL_PREVENTION policy', () => {
    it('should have correct structure', () => {
      expect(PATH_TRAVERSAL_PREVENTION.id).toBe(PolicyIds.PATH_TRAVERSAL_PREVENTION);
      expect(PATH_TRAVERSAL_PREVENTION.name).toBe('Path Traversal Prevention');
      expect(PATH_TRAVERSAL_PREVENTION.enabled).toBe(true);
      expect(PATH_TRAVERSAL_PREVENTION.severity).toBe('critical');
      expect(PATH_TRAVERSAL_PREVENTION.action).toBe('block');
    });

    it('should mention traversal in description', () => {
      expect(PATH_TRAVERSAL_PREVENTION.description).toContain('traversal');
    });
  });

  describe('DESTRUCTIVE_OPERATIONS policy', () => {
    it('should have correct structure', () => {
      expect(DESTRUCTIVE_OPERATIONS.id).toBe(PolicyIds.DESTRUCTIVE_OPERATIONS);
      expect(DESTRUCTIVE_OPERATIONS.name).toBe('Destructive Operations Guard');
      expect(DESTRUCTIVE_OPERATIONS.enabled).toBe(true);
      expect(DESTRUCTIVE_OPERATIONS.severity).toBe('high');
      expect(DESTRUCTIVE_OPERATIONS.action).toBe('block');
    });

    it('should apply to destructive operations', () => {
      expect(DESTRUCTIVE_OPERATIONS.appliesTo).toContain('delete');
      expect(DESTRUCTIVE_OPERATIONS.appliesTo).toContain('truncate');
    });

    it('should exclude temp and cache', () => {
      expect(DESTRUCTIVE_OPERATIONS.excludes).toContain('temp/');
      expect(DESTRUCTIVE_OPERATIONS.excludes).toContain('cache/');
    });
  });

  describe('APPEND_ONLY_HISTORY policy', () => {
    it('should have correct structure', () => {
      expect(APPEND_ONLY_HISTORY.id).toBe(PolicyIds.APPEND_ONLY_HISTORY);
      expect(APPEND_ONLY_HISTORY.name).toBe('Append-Only History');
      expect(APPEND_ONLY_HISTORY.enabled).toBe(true);
      expect(APPEND_ONLY_HISTORY.severity).toBe('critical');
      expect(APPEND_ONLY_HISTORY.action).toBe('block');
    });

    it('should apply to history directory', () => {
      expect(APPEND_ONLY_HISTORY.appliesTo).toContain('history/*');
    });
  });

  describe('TEXT_ONLY_ENFORCEMENT policy', () => {
    it('should have correct structure', () => {
      expect(TEXT_ONLY_ENFORCEMENT.id).toBe(PolicyIds.TEXT_ONLY_ENFORCEMENT);
      expect(TEXT_ONLY_ENFORCEMENT.name).toBe('Text-Only Enforcement');
      expect(TEXT_ONLY_ENFORCEMENT.enabled).toBe(true);
      expect(TEXT_ONLY_ENFORCEMENT.severity).toBe('high');
      expect(TEXT_ONLY_ENFORCEMENT.action).toBe('block');
    });

    it('should mention text formats in description', () => {
      expect(TEXT_ONLY_ENFORCEMENT.description).toContain('MD');
      expect(TEXT_ONLY_ENFORCEMENT.description).toContain('YAML');
      expect(TEXT_ONLY_ENFORCEMENT.description).toContain('JSON');
    });
  });

  describe('COMMAND_INJECTION_PREVENTION policy', () => {
    it('should have correct structure', () => {
      expect(COMMAND_INJECTION_PREVENTION.id).toBe(PolicyIds.COMMAND_INJECTION_PREVENTION);
      expect(COMMAND_INJECTION_PREVENTION.name).toBe('Command Injection Prevention');
      expect(COMMAND_INJECTION_PREVENTION.enabled).toBe(true);
      expect(COMMAND_INJECTION_PREVENTION.severity).toBe('critical');
      expect(COMMAND_INJECTION_PREVENTION.action).toBe('block');
    });
  });

  describe('RATE_LIMITING policy', () => {
    it('should have correct structure', () => {
      expect(RATE_LIMITING.id).toBe(PolicyIds.RATE_LIMITING);
      expect(RATE_LIMITING.name).toBe('Rate Limiting');
      expect(RATE_LIMITING.enabled).toBe(true);
      expect(RATE_LIMITING.severity).toBe('medium');
      expect(RATE_LIMITING.action).toBe('block');
    });
  });

  describe('DEFAULT_POLICIES', () => {
    it('should include all 7 default policies', () => {
      expect(DEFAULT_POLICIES.length).toBe(7);
    });

    it('should include all policy types', () => {
      const ids = DEFAULT_POLICIES.map((p) => p.id);

      expect(ids).toContain(PolicyIds.FILE_SYSTEM_BOUNDARY);
      expect(ids).toContain(PolicyIds.PATH_TRAVERSAL_PREVENTION);
      expect(ids).toContain(PolicyIds.DESTRUCTIVE_OPERATIONS);
      expect(ids).toContain(PolicyIds.APPEND_ONLY_HISTORY);
      expect(ids).toContain(PolicyIds.TEXT_ONLY_ENFORCEMENT);
      expect(ids).toContain(PolicyIds.COMMAND_INJECTION_PREVENTION);
      expect(ids).toContain(PolicyIds.RATE_LIMITING);
    });

    it('should have all policies enabled by default', () => {
      expect(DEFAULT_POLICIES.every((p) => p.enabled)).toBe(true);
    });

    it('should have valid policy structure for all policies', () => {
      DEFAULT_POLICIES.forEach((policy: GuardrailPolicy) => {
        expect(policy.id).toBeDefined();
        expect(policy.name).toBeDefined();
        expect(policy.description).toBeDefined();
        expect(typeof policy.enabled).toBe('boolean');
        expect(['low', 'medium', 'high', 'critical']).toContain(policy.severity);
        expect(['warn', 'block', 'log']).toContain(policy.action);
      });
    });
  });

  describe('CRITICAL_POLICIES', () => {
    it('should include security-critical policies', () => {
      expect(CRITICAL_POLICIES.length).toBe(4);
      const ids = CRITICAL_POLICIES.map((p) => p.id);

      expect(ids).toContain(PolicyIds.FILE_SYSTEM_BOUNDARY);
      expect(ids).toContain(PolicyIds.PATH_TRAVERSAL_PREVENTION);
      expect(ids).toContain(PolicyIds.APPEND_ONLY_HISTORY);
      expect(ids).toContain(PolicyIds.COMMAND_INJECTION_PREVENTION);
    });

    it('should all be critical severity', () => {
      expect(CRITICAL_POLICIES.every((p) => p.severity === 'critical')).toBe(true);
    });
  });

  describe('OPTIONAL_POLICIES', () => {
    it('should include relaxable policies', () => {
      expect(OPTIONAL_POLICIES.length).toBe(3);
      const ids = OPTIONAL_POLICIES.map((p) => p.id);

      expect(ids).toContain(PolicyIds.DESTRUCTIVE_OPERATIONS);
      expect(ids).toContain(PolicyIds.TEXT_ONLY_ENFORCEMENT);
      expect(ids).toContain(PolicyIds.RATE_LIMITING);
    });
  });

  describe('ALLOWED_TEXT_EXTENSIONS', () => {
    it('should include common text extensions', () => {
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.md');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.yaml');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.yml');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.json');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.txt');
    });

    it('should include code extensions', () => {
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.js');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.ts');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.html');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.css');
    });

    it('should include config extensions', () => {
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.toml');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.ini');
      expect(ALLOWED_TEXT_EXTENSIONS).toContain('.env');
    });
  });

  describe('DEFAULT_RATE_LIMITS', () => {
    it('should define rate limits for common operations', () => {
      const operations = DEFAULT_RATE_LIMITS.map((r) => r.operation);

      expect(operations).toContain('read');
      expect(operations).toContain('write');
      expect(operations).toContain('append');
      expect(operations).toContain('delete');
      expect(operations).toContain('list');
    });

    it('should have valid rate limit structure', () => {
      DEFAULT_RATE_LIMITS.forEach((limit) => {
        expect(limit.operation).toBeDefined();
        expect(typeof limit.limit).toBe('number');
        expect(typeof limit.windowMs).toBe('number');
        expect(limit.limit).toBeGreaterThan(0);
        expect(limit.windowMs).toBeGreaterThan(0);
      });
    });
  });

  describe('DEFAULT_GUARDRAILS_CONFIG', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_GUARDRAILS_CONFIG.policies).toBeDefined();
      expect(DEFAULT_GUARDRAILS_CONFIG.enabled).toBe(true);
      expect(DEFAULT_GUARDRAILS_CONFIG.defaultAction).toBe('block');
      expect(DEFAULT_GUARDRAILS_CONFIG.verboseLogging).toBe(false);
      expect(DEFAULT_GUARDRAILS_CONFIG.basePath).toBe('~/.infinite-aura-ts');
      expect(DEFAULT_GUARDRAILS_CONFIG.allowedExtensions).toBeDefined();
    });

    it('should include all default policies', () => {
      expect(DEFAULT_GUARDRAILS_CONFIG.policies.length).toBe(7);
    });
  });

  describe('getPolicyById', () => {
    it('should return policy for valid ID', () => {
      const policy = getPolicyById(PolicyIds.FILE_SYSTEM_BOUNDARY);

      expect(policy).toBeDefined();
      expect(policy?.id).toBe(PolicyIds.FILE_SYSTEM_BOUNDARY);
    });

    it('should return undefined for invalid ID', () => {
      const policy = getPolicyById('non-existent-policy');

      expect(policy).toBeUndefined();
    });
  });

  describe('getPoliciesBySeverity', () => {
    it('should return policies with matching severity', () => {
      const critical = getPoliciesBySeverity('critical');

      expect(critical.length).toBeGreaterThan(0);
      expect(critical.every((p) => p.severity === 'critical')).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const low = getPoliciesBySeverity('low');

      expect(low).toEqual([]);
    });
  });

  describe('getEnabledPolicies', () => {
    it('should return all enabled policies', () => {
      const enabled = getEnabledPolicies();

      expect(enabled.length).toBe(7);
      expect(enabled.every((p) => p.enabled)).toBe(true);
    });
  });

  describe('isCriticalPolicy', () => {
    it('should return true for critical policy IDs', () => {
      expect(isCriticalPolicy(PolicyIds.FILE_SYSTEM_BOUNDARY)).toBe(true);
      expect(isCriticalPolicy(PolicyIds.PATH_TRAVERSAL_PREVENTION)).toBe(true);
      expect(isCriticalPolicy(PolicyIds.APPEND_ONLY_HISTORY)).toBe(true);
      expect(isCriticalPolicy(PolicyIds.COMMAND_INJECTION_PREVENTION)).toBe(true);
    });

    it('should return false for optional policy IDs', () => {
      expect(isCriticalPolicy(PolicyIds.DESTRUCTIVE_OPERATIONS)).toBe(false);
      expect(isCriticalPolicy(PolicyIds.TEXT_ONLY_ENFORCEMENT)).toBe(false);
      expect(isCriticalPolicy(PolicyIds.RATE_LIMITING)).toBe(false);
    });

    it('should return false for unknown IDs', () => {
      expect(isCriticalPolicy('unknown-policy')).toBe(false);
    });
  });
});
