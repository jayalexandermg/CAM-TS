/**
 * VersionCommand
 *
 * Displays version information for CAM CLI.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseCommandHandler, Command, CommandResult } from '../types';

/**
 * Version command handler - displays current version
 */
export class VersionCommand extends BaseCommandHandler {
  async execute(_command: Command): Promise<CommandResult> {
    const version = this.getVersion();
    return this.success(`CAM version ${version}`);
  }

  getHelp(): string {
    return 'Display version information';
  }

  getDescription(): string {
    return 'Show the current version of CAM';
  }

  private getVersion(): string {
    try {
      const packagePath = path.join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}
