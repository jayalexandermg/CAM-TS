/**
 * CommandRouter
 *
 * Routes parsed commands to their handlers.
 */

import { Command, CommandHandler, CommandResult } from './types';
import { CommandNotFoundError } from './errors';

/**
 * Routes commands to registered handlers
 */
export class CommandRouter {
  private handlers: Map<string, CommandHandler>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register a command handler
   */
  register(name: string, handler: CommandHandler): void {
    this.handlers.set(name, handler);
  }

  /**
   * Unregister a command handler
   */
  unregister(name: string): void {
    this.handlers.delete(name);
  }

  /**
   * Route a command to its handler
   */
  async route(command: Command): Promise<CommandResult> {
    const handler = this.handlers.get(command.name);

    if (!handler) {
      throw new CommandNotFoundError(command.name);
    }

    try {
      return await handler.execute(command);
    } catch (error) {
      return {
        exitCode: 1,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get list of registered commands
   */
  getCommands(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a command is registered
   */
  hasCommand(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * Get handler for a command
   */
  getHandler(name: string): CommandHandler | undefined {
    return this.handlers.get(name);
  }
}
