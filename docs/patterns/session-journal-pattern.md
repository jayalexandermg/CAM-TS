# Session Journal Pattern

A reusable pattern for capturing structured session events in real-time,
enabling high-quality session summaries without information loss.

## The Problem

Reconstructing what happened from raw conversation history is lossy:
- **Truncate to last N turns** → misses early decisions
- **Send all turns** → exceeds context window, buries signal in noise
- **Post-hoc summarization** → LLM guesses at importance without structure

## The Solution

Append structured events as they happen. At session end, the journal
(5-20KB, pre-structured) replaces raw conversation as the summary source.

## Architecture

```
Session Start ──→ Journal.start()     (wipe previous, log session_start)
     │
During Session ──→ Journal.log()      (append JSONL entries in real-time)
     │
Session End ────→ Journal.getSummary() → LLM → Passdown
                  Journal.wipe()       (journal is disposable scaffolding)
                  Passdown saved       (passdown is the durable artifact)
```

## Entry Types

| Type | When to emit | Example |
|------|-------------|---------|
| `session_start` | Session opens | `Session abc-123 started` |
| `turn` | Each user interaction | `Discussed routing architecture` |
| `decision` | A choice is made | `Use JSONL for passdowns — simpler than SQLite` |
| `action` | Something concrete is done | `Created EOSPassdownManager.ts` |
| `iteration` | A pivot or change in approach | `Switched from readline reopen to in-band checkin` |
| `blocker` | Something is blocking progress | `API key not configured` |
| `discovery` | New information surfaces | `UOCS already captures decisions` |
| `note` | Freeform user note | `Remember to revisit caching strategy` |
| `mode_switch` | Context/mode change | `Switched to execution mode` |
| `session_end` | Session closing | `Session ending via EOS checkin` |

## JSONL Format

One entry per line, append-only:

```jsonl
{"t":"session_start","ts":"2026-03-03T17:18:33Z","what":"Session abc-123 started"}
{"t":"turn","ts":"2026-03-03T17:19:01Z","what":"Discussed EOS passdown architecture"}
{"t":"decision","ts":"2026-03-03T17:25:00Z","what":"Use session journal instead of truncated history","meta":{"status":"active","scope":"project"}}
{"t":"action","ts":"2026-03-03T17:30:00Z","what":"Created SessionJournal.ts","meta":{"files":["src/memory/passdown/SessionJournal.ts"]}}
{"t":"iteration","ts":"2026-03-03T17:35:00Z","what":"Switched from post-hoc to real-time capture","meta":{"reason":"information loss in truncation"}}
{"t":"session_end","ts":"2026-03-03T18:00:00Z","what":"Session ending via EOS checkin"}
```

## Implementation Template

### 1. Types

```typescript
export type JournalEntryType =
  | 'session_start' | 'session_end'
  | 'turn' | 'decision' | 'action'
  | 'iteration' | 'blocker' | 'discovery'
  | 'note' | 'mode_switch';

export interface JournalEntry {
  t: JournalEntryType;
  ts: string;
  what: string;
  meta?: Record<string, unknown>;
}
```

### 2. Core Class

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

export class SessionJournal {
  private filePath: string;

  constructor(basePath: string) {
    this.filePath = path.join(basePath, 'session-journal.jsonl');
  }

  /** Wipe previous journal, start fresh */
  async start(sessionId: string): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, '');
    await this.log('session_start', `Session ${sessionId} started`);
  }

  /** Append a structured entry */
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

  /** Read all entries */
  async getEntries(): Promise<JournalEntry[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  /** Render entries as grouped markdown */
  async getFormattedSummary(): Promise<string> {
    const entries = await this.getEntries();
    if (entries.length === 0) return '(No journal entries)';

    const groups: Record<string, string[]> = {};
    for (const entry of entries) {
      const key = entry.t;
      if (!groups[key]) groups[key] = [];
      groups[key].push(`- ${entry.what}`);
    }

    const sectionOrder = [
      'decision', 'action', 'iteration',
      'blocker', 'discovery', 'turn', 'note',
    ];

    const sectionLabels: Record<string, string> = {
      decision: 'Decisions',
      action: 'Actions',
      iteration: 'Iterations / Pivots',
      blocker: 'Blockers',
      discovery: 'Discoveries',
      turn: 'Conversation Topics',
      note: 'Notes',
    };

    let summary = '';
    for (const key of sectionOrder) {
      if (groups[key]?.length) {
        summary += `## ${sectionLabels[key]}\n${groups[key].join('\n')}\n\n`;
      }
    }
    return summary.trim();
  }

  /** Delete the journal file */
  async wipe(): Promise<void> {
    try { await fs.unlink(this.filePath); } catch { /* may not exist */ }
  }
}
```

### 3. Integration Points

Emit journal entries from wherever events happen:

```typescript
// On each conversation turn
await journal.log('turn', input.substring(0, 150));

// On mode switch
await journal.log('mode_switch', `Switched to ${newMode} mode`);

// On explicit decision (user or LLM)
await journal.log('decision', 'Use PostgreSQL over SQLite', {
  status: 'active',
  scope: 'project',
});

// On file creation/modification
await journal.log('action', `Created ${filename}`, {
  files: [filename],
});
```

### 4. EOS Summary Generation

At session end, feed the journal summary to an LLM:

```typescript
const summary = await journal.getFormattedSummary();

const passdown = await llm.chat(
  'Generate a structured EOS passdown from this session journal.',
  summary
);

await savePassdown(passdown);
await journal.wipe();  // disposable scaffolding
```

## Why This Works

| Property | Benefit |
|----------|---------|
| **Append-only** | No read-modify-write races, simple I/O |
| **JSONL** | One entry per line, streamable, greppable |
| **Structured types** | Signal pre-separated from noise |
| **Small footprint** | 50 entries ~ 5KB vs 50 turns ~ 50-200KB raw |
| **Ephemeral** | No unbounded growth — wiped each session |
| **Durable output** | Passdown file persists, journal doesn't |

## Extending the Pattern

- **Auto-classification**: Have the LLM tag its own responses as decision/action/discovery
- **Explicit commands**: `/decision <text>`, `/blocker <text>` for manual entries
- **UOCS integration**: Pipe journal entries into existing observation systems
- **Cross-session search**: Index passdowns for retrieval across sessions
