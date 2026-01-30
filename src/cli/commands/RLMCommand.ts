/**
 * RLM Commands
 *
 * CLI commands for interacting with the RLM (Recursive Language Model) system.
 * Provides rlm:solve and rlm:analyze subcommands.
 */

import { BaseCommandHandler, Command, CommandResult } from '../types';
import { RLMOrchestrator } from '../../rlm/integration/RLMOrchestrator';
import { RLMSolveRequest, RLMAnalyzeRequest } from '../../rlm/integration/types';

/**
 * RLM Command Handler
 *
 * Handles rlm:solve and rlm:analyze commands for recursive reasoning.
 */
export class RLMCommand extends BaseCommandHandler {
  private orchestrator: RLMOrchestrator;

  constructor(orchestrator?: RLMOrchestrator) {
    super();
    this.orchestrator = orchestrator || new RLMOrchestrator();
  }

  async execute(command: Command): Promise<CommandResult> {
    const subcommand = command.subcommand || command.positional[0];

    switch (subcommand) {
      case 'solve':
        return this.handleSolve(command);
      case 'analyze':
        return this.handleAnalyze(command);
      case 'status':
        return this.handleStatus();
      case 'clear':
        return this.handleClear(command);
      default:
        return this.failure(
          `Unknown RLM subcommand: ${subcommand}\n\n${this.getHelp()}`
        );
    }
  }

  getHelp(): string {
    return `
RLM Commands - Recursive Language Model reasoning

Usage:
  rlm solve <query>     Solve a problem using recursive reasoning
  rlm analyze <query>   Analyze problem complexity
  rlm status            Show RLM orchestrator status
  rlm clear [context]   Clear context or cache

Solve Options:
  --context, -c <text>  Add context for the problem
  --constraint <text>   Add a constraint (can be used multiple times)
  --depth <number>      Maximum recursion depth (default: 5)
  --timeout <ms>        Timeout in milliseconds
  --no-validate         Disable validation of reasoning chains

Analyze Options:
  --depth <level>       Analysis depth: shallow, medium, deep
  --context, -c <text>  Add context for analysis

Examples:
  rlm solve "What is the capital of France?"
  rlm solve "Design a REST API" --context "Using Node.js"
  rlm analyze "Implement a sorting algorithm"
  rlm status
  rlm clear context
    `.trim();
  }

  getDescription(): string {
    return 'Recursive Language Model reasoning commands';
  }

