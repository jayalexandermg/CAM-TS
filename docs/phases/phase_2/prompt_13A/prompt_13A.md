PROMPT 13A: Command Parser & Router Core
Terminal 1

Save to: docs/phases/phase_3/prompt_13a/prompt_13a.md

PROMPT 13A: Command Parser & Router Core
Phase: 3 (CLI + Persona)
Status: 🆕 NEW - Core CLI infrastructure
Time Estimate: 4-5 hours
Priority: CRITICAL
Dependencies: Phase 2 complete
Parallel: ✅ Can run with 13B, 13C, 13D

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Implement core CLI infrastructure: command parsing, routing, and error handling.

After this prompt:

✅ CommandParser class (argument parsing)
✅ CommandRouter class (command routing)
✅ CLI types and interfaces
✅ CLI error classes
✅ 20-25 new tests
📦 REQUIREMENTS
1. CommandParser Class
Create src/cli/CommandParser.ts:

typescript
Copy
export class CommandParser {
  private args: string[];

  constructor(args: string[]) {
    this.args = args;
  }

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
      positional
    };
  }

  private extractCommand(): string {
    // First non-flag argument
    return this.args.find(arg => !arg.startsWith('-')) || 'help';
  }

  private extractSubcommand(): string | undefined {
    // Second non-flag argument
    const nonFlags = this.args.filter(arg => !arg.startsWith('-'));
    return nonFlags[1];
  }

  private extractFlags(): Map<string, boolean> {
    // --flag or -f
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

  private extractOptions(): Map<string, string> {
    // --key=value
    const options = new Map<string, string>();

    for (const arg of this.args) {
      if (arg.startsWith('--') && arg.includes('=')) {
        const [key, value] = arg.slice(2).split('=');
        options.set(key, value);
      }
    }

    return options;
  }

  private extractPositional(): string[] {
    // Non-flag, non-option arguments (after command and subcommand)
    const positional: string[] = [];
    let skipNext = false;

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];

      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (!arg.startsWith('-')) {
        positional.push(arg);
      }
    }

    // Remove command and subcommand
    return positional.slice(2);
  }
}
2. CommandRouter Class
Create src/cli/CommandRouter.ts:

typescript
Copy
import { Command, CommandHandler, CommandResult } from './types';
import { CommandNotFoundError } from './errors';

export class CommandRouter {
  private handlers: Map<string, CommandHandler>;

  constructor() {
    this.handlers = new Map();
  }

  register(name: string, handler: CommandHandler): void {
    this.handlers.set(name, handler);
  }

  unregister(name: string): void {
    this.handlers.delete(name);
  }

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
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getCommands(): string[] {
    return Array.from(this.handlers.keys());
  }

  hasCommand(name: string): boolean {
    return this.handlers.has(name);
  }

  getHandler(name: string): CommandHandler | undefined {
    return this.handlers.get(name);
  }
}
3. CLI Types
Create src/cli/types.ts:

typescript
Copy
export interface Command {
  name: string;
  subcommand?: string;
  flags: Map<string, boolean>;
  options: Map<string, string>;
  positional: string[];
}

export interface CommandHandler {
  execute(command: Command): Promise<CommandResult>;
  getHelp(): string;
  getDescription(): string;
}

export interface CommandResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export abstract class BaseCommandHandler implements CommandHandler {
  abstract execute(command: Command): Promise<CommandResult>;
  abstract getHelp(): string;
  abstract getDescription(): string;

  protected success(output?: string): CommandResult {
    return {
      exitCode: 0,
      output
    };
  }

  protected failure(error: string, exitCode: number = 1): CommandResult {
    return {
      exitCode,
      error
    };
  }
}
4. CLI Errors
Create src/cli/errors.ts:

typescript
Copy
export class CLIError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class CommandNotFoundError extends CLIError {
  constructor(command: string) {
    super(`Command not found: ${command}`, 1);
    this.name = 'CommandNotFoundError';
  }
}

export class InvalidArgumentError extends CLIError {
  constructor(message: string) {
    super(`Invalid argument: ${message}`, 1);
    this.name = 'InvalidArgumentError';
  }
}

export class MissingArgumentError extends CLIError {
  constructor(argument: string) {
    super(`Missing required argument: ${argument}`, 1);
    this.name = 'MissingArgumentError';
  }
}

export class InvalidCommandError extends CLIError {
  constructor(message: string) {
    super(`Invalid command: ${message}`, 1);
    this.name = 'InvalidCommandError';
  }
}
5. Index Export
Create src/cli/index.ts:

typescript
Copy
export * from './types';
export * from './errors';
export * from './CommandParser';
export * from './CommandRouter';
📁 FILES TO CREATE
src/cli/CommandParser.ts
src/cli/CommandRouter.ts
src/cli/types.ts
src/cli/errors.ts
src/cli/index.ts
tests/cli/CommandParser.test.ts (12-15 tests)
tests/cli/CommandRouter.test.ts (8-10 tests)
Total: 7 files, 20-25 tests

✅ SUCCESS CRITERIA
✅ CommandParser working
✅ CommandRouter working
✅ All types defined
✅ Error classes working
✅ 20-25 tests passing
✅ No TypeScript errors
END OF PROMPT 13A
