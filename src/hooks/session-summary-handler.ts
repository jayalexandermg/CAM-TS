/**
 * Infinite Aura - Session-Summary Hook Handler
 *
 * Captures session summaries (end-of-session reflections) and writes to history/sessions/.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { FileNamingConvention } from '../memory/file-naming';
import { BaseHookHandler, BaseHookHandlerOptions } from './hook-handler';
import { HookEvent, EventType } from './types';

/**
 * Options for SessionSummaryHandler
 */
export interface SessionSummaryHandlerOptions extends BaseHookHandlerOptions {
  /** Base directory for session storage (relative path within memory) */
  baseDirectory?: string;
}

/**
 * Captures session summary events and writes to history/sessions/ directory
 *
 * This handler:
 * - Receives SESSION_SUMMARY events only
 * - Writes events to JSONL files in history/sessions/
 * - Includes metadata about session duration, tasks completed, etc.
 * - Uses FileNamingConvention for consistent filenames
 */
export class SessionSummaryHandler extends BaseHookHandler {
  readonly name = 'session-summary';
  readonly eventType = EventType.SESSION_SUMMARY;

  private readonly fileOperations: FileOperations;
  private readonly directoryOperations: DirectoryOperations;
  private readonly fileNaming: FileNamingConvention;
  private readonly baseDirectory: string;

  private currentFilename: string | null = null;

  constructor(
    fileOperations: FileOperations,
    directoryOperations: DirectoryOperations,
    options: SessionSummaryHandlerOptions = {}
  ) {
    super(options);
    this.fileOperations = fileOperations;
    this.directoryOperations = directoryOperations;
    this.fileNaming = new FileNamingConvention();
    this.baseDirectory = options.baseDirectory ?? 'history/sessions';
  }

  /**
   * Handle a session summary event by writing it to the sessions log
   */
  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);

    // Ensure directory exists
    await this.directoryOperations.ensureDirectory(this.baseDirectory);

    // Get or create filename for this session
    const filename = this.getOrCreateFilename();

    // Enrich event with session-specific metadata
    const enrichedEvent = this.enrichSessionEvent(event);

    // Format event as JSONL
    const jsonLine = this.formatEventForStorage(enrichedEvent);

    // Append to file
    const filePath = `${this.baseDirectory}/${filename}`;
    await this.fileOperations.appendFile(filePath, jsonLine);
  }

  /**
   * Enrich session summary event with additional metadata
   */
  private enrichSessionEvent(event: HookEvent): HookEvent {
    return {
      ...event,
      metadata: {
        ...event.metadata,
        recordedAt: event.timestamp,
        handledBy: this.name,
        // Calculate session end time if not present
        sessionEndTime: event.metadata.sessionEndTime ?? event.timestamp,
      },
    };
  }

  /**
   * Get the current filename or create a new one
   */
  private getOrCreateFilename(): string {
    if (!this.currentFilename) {
      this.currentFilename = this.fileNaming.generateFilename(
        'SESSION-SUMMARY',
        'summaries',
        'jsonl'
      );
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

  /**
   * Create a session summary event helper
   */
  createSessionSummary(
    summary: string,
    sessionId: string,
    durationMs: number,
    tasksCompleted: string[] = [],
    additionalMetadata: Record<string, unknown> = {}
  ): HookEvent {
    return this.createEvent(EventType.SESSION_SUMMARY, summary, {
      sessionId,
      durationMs,
      tasksCompleted,
      taskCount: tasksCompleted.length,
      ...additionalMetadata,
    });
  }
}
