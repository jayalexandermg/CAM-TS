/**
 * HelpCommand
 *
 * Displays help information for CAM CLI.
 */

import { BaseCommandHandler, Command, CommandResult } from '../types';

/**
 * Help command handler - displays available commands and usage
 */
export class HelpCommand extends BaseCommandHandler {
  async execute(_command: Command): Promise<CommandResult> {
    const helpText = this.getHelpText();
    return this.success(helpText);
  }

  getHelp(): string {
    return 'Display help information';
  }

  getDescription(): string {
    return 'Show available commands and usage information';
  }

  private getHelpText(): string {
    return `
CAM - Context-Aware Memory System

Usage:
  cam [command] [options]

Commands:
  help              Show this help message
  version           Show version information
  init              Initialize CAM in current directory

Options:
  --help, -h        Show help
  --version, -v     Show version

Examples:
  cam help
  cam version
  cam init
    `.trim();
  }
}
