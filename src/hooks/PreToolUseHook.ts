/**
 * Infinite Aura - PreToolUse Hook
 *
 * Security validation hook that fires BEFORE tool execution.
 * Validates tool safety, detects dangerous commands, and blocks unsafe operations.
 */

import { BaseHookHandler, BaseHookHandlerOptions } from './hook-handler';
import {
  HookEvent,
  EventType,
  PreToolUseEvent,
  HookResult,
  ToolValidationResult,
} from './types';

// ============================================================================
// Default Dangerous Patterns
// ============================================================================

/**
 * Default patterns that indicate dangerous commands
 */
export const DEFAULT_DANGEROUS_PATTERNS: RegExp[] = [
  // Filesystem destruction
  /rm\s+-rf\s+\//i, // rm -rf /
  /rm\s+-rf\s+\/\*/i, // rm -rf /*
  /rm\s+-rf\s+~\//i, // rm -rf ~/
  /rm\s+--no-preserve-root/i, // rm with no-preserve-root flag

  // Fork bomb patterns
  /:\(\)\{\s*:\|:&\s*\};:/i, // Classic fork bomb
  /\$0\s*\|\s*\$0\s*&/i, // Fork bomb variant

  // Disk/device operations
  />\s*\/dev\/sd[a-z]/i, // Write to disk device
  /dd\s+if=.*of=\/dev/i, // dd to disk
  /dd\s+of=\/dev/i, // dd to device
  /mkfs[.\s]/i, // Format filesystem (mkfs or mkfs.ext4)
  /fdisk\s+/i, // Disk partitioning

  // Network pipe to shell (remote code execution)
  /curl\s+.*\|\s*(bash|sh|zsh)/i, // curl | bash
  /wget\s+.*\|\s*(bash|sh|zsh)/i, // wget | sh
  /curl\s+.*\|\s*sudo/i, // curl | sudo
  /wget\s+.*-O\s*-\s*\|\s*(bash|sh)/i, // wget -O - | bash

  // Code injection patterns
  /eval\s*\([^)]*\$/i, // eval with variable expansion
  /\$\(.*\)/i, // Command substitution that could be dangerous

  // System modification
  /chmod\s+777\s+\//i, // chmod 777 on root
  /chown\s+-R\s+.*\s+\//i, // recursive chown on root

  // Database destruction
  /DROP\s+DATABASE/i, // Drop database
  /DROP\s+TABLE\s+\*/i, // Drop all tables
  /TRUNCATE\s+/i, // Truncate tables
  /DELETE\s+FROM\s+\w+\s*;?\s*$/i, // Delete without WHERE

  // Environment manipulation
  /export\s+PATH\s*=\s*$/i, // Clearing PATH
  /unset\s+PATH/i, // Unsetting PATH
];

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for PreToolUseHook
 */
export interface PreToolUseHookConfig {
  /** Additional dangerous patterns to check */
  dangerousPatterns?: RegExp[];
  /** Replace default patterns instead of extending */
  replaceDefaultPatterns?: boolean;
  /** Tools that are always allowed */
  allowedTools?: string[];
  /** Tools that are always blocked */
  blockedTools?: string[];
  /** If true, unknown tools are blocked (default: false) */
  strictMode?: boolean;
  /** Enable logging of tool usage */
  enableLogging?: boolean;
  /** Custom log handler */
  logHandler?: (event: PreToolUseEvent, result: HookResult) => void;
}

/**
 * Options for PreToolUseHook
 */
