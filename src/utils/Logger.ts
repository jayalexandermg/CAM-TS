/**
 * Logger
 *
 * Structured logging system with multiple log levels and file output support.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LogLevel } from '../config/types';

/**
 * Log entry structure for structured logging
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Optional context data */
  context?: Record<string, unknown>;
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  /** File path for log output */
  file?: string;
  /** Whether to output to console */
  console?: boolean;
  /** Custom name for the logger */
  name?: string;
}

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger class for structured logging
 */
export class Logger {
  private level: LogLevel;
  private filePath?: string;
  private fileEnabled: boolean = false;
  private consoleEnabled: boolean;
  private name: string;

  /**
   * Create a new Logger instance
   * @param options Logger configuration options
   */
  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.consoleEnabled = options.console !== false;
    this.name = options.name || 'cam';

    if (options.file) {
      this.setFile(options.file);
    }
  }

  /**
   * Set the log file path
   * @param filePath Path to the log file
   */
  setFile(filePath: string): void {
    this.filePath = filePath;

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.fileEnabled = true;
  }

  /**
   * Set the minimum log level
   * @param level New log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Log a debug message
   * @param message Log message
   * @param context Optional context data
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message
   * @param message Log message
   * @param context Optional context data
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   * @param message Log message
   * @param context Optional context data
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message
   * @param message Log message
   * @param context Optional context data
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  /**
   * Core logging method
   * @param level Log level
   * @param message Log message
   * @param context Optional context data
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Check if this level should be logged
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };

    // Output to console
    if (this.consoleEnabled) {
      this.writeToConsole(entry);
    }

    // Output to file
    if (this.fileEnabled && this.filePath) {
      this.writeToFile(entry);
    }
  }

  /**
   * Check if a log level should be output based on current level
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  /**
   * Write a log entry to the console
   */
  private writeToConsole(entry: LogEntry): void {
    const formatted = this.formatConsoleEntry(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * Format a log entry for console output
   */
  private formatConsoleEntry(entry: LogEntry): string {
    const levelUpper = entry.level.toUpperCase().padEnd(5);
    const base = `[${entry.timestamp}] [${this.name}] ${levelUpper} ${entry.message}`;

    if (entry.context) {
      return `${base} ${JSON.stringify(entry.context)}`;
    }

    return base;
  }

  /**
   * Write a log entry to the file as JSON
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.filePath) return;

    const logObject = {
      ...entry,
      logger: this.name,
    };

    fs.appendFileSync(this.filePath, JSON.stringify(logObject) + '\n');
  }

  /**
   * Close the logger and any open file streams
   */
  close(): void {
    this.fileEnabled = false;
  }

  /**
   * Create a child logger with a different name
   * @param name Name for the child logger
   */
  child(name: string): Logger {
    return new Logger({
      level: this.level,
      file: this.filePath,
      console: this.consoleEnabled,
      name: `${this.name}:${name}`,
    });
  }

  /**
   * Get the log file path
   */
  getFilePath(): string | undefined {
    return this.filePath;
  }

  /**
   * Check if file logging is enabled
   */
  isFileEnabled(): boolean {
    return this.fileEnabled;
  }

  /**
   * Check if console logging is enabled
   */
  isConsoleEnabled(): boolean {
    return this.consoleEnabled;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
