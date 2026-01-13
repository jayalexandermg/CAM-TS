/**
 * Infinite Aura - Tool Usage Logger
 *
 * Persistent logging of tool usage events.
 * Stores tool usage history in JSONL format for audit trails.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { FileNamingConvention } from '../memory/file-naming';
import { PreToolUseEvent, HookResult, HookAction } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Entry in the tool usage log
 */
export interface ToolUsageEntry {
  /** When the tool was used */
  timestamp: string;
  /** Name of the tool */
  toolName: string;
  /** Arguments passed to the tool */
  args: unknown[];
  /** Action taken (ALLOW, BLOCK, MODIFY) */
  action: HookAction;
  /** Reason for the action (if BLOCK or MODIFY) */
  reason?: string;
  /** Additional context */
  context?: {
    skillName?: string;
    sessionId?: string;
    userId?: string;
    workingDirectory?: string;
  };
  /** Additional metadata from the hook result */
  metadata?: Record<string, unknown>;
}

/**
 * Filters for retrieving usage history
 */
export interface LogFilters {
  /** Filter by tool name */
  toolName?: string;
  /** Filter by action */
  action?: HookAction;
  /** Filter by minimum timestamp */
  since?: Date;
  /** Filter by maximum timestamp */
  until?: Date;
  /** Filter by session ID */
  sessionId?: string;
  /** Maximum number of entries to return */
  limit?: number;
}

/**
 * Options for ToolUsageLogger
 */
export interface ToolUsageLoggerOptions {
  /** Base directory for logs (relative to memory root) */
  baseDirectory?: string;
  /** Maximum entries to keep in memory */
  maxMemoryEntries?: number;
}

// ============================================================================
// ToolUsageLogger Class
// ============================================================================

/**
 * Logs tool usage events to persistent storage
 *
 * Features:
 * - Writes to JSONL files for easy streaming/parsing
 * - Supports filtering and history retrieval
 * - Maintains in-memory cache for quick access
 * - Integrates with FileOperations for safe file handling
 */
export class ToolUsageLogger {
  private readonly fileOperations: FileOperations;
  private readonly directoryOperations: DirectoryOperations;
  private readonly fileNaming: FileNamingConvention;
  private readonly baseDirectory: string;
  private readonly maxMemoryEntries: number;

  /** In-memory cache of recent entries */
  private memoryCache: ToolUsageEntry[] = [];

  /** Current log filename */
  private currentFilename: string | null = null;

  /**
   * Create a new ToolUsageLogger
   * @param fileOperations - FileOperations instance for file handling
   * @param directoryOperations - DirectoryOperations instance for directory handling
   * @param options - Configuration options
   */
  constructor(
    fileOperations: FileOperations,
    directoryOperations: DirectoryOperations,
    options: ToolUsageLoggerOptions = {}
  ) {
    this.fileOperations = fileOperations;
    this.directoryOperations = directoryOperations;
    this.fileNaming = new FileNamingConvention();
    this.baseDirectory = options.baseDirectory ?? 'history/tool-usage';
    this.maxMemoryEntries = options.maxMemoryEntries ?? 1000;
  }

  /**
   * Log a tool usage event
   * @param event - The pre-tool-use event
   * @param result - The hook result
   */
  async log(event: PreToolUseEvent, result: HookResult): Promise<void> {
    const entry = this.createEntry(event, result);

    // Add to memory cache
    this.addToMemoryCache(entry);

    // Write to file
    await this.writeEntry(entry);
  }

  /**
   * Get usage history with optional filters
   * @param filters - Optional filters to apply
   * @returns Array of matching entries
   */
  async getHistory(filters?: LogFilters): Promise<ToolUsageEntry[]> {
    // Start with memory cache
    let entries = [...this.memoryCache];

    // Apply filters
    if (filters) {
      entries = this.applyFilters(entries, filters);
    }

    // Sort by timestamp descending (most recent first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (filters?.limit && entries.length > filters.limit) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  }

  /**
   * Get history from files (for entries not in memory)
   * @param filters - Optional filters to apply
   * @returns Array of matching entries from files
   */
  async getHistoryFromFiles(filters?: LogFilters): Promise<ToolUsageEntry[]> {
    const entries: ToolUsageEntry[] = [];

    try {
      // Check if directory exists
      const exists = await this.directoryOperations.directoryExists(this.baseDirectory);
      if (!exists) {
        return entries;
      }

      // List log files and filter for .jsonl
      const allFiles = await this.directoryOperations.listFiles(this.baseDirectory);
      const files = allFiles.filter((file) => file.endsWith('.jsonl'));

      // Read each file and parse entries
      for (const file of files) {
        const content = await this.fileOperations.readFile(`${this.baseDirectory}/${file}`);
        const lines = content.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as ToolUsageEntry;
            entries.push(entry);
          } catch {
            // Skip invalid lines
          }
        }
      }
    } catch {
      // Return empty if directory doesn't exist or other errors
    }

