/**
 * EOS Passdown Manager
 *
 * Manages reading/writing EOS passdown files and SOS session briefs.
 * Passdowns are the durable artifacts generated at session end.
 * Briefs are generated at session start from the latest passdown.
 *
 * Storage layout:
 *   {memoryBasePath}/eos-passdowns/{sessionId}.md
 *   {memoryBasePath}/session-briefs/{sessionId}.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export class EOSPassdownManager {
  private readonly eosDir: string;
  private readonly briefsDir: string;

  constructor(memoryBasePath: string) {
    this.eosDir = path.join(memoryBasePath, 'eos-passdowns');
    this.briefsDir = path.join(memoryBasePath, 'session-briefs');
  }

  /** Create storage directories if they don't exist */
  async initialize(): Promise<void> {
    await fs.mkdir(this.eosDir, { recursive: true });
    await fs.mkdir(this.briefsDir, { recursive: true });
  }

  /** Write an EOS passdown for a session, returns the file path */
  async writeEOS(sessionId: string, content: string): Promise<string> {
    const filePath = path.join(this.eosDir, `${sessionId}.md`);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  /** Read the most recent EOS passdown, or null if none exist */
  async getLatestEOS(): Promise<string | null> {
    try {
      const files = await fs.readdir(this.eosDir);
      const mdFiles = files.filter((f) => f.endsWith('.md')).sort();
      if (mdFiles.length === 0) return null;
      return await fs.readFile(
        path.join(this.eosDir, mdFiles[mdFiles.length - 1]),
        'utf-8'
      );
    } catch {
      return null;
    }
  }

  /** Write a SOS session brief */
  async writeSOS(sessionId: string, content: string): Promise<void> {
    const filePath = path.join(this.briefsDir, `${sessionId}.md`);
    await fs.writeFile(filePath, content);
  }

  /** Get the EOS directory path */
  getEOSDir(): string {
    return this.eosDir;
  }

  /** Get the briefs directory path */
  getBriefsDir(): string {
    return this.briefsDir;
  }
}
