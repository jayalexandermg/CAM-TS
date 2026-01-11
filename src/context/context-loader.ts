/**
 * Infinite Aura - Base Context Loader
 *
 * Abstract base class for loading context from UFC directories.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { HookEvent } from '../hooks/types';
import { ContextConfig, ContextRequest, DEFAULT_CONTEXT_CONFIG } from './types';

/**
 * Abstract base class for context loaders
 *
 * Provides common functionality for loading files, parsing JSONL,
 * and calculating token counts.
 */
export abstract class ContextLoader {
  protected readonly config: ContextConfig;

  constructor(
    protected readonly fileOps: FileOperations,
    protected readonly dirOps: DirectoryOperations,
    config: Partial<ContextConfig> = {}
  ) {
    this.config = {
      ...DEFAULT_CONTEXT_CONFIG,
      ...config,
    };
  }

  /**
   * Load context based on request
   * To be implemented by subclasses
   */
  abstract load(request: ContextRequest): Promise<unknown>;

  /**
   * List files in a directory
   */
  protected async loadFiles(directory: string): Promise<string[]> {
    try {
      const exists = await this.directoryExists(directory);
      if (!exists) {
        return [];
      }
      return await this.dirOps.listFiles(directory);
    } catch {
      return [];
    }
  }

  /**
   * Parse a JSONL file into events
   */
  protected async parseJSONL(filePath: string): Promise<HookEvent[]> {
    try {
      const exists = await this.fileOps.fileExists(filePath);
      if (!exists) {
        return [];
      }

      const content = await this.fileOps.readFile(filePath);
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      const events: HookEvent[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (this.isValidEvent(parsed)) {
            events.push(parsed);
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      return events;
    } catch {
      return [];
    }
  }

  /**
   * Parse a JSON file
   */
  protected async parseJSON<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
      const exists = await this.fileOps.fileExists(filePath);
      if (!exists) {
        return defaultValue;
      }

      const content = await this.fileOps.readFile(filePath);
      return JSON.parse(content) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Calculate approximate token count
   * Uses rough estimation: 1 token ≈ 4 characters
   */
  protected calculateTokens(text: string): number {
    if (!text || typeof text !== 'string') {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate tokens for an object (serialized to JSON)
   */
  protected calculateObjectTokens(obj: unknown): number {
    if (!obj) {
      return 0;
    }
    try {
      const json = JSON.stringify(obj);
      return this.calculateTokens(json);
    } catch {
      return 0;
    }
  }

  /**
   * Check if directory exists
   */
  protected async directoryExists(directory: string): Promise<boolean> {
    try {
      return await this.dirOps.directoryExists(directory);
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.fileOps.fileExists(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Validate if an object is a valid HookEvent
   */
  protected isValidEvent(obj: unknown): obj is HookEvent {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const event = obj as Record<string, unknown>;
    return (
      typeof event.timestamp === 'string' &&
      typeof event.type === 'string' &&
      typeof event.content === 'string' &&
      typeof event.metadata === 'object' &&
      event.metadata !== null
    );
  }

  /**
   * Limit events by token count
   */
  protected limitEventsByTokens(events: HookEvent[], maxTokens: number): HookEvent[] {
    const limited: HookEvent[] = [];
    let currentTokens = 0;

    // Sort by timestamp descending (most recent first)
    const sorted = [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const event of sorted) {
      const eventTokens = this.calculateObjectTokens(event);
      if (currentTokens + eventTokens <= maxTokens) {
        limited.push(event);
        currentTokens += eventTokens;
      } else {
        break;
      }
    }

    return limited;
  }

  /**
   * Get config
   */
  getConfig(): Readonly<ContextConfig> {
    return { ...this.config };
  }
}
