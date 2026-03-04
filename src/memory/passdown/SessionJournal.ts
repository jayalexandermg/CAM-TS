/**
 * Session Journal
 *
 * Append-only JSONL journal for capturing structured session events
 * in real-time. Wiped at each session start — the EOS passdown is
 * the durable artifact, the journal is disposable scaffolding.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { JournalEntry, JournalEntryType } from './types';

/** Section labels for formatted summary output */
const SECTION_LABELS: Record<string, string> = {
  decision: 'Decisions',
  action: 'Actions',
  iteration: 'Iterations / Pivots',
  blocker: 'Blockers',
  discovery: 'Discoveries',
  turn: 'Conversation Topics',
  note: 'Notes',
};

/** Order sections appear in formatted summary */
const SECTION_ORDER = [
  'decision',
  'action',
  'iteration',
  'blocker',
  'discovery',
  'turn',
  'note',
];

export class SessionJournal {
  private readonly filePath: string;
  private sessionId: string | null = null;

  constructor(memoryBasePath: string) {
    this.filePath = path.join(memoryBasePath, 'session-journal.jsonl');
  }

  /** Wipe previous journal and start fresh for a new session */
  async start(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, '');
    await this.log('session_start', `Session ${sessionId} started`);
  }

  /** Append a structured entry to the journal */
  async log(
    type: JournalEntryType,
    what: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    const entry: JournalEntry = {
      t: type,
      ts: new Date().toISOString(),
      what,
      ...(meta ? { meta } : {}),
    };
    await fs.appendFile(this.filePath, JSON.stringify(entry) + '\n');
  }

  /** Read all journal entries */
  async getEntries(): Promise<JournalEntry[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  }

  /** Render entries as grouped markdown summary */
  async getFormattedSummary(): Promise<string> {
    const entries = await this.getEntries();
    if (entries.length === 0) return '(No journal entries)';

    const groups: Record<string, string[]> = {};
    for (const entry of entries) {
      if (entry.t === 'session_start' || entry.t === 'session_end') continue;
      if (!groups[entry.t]) groups[entry.t] = [];
      groups[entry.t].push(`- ${entry.what}`);
    }

    let summary = '';
    for (const key of SECTION_ORDER) {
      if (groups[key]?.length) {
        summary += `## ${SECTION_LABELS[key]}\n${groups[key].join('\n')}\n\n`;
      }
    }
    return summary.trim() || '(No substantive entries)';
  }

  /** Get the current session ID */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /** Get the journal file path */
  getFilePath(): string {
    return this.filePath;
  }

  /** Delete the journal file */
  async wipe(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch {
      // File may not exist
    }
    this.sessionId = null;
  }
}
