/**
 * HistoryCommand
 *
 * Shows session history, transcripts, learnings, and decisions from UOCS.
 * Provides comprehensive session history management.
 */

import { BaseCommandHandler, Command, CommandResult } from '../types';
import { UOCS } from '../../history/UOCS';
import { HistoryStorage } from '../../history/HistoryStorage';
import { SessionTranscript, Learning, Decision, TranscriptTurn } from '../../history/types';

/**
 * History command handler - displays session history, learnings, and decisions
 */
export class HistoryCommand extends BaseCommandHandler {
  private readonly uocs: UOCS;
  private readonly storage: HistoryStorage;

  /**
   * Create a new HistoryCommand instance
   * @param uocs - UOCS instance for session data
   * @param storage - Optional HistoryStorage for persisted data
   */
  constructor(uocs: UOCS, storage?: HistoryStorage) {
    super();
    this.uocs = uocs;
    this.storage = storage || new HistoryStorage();
  }

  async execute(command: Command): Promise<CommandResult> {
    const subcommand = command.subcommand || 'transcript';
    const sessionId = command.options.get('session') || command.positional[0];

    switch (subcommand) {
      case 'transcript':
        return this.showTranscript(sessionId);
      case 'learnings':
        return this.showLearnings(command.positional[0]);
      case 'decisions':
        return this.showDecisions(sessionId);
      case 'sessions':
        return this.showSessions();
      case 'search':
        return this.searchHistory(command.positional.join(' '));
      default:
        return this.failure(`Unknown history subcommand: ${subcommand}`);
    }
  }

  getHelp(): string {
    return `
history [subcommand] [options]

View session history, learnings, and decisions.

Subcommands:
  transcript [sessionId]    Show session transcript (default)
  learnings [topic]         Show learnings, optionally filtered by topic
  decisions [sessionId]     Show decisions made in a session
  sessions                  List all recorded sessions
  search <query>            Search across history

Options:
  --session=<id>            Specify session ID

Examples:
  history
  history transcript abc123
  history learnings typescript
  history decisions --session=abc123
  history sessions
  history search authentication
    `.trim();
  }

  getDescription(): string {
    return 'View session history, transcripts, learnings, and decisions';
  }

  /**
   * Show session transcript
   */
  private async showTranscript(sessionId?: string): Promise<CommandResult> {
    // If no session ID, show active sessions
    if (!sessionId) {
      const activeIds = this.uocs.getActiveSessionIds();
      if (activeIds.length === 0) {
        return this.success('No active sessions. Use "history sessions" to see past sessions.');
      }

      // Show first active session
      sessionId = activeIds[0];
    }

    const transcript = await this.uocs.getSessionTranscript(sessionId);
    if (!transcript) {
      // Try loading from storage
      const stored = await this.storage.getSessionTranscript(sessionId);
      if (!stored) {
        return this.failure(`Session not found: ${sessionId}`);
      }
      return this.success(this.formatTranscript(stored));
    }

    return this.success(this.formatTranscript(transcript));
  }

  /**
   * Show learnings, optionally filtered by topic
   */
  private async showLearnings(topic?: string): Promise<CommandResult> {
    if (topic) {
      const learnings = await this.uocs.searchLearnings(topic);
      if (learnings.length === 0) {
        return this.success(`No learnings found for topic: ${topic}`);
      }
      return this.success(this.formatLearnings(learnings));
    }

    // Show all learnings from storage
    const allIds = await this.storage.listEntries('learning');
    if (allIds.length === 0) {
      return this.success('No learnings recorded yet.');
    }

    const learnings: Learning[] = [];
    for (const id of allIds.slice(0, 20)) {
      const entry = await this.storage.getEntry(id, 'learning');
      if (entry) {
        learnings.push(entry as unknown as Learning);
      }
    }

    const output = this.formatLearnings(learnings);
    if (allIds.length > 20) {
      return this.success(`${output}\n\n... and ${allIds.length - 20} more learnings`);
    }

    return this.success(output);
  }

  /**
   * Show decisions for a session
   */
  private async showDecisions(sessionId?: string): Promise<CommandResult> {
    const allIds = await this.storage.listEntries('decision');
    if (allIds.length === 0) {
      return this.success('No decisions recorded yet.');
    }

    const decisions: Decision[] = [];
    for (const id of allIds) {
      const entry = await this.storage.getEntry(id, 'decision');
      if (entry) {
        const decision = entry as unknown as Decision;
        // Filter by session if specified
        if (!sessionId || decision.sessionId === sessionId) {
          decisions.push(decision);
        }
      }
    }

    if (decisions.length === 0) {
      if (sessionId) {
        return this.success(`No decisions found for session: ${sessionId}`);
      }
      return this.success('No decisions recorded yet.');
    }

    return this.success(this.formatDecisions(decisions));
  }

  /**
   * Show all recorded sessions
   */
  private async showSessions(): Promise<CommandResult> {
    const activeIds = this.uocs.getActiveSessionIds();
    const storedIds = await this.storage.listEntries('session');

    const lines: string[] = ['\n=== Session History ==='];

    if (activeIds.length > 0) {
      lines.push('');
      lines.push('Active Sessions:');
      for (const id of activeIds) {
        const transcript = await this.uocs.getSessionTranscript(id);
        const turnCount = transcript?.turns.length || 0;
        lines.push(`  * ${id} (${turnCount} turns)`);
      }
    }

    if (storedIds.length > 0) {
      lines.push('');
      lines.push('Stored Sessions:');
      for (const id of storedIds.slice(0, 10)) {
        const transcript = await this.storage.getSessionTranscript(id);
        if (transcript) {
          const startTime = new Date(transcript.startTime).toLocaleString();
          const turnCount = transcript.turns.length;
          lines.push(`  - ${id}`);
          lines.push(`    Started: ${startTime}`);
          lines.push(`    Turns: ${turnCount}`);
          if (transcript.summary) {
            lines.push(`    Summary: ${transcript.summary.substring(0, 50)}...`);
          }
        }
      }

      if (storedIds.length > 10) {
        lines.push(`  ... and ${storedIds.length - 10} more sessions`);
      }
    }

    if (activeIds.length === 0 && storedIds.length === 0) {
      lines.push('');
      lines.push('No sessions recorded yet.');
    }

    lines.push('');
    return this.success(lines.join('\n'));
  }