export interface PreToolUseHookOptions extends BaseHookHandlerOptions {
  /** Hook configuration */
  config?: PreToolUseHookConfig;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<PreToolUseHookConfig, 'logHandler'>> & {
  logHandler?: (event: PreToolUseEvent, result: HookResult) => void;
} = {
  dangerousPatterns: [],
  replaceDefaultPatterns: false,
  allowedTools: [],
  blockedTools: [],
  strictMode: false,
  enableLogging: true,
  logHandler: undefined,
};

// ============================================================================
// PreToolUseHook Class
// ============================================================================

/**
 * Security validation hook for tool execution
 *
 * This hook:
 * - Fires BEFORE any tool/command execution
 * - Validates tool safety
 * - Detects dangerous commands
 * - Blocks unsafe operations
 * - Logs tool usage
 * - Enforces security policies
 *
 * Uses the enforcement pattern:
 * - ALLOW: Tool is safe, proceed with execution
 * - BLOCK: Tool is unsafe, prevent execution
 */
export class PreToolUseHook extends BaseHookHandler {
  readonly name = 'pre-tool-use';
  readonly eventType = EventType.PRE_TOOL_USE;

  private readonly dangerousPatterns: RegExp[];
  private readonly allowedTools: Set<string>;
  private readonly blockedTools: Set<string>;
  private readonly strictMode: boolean;
  private readonly enableLogging: boolean;
  private readonly logHandler?: (event: PreToolUseEvent, result: HookResult) => void;

  /** Tool usage log for inspection */
  private usageLog: Array<{ event: PreToolUseEvent; result: HookResult; timestamp: string }> = [];

  /**
   * Create a new PreToolUseHook
   * @param options - Configuration options
   */
  constructor(options: PreToolUseHookOptions = {}) {
    super(options);

    const config = { ...DEFAULT_CONFIG, ...options.config };

    // Build dangerous patterns list
    if (config.replaceDefaultPatterns) {
      this.dangerousPatterns = config.dangerousPatterns ?? [];
    } else {
      this.dangerousPatterns = [...DEFAULT_DANGEROUS_PATTERNS, ...(config.dangerousPatterns ?? [])];
    }

    this.allowedTools = new Set(config.allowedTools ?? []);
    this.blockedTools = new Set(config.blockedTools ?? []);
    this.strictMode = config.strictMode ?? false;
    this.enableLogging = config.enableLogging ?? true;
    this.logHandler = config.logHandler;
  }

