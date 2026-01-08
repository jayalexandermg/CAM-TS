/**
 * Infinite Aura - Stop Hook Handler
 *
 * Captures stop events (when CAM or an agent stops) and writes to history/execution/.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { FileNamingConvention } from '../memory/file-naming';
import { BaseHookHandler, BaseHookHandlerOptions } from './hook-handler';
import { HookEvent, EventType } from './types';

/**
 * Options for StopHandler
 */
export interface StopHandlerOptions extends BaseHookHandlerOptions {
  /** Base directory for event storage (relative path within memory) */
  baseDirectory?: string;
}

/**
 * Captures stop events and writes to history/execution/ directory
 *
 * This handler:
 * - Receives STOP events only
 * - Writes events to JSONL files in history/execution/
 * - Includes metadata about why the stop occurred
 * - Uses FileNamingConvention for consistent filenames
 */
export class StopHandler extends BaseHookHandler {
  readonly name = 'stop';
  readonly eventType = EventType.STOP;

  private readonly fileOperations: FileOperations;
  private readonly directoryOperations: DirectoryOperations;
  private readonly fileNaming: FileNamingConvention;
  private readonly baseDirectory: string;

  private currentFilename: string | null = null;

  constructor(
    fileOperations: FileOperations,
    directoryOperations: DirectoryOperations,
    options: StopHandlerOptions = {}
  ) {
    super(options);
    this.fileOperations = fileOperations;
    this.directoryOperations = directoryOperations;
    this.fileNaming = new FileNamingConvention();
    this.baseDirectory = options.baseDirectory ?? 'history/execution';
  }

  /**
   * Handle a stop event by writing it to the execution log
   */
  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);

    // Ensure directory exists
    await this.directoryOperations.ensureDirectory(this.baseDirectory);

    // Get or create filename for this session
    const filename = this.getOrCreateFilename();

    // Enrich event with stop-specific metadata if not present
    const enrichedEvent = this.enrichStopEvent(event);

    // Format event as JSONL
    const jsonLine = this.formatEventForStorage(enrichedEvent);

    // Append to file
    const filePath = `${this.baseDirectory}/${filename}`;
    await this.fileOperations.appendFile(filePath, jsonLine);
  }

  /**
   * Enrich stop event with additional metadata
   */
  private enrichStopEvent(event: HookEvent): HookEvent {
    return {
      ...event,
      metadata: {
        ...event.metadata,
        stoppedAt: event.timestamp,
        handledBy: this.name,
      },
    };
  }

  /**
   * Get the current filename or create a new one
   */
  private getOrCreateFilename(): string {
    if (!this.currentFilename) {
      this.currentFilename = this.fileNaming.generateFilename('STOP', 'events', 'jsonl');
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
