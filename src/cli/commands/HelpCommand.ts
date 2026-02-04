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
    return this.getHelpText();
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
  status            Show orchestrator state, agents, and resource usage
  rlm               Recursive Language Model reasoning commands
  agent             Create dynamic agents from tasks, traits, or examples
  history           View and manage command history

Options:
  --help, -h        Show help
  --version, -v     Show version

Examples:
  cam help
  cam status
  cam rlm solve "What is 2+2?"
  cam agent create --task "Review code"
  cam <command> help   Show help for a specific command
    `.trim();
  }
}
