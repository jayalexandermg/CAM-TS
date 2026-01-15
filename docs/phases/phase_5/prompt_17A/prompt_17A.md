PROMPT 17A: UOCS + History Storage
Phase: 5 (History & Hooks)
Parallel: ✅ Can run with 17B, 17C

⚠️ PACKAGE MANAGER: PNPM ONLY
📋 OBJECTIVE
Implement Universal Output Capture System (UOCS) and History storage.

📦 REQUIREMENTS
1. History Types
Create src/history/types.ts:

typescript
Copy
export type HistoryEntryType = 'session' | 'learning' | 'research' | 'decision' | 'output';

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  timestamp: Date;
  sessionId: string;
  agentId?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface SessionTranscript {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  turns: TranscriptTurn[];
  summary?: string;
}

export interface TranscriptTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  toolsUsed?: string[];
}

export interface Learning {
  id: string;
  sessionId: string;
  topic: string;
  insight: string;
  confidence: number;
  timestamp: Date;
  source?: string;
}

export interface Decision {
  id: string;
  sessionId: string;
  question: string;
  decision: string;
  reasoning: string;
  timestamp: Date;
  alternatives?: string[];
}
2. History Storage
Create src/history/HistoryStorage.ts:

typescript
Copy
import * as fs from 'fs/promises';
import * as path from 'path';
import { HistoryEntry, SessionTranscript, Learning, Decision, HistoryEntryType } from './types';

