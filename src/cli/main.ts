#!/usr/bin/env node
/**
 * Infinite Aura CLI - Entry Point
 *
 * Main entry point for the CAM (Context-Aware Memory) CLI.
 * Supports both interactive mode (REPL) and single command execution.
 */

import { CommandRouter } from './CommandRouter';
import { CommandParser } from './CommandParser';
import { HelpCommand } from './commands/HelpCommand';
import { VersionCommand } from './commands/VersionCommand';
import { InitCommand } from './commands/InitCommand';
import { InteractiveMode } from './InteractiveMode';
import { SessionManager } from './session/SessionManager';
import { PersonaManager } from '../persona/PersonaManager';
import { HookEventEmitter } from '../hooks/event-emitter';

/**
 * Create and configure the command router with all commands
 * @returns Configured CommandRouter instance
 */
function createRouter(): CommandRouter {
  const router = new CommandRouter();

  router.register('help', new HelpCommand());
  router.register('version', new VersionCommand());
  router.register('init', new InitCommand());

  return router;
}

/**
 * Run a single command
 * @param args - Command line arguments
 */
async function runCommand(args: string[]): Promise<void> {
  const parser = new CommandParser(args);
  const command = parser.parse();

  const router = createRouter();
  const result = await router.route(command);

  if (result.output) {
    console.log(result.output);
  }

  if (result.error) {
    console.error(result.error);
  }

  process.exit(result.exitCode);
}

/**
 * Start interactive mode
 */
async function runInteractive(): Promise<void> {
  const sessionManager = new SessionManager();
  const personaManager = new PersonaManager();
  const hookEmitter = new HookEventEmitter({ throwOnErrors: false });
  const router = createRouter();

  const interactive = new InteractiveMode(
    router,
    sessionManager,
    personaManager,
    hookEmitter
  );

  await interactive.start();
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);

    // If no arguments, start interactive mode
    if (args.length === 0) {
      await runInteractive();
      return;
    }

    // Parse and route command
    await runCommand(args);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main function
main();
