/**
 * Infinite Aura - PostToolUse Hook
 *
 * Capture hook that fires AFTER tool execution.
 * Captures tool outputs to UOCS, extracts learnings, and logs transcript turns.
 */

import { BaseHookHandler, BaseHookHandlerOptions } from './hook-handler';
import { HookEvent, EventType, PostToolUseEvent, PostToolUseMetadata, HookResult } from './types';
import { UOCS } from '../history/UOCS';

// ============================================================================
// Insight Patterns for Learning Extraction
// ============================================================================

/**
 * Default patterns that indicate potential learnings in tool output
 */
export const DEFAULT_INSIGHT_PATTERNS: RegExp[] = [
  /learned that (.+)/i,
  /discovered (.+)/i,
  /found that (.+)/i,
  /important: (.+)/i,
  /note: (.+)/i,
  /insight: (.+)/i,
  /conclusion: (.+)/i,
  /observation: (.+)/i,
];

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for PostToolUseHook
 */
export interface PostToolUseHookConfig {
  /** Additional insight patterns to check for learnings */
  insightPatterns?: RegExp[];
  /** Replace default patterns instead of extending */
  replaceDefaultPatterns?: boolean;
  /** Default confidence for extracted learnings */
  defaultConfidence?: number;
  /** Enable logging of tool outputs */
  enableLogging?: boolean;
  /** Enable learning extraction */
  enableLearningExtraction?: boolean;
  /** Custom log handler */
  logHandler?: (event: PostToolUseEvent, result: HookResult) => void;
}

/**
 * Options for PostToolUseHook
 */
export interface PostToolUseHookOptions extends BaseHookHandlerOptions {
  /** Hook configuration */
  config?: PostToolUseHookConfig;
  /** UOCS instance for capturing outputs */
  uocs?: UOCS;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<PostToolUseHookConfig, 'logHandler'>> & {
  logHandler?: (event: PostToolUseEvent, result: HookResult) => void;
} = {
  insightPatterns: [],
  replaceDefaultPatterns: false,
  defaultConfidence: 0.7,
  enableLogging: true,
  enableLearningExtraction: true,
  logHandler: undefined,
};

// ============================================================================
// PostToolUseHook Class
// ============================================================================

/**
 * Capture hook for post-tool execution
 *
 * This hook:
 * - Fires AFTER any tool/command execution
 * - Captures tool outputs to UOCS history
 * - Records turns in session transcript
 * - Extracts learnings from successful outputs
 * - Logs tool usage for analysis
 */
export class PostToolUseHook extends BaseHookHandler {
  readonly name = 'post-tool-use';
  readonly eventType = EventType.POST_TOOL_USE;

  private uocs: UOCS | null = null;
  private readonly insightPatterns: RegExp[];
  private readonly defaultConfidence: number;
  private readonly enableLogging: boolean;
  private readonly enableLearningExtraction: boolean;
  private readonly logHandler?: (event: PostToolUseEvent, result: HookResult) => void;

  /** Output log for inspection */
  private outputLog: Array<{ event: PostToolUseEvent; result: HookResult; timestamp: string }> = [];

  /**
   * Create a new PostToolUseHook
   * @param options - Configuration options
   */
  constructor(options: PostToolUseHookOptions = {}) {
    super(options);

    const config = { ...DEFAULT_CONFIG, ...options.config };

    // Build insight patterns list
    if (config.replaceDefaultPatterns) {
      this.insightPatterns = config.insightPatterns ?? [];
    } else {
      this.insightPatterns = [...DEFAULT_INSIGHT_PATTERNS, ...(config.insightPatterns ?? [])];
    }

    this.defaultConfidence = config.defaultConfidence;
    this.enableLogging = config.enableLogging;
    this.enableLearningExtraction = config.enableLearningExtraction;
    this.logHandler = config.logHandler;

    if (options.uocs) {
      this.uocs = options.uocs;
    }
  }

