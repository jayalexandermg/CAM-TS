/**
 * CLI Types
 *
 * Core types and interfaces for CLI infrastructure.
 */

/**
 * Parsed command representation
 */
export interface Command {
  name: string;
  subcommand?: string;
  flags: Map<string, boolean>;
  options: Map<string, string>;
  positional: string[];
}

/**
 * Result of command execution
 */
export interface CommandResult {
  exitCode: number;
  output?: string;
  error?: string;
}

/**
 * Command handler interface
 */
export interface CommandHandler {
  execute(command: Command): Promise<CommandResult>;
  getHelp(): string;
  getDescription(): string;
}

/**
 * Base class for command handlers with utility methods
 */
export abstract class BaseCommandHandler implements CommandHandler {
  abstract execute(command: Command): Promise<CommandResult>;
  abstract getHelp(): string;
  abstract getDescription(): string;

  /**
   * Create a success result
   */
  protected success(output?: string): CommandResult {
    return {
      exitCode: 0,
      output,
    };
  }

  /**
   * Create a failure result
   */
  protected failure(error: string, exitCode: number = 1): CommandResult {
    return {
      exitCode,
      error,
    };
  }
}