export class HistoryStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(
      process.env.HOME || '~',
      '.infinite-aura-ts',
      'history'
    );
  }

  async initialize(): Promise<void> {
    const dirs = ['Sessions', 'Learnings', 'Research', 'Decisions', 'RawOutputs'];

    for (const dir of dirs) {
      await fs.mkdir(path.join(this.baseDir, dir), { recursive: true });
    }
  }

  async saveEntry(entry: HistoryEntry): Promise<void> {
    const dir = this.getDirectoryForType(entry.type);
    const filename = `${entry.id}.json`;
    const filepath = path.join(this.baseDir, dir, filename);

    await fs.writeFile(filepath, JSON.stringify(entry, null, 2));
  }

  async saveSessionTranscript(transcript: SessionTranscript): Promise<void> {
    const filename = `${transcript.sessionId}.json`;
    const filepath = path.join(this.baseDir, 'Sessions', filename);

    await fs.writeFile(filepath, JSON.stringify(transcript, null, 2));

    // Also save as JSONL for streaming
    const jsonlPath = path.join(this.baseDir, 'Sessions', `${transcript.sessionId}.jsonl`);
    const lines = transcript.turns.map(t => JSON.stringify(t)).join('\n');
    await fs.writeFile(jsonlPath, lines);
  }

  async saveLearning(learning: Learning): Promise<void> {
    const filename = `${learning.id}.json`;
    const filepath = path.join(this.baseDir, 'Learnings', filename);

    await fs.writeFile(filepath, JSON.stringify(learning, null, 2));
  }

  async saveDecision(decision: Decision): Promise<void> {
    const filename = `${decision.id}.json`;
    const filepath = path.join(this.baseDir, 'Decisions', filename);

    await fs.writeFile(filepath, JSON.stringify(decision, null, 2));
  }

  async getEntry(id: string, type: HistoryEntryType): Promise<HistoryEntry | null> {
    const dir = this.getDirectoryForType(type);
    const filepath = path.join(this.baseDir, dir, `${id}.json`);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async getSessionTranscript(sessionId: string): Promise<SessionTranscript | null> {
    const filepath = path.join(this.baseDir, 'Sessions', `${sessionId}.json`);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async listEntries(type: HistoryEntryType): Promise<string[]> {
    const dir = this.getDirectoryForType(type);
    const dirPath = path.join(this.baseDir, dir);

    try {
      const files = await fs.readdir(dirPath);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  async searchLearnings(topic: string): Promise<Learning[]> {
    const ids = await this.listEntries('learning');
    const learnings: Learning[] = [];

    for (const id of ids) {
      const entry = await this.getEntry(id, 'learning');
      if (entry && entry.content.toLowerCase().includes(topic.toLowerCase())) {
        learnings.push(entry as unknown as Learning);
      }
    }

    return learnings;
  }

  private getDirectoryForType(type: HistoryEntryType): string {
    const map: Record<HistoryEntryType, string> = {
      session: 'Sessions',
      learning: 'Learnings',
      research: 'Research',
      decision: 'Decisions',
      output: 'RawOutputs'
    };
    return map[type];
  }
}
3. UOCS (Universal Output Capture System)
Create src/history/UOCS.ts:

typescript
Copy
import { HistoryStorage } from './HistoryStorage';
import { HistoryEntry, SessionTranscript, TranscriptTurn, Learning, Decision } from './types';
import { EventEmitter } from 'events';

export class UOCS extends EventEmitter {
  private storage: HistoryStorage;
  private activeTranscripts: Map<string, SessionTranscript>;

  constructor(storage?: HistoryStorage) {
    super();
    this.storage = storage || new HistoryStorage();
    this.activeTranscripts = new Map();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  // Session Transcript Capture
  startSession(sessionId: string): void {
    const transcript: SessionTranscript = {
      sessionId,
      startTime: new Date(),
      turns: []
    };

    this.activeTranscripts.set(sessionId, transcript);
    this.emit('sessionStarted', { sessionId });
  }

  captureTurn(sessionId: string, turn: TranscriptTurn): void {
    const transcript = this.activeTranscripts.get(sessionId);
    if (!transcript) {
      // Auto-start session if not exists
      this.startSession(sessionId);
      this.captureTurn(sessionId, turn);
      return;
    }

    transcript.turns.push(turn);
    this.emit('turnCaptured', { sessionId, turn });
  }

  async endSession(sessionId: string, summary?: string): Promise<void> {
    const transcript = this.activeTranscripts.get(sessionId);
    if (!transcript) {
      return;
    }

    transcript.endTime = new Date();
    transcript.summary = summary;

    await this.storage.saveSessionTranscript(transcript);
    this.activeTranscripts.delete(sessionId);

    this.emit('sessionEnded', { sessionId, transcript });
  }

  // Learning Capture
  async captureLearning(
    sessionId: string,
    topic: string,
    insight: string,
    confidence: number = 0.8,
    source?: string
  ): Promise<Learning> {
    const learning: Learning = {
      id: this.generateId('learning'),
      sessionId,
      topic,
      insight,
      confidence,
      timestamp: new Date(),
      source
    };

    await this.storage.saveLearning(learning);
    this.emit('learningCaptured', learning);

    return learning;
  }

  // Decision Capture
  async captureDecision(
    sessionId: string,
    question: string,
    decision: string,
    reasoning: string,
    alternatives?: string[]
  ): Promise<Decision> {
    const decisionEntry: Decision = {
      id: this.generateId('decision'),
      sessionId,
      question,
      decision,
      reasoning,
      timestamp: new Date(),
      alternatives
    };

    await this.storage.saveDecision(decisionEntry);
    this.emit('decisionCaptured', decisionEntry);

    return decisionEntry;
  }

  // Raw Output Capture
  async captureOutput(
    sessionId: string,
    content: string,
    agentId?: string,
    metadata?: Record<string, any>
  ): Promise<HistoryEntry> {
    const entry: HistoryEntry = {
      id: this.generateId('output'),
      type: 'output',
      timestamp: new Date(),
      sessionId,
      agentId,
      content,
      metadata
    };

    await this.storage.saveEntry(entry);
    this.emit('outputCaptured', entry);

    return entry;
  }

  // Retrieval
  async getSessionTranscript(sessionId: string): Promise<SessionTranscript | null> {
    // Check active first
    const active = this.activeTranscripts.get(sessionId);
    if (active) {
      return active;
    }

    return this.storage.getSessionTranscript(sessionId);
  }

  async searchLearnings(topic: string): Promise<Learning[]> {
    return this.storage.searchLearnings(topic);
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.activeTranscripts.keys());
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }
}
4. Index Exports
Create src/history/index.ts:

typescript
Copy
export * from './types';
export * from './HistoryStorage';
export * from './UOCS';
📁 FILES TO CREATE
src/history/types.ts
src/history/HistoryStorage.ts
src/history/UOCS.ts
src/history/index.ts
tests/history/HistoryStorage.test.ts (12-15 tests)
tests/history/UOCS.test.ts (15-20 tests)
Total: 6 files, 27-35 tests

✅ SUCCESS CRITERIA
✅ HistoryStorage saves/retrieves entries
✅ UOCS captures sessions, learnings, decisions, outputs
✅ Session transcripts saved as JSON and JSONL
✅ 27-35 tests passing
✅ No TypeScript errors
END OF PROMPT 17A