  /**
   * Handle a post-tool-use event
   * @param event - The event to handle
   */
  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);
    await this.execute(event as PostToolUseEvent);
  }

  /**
   * Execute the hook after tool use
   * @param event - The post-tool-use event
   * @returns Hook result with captured data
   */
  async execute(event: PostToolUseEvent): Promise<HookResult> {
    const startTime = Date.now();

    try {
      const metadata = event.metadata;
      const sessionId = metadata.context?.sessionId || 'default';
      const agentId = metadata.context?.agentId;

      // Capture tool output to UOCS if available
      if (this.uocs) {
        await this.captureToUOCS(event, sessionId, agentId);
      }

      // Check for learnings in successful outputs
      let learningsExtracted = 0;
      if (this.enableLearningExtraction && metadata.success && metadata.toolOutput) {
        learningsExtracted = await this.extractLearnings(event, sessionId);
      }

      const result = this.allow({
        captured: true,
        toolName: metadata.toolName,
        success: metadata.success,
        duration: metadata.duration,
        learningsExtracted,
      });

      // Log output if enabled
      if (this.enableLogging) {
        this.logToolOutput(event, result);
      }

      return result;
    } catch (error) {
      const result: HookResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          toolName: event.metadata.toolName,
          duration: Date.now() - startTime,
        },
      };

      // Log failure if enabled
      if (this.enableLogging) {
        this.logToolOutput(event, result);
      }

      return result;
    }
  }

  /**
   * Capture tool output to UOCS
   */
  private async captureToUOCS(
    event: PostToolUseEvent,
    sessionId: string,
    agentId?: string
  ): Promise<void> {
    const metadata = event.metadata;

    // Capture raw output
    await this.uocs!.captureOutput(
      sessionId,
      JSON.stringify({
        tool: metadata.toolName,
        input: metadata.toolInput,
        output: metadata.toolOutput,
        success: metadata.success,
      }),
      agentId,
      {
        toolName: metadata.toolName,
        duration: metadata.duration,
        success: metadata.success,
      }
    );

    // Capture turn in transcript
    this.uocs!.captureTurn(sessionId, {
      role: 'system',
      content: `Tool ${metadata.toolName} executed${metadata.success ? '' : ' (failed)'}`,
      timestamp: new Date(),
      agentId,
      toolsUsed: [metadata.toolName],
    });
  }

  /**
   * Extract learnings from tool output
   * @param event - The post-tool-use event
   * @param sessionId - Session ID for learning storage
   * @returns Number of learnings extracted
   */
  private async extractLearnings(event: PostToolUseEvent, sessionId: string): Promise<number> {
    const output = this.stringifyOutput(event.metadata.toolOutput);
    let learningsExtracted = 0;

    for (const pattern of this.insightPatterns) {
      const match = output.match(pattern);
      if (match && match[1] && this.uocs) {
        await this.uocs.captureLearning(
          sessionId,
          event.metadata.toolName,
          match[1].trim(),
          this.defaultConfidence,
          `Tool: ${event.metadata.toolName}`
        );
        learningsExtracted++;
      }
    }

    return learningsExtracted;
  }

  /**
   * Stringify tool output for pattern matching
   */
  private stringifyOutput(output: unknown): string {
    if (typeof output === 'string') {
      return output;
    }
    try {
      return JSON.stringify(output);
    } catch {
      return String(output);
    }
  }

  /**
   * Log tool output
   */
  private logToolOutput(event: PostToolUseEvent, result: HookResult): void {
    const logEntry = {
      event,
      result,
      timestamp: new Date().toISOString(),
    };

    this.outputLog.push(logEntry);

    // Call custom log handler if provided
    if (this.logHandler) {
      this.logHandler(event, result);
    }
  }

  // =========================================================================
  // UOCS Management
  // =========================================================================

  /**
   * Set the UOCS instance
   * @param uocs - UOCS instance to use
   */
  setUOCS(uocs: UOCS): void {
    this.uocs = uocs;
  }

  /**
   * Get the current UOCS instance
   * @returns Current UOCS instance or null
   */
  getUOCS(): UOCS | null {
    return this.uocs;
  }

  // =========================================================================
  // Inspection Methods
  // =========================================================================

  /**
   * Get the output log
   * @returns Array of logged tool output entries
   */
  getOutputLog(): Array<{ event: PostToolUseEvent; result: HookResult; timestamp: string }> {
    return [...this.outputLog];
  }

  /**
   * Clear the output log
   */
  clearOutputLog(): void {
    this.outputLog = [];
  }

  /**
   * Get insight patterns
   * @returns Array of insight patterns
   */
  getInsightPatterns(): RegExp[] {
    return [...this.insightPatterns];
  }

  /**
   * Get default confidence
   * @returns Default confidence value
   */
  getDefaultConfidence(): number {
    return this.defaultConfidence;
  }

  /**
   * Check if logging is enabled
   * @returns true if logging is enabled
   */
  isLoggingEnabled(): boolean {
    return this.enableLogging;
  }

  /**
   * Check if learning extraction is enabled
   * @returns true if learning extraction is enabled
   */
  isLearningExtractionEnabled(): boolean {
    return this.enableLearningExtraction;
  }

  // =========================================================================
  // Dynamic Configuration
  // =========================================================================

  /**
   * Add an insight pattern
   * @param pattern - Pattern to add
   */
  addInsightPattern(pattern: RegExp): void {
    this.insightPatterns.push(pattern);
  }
}

// ============================================================================
// Helper: Create PostToolUseEvent
// ============================================================================

/**
 * Create a PostToolUseEvent
 * @param toolName - Name of the tool
 * @param toolInput - Input passed to the tool
 * @param toolOutput - Output returned by the tool
 * @param success - Whether the tool executed successfully
 * @param duration - Duration of tool execution in milliseconds
 * @param context - Optional context
 * @param error - Optional error if execution failed
 * @returns PostToolUseEvent
 */
export function createPostToolUseEvent(
  toolName: string,
  toolInput: unknown,
  toolOutput: unknown,
  success: boolean,
  duration: number,
  context?: {
    skillName?: string;
    sessionId?: string;
    userId?: string;
    agentId?: string;
    workingDirectory?: string;
  },
  error?: Error
): PostToolUseEvent {
  const metadata: PostToolUseMetadata = {
    toolName,
    toolInput,
    toolOutput,
    duration,
    success,
    context,
  };

  if (error) {
    metadata.error = error;
  }

  return {
    timestamp: new Date().toISOString(),
    type: EventType.POST_TOOL_USE,
    content: `Tool ${toolName} ${success ? 'completed' : 'failed'}`,
    metadata,
  };
}
