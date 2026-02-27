/**
 * CLI Error Classes
 *
 * Custom error types for CLI operations.
 */

/**
 * Base CLI error class
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * Error thrown when a command is not found
 */
export class CommandNotFoundError extends CLIError {
  constructor(command: string) {
    super(`Command not found: ${command}`, 1);
    this.name = 'CommandNotFoundError';
  }
}

/**
 * Error thrown when an argument is invalid
 */
export class InvalidArgumentError extends CLIError {
  constructor(message: string) {
    super(`Invalid argument: ${message}`, 1);
    this.name = 'InvalidArgumentError';
  }
}

/**
 * Error thrown when a required argument is missing
 */
export class MissingArgumentError extends CLIError {
  constructor(argument: string) {
    super(`Missing required argument: ${argument}`, 1);
    this.name = 'MissingArgumentError';
  }
}

/**
 * Error thrown when a command is invalid
 */
export class InvalidCommandError extends CLIError {
  constructor(message: string) {
    super(`Invalid command: ${message}`, 1);
    this.name = 'InvalidCommandError';
  }
}
