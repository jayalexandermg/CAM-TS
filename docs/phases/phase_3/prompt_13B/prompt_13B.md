PROMPT 13B: Session Management System
Phase: 3 (CLI + Persona)
Status: 🆕 NEW - Session management
Time Estimate: 4-5 hours
Priority: CRITICAL
Dependencies: Phase 2 complete
Parallel: ✅ Can run with 13A, 13C, 13D

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Implement session management system with state persistence and history tracking.

After this prompt:

✅ Session class (state management)
✅ SessionManager class (lifecycle)
✅ Session persistence
✅ History tracking
✅ 20-25 new tests
📦 REQUIREMENTS
1. Session Class
Create src/cli/Session.ts:

typescript
Copy
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ConversationTurn {
  timestamp: Date;
  input: string;
  output: string;
  metadata?: Record<string, any>;
}

export interface SessionSummary {
  id: string;
  startTime: Date;
  endTime?: Date;
  turnCount: number;
  persona?: string;
}

export class Session {
  private id: string;
  private startTime: Date;
  private endTime?: Date;
  private history: ConversationTurn[];
  private state: Map<string, any>;
  private persona?: string;
  private sessionDir: string;

  constructor(id?: string, sessionDir?: string) {
    this.id = id || this.generateId();
    this.startTime = new Date();
    this.history = [];
    this.state = new Map();
    this.sessionDir = sessionDir || path.join(
      process.env.HOME || '~',
      '.infinite-aura-ts',
      'sessions',
      this.id
    );
  }

  private generateId(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `${date}-${time}`;
  }

  getId(): string {
    return this.id;
  }

  getStartTime(): Date {
    return this.startTime;
  }

  getEndTime(): Date | undefined {
    return this.endTime;
  }

  addTurn(input: string, output: string, metadata?: Record<string, any>): void {
    this.history.push({
      timestamp: new Date(),
      input,
      output,
      metadata
    });
  }

  getHistory(): ConversationTurn[] {
    return [...this.history];
  }

  getLastTurn(): ConversationTurn | undefined {
    return this.history[this.history.length - 1];
  }

  setState(key: string, value: any): void {
    this.state.set(key, value);
  }

  getState(key: string): any {
    return this.state.get(key);
  }

  getAllState(): Record<string, any> {
    return Object.fromEntries(this.state);
  }

  setPersona(persona: string): void {
    this.persona = persona;
  }

  getPersona(): string | undefined {
    return this.persona;
  }

  end(): void {
    this.endTime = new Date();
  }

  getSummary(): SessionSummary {
    return {
      id: this.id,
      startTime: this.startTime,
      endTime: this.endTime,
      turnCount: this.history.length,
      persona: this.persona
    };
  }

  async save(): Promise<void> {
    // Create session directory
    await fs.mkdir(this.sessionDir, { recursive: true });

    // Save session metadata
    const sessionFile = path.join(this.sessionDir, 'session.json');
    await fs.writeFile(
      sessionFile,
      JSON.stringify(this.getSummary(), null, 2)
    );

    // Save history (JSONL format)
    const historyFile = path.join(this.sessionDir, 'history.jsonl');
    const historyLines = this.history.map(turn => JSON.stringify(turn));
    await fs.writeFile(historyFile, historyLines.join('\n'));

    // Save state
    const stateFile = path.join(this.sessionDir, 'state.json');
    await fs.writeFile(
      stateFile,
      JSON.stringify(this.getAllState(), null, 2)
    );
  }

  static async load(sessionDir: string): Promise<Session> {
    // Load session metadata
    const sessionFile = path.join(sessionDir, 'session.json');
    const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf-8'));

    // Create session
    const session = new Session(sessionData.id, sessionDir);
    session.startTime = new Date(sessionData.startTime);
    if (sessionData.endTime) {
      session.endTime = new Date(sessionData.endTime);
    }
    session.persona = sessionData.persona;

    // Load history
    const historyFile = path.join(sessionDir, 'history.jsonl');
    try {
      const historyContent = await fs.readFile(historyFile, 'utf-8');
      const historyLines = historyContent.split('\n').filter(line => line.trim());
      session.history = historyLines.map(line => {
        const turn = JSON.parse(line);
        return {
          ...turn,
          timestamp: new Date(turn.timestamp)
        };
      });
    } catch (error) {
      // History file might not exist yet
      session.history = [];
    }

    // Load state
    const stateFile = path.join(sessionDir, 'state.json');
    try {
      const stateData = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      session.state = new Map(Object.entries(stateData));
    } catch (error) {
      // State file might not exist yet
      session.state = new Map();
    }

    return session;
  }
}
2. SessionManager Class
Create src/cli/SessionManager.ts:

typescript
Copy
import * as fs from 'fs/promises';
import * as path from 'path';
import { Session, SessionSummary } from './Session';

export class SessionManager {
  private sessionsDir: string;

  constructor(sessionsDir?: string) {
    this.sessionsDir = sessionsDir || path.join(
      process.env.HOME || '~',
      '.infinite-aura-ts',
      'sessions'
    );
  }

  createSession(): Session {
    return new Session(undefined, undefined);
  }

  async loadSession(id: string): Promise<Session> {
    const sessionDir = path.join(this.sessionsDir, id);
    return await Session.load(sessionDir);
  }

  async listSessions(): Promise<SessionSummary[]> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      const entries = await fs.readdir(this.sessionsDir, { withFileTypes: true });

      const summaries: SessionSummary[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const sessionDir = path.join(this.sessionsDir, entry.name);
            const sessionFile = path.join(sessionDir, 'session.json');
            const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf-8'));
            summaries.push({
              ...sessionData,
              startTime: new Date(sessionData.startTime),
              endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined
            });
          } catch (error) {
            // Skip invalid session directories
            continue;
          }
        }
      }

      // Sort by start time (newest first)
      summaries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      return summaries;
    } catch (error) {
      return [];
    }
  }

  async deleteSession(id: string): Promise<void> {
    const sessionDir = path.join(this.sessionsDir, id);
    await fs.rm(sessionDir, { recursive: true, force: true });
  }

  async getLatestSession(): Promise<Session | null> {
    const sessions = await this.listSessions();
    if (sessions.length === 0) {
      return null;
    }

    return await this.loadSession(sessions[0].id);
  }

  async sessionExists(id: string): Promise<boolean> {
    try {
      const sessionDir = path.join(this.sessionsDir, id);
      await fs.access(sessionDir);
      return true;
    } catch {
      return false;
    }
  }
}
3. Index Export
Create src/cli/session/index.ts:

typescript
Copy
export * from './Session';
export * from './SessionManager';
📁 FILES TO CREATE
src/cli/Session.ts
src/cli/SessionManager.ts
src/cli/session/index.ts
tests/cli/Session.test.ts (12-15 tests)
tests/cli/SessionManager.test.ts (8-10 tests)
Total: 5 files, 20-25 tests

✅ SUCCESS CRITERIA
✅ Session class working
✅ SessionManager working
✅ Session persistence working
✅ History tracking working
✅ 20-25 tests passing
✅ No TypeScript errors
END OF PROMPT 13B