    // Apply filters
    let filtered = entries;
    if (filters) {
      filtered = this.applyFilters(entries, filters);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (filters?.limit && filtered.length > filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Clear all logs (memory and files)
   */
  async clearLogs(): Promise<void> {
    // Clear memory cache
    this.memoryCache = [];

    // Clear current filename
    this.currentFilename = null;

    // Delete log files
    try {
      const exists = await this.directoryOperations.directoryExists(this.baseDirectory);
      if (exists) {
        const allFiles = await this.directoryOperations.listFiles(this.baseDirectory);
        const files = allFiles.filter((file) => file.endsWith('.jsonl'));
        for (const file of files) {
          await this.fileOperations.deleteFile(`${this.baseDirectory}/${file}`);
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  }

  /**
   * Clear only memory cache
   */
  clearMemoryCache(): void {
    this.memoryCache = [];
  }

  /**
   * Get count of entries in memory cache
   * @returns Number of entries
   */
  getMemoryCacheSize(): number {
    return this.memoryCache.length;
  }

  /**
   * Get the current log file path
   * @returns Current log file path or null
   */
  getCurrentFilePath(): string | null {
    if (!this.currentFilename) {
      return null;
    }
    return `${this.baseDirectory}/${this.currentFilename}`;
  }

  /**
   * Get the base directory for logs
   * @returns Base directory path
   */
  getBaseDirectory(): string {
    return this.baseDirectory;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Create a log entry from event and result
   */
  private createEntry(event: PreToolUseEvent, result: HookResult): ToolUsageEntry {
    return {
      timestamp: event.timestamp,
      toolName: event.metadata.toolName,
      args: event.metadata.args,
      action: result.action ?? HookAction.ALLOW,
      reason: result.reason,
      context: event.metadata.context,
      metadata: result.metadata,
    };
  }

  /**
   * Add entry to memory cache
   */
  private addToMemoryCache(entry: ToolUsageEntry): void {
    this.memoryCache.push(entry);

    // Trim if over limit
    if (this.memoryCache.length > this.maxMemoryEntries) {
      this.memoryCache = this.memoryCache.slice(-this.maxMemoryEntries);
    }
  }

  /**
   * Write entry to file
   */
  private async writeEntry(entry: ToolUsageEntry): Promise<void> {
    // Ensure directory exists
    await this.directoryOperations.ensureDirectory(this.baseDirectory);

    // Get or create filename
    const filename = this.getOrCreateFilename();

    // Format as JSONL
    const jsonLine = JSON.stringify(entry);

    // Append to file
    const filePath = `${this.baseDirectory}/${filename}`;
    await this.fileOperations.appendFile(filePath, jsonLine);
  }

  /**
   * Get or create filename for current session
   */
  private getOrCreateFilename(): string {
    if (!this.currentFilename) {
      this.currentFilename = this.fileNaming.generateFilename('TOOL-USAGE', 'log', 'jsonl');
    }
    return this.currentFilename;
  }

  /**
   * Apply filters to entries
   */
  private applyFilters(entries: ToolUsageEntry[], filters: LogFilters): ToolUsageEntry[] {
    return entries.filter((entry) => {
      // Filter by tool name
      if (filters.toolName && entry.toolName !== filters.toolName) {
        return false;
      }

      // Filter by action
      if (filters.action && entry.action !== filters.action) {
        return false;
      }

      // Filter by session ID
      if (filters.sessionId && entry.context?.sessionId !== filters.sessionId) {
        return false;
      }

      // Filter by timestamp range
      const entryTime = new Date(entry.timestamp).getTime();

      if (filters.since && entryTime < filters.since.getTime()) {
        return false;
      }

      if (filters.until && entryTime > filters.until.getTime()) {
        return false;
      }

      return true;
    });
  }
}
