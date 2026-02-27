import * as fs from 'fs/promises';
import * as path from 'path';
import { HistoryEntry, SessionTranscript, Learning, Decision, HistoryEntryType } from './types';

export class HistoryStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.env.HOME || '~', '.infinite-aura-ts', 'history');
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
    const lines = transcript.turns.map((t) => JSON.stringify(t)).join('\n');
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
      return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
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
      output: 'RawOutputs',
    };
    return map[type];
  }
}
