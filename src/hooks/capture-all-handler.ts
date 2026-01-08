/**
 * Infinite Aura - Capture-All Hook Handler
 *
 * Captures ALL events and writes them to history/execution/ directory.
 * This handler receives every event regardless of type.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { FileNamingConvention } from '../memory/file-naming';
import { BaseHookHandler, BaseHookHandlerOptions } from './hook-handler';
import { HookEvent, EventType } from './types';

/**
 * Options for CaptureAllHandler
 */
export interface CaptureAllHandlerOptions extends BaseHookHandlerOptions {
  /** Base directory for event storage (relative path within memory) */
  baseDirectory?: string;
}

/**
 * Captures all events and writes to history/execution/ directory
 *
 * This handler:
 * - Receives ALL events (CAPTURE_ALL type)
 * - Writes events to JSONL files in history/execution/
 * - Uses FileNamingConvention for consistent filenames
 * - Appends to existing files within the same session
 */
export class CaptureAllHandler extends BaseHookHandler {
  readonly name = 'capture-all';
  readonly eventType = EventType.CAPTURE_ALL;

  private readonly fileOperations: FileOperations;
  private readonly directoryOperations: DirectoryOperations;
  private readonly fileNaming: FileNamingConvention;
  private readonly baseDirectory: string;

  private currentFilename: string | null = null;

  constructor(
    fileOperations: FileOperations,
    directoryOperations: DirectoryOperations,
    options: CaptureAllHandlerOptions = {}
  ) {
    super(options);
    this.fileOperations = fileOperations;
    this.directoryOperations = directoryOperations;
    this.fileNaming = new FileNamingConvention();
    this.baseDirectory = options.baseDirectory ?? 'history/execution';
  }

  /**
   * Handle an event by writing it to the execution log
   */
  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);

    // Ensure directory exists
    await this.directoryOperations.ensureDirectory(this.baseDirectory);

    // Get or create filename for this session
    const filename = this.getOrCreateFilename();

    // Format event as JSONL
    const jsonLine = this.formatEventForStorage(event);

    // Append to file
    const filePath = `${this.baseDirectory}/${filename}`;
    await this.fileOperations.appendFile(filePath, jsonLine);
  }

  /**
   * Get the current filename or create a new one
   */
  private getOrCreateFilename(): string {
    if (!this.currentFilename) {
      this.currentFilename = this.fileNaming.generateFilename('CAPTURE-ALL', 'events', 'jsonl');
    }
    return this.currentFilename;
  }

  /**
   * Get the current log file path (relative)
   */
  getCurrentFilePath(): string | null {
    if (!this.currentFilename) {
      return null;
    }
    return `${this.baseDirectory}/${this.currentFilename}`;
  }

  /**
   * Reset the current filename (starts a new log file)
   */
  resetFilename(): void {
    this.currentFilename = null;
  }

  /**
   * Get the base directory for this handler
   */
  getBaseDirectory(): string {
    return this.baseDirectory;
  }
}
