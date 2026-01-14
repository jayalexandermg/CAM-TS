/**
 * CommandParser
 *
 * Parses command-line arguments into structured Command objects.
 */

import { Command } from './types';

/**
 * Parses CLI arguments into structured commands
 */
export class CommandParser {
  private args: string[];

  constructor(args: string[]) {
    this.args = args;
  }

  /**
   * Parse arguments into a Command object
   */
  parse(): Command {
    const command = this.extractCommand();
    const subcommand = this.extractSubcommand();
    const flags = this.extractFlags();
    const options = this.extractOptions();
    const positional = this.extractPositional();

    return {
      name: command,
      subcommand,
      flags,
      options,
      positional,
    };
  }

  /**
   * Extract the main command (first non-flag argument)
   */
  private extractCommand(): string {
    return this.args.find((arg) => !arg.startsWith('-')) || 'help';
  }

  /**
   * Extract the subcommand (second non-flag argument)
   */
  private extractSubcommand(): string | undefined {
    const nonFlags = this.args.filter((arg) => !arg.startsWith('-'));
    return nonFlags[1];
  }

  /**
   * Extract flags (--flag or -f)
   */
  private extractFlags(): Map<string, boolean> {
    const flags = new Map<string, boolean>();

    for (const arg of this.args) {
      if (arg.startsWith('--') && !arg.includes('=')) {
        flags.set(arg.slice(2), true);
      } else if (arg.startsWith('-') && arg.length === 2) {
        flags.set(arg.slice(1), true);
      }
    }

    return flags;
  }

  /**
   * Extract options (--key=value)
   */
  private extractOptions(): Map<string, string> {
    const options = new Map<string, string>();

    for (const arg of this.args) {
      if (arg.startsWith('--') && arg.includes('=')) {
        const eqIndex = arg.indexOf('=');
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        options.set(key, value);
      }
    }

    return options;
  }

  /**
   * Extract positional arguments (non-flag, non-option, after command/subcommand)
   */
  private extractPositional(): string[] {
    const positional: string[] = [];

    for (const arg of this.args) {
      if (!arg.startsWith('-')) {
        positional.push(arg);
      }
    }

    // Remove command and subcommand
    return positional.slice(2);
  }
}