  /**
   * Handle rlm:solve command
   */
  private async handleSolve(command: Command): Promise<CommandResult> {
    // Get query from positional args (skip 'solve' if present)
    const queryParts = command.positional.slice(
      command.positional[0] === 'solve' ? 1 : 0
    );

    if (queryParts.length === 0) {
      return this.failure('Missing query. Usage: rlm solve <query>');
    }

    const query = queryParts.join(' ');

    // Build request
    const request: RLMSolveRequest = {
      query,
      context: command.options.get('context') || command.options.get('c'),
      constraints: this.getConstraints(command),
      options: {
        maxDepth: this.parseNumber(command.options.get('depth')),
        timeout: this.parseNumber(command.options.get('timeout')),
        enableValidation: !command.flags.get('no-validate'),
      },
    };

    try {
      const startTime = Date.now();
      const result = await this.orchestrator.solve(request);
      const duration = Date.now() - startTime;

      if (result.success) {
        const output = this.formatSolveResult(result, duration);
        return this.success(output);
      } else {
        return this.failure(
          `Solving failed: ${result.error?.message || 'Unknown error'}`
        );
      }
    } catch (error) {
      return this.failure(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle rlm:analyze command
   */
  private async handleAnalyze(command: Command): Promise<CommandResult> {
    // Get query from positional args
    const queryParts = command.positional.slice(
      command.positional[0] === 'analyze' ? 1 : 0
    );

    if (queryParts.length === 0) {
      return this.failure('Missing query. Usage: rlm analyze <query>');
    }

    const query = queryParts.join(' ');

    // Build request
    const request: RLMAnalyzeRequest = {
      query,
      context: command.options.get('context') || command.options.get('c'),
      depth: this.parseDepth(command.options.get('depth')),
    };

    try {
      const result = await this.orchestrator.analyze(request);

      if (result.success) {
        const output = this.formatAnalyzeResult(result);
        return this.success(output);
      } else {
        return this.failure(
          `Analysis failed: ${result.error?.message || 'Unknown error'}`
        );
      }
    } catch (error) {
      return this.failure(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle rlm:status command
   */
  private handleStatus(): CommandResult {
    const state = this.orchestrator.getState();
    const contextStats = this.orchestrator.getContextManager().getStats();

    const output = `
RLM Orchestrator Status
=======================

Tasks:
  Active:    ${state.activeTasks}
  Completed: ${state.completedTasks}
  Failed:    ${state.failedTasks}

Performance:
  Problems Solved: ${state.problemsSolved}
  Avg Solve Time:  ${state.averageSolveTime.toFixed(0)}ms
  Uptime:          ${this.formatDuration(state.uptime)}

Context:
  Items:     ${contextStats.itemCount}
  Tokens:    ${contextStats.totalTokens}
  Available: ${contextStats.availableTokens}
  Usage:     ${(contextStats.usageRatio * 100).toFixed(1)}%
    `.trim();

    return this.success(output);
  }

  /**
   * Handle rlm:clear command
   */
  private handleClear(command: Command): CommandResult {
    const target = command.positional[1] || 'all';

    switch (target) {
      case 'context':
        this.orchestrator.clearContext();
        return this.success('Context cleared.');
      case 'cache':
        this.orchestrator.clearCache();
        return this.success('Cache cleared.');
      case 'all':
        this.orchestrator.clearContext();
        this.orchestrator.clearCache();
        return this.success('Context and cache cleared.');
      default:
        return this.failure(
          `Unknown clear target: ${target}. Use: context, cache, or all`
        );
    }
  }

  /**
   * Format solve result for display
   */
  private formatSolveResult(
    result: import('../../rlm/integration/types').RLMSolveResult,
    duration: number
  ): string {
    const parts: string[] = [];

    parts.push('=== RLM Solution ===\n');

    if (result.formattedAnswer) {
      parts.push(result.formattedAnswer);
    } else if (result.solution) {
      parts.push(`Answer: ${result.solution.answer}`);
    }

    parts.push('\n--- Metrics ---');
    parts.push(`Duration: ${duration}ms`);
    parts.push(`Confidence: ${((result.solution?.confidence || 0) * 100).toFixed(0)}%`);
    parts.push(`Problems Processed: ${result.metrics.reasoning.problemsProcessed}`);
    parts.push(`Max Depth: ${result.metrics.reasoning.maxDepth}`);

    if (result.metrics.cacheHits > 0) {
      parts.push(`Cache Hits: ${result.metrics.cacheHits}`);
    }

    return parts.join('\n');
  }

  /**
   * Format analyze result for display
   */
  private formatAnalyzeResult(
    result: import('../../rlm/integration/types').RLMAnalyzeResult
  ): string {
    const parts: string[] = [];

    parts.push('=== Problem Analysis ===\n');
    parts.push(`Complexity: ${result.complexity.toUpperCase()}`);
    parts.push(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    parts.push(`Can Solve Directly: ${result.canSolveDirectly ? 'Yes' : 'No'}`);

    parts.push('\nKey Concepts:');
    for (const concept of result.keyConcepts) {
      parts.push(`  - ${concept}`);
    }

    parts.push(`\nSuggested Approach: ${result.suggestedApproach}`);

    if (result.suggestedDecomposition && result.suggestedDecomposition.length > 0) {
      parts.push('\nSuggested Decomposition:');
      for (let i = 0; i < result.suggestedDecomposition.length; i++) {
        parts.push(`  ${i + 1}. ${result.suggestedDecomposition[i]}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Get constraints from command
   */
  private getConstraints(command: Command): string[] | undefined {
    const constraints: string[] = [];

    // Check for multiple --constraint options
    for (const [key, value] of command.options) {
      if (key === 'constraint') {
        constraints.push(value);
      }
    }

    return constraints.length > 0 ? constraints : undefined;
  }

  /**
   * Parse number from string
   */
  private parseNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse analysis depth
   */
  private parseDepth(
    value: string | undefined
  ): 'shallow' | 'medium' | 'deep' | undefined {
    if (!value) return undefined;
    const lower = value.toLowerCase();
    if (lower === 'shallow' || lower === 'medium' || lower === 'deep') {
      return lower;
    }
    return undefined;
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Get the orchestrator instance
   */
  getOrchestrator(): RLMOrchestrator {
    return this.orchestrator;
  }
}
