/**
 * Infinite Aura - Session Context Loader
 *
 * Layer 3: Loads session context from history/sessions/ directory.
 * Loaded if sessionId is present in the request.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { HookEvent } from '../hooks/types';
import { ContextLoader } from './context-loader';
import { ContextConfig, ContextRequest, SessionContext } from './types';

/**
 * Loads session context from the history/sessions/ directory
 *
 * Session context includes:
 * - Recent events
 * - Session summary
 */
export class SessionContextLoader extends ContextLoader {
  private readonly sessionsBaseDir: string;

  constructor(
    fileOps: FileOperations,
    dirOps: DirectoryOperations,
    config: Partial<ContextConfig> = {},
    sessionsBaseDir: string = 'history/sessions'
  ) {
    super(fileOps, dirOps, config);
    this.sessionsBaseDir = sessionsBaseDir;
  }

  /**
   * Load session context
   */
  async load(request: ContextRequest): Promise<SessionContext | undefined> {
    // Need sessionId to load session context
    if (!request.sessionId) {
      return undefined;
    }

    // Check if sessions directory exists
    const exists = await this.directoryExists(this.sessionsBaseDir);
    if (!exists) {
      return undefined;
    }

    const recentEvents = await this.loadRecentEvents(
      request.sessionId,
      request.maxTokens || this.config.maxTokensPerLayer
    );
    const summary = await this.loadSummary(request.sessionId);

    // If no events and no summary, return undefined
    if (recentEvents.length === 0 && !summary) {
      return undefined;
    }

    // Determine session start time
    const startedAt = this.determineStartTime(recentEvents, request.sessionId);

    return {
      sessionId: request.sessionId,
      startedAt,
      recentEvents,
      summary,
      metadata: {},
    };
  }

  /**
   * Load recent session events from JSONL files
   */
  private async loadRecentEvents(sessionId: string, maxTokens: number): Promise<HookEvent[]> {
    const files = await this.loadFiles(this.sessionsBaseDir);

    // Filter for JSONL files
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

    // Load events and filter by sessionId
    let sessionEvents: HookEvent[] = [];
    for (const file of jsonlFiles) {
      const filePath = `${this.sessionsBaseDir}/${file}`;
      const events = await this.parseJSONL(filePath);

      // Filter events for this session
      const filtered = events.filter(
        (e) => e.metadata.sessionId === sessionId || this.isSessionFile(file, sessionId)
      );
      sessionEvents = sessionEvents.concat(filtered);
    }

    // Limit by tokens
    return this.limitEventsByTokens(sessionEvents, maxTokens);
  }

  /**
   * Check if a file belongs to a specific session
   */
  private isSessionFile(filename: string, sessionId: string): boolean {
    return filename.toLowerCase().includes(sessionId.toLowerCase());
  }

  /**
   * Load session summary
   */
  private async loadSummary(sessionId: string): Promise<string> {
    // Try loading from a summary file
    const summaryFile = `${this.sessionsBaseDir}/${sessionId}-summary.json`;
    const data = await this.parseJSON<{ summary?: string }>(summaryFile, {});
    if (data.summary) {
      return data.summary;
    }

    // Try loading from a JSONL file with session_summary type
    const files = await this.loadFiles(this.sessionsBaseDir);
    for (const file of files.filter((f) => f.endsWith('.jsonl'))) {
      const filePath = `${this.sessionsBaseDir}/${file}`;
      const events = await this.parseJSONL(filePath);

      // Look for session_summary events
      const summaryEvent = events.find(
        (e) =>
          e.type === 'session_summary' &&
          (e.metadata.sessionId === sessionId || this.isSessionFile(file, sessionId))
      );

      if (summaryEvent) {
        return summaryEvent.content;
      }
    }

    return '';
  }

  /**
   * Determine session start time from events
   */
  private determineStartTime(events: HookEvent[], _sessionId: string): string {
    if (events.length === 0) {
      return new Date().toISOString();
    }

    // Sort by timestamp ascending
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sorted[0].timestamp;
  }

  /**
   * Get sessions base directory
   */
  getSessionsBaseDir(): string {
    return this.sessionsBaseDir;
  }
}
