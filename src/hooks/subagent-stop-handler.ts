/**
 * Infinite Aura - Subagent-Stop Hook Handler
 *
 * Captures when sub-agents complete their tasks and writes to agents/ directory.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { FileNamingConvention } from '../memory/file-naming';
import { InvalidEventError } from '../exceptions';
import { BaseHookHandler, BaseHookHandlerOptions } from './hook-handler';
import { HookEvent, EventType } from './types';

/**
 * Options for SubagentStopHandler
 */
export interface SubagentStopHandlerOptions extends BaseHookHandlerOptions {
  /** Base directory for agent storage (relative path within memory) */
  baseDirectory?: string;
  /** Default agent ID if not specified in metadata */
  defaultAgentId?: string;
}

/**
 * Captures sub-agent stop events and writes to agents/{AGENT_NAME}/ directory
 *
 * This handler:
 * - Receives SUBAGENT_STOP events only
 * - Writes events to JSONL files in agents/{agentId}/
 * - Uses agentId from metadata to determine directory
 * - Creates agent directory if it doesn't exist
 */
export class SubagentStopHandler extends BaseHookHandler {
  readonly name = 'subagent-stop';
  readonly eventType = EventType.SUBAGENT_STOP;

  private readonly fileOperations: FileOperations;
  private readonly directoryOperations: DirectoryOperations;
  private readonly fileNaming: FileNamingConvention;
  private readonly baseDirectory: string;
  private readonly defaultAgentId: string;

  /** Cache of filenames per agent */
  private readonly agentFilenames: Map<string, string> = new Map();

  constructor(
    fileOperations: FileOperations,
    directoryOperations: DirectoryOperations,
    options: SubagentStopHandlerOptions = {}
  ) {
    super(options);
    this.fileOperations = fileOperations;
    this.directoryOperations = directoryOperations;
    this.fileNaming = new FileNamingConvention();
    this.baseDirectory = options.baseDirectory ?? 'agents';
    this.defaultAgentId = options.defaultAgentId ?? 'unknown-agent';
  }

  /**
   * Handle a sub-agent stop event by writing it to the agent's log
   */
  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);

    // Get agent ID from metadata
    const agentId = this.getAgentId(event);

    // Construct agent directory path
    const agentDirectory = `${this.baseDirectory}/${this.sanitizeAgentId(agentId)}`;

    // Ensure agent directory exists
    await this.directoryOperations.ensureDirectory(agentDirectory);

    // Get or create filename for this agent
    const filename = this.getOrCreateFilename(agentId);

    // Enrich event with subagent-specific metadata
    const enrichedEvent = this.enrichSubagentEvent(event, agentId);

    // Format event as JSONL
    const jsonLine = this.formatEventForStorage(enrichedEvent);

    // Append to file
    const filePath = `${agentDirectory}/${filename}`;
    await this.fileOperations.appendFile(filePath, jsonLine);
  }

  /**
   * Get agent ID from event metadata
   */
  private getAgentId(event: HookEvent): string {
    const agentId = event.metadata.agentId;
    if (!agentId || typeof agentId !== 'string') {
      if (this.options.validateEvents) {
        throw new InvalidEventError('SUBAGENT_STOP event requires agentId in metadata', {
          metadata: event.metadata,
        });
      }
      return this.defaultAgentId;
    }
    return agentId;
  }

  /**
   * Sanitize agent ID for use in filesystem paths
   */
  private sanitizeAgentId(agentId: string): string {
    return agentId
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Enrich subagent stop event with additional metadata
   */
  private enrichSubagentEvent(event: HookEvent, agentId: string): HookEvent {
    return {
      ...event,
      metadata: {
        ...event.metadata,
        agentId,
        stoppedAt: event.timestamp,
        handledBy: this.name,
      },
    };
  }

  /**
   * Get the current filename for an agent or create a new one
   */
  private getOrCreateFilename(agentId: string): string {
    const sanitizedId = this.sanitizeAgentId(agentId);
    let filename = this.agentFilenames.get(sanitizedId);

    if (!filename) {
      filename = this.fileNaming.generateFilename('SUBAGENT-STOP', sanitizedId, 'jsonl');
      this.agentFilenames.set(sanitizedId, filename);
    }

    return filename;
  }

  /**
   * Get the current log file path for an agent (relative)
   */
  getCurrentFilePath(agentId: string): string | null {
    const sanitizedId = this.sanitizeAgentId(agentId);
    const filename = this.agentFilenames.get(sanitizedId);
    if (!filename) {
      return null;
    }
    return `${this.baseDirectory}/${sanitizedId}/${filename}`;
  }

  /**
   * Reset the filename for a specific agent (starts a new log file)
   */
  resetFilename(agentId: string): void {
    const sanitizedId = this.sanitizeAgentId(agentId);
    this.agentFilenames.delete(sanitizedId);
  }

  /**
   * Reset all filenames
   */
  resetAllFilenames(): void {
    this.agentFilenames.clear();
  }

  /**
   * Get the base directory for this handler
   */
  getBaseDirectory(): string {
    return this.baseDirectory;
  }

  /**
   * Get all known agent IDs
   */
  getKnownAgentIds(): string[] {
    return Array.from(this.agentFilenames.keys());
  }
}
