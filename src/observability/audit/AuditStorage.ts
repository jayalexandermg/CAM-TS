/**
 * Audit Storage
 *
 * Provides storage backends for the audit logging system.
 * Supports JSONL file storage and in-memory storage for testing.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ObservabilityEvent } from '../types';

export interface AuditStorageConfig {
  type: 'jsonl' | 'sqlite' | 'memory';
  path?: string;
  maxEntries?: number;
  retentionDays?: number;
}

export interface AuditFilter {
  type?: string | string[];
  sessionId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export abstract class AuditStorage {
  abstract write(event: ObservabilityEvent): Promise<void>;
  abstract read(filter: AuditFilter): Promise<ObservabilityEvent[]>;
  abstract count(filter?: AuditFilter): Promise<number>;
  abstract rotate(): Promise<number>; // Returns deleted count
  abstract close(): Promise<void>;
}

export class JsonlAuditStorage extends AuditStorage {
  private filePath: string;
  private writeBuffer: ObservabilityEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: AuditStorageConfig) {
    super();
    this.filePath = config.path || './logs/audit.jsonl';
    this.startAutoFlush();
  }

  async write(event: ObservabilityEvent): Promise<void> {
    this.writeBuffer.push(event);
    if (this.writeBuffer.length >= 100) {
      await this.flush();
    }
  }

  async read(filter: AuditFilter): Promise<ObservabilityEvent[]> {
    await this.flush(); // Ensure buffer is written

    const content = await fs.readFile(this.filePath, 'utf-8').catch(() => '');
    const lines = content.split('\n').filter((l) => l.trim());

    let events = lines.map((line) => JSON.parse(line) as ObservabilityEvent);

    // Apply filters
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      events = events.filter((e) => types.includes(e.type));
    }
    if (filter.sessionId) {
      events = events.filter((e) => e.sessionId === filter.sessionId);
    }
    if (filter.startTime) {
      events = events.filter((e) => new Date(e.timestamp) >= filter.startTime!);
    }
    if (filter.endTime) {
      events = events.filter((e) => new Date(e.timestamp) <= filter.endTime!);
    }

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || events.length;

    return events.slice(offset, offset + limit);
  }

  async count(filter?: AuditFilter): Promise<number> {
    const events = await this.read({ ...filter, limit: undefined });
    return events.length;
  }

  async rotate(): Promise<number> {
    // Archive old file and create new
    const archivePath = `${this.filePath}.${Date.now()}.archive`;
    const count = await this.count();

    if (count > 0) {
      await fs.rename(this.filePath, archivePath);
    }

    return count;
  }

  async flush(): Promise<void> {
    if (this.writeBuffer.length === 0) return;

    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    const lines = this.writeBuffer.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await fs.appendFile(this.filePath, lines);
    this.writeBuffer = [];
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }

  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }
}

export class MemoryAuditStorage extends AuditStorage {
  private events: ObservabilityEvent[] = [];
  private maxEntries: number;

  constructor(config: AuditStorageConfig) {
    super();
    this.maxEntries = config.maxEntries || 10000;
  }

  async write(event: ObservabilityEvent): Promise<void> {
    this.events.push(event);
    if (this.events.length > this.maxEntries) {
      this.events = this.events.slice(-this.maxEntries);
    }
  }

  async read(filter: AuditFilter): Promise<ObservabilityEvent[]> {
    let events = [...this.events];

    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      events = events.filter((e) => types.includes(e.type));
    }
    if (filter.sessionId) {
      events = events.filter((e) => e.sessionId === filter.sessionId);
    }
    if (filter.startTime) {
      events = events.filter((e) => new Date(e.timestamp) >= filter.startTime!);
    }
    if (filter.endTime) {
      events = events.filter((e) => new Date(e.timestamp) <= filter.endTime!);
    }

    const offset = filter.offset || 0;
    const limit = filter.limit || events.length;

    return events.slice(offset, offset + limit);
  }

  async count(filter?: AuditFilter): Promise<number> {
    const events = await this.read({ ...filter, limit: undefined });
    return events.length;
  }

  async rotate(): Promise<number> {
    const count = this.events.length;
    this.events = [];
    return count;
  }

  async close(): Promise<void> {
    // No cleanup needed
  }
}