  /**
   * Search across history
   */
  private async searchHistory(query: string): Promise<CommandResult> {
    if (!query) {
      return this.failure('Please provide a search query');
    }

    const lines: string[] = [
      `\n=== Search Results for "${query}" ===`,
    ];

    let learningsCount = 0;

    // Search learnings (with error handling for storage compatibility)
    try {
      const learnings = await this.uocs.searchLearnings(query);
      if (learnings.length > 0) {
        learningsCount = learnings.length;
        lines.push('');
        lines.push(`Learnings (${learnings.length}):`);
        for (const learning of learnings.slice(0, 5)) {
          const insight = learning.insight || '';
          lines.push(`  - [${learning.topic}] ${insight.substring(0, 60)}...`);
        }
      }
    } catch {
      // Learnings search may fail due to storage format differences
    }

    // Search sessions (basic string matching in memory)
    const activeIds = this.uocs.getActiveSessionIds();
    const matchingSessions: string[] = [];
    for (const id of activeIds) {
      const transcript = await this.uocs.getSessionTranscript(id);
      if (transcript) {
        const hasMatch = transcript.turns.some(
          (turn) => turn.content.toLowerCase().includes(query.toLowerCase())
        );
        if (hasMatch) {
          matchingSessions.push(id);
        }
      }
    }

    if (matchingSessions.length > 0) {
      lines.push('');
      lines.push(`Sessions with matches (${matchingSessions.length}):`);
      for (const id of matchingSessions.slice(0, 5)) {
        lines.push(`  - ${id}`);
      }
    }

    if (learningsCount === 0 && matchingSessions.length === 0) {
      lines.push('');
      lines.push('No results found.');
    }

    lines.push('');
    return this.success(lines.join('\n'));
  }

  /**
   * Format a session transcript for display
   */
  private formatTranscript(transcript: SessionTranscript): string {
    const lines: string[] = [
      `\n=== Session Transcript ===`,
      `Session ID: ${transcript.sessionId}`,
      `Started: ${new Date(transcript.startTime).toLocaleString()}`,
    ];

    if (transcript.endTime) {
      lines.push(`Ended: ${new Date(transcript.endTime).toLocaleString()}`);
    }

    if (transcript.summary) {
      lines.push(`Summary: ${transcript.summary}`);
    }

    lines.push('');
    lines.push(`--- Transcript (${transcript.turns.length} turns) ---`);

    for (let i = 0; i < transcript.turns.length; i++) {
      const turn = transcript.turns[i];
      lines.push('');
      lines.push(this.formatTurn(turn, i + 1));
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Format a single turn
   */
  private formatTurn(turn: TranscriptTurn, index: number): string {
    const rolePrefix = turn.role === 'user' ? '>' : turn.role === 'assistant' ? '<' : '*';
    const timestamp = new Date(turn.timestamp).toLocaleTimeString();
    const agentInfo = turn.agentId ? ` [${turn.agentId}]` : '';
    const toolsInfo = turn.toolsUsed?.length ? ` (tools: ${turn.toolsUsed.join(', ')})` : '';

    const lines: string[] = [
      `[${index}] ${rolePrefix} ${turn.role}${agentInfo} @ ${timestamp}${toolsInfo}`,
    ];

    // Truncate long content
    const content = turn.content.length > 200
      ? turn.content.substring(0, 200) + '...'
      : turn.content;

    lines.push(`   ${content}`);

    return lines.join('\n');
  }

  /**
   * Format learnings for display
   */
  private formatLearnings(learnings: Learning[]): string {
    const lines: string[] = [
      `\n=== Learnings (${learnings.length}) ===`,
    ];

    for (const learning of learnings) {
      lines.push('');
      lines.push(`Topic: ${learning.topic}`);
      lines.push(`Insight: ${learning.insight}`);
      lines.push(`Confidence: ${Math.round(learning.confidence * 100)}%`);
      lines.push(`Session: ${learning.sessionId}`);
      if (learning.source) {
        lines.push(`Source: ${learning.source}`);
      }
      lines.push(`Time: ${new Date(learning.timestamp).toLocaleString()}`);
      lines.push('---');
    }

    return lines.join('\n');
  }

  /**
   * Format decisions for display
   */
  private formatDecisions(decisions: Decision[]): string {
    const lines: string[] = [
      `\n=== Decisions (${decisions.length}) ===`,
    ];

    for (const decision of decisions) {
      lines.push('');
      lines.push(`Question: ${decision.question}`);
      lines.push(`Decision: ${decision.decision}`);
      lines.push(`Reasoning: ${decision.reasoning}`);
      if (decision.alternatives && decision.alternatives.length > 0) {
        lines.push(`Alternatives: ${decision.alternatives.join(', ')}`);
      }
      lines.push(`Session: ${decision.sessionId}`);
      lines.push(`Time: ${new Date(decision.timestamp).toLocaleString()}`);
      lines.push('---');
    }

    return lines.join('\n');
  }
}
