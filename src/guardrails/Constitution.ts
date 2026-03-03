/**
 * Infinite Aura - Constitution
 *
 * Hard rule system. Metal core. Rules that CANNOT be overridden by any agent.
 * Constitution wins ALL conflicts — this is the absolute authority.
 */

import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Types
// ============================================================================

export interface ConstitutionAction {
  type:
    | 'file_write'
    | 'file_read'
    | 'tool_execute'
    | 'skill_activate'
    | 'agent_spawn'
    | 'memory_write';
  target: string;
  agent: string;
  context: Record<string, unknown>;
}

export interface ConstitutionVerdict {
  allowed: boolean;
  rule: string;
  reason: string;
}

export interface ConstitutionRule {
  id: string;
  description: string;
  check: (action: ConstitutionAction) => ConstitutionVerdict;
}

// ============================================================================
// Built-in Rules
// ============================================================================

function resolveMemoryPath(basePath: string): string {
  let resolved = basePath;
  if (resolved.startsWith('~')) {
    resolved = path.join(os.homedir(), resolved.slice(1));
  }
  return path.resolve(resolved);
}

function createBuiltInRules(memoryBasePath: string): ConstitutionRule[] {
  const resolvedBase = resolveMemoryPath(memoryBasePath);

  return [
    {
      id: 'no-write-outside-memory',
      description: 'No writing outside memory directory',
      check: (action: ConstitutionAction): ConstitutionVerdict => {
        if (action.type !== 'file_write' && action.type !== 'memory_write') {
          return { allowed: true, rule: 'no-write-outside-memory', reason: 'Not a write operation' };
        }

        let targetPath = action.target;
        if (targetPath.startsWith('~')) {
          targetPath = path.join(os.homedir(), targetPath.slice(1));
        }
        targetPath = path.resolve(targetPath);

        if (!targetPath.startsWith(resolvedBase)) {
          return {
            allowed: false,
            rule: 'no-write-outside-memory',
            reason: `Write target '${action.target}' is outside memory directory '${memoryBasePath}'`,
          };
        }
        return { allowed: true, rule: 'no-write-outside-memory', reason: 'Within memory boundary' };
      },
    },
    {
      id: 'no-delete-core',
      description: 'No deleting CORE files',
      check: (action: ConstitutionAction): ConstitutionVerdict => {
        if (action.type !== 'file_write') {
          return { allowed: true, rule: 'no-delete-core', reason: 'Not a file write operation' };
        }

        const isDelete =
          action.context.operation === 'delete' || action.context.operation === 'rmdir';
        const isCoreFile =
          action.target.includes('/CORE/') ||
          action.target.includes('\\CORE\\') ||
          action.target.includes('/core/') ||
          action.target.includes('\\core\\');

        if (isDelete && isCoreFile) {
          return {
            allowed: false,
            rule: 'no-delete-core',
            reason: `Cannot delete CORE file: '${action.target}'`,
          };
        }
        return { allowed: true, rule: 'no-delete-core', reason: 'Not a CORE deletion' };
      },
    },
    {
      id: 'no-unvalidated-skills',
      description: 'No executing unvalidated skills',
      check: (action: ConstitutionAction): ConstitutionVerdict => {
        if (action.type !== 'skill_activate') {
          return {
            allowed: true,
            rule: 'no-unvalidated-skills',
            reason: 'Not a skill activation',
          };
        }

        const validated = action.context.validated === true;
        if (!validated) {
          return {
            allowed: false,
            rule: 'no-unvalidated-skills',
            reason: `Skill '${action.target}' has not been validated`,
          };
        }
        return { allowed: true, rule: 'no-unvalidated-skills', reason: 'Skill is validated' };
      },
    },
    {
      id: 'no-agent-without-guardrails',
      description: 'No spawning agents without guardrail context',
      check: (action: ConstitutionAction): ConstitutionVerdict => {
        if (action.type !== 'agent_spawn') {
          return {
            allowed: true,
            rule: 'no-agent-without-guardrails',
            reason: 'Not an agent spawn',
          };
        }

        const hasGuardrails = action.context.guardrailsAttached === true;
        if (!hasGuardrails) {
          return {
            allowed: false,
            rule: 'no-agent-without-guardrails',
            reason: `Agent '${action.target}' cannot spawn without guardrail context`,
          };
        }
        return {
          allowed: true,
          rule: 'no-agent-without-guardrails',
          reason: 'Guardrail context attached',
        };
      },
    },
    {
      id: 'no-cross-session-data',
      description: 'Session data cannot cross session boundaries',
      check: (action: ConstitutionAction): ConstitutionVerdict => {
        if (action.type !== 'file_read' && action.type !== 'file_write') {
          return {
            allowed: true,
            rule: 'no-cross-session-data',
            reason: 'Not a file operation',
          };
        }

        const currentSession = action.context.sessionId as string | undefined;
        const targetSession = action.context.targetSessionId as string | undefined;

        if (currentSession && targetSession && currentSession !== targetSession) {
          return {
            allowed: false,
            rule: 'no-cross-session-data',
            reason: `Session '${currentSession}' cannot access data from session '${targetSession}'`,
          };
        }
        return { allowed: true, rule: 'no-cross-session-data', reason: 'Same session or no session context' };
      },
    },
  ];
}

// ============================================================================
// Constitution Class
// ============================================================================

export class Constitution {
  private rules: Map<string, ConstitutionRule>;
  private violations: ConstitutionVerdict[];

  constructor(memoryBasePath: string = '~/.infinite-aura-ts') {
    this.rules = new Map();
    this.violations = [];
    this.loadRules(memoryBasePath);
  }

  /**
   * Load built-in constitution rules.
   */
  loadRules(memoryBasePath: string): void {
    const builtIn = createBuiltInRules(memoryBasePath);
    for (const rule of builtIn) {
      this.rules.set(rule.id, rule);
    }
  }

  /**
   * Evaluate a single action against all constitution rules.
   * Returns all verdicts. Constitution BLOCKS if ANY rule disallows.
   */
  evaluate(action: ConstitutionAction): ConstitutionVerdict[] {
    const verdicts: ConstitutionVerdict[] = [];

    for (const rule of this.rules.values()) {
      const verdict = rule.check(action);
      verdicts.push(verdict);

      if (!verdict.allowed) {
        this.violations.push(verdict);
      }
    }

    return verdicts;
  }

  /**
   * Quick check: is the action allowed by ALL rules?
   */
  isAllowed(action: ConstitutionAction): boolean {
    for (const rule of this.rules.values()) {
      const verdict = rule.check(action);
      if (!verdict.allowed) {
        this.violations.push(verdict);
        return false;
      }
    }
    return true;
  }

  /**
   * Add a custom constitution rule.
   */
  addRule(rule: ConstitutionRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get all recorded violations.
   */
  getViolations(): ReadonlyArray<ConstitutionVerdict> {
    return this.violations;
  }

  /**
   * Get all loaded rules.
   */
  getRules(): ReadonlyArray<ConstitutionRule> {
    return Array.from(this.rules.values());
  }

  /**
   * Clear recorded violations.
   */
  clearViolations(): void {
    this.violations = [];
  }
}
