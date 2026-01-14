/**
 * Infinite Aura - Session Class
 *
 * Manages session state, conversation history, and persistence.
 * Sessions track conversation turns and can be saved/loaded from disk.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * A single turn in the conversation
 */
export interface ConversationTurn {
  timestamp: Date;
  input: string;
  output: string;
  metadata?: Record<string, unknown>;
}

/**
 * Summary of a session for listing purposes
 */
export interface SessionSummary {
  id: string;
  startTime: Date;
  endTime?: Date;
  turnCount: number;
  persona?: string;
}

/**
 * Session class for managing conversation state and history
 *
 * The Session class:
 * - Tracks conversation turns (input/output pairs)
 * - Maintains arbitrary state via key-value storage
 * - Supports persona assignment
 * - Persists to disk in JSON/JSONL format
 * - Can be loaded from existing session directories
 */
export class Session {
  private id: string;
  private startTime: Date;
  private endTime?: Date;
  private history: ConversationTurn[];
  private state: Map<string, unknown>;
  private persona?: string;
  private sessionDir: string;

  /**
   * Create a new Session
   * @param id - Session ID (auto-generated if not provided)
   * @param sessionDir - Directory for session files (auto-generated if not provided)
   */
  constructor(id?: string, sessionDir?: string) {
    this.id = id || this.generateId();
    this.startTime = new Date();
    this.history = [];
    this.state = new Map();
    this.sessionDir =
      sessionDir ||
      path.join(process.env.HOME || '~', '.infinite-aura-ts', 'sessions', this.id);
  }

  /**
   * Generate a unique session ID based on current timestamp
   * Format: YYYY-MM-DD-HHMMSS
   * @returns Unique session ID
   */
  private generateId(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `${date}-${time}`;
  }

  /**
   * Get the session ID
   * @returns Session ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get the session start time
   * @returns Start time
   */
  getStartTime(): Date {
    return this.startTime;
  }

  /**
   * Get the session end time
   * @returns End time or undefined if session is still active
   */
  getEndTime(): Date | undefined {
    return this.endTime;
  }

  /**
   * Get the session directory path
   * @returns Session directory path
   */
  getSessionDir(): string {
    return this.sessionDir;
  }

  /**
   * Add a conversation turn to the history
   * @param input - User input
   * @param output - Assistant output
   * @param metadata - Optional metadata for the turn
   */
  addTurn(input: string, output: string, metadata?: Record<string, unknown>): void {
    this.history.push({
      timestamp: new Date(),
      input,
      output,
      metadata,
    });
  }

  /**
   * Get all conversation turns
   * @returns Copy of the conversation history
   */
  getHistory(): ConversationTurn[] {
    return [...this.history];
  }

  /**
   * Get the last conversation turn
   * @returns Last turn or undefined if no history
   */
  getLastTurn(): ConversationTurn | undefined {
    return this.history[this.history.length - 1];
  }

  /**
   * Get the number of turns in the session
   * @returns Turn count
   */
  getTurnCount(): number {
    return this.history.length;
  }

  /**
   * Set a state value
   * @param key - State key
   * @param value - State value
   */
  setState(key: string, value: unknown): void {
    this.state.set(key, value);
  }

  /**
   * Get a state value
   * @param key - State key
   * @returns State value or undefined if not set
   */
  getState(key: string): unknown {
    return this.state.get(key);
  }

  /**
   * Get all state as a plain object
   * @returns State object
   */
  getAllState(): Record<string, unknown> {
    return Object.fromEntries(this.state);
  }

  /**
   * Check if a state key exists
   * @param key - State key
   * @returns true if key exists
   */
  hasState(key: string): boolean {
    return this.state.has(key);
  }

  /**
   * Delete a state value
   * @param key - State key
   * @returns true if key existed and was deleted
   */
  deleteState(key: string): boolean {
    return this.state.delete(key);
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.state.clear();
  }

  /**
   * Set the persona for this session
   * @param persona - Persona name/identifier
   */
  setPersona(persona: string): void {
    this.persona = persona;
  }

  /**
   * Get the persona for this session
   * @returns Persona or undefined if not set
   */
  getPersona(): string | undefined {
    return this.persona;
  }

  /**
   * End the session (sets end time)
   */
  end(): void {
    this.endTime = new Date();
  }

  /**
   * Check if the session has ended
   * @returns true if session has ended
   */
  hasEnded(): boolean {
    return this.endTime !== undefined;
  }

  /**
   * Get session duration in milliseconds
   * @returns Duration in ms (uses current time if session hasn't ended)
   */
  getDurationMs(): number {
    const endTime = this.endTime || new Date();
    return endTime.getTime() - this.startTime.getTime();
  }

  /**
   * Get a summary of this session
   * @returns Session summary
   */
  getSummary(): SessionSummary {
    return {
      id: this.id,
      startTime: this.startTime,
      endTime: this.endTime,
      turnCount: this.history.length,
      persona: this.persona,
    };
  }

  /**
   * Save the session to disk
   * Creates session directory and writes:
   * - session.json: Session metadata
   * - history.jsonl: Conversation history (one turn per line)
   * - state.json: Session state
   */
  async save(): Promise<void> {
    // Create session directory
    await fs.mkdir(this.sessionDir, { recursive: true });

    // Save session metadata
    const sessionFile = path.join(this.sessionDir, 'session.json');
    await fs.writeFile(sessionFile, JSON.stringify(this.getSummary(), null, 2));

    // Save history (JSONL format)
    const historyFile = path.join(this.sessionDir, 'history.jsonl');
    const historyLines = this.history.map((turn) => JSON.stringify(turn));
    await fs.writeFile(historyFile, historyLines.join('\n'));

    // Save state
    const stateFile = path.join(this.sessionDir, 'state.json');
    await fs.writeFile(stateFile, JSON.stringify(this.getAllState(), null, 2));
  }

  /**
   * Load a session from disk
   * @param sessionDir - Directory containing session files
   * @returns Loaded session
   * @throws Error if session files cannot be read
   */
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
      const historyLines = historyContent.split('\n').filter((line) => line.trim());
      session.history = historyLines.map((line) => {
        const turn = JSON.parse(line);
        return {
          ...turn,
          timestamp: new Date(turn.timestamp),
        };
      });
    } catch {
      // History file might not exist yet
      session.history = [];
    }

    // Load state
    const stateFile = path.join(sessionDir, 'state.json');
    try {
      const stateData = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      session.state = new Map(Object.entries(stateData));
    } catch {
      // State file might not exist yet
      session.state = new Map();
    }

    return session;
  }
}
