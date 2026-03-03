/**
 * Infinite Aura - Guardrail Engine
 *
 * Evaluates policies against operation contexts to enforce safety constraints.
 * Loads all 7 default policies from policies.ts on construction.
 */

import * as path from 'path';
import * as os from 'os';
import {
  GuardrailPolicy,
  GuardrailCheckInput,
  GuardrailResult,
  GuardrailViolation,
  GuardrailAuditEntry,
  PolicySeverity,
  RateLimitState,
} from './types';
import {
  DEFAULT_POLICIES,
  PolicyIds,
  ALLOWED_TEXT_EXTENSIONS,
  DEFAULT_RATE_LIMITS,
  isCriticalPolicy,
} from './policies';

// Path traversal patterns to detect
const TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e/i,
  /%2e%2e%2f/i,
  /%2e%2e%5c/i,
];

// Command injection patterns
const INJECTION_PATTERNS = [
  /[;|&`$]/, // shell metacharacters
  /\$\(/, // command substitution
  /`[^`]*`/, // backtick substitution
  />\s*\//, // redirect to absolute path
  /\|\|/, // logical OR
  /&&/, // logical AND
];

export class GuardrailEngine {
  private policies: Map<string, GuardrailPolicy>;
  private rateLimitStates: Map<string, RateLimitState>;
  private auditLog: GuardrailAuditEntry[];
  private readonly basePath: string;

  constructor(basePath: string = '~/.infinite-aura-ts') {
    this.policies = new Map();
    this.rateLimitStates = new Map();
    this.auditLog = [];
    this.basePath = this.resolveBasePath(basePath);

    // Load all 7 default policies
    for (const policy of DEFAULT_POLICIES) {
      this.policies.set(policy.id, { ...policy });
    }
  }

  private resolveBasePath(inputPath: string): string {
    let resolved = inputPath;
    if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(1));
    }
    return path.resolve(resolved);
  }

  /**
   * Evaluate all active policies against the given input context.
   */
  evaluate(input: GuardrailCheckInput): GuardrailResult {
    const start = Date.now();
    const violations: GuardrailViolation[] = [];
    const warnings: string[] = [];
    const policiesChecked: string[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;
      policiesChecked.push(policy.id);

      const policyViolations = this.evaluatePolicy(policy, input);
      for (const v of policyViolations) {
        if (policy.action === 'warn') {
          warnings.push(v.message);
        } else {
          violations.push(v);
        }
      }
    }

    const result: GuardrailResult = {
      allowed: violations.length === 0,
      violations,
      warnings,
      checkDurationMs: Date.now() - start,
    };

    // Record audit entry
    this.auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      input,
      result,
      policiesChecked,
    });

    return result;
  }

  /**
   * Add a policy to the engine.
   */
  addPolicy(policy: GuardrailPolicy): void {
    this.policies.set(policy.id, { ...policy });
  }

  /**
   * Remove a policy by name/id. Critical policies cannot be removed.
   */
  removePolicy(id: string): boolean {
    if (isCriticalPolicy(id)) {
      return false;
    }
    return this.policies.delete(id);
  }

  /**
   * Get a policy by ID.
   */
  getPolicy(id: string): GuardrailPolicy | undefined {
    return this.policies.get(id);
  }

  /**
   * Get all active policies.
   */
  getActivePolicies(): GuardrailPolicy[] {
    return Array.from(this.policies.values()).filter((p) => p.enabled);
  }

  /**
   * Get the audit log.
   */
  getAuditLog(): ReadonlyArray<GuardrailAuditEntry> {
    return this.auditLog;
  }

  private evaluatePolicy(
    policy: GuardrailPolicy,
    input: GuardrailCheckInput
  ): GuardrailViolation[] {
    switch (policy.id) {
      case PolicyIds.FILE_SYSTEM_BOUNDARY:
        return this.checkFileSystemBoundary(policy, input);
      case PolicyIds.PATH_TRAVERSAL_PREVENTION:
        return this.checkPathTraversal(policy, input);
      case PolicyIds.DESTRUCTIVE_OPERATIONS:
        return this.checkDestructiveOperations(policy, input);
      case PolicyIds.APPEND_ONLY_HISTORY:
        return this.checkAppendOnlyHistory(policy, input);
      case PolicyIds.TEXT_ONLY_ENFORCEMENT:
        return this.checkTextOnly(policy, input);
      case PolicyIds.COMMAND_INJECTION_PREVENTION:
        return this.checkCommandInjection(policy, input);
      case PolicyIds.RATE_LIMITING:
        return this.checkRateLimit(policy, input);
      default:
        return [];
    }
  }

  private createViolation(
    policyId: string,
    message: string,
    severity: PolicySeverity,
    context: Record<string, unknown> = {}
  ): GuardrailViolation {
    return {
      policyId,
      message,
      severity,
      timestamp: new Date(),
      context,
    };
  }

  /**
   * FILE_SYSTEM_BOUNDARY: Blocks access outside the memory directory.
   */
  private checkFileSystemBoundary(
    policy: GuardrailPolicy,
    input: GuardrailCheckInput
  ): GuardrailViolation[] {
    if (!input.path) return [];

    let resolved = input.path;
    if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(1));
    }
    resolved = path.resolve(resolved);

    if (!resolved.startsWith(this.basePath)) {
      return [
        this.createViolation(
          policy.id,
          `Path '${input.path}' is outside the allowed boundary '${this.basePath}'`,
          policy.severity,
          { path: input.path, resolved, basePath: this.basePath, operation: input.operation }
        ),
      ];
    }
    return [];
  }

  /**
   * PATH_TRAVERSAL_PREVENTION: Blocks ../ patterns and encoded variants.
   */
  private checkPathTraversal(
    policy: GuardrailPolicy,
    input: GuardrailCheckInput
  ): GuardrailViolation[] {
    const valuesToCheck = [input.path, input.content].filter(Boolean) as string[];
    const violations: GuardrailViolation[] = [];

    for (const value of valuesToCheck) {
      for (const pattern of TRAVERSAL_PATTERNS) {
        if (pattern.test(value)) {
          violations.push(
            this.createViolation(
              policy.id,
              `Path traversal pattern detected in '${value}'`,
              policy.severity,
              { value, matchedPattern: pattern.source, operation: input.operation }
            )
          );
          break; // One violation per value is enough
        }
      }
    }
    return violations;
  }

  /**
   * DESTRUCTIVE_OPERATIONS: Blocks delete, truncate, overwrite without exclusions.
   */
  private checkDestructiveOperations(
    policy: GuardrailPolicy,
    input: GuardrailCheckInput
  ): GuardrailViolation[] {
    const destructiveOps = policy.appliesTo ?? ['delete', 'truncate', 'overwrite', 'rmdir'];
    if (!destructiveOps.includes(input.operation)) return [];

    // Check exclusions
    if (input.path && policy.excludes) {
      for (const exclusion of policy.excludes) {
        if (input.path.includes(exclusion)) return [];
      }
    }

    return [
      this.createViolation(
        policy.id,
        `Destructive operation '${input.operation}' blocked on '${input.path ?? 'unknown'}'`,
        policy.severity,
        { operation: input.operation, path: input.path }
      ),
    ];
  }

  /**
   * APPEND_ONLY_HISTORY: Prevents modifications/deletions to history directory.
   */
  private checkAppendOnlyHistory(
    policy: GuardrailPolicy,
    input: GuardrailCheckInput
  ): GuardrailViolation[] {
    if (!input.path) return [];

    const isHistoryPath =
      input.path.includes('history/') || input.path.includes('history\\');
    if (!isHistoryPath) return [];

    const forbiddenOps = ['delete', 'overwrite', 'truncate', 'modify'];
    if (forbiddenOps.includes(input.operation)) {
      return [
        this.createViolation(
          policy.id,
          `Append-only violation: cannot '${input.operation}' in history directory`,
          policy.severity,
          { path: input.path, operation: input.operation }
        ),
      ];
    }
    return [];
  }

  /**
   * TEXT_ONLY_ENFORCEMENT: Blocks non-text file operations.
   */
  private checkTextOnly(
    policy: GuardrailPolicy,
    input: GuardrailCheckInput
  ): GuardrailViolation[] {
    if (!input.path) return [];
    if (input.operation === 'list' || input.operation === 'delete') return [];

    const ext = path.extname(input.path).toLowerCase();
    // Files without extension are allowed (e.g., .gitignore-like files)
    if (!ext) return [];

    if (!ALLOWED_TEXT_EXTENSIONS.includes(ext)) {
      return [
        this.createViolation(
          policy.id,
          `Text-only violation: extension '${ext}' is not allowed`,
          policy.severity,
          { path: input.path, extension: ext, operation: input.operation }
        ),
      ];
    }
    return [];
  }

  /**
   * COMMAND_INJECTION_PREVENTION: Blocks shell metacharacters and injection patterns.
   */
  private checkCommandInjection(
    policy: GuardrailPolicy,
    input: GuardrailCheckInput
  ): GuardrailViolation[] {
    if (!input.tool) return [];

    const valuesToCheck = [input.path, input.content].filter(Boolean) as string[];
    const violations: GuardrailViolation[] = [];

    for (const value of valuesToCheck) {
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(value)) {
          violations.push(
            this.createViolation(
              policy.id,
              `Command injection pattern detected in tool input`,
              policy.severity,
              { tool: input.tool, matchedPattern: pattern.source, operation: input.operation }
            )
          );
          break;
        }
      }
    }
    return violations;
  }

  /**
   * RATE_LIMITING: Enforces operation rate limits.
   */
  private checkRateLimit(
    policy: GuardrailPolicy,
    input: GuardrailCheckInput
  ): GuardrailViolation[] {
    const limitConfig = DEFAULT_RATE_LIMITS.find((r) => r.operation === input.operation);
    if (!limitConfig) return [];

    const key = input.operation;
    const now = Date.now();
    let state = this.rateLimitStates.get(key);

    if (!state || now - state.windowStart.getTime() > limitConfig.windowMs) {
      state = { count: 0, windowStart: new Date(now), operation: key };
    }

    state.count++;
    this.rateLimitStates.set(key, state);

    if (state.count > limitConfig.limit) {
      return [
        this.createViolation(
          policy.id,
          `Rate limit exceeded for '${input.operation}': ${state.count}/${limitConfig.limit} in ${limitConfig.windowMs}ms`,
          policy.severity,
          {
            operation: input.operation,
            count: state.count,
            limit: limitConfig.limit,
            windowMs: limitConfig.windowMs,
          }
        ),
      ];
    }
    return [];
  }
}