  /**
   * Handle a pre-tool-use event
   * @param event - The event to handle
   */
  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);
    await this.execute(event as PreToolUseEvent);
  }

  /**
   * Execute the hook before tool use
   * @param event - The pre-tool-use event
   * @returns Hook result with ALLOW or BLOCK action
   */
  async execute(event: PreToolUseEvent): Promise<HookResult> {
    const toolName = event.metadata.toolName;
    const args = event.metadata.args;

    // Validate tool safety
    const validation = this.validateTool(toolName, args);

    let result: HookResult;

    if (!validation.safe) {
      // Block unsafe tool
      result = this.block(validation.reason ?? 'Tool blocked for safety reasons', {
        toolName,
        args,
        matchedPattern: validation.matchedPattern,
      });
    } else {
      // Allow safe tool
      result = this.allow({
        toolName,
        validated: true,
      });
    }

    // Log tool usage
    if (this.enableLogging) {
      this.logToolUsage(event, result);
    }

    return result;
  }

  /**
   * Validate tool safety
   * @param toolName - Name of the tool
   * @param args - Arguments passed to the tool
   * @returns Validation result
   */
  validateTool(toolName: string, args: unknown[]): ToolValidationResult {
    // Check if tool is explicitly blocked
    if (this.blockedTools.has(toolName)) {
      return {
        safe: false,
        reason: `Tool '${toolName}' is blocked by policy`,
      };
    }

    // Check if tool is explicitly allowed (bypass further checks)
    if (this.allowedTools.has(toolName)) {
      return { safe: true };
    }

    // In strict mode, unknown tools are blocked
    if (this.strictMode && this.allowedTools.size > 0 && !this.allowedTools.has(toolName)) {
      return {
        safe: false,
        reason: `Tool '${toolName}' is not in allowed list (strict mode)`,
      };
    }

    // Check for dangerous patterns in arguments
    const argsString = this.stringifyArgs(args);
    const patternResult = this.checkDangerousPatterns(argsString);

    if (!patternResult.safe) {
      return patternResult;
    }

    return { safe: true };
  }

  /**
   * Check for dangerous patterns in a command string
   * @param command - Command string to check
   * @returns Validation result
   */
  checkDangerousPatterns(command: string): ToolValidationResult {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          safe: false,
          reason: `Dangerous pattern detected in command`,
          matchedPattern: pattern.source,
        };
      }
    }
    return { safe: true };
  }

  /**
   * Stringify arguments for pattern matching
   * @param args - Arguments to stringify
   * @returns String representation of arguments
   */
  private stringifyArgs(args: unknown[]): string {
    try {
      return args
        .map((arg) => {
          if (typeof arg === 'string') {
            return arg;
          }
          return JSON.stringify(arg);
        })
        .join(' ');
    } catch {
      return '';
    }
  }

  /**
   * Log tool usage
   * @param event - The pre-tool-use event
   * @param result - The hook result
   */
  private logToolUsage(event: PreToolUseEvent, result: HookResult): void {
    const logEntry = {
      event,
      result,
      timestamp: new Date().toISOString(),
    };

    this.usageLog.push(logEntry);

    // Call custom log handler if provided
    if (this.logHandler) {
      this.logHandler(event, result);
    }
  }

  // =========================================================================
  // Inspection Methods
  // =========================================================================

  /**
   * Get the usage log
   * @returns Array of logged tool usage entries
   */
  getUsageLog(): Array<{ event: PreToolUseEvent; result: HookResult; timestamp: string }> {
    return [...this.usageLog];
  }

  /**
   * Clear the usage log
   */
  clearUsageLog(): void {
    this.usageLog = [];
  }

  /**
   * Get dangerous patterns
   * @returns Array of dangerous patterns
   */
  getDangerousPatterns(): RegExp[] {
    return [...this.dangerousPatterns];
  }

  /**
   * Get allowed tools
   * @returns Set of allowed tools
   */
  getAllowedTools(): Set<string> {
    return new Set(this.allowedTools);
  }

  /**
   * Get blocked tools
   * @returns Set of blocked tools
   */
  getBlockedTools(): Set<string> {
    return new Set(this.blockedTools);
  }

  /**
   * Check if strict mode is enabled
   * @returns true if strict mode is enabled
   */
  isStrictMode(): boolean {
    return this.strictMode;
  }

  /**
   * Check if logging is enabled
   * @returns true if logging is enabled
   */
  isLoggingEnabled(): boolean {
    return this.enableLogging;
  }

  // =========================================================================
  // Dynamic Configuration
  // =========================================================================

  /**
   * Add a tool to the allowed list
   * @param toolName - Tool name to allow
   */
  allowTool(toolName: string): void {
    this.allowedTools.add(toolName);
    this.blockedTools.delete(toolName); // Remove from blocked if present
  }

  /**
   * Add a tool to the blocked list
   * @param toolName - Tool name to block
   */
  blockTool(toolName: string): void {
    this.blockedTools.add(toolName);
    this.allowedTools.delete(toolName); // Remove from allowed if present
  }

  /**
   * Add a dangerous pattern
   * @param pattern - Pattern to add
   */
  addDangerousPattern(pattern: RegExp): void {
    this.dangerousPatterns.push(pattern);
  }
}

// ============================================================================
// Helper: Create PreToolUseEvent
// ============================================================================

/**
 * Create a PreToolUseEvent
 * @param toolName - Name of the tool
 * @param args - Arguments for the tool
 * @param context - Optional context
 * @returns PreToolUseEvent
 */
export function createPreToolUseEvent(
  toolName: string,
  args: unknown[],
  context?: {
    skillName?: string;
    sessionId?: string;
    userId?: string;
    workingDirectory?: string;
  }
): PreToolUseEvent {
  return {
    timestamp: new Date().toISOString(),
    type: EventType.PRE_TOOL_USE,
    content: `Tool call: ${toolName}`,
    metadata: {
      toolName,
      args,
      context,
    },
  };
}
