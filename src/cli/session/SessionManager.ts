/**
 * Infinite Aura - CLI Session Manager
 *
 * Manages session persistence and listing.
 * Handles loading, saving, and querying sessions from disk.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Session, SessionSummary } from './Session';

/**
 * CLI Session Manager for persisted sessions
 *
 * The SessionManager:
 * - Creates new sessions
 * - Loads existing sessions from disk
 * - Lists all available sessions
 * - Deletes sessions
 * - Finds the latest session
 */
export class SessionManager {
  private sessionsDir: string;

  /**
   * Create a new SessionManager
   * @param sessionsDir - Base directory for all sessions
   */
  constructor(sessionsDir?: string) {
    this.sessionsDir =
      sessionsDir || path.join(process.env.HOME || '~', '.infinite-aura-ts', 'sessions');
  }

  /**
   * Get the sessions directory path
   * @returns Sessions directory path
   */
  getSessionsDir(): string {
    return this.sessionsDir;
  }

  /**
   * Create a new session
   * @returns New session instance
   */
  createSession(): Session {
    return new Session(undefined, undefined);
  }

  /**
   * Create a new session with a specific ID
   * @param id - Session ID
   * @returns New session instance
   */
  createSessionWithId(id: string): Session {
    const sessionDir = path.join(this.sessionsDir, id);
    return new Session(id, sessionDir);
  }

  /**
   * Load an existing session by ID
   * @param id - Session ID to load
   * @returns Loaded session
   * @throws Error if session doesn't exist or can't be loaded
   */
  async loadSession(id: string): Promise<Session> {
    const sessionDir = path.join(this.sessionsDir, id);
    return await Session.load(sessionDir);
  }

  /**
   * List all sessions
   * @returns Array of session summaries, sorted by start time (newest first)
   */
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
              endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined,
            });
          } catch {
            // Skip invalid session directories
            continue;
          }
        }
      }

      // Sort by start time (newest first)
      summaries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      return summaries;
    } catch {
      return [];
    }
  }

  /**
   * Delete a session by ID
   * @param id - Session ID to delete
   */
  async deleteSession(id: string): Promise<void> {
    const sessionDir = path.join(this.sessionsDir, id);
    await fs.rm(sessionDir, { recursive: true, force: true });
  }

  /**
   * Get the latest (most recent) session
   * @returns Latest session or null if no sessions exist
   */
  async getLatestSession(): Promise<Session | null> {
    const sessions = await this.listSessions();
    if (sessions.length === 0) {
      return null;
    }

    return await this.loadSession(sessions[0].id);
  }

  /**
   * Check if a session exists
   * @param id - Session ID to check
   * @returns true if session exists
   */
  async sessionExists(id: string): Promise<boolean> {
    try {
      const sessionDir = path.join(this.sessionsDir, id);
      const sessionFile = path.join(sessionDir, 'session.json');
      await fs.access(sessionFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the count of sessions
   * @returns Number of sessions
   */
  async getSessionCount(): Promise<number> {
    const sessions = await this.listSessions();
    return sessions.length;
  }

  /**
   * Delete all sessions
   */
  async deleteAllSessions(): Promise<void> {
    const sessions = await this.listSessions();
    for (const session of sessions) {
      await this.deleteSession(session.id);
    }
  }

  /**
   * Find sessions by persona
   * @param persona - Persona to search for
   * @returns Sessions matching the persona
   */
  async findSessionsByPersona(persona: string): Promise<SessionSummary[]> {
    const sessions = await this.listSessions();
    return sessions.filter((s) => s.persona === persona);
  }

  /**
   * Find sessions within a date range
   * @param startDate - Start of range
   * @param endDate - End of range
   * @returns Sessions within the date range
   */
  async findSessionsByDateRange(startDate: Date, endDate: Date): Promise<SessionSummary[]> {
    const sessions = await this.listSessions();
    return sessions.filter((s) => s.startTime >= startDate && s.startTime <= endDate);
  }
}
