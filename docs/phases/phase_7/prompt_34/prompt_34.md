# Prompt_34

```
PROMPT 34: Enhanced Audit Logger

[CONTEXT]
CAM Enhancement - Phase 10: Observability
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 33 (Observability types)

Enhance existing audit logging with structured events and storage backends.

[TASK]
Create enhanced audit logger with multiple storage options.

## Part 1: Create src/observability/audit/AuditStorage.ts
```typescript
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
    const lines = content.split('\n').filter(l => l.trim());

    let events = lines.map(line => JSON.parse(line) as ObservabilityEvent);

    // Apply filters
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      events = events.filter(e => types.includes(e.type));
    }
    if (filter.sessionId) {
      events = events.filter(e => e.sessionId === filter.sessionId);
    }
    if (filter.startTime) {
      events = events.filter(e => new Date(e.timestamp) >= filter.startTime!);
    }
    if (filter.endTime) {
      events = events.filter(e => new Date(e.timestamp) <= filter.endTime!);
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

    const lines = this.writeBuffer.map(e => JSON.stringify(e)).join('\n') + '\n';
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
      events = events.filter(e => types.includes(e.type));
    }
    if (filter.sessionId) {
      events = events.filter(e => e.sessionId === filter.sessionId);
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
```

## Part 2: Create src/observability/audit/AuditLogger.ts
```typescript
import { v4 as uuidv4 } from 'uuid';
import {
  ObservabilityEvent,
  ObservabilityEventType,
  EventMetadata,
  SystemMetrics
} from '../types';
import { AuditStorage, JsonlAuditStorage, AuditFilter, AuditStorageConfig } from './AuditStorage';

export interface AuditLoggerConfig {
  storage: AuditStorageConfig;
  defaultMetadata?: Partial<EventMetadata>;
  enableRealtime?: boolean;
}

export class AuditLogger {
  private storage: AuditStorage;
  private defaultMetadata: Partial<EventMetadata>;
  private sessionId: string;
  private listeners: ((event: ObservabilityEvent) => void)[] = [];

  constructor(config: AuditLoggerConfig) {
    this.storage = this.createStorage(config.storage);
    this.defaultMetadata = config.defaultMetadata || {};
    this.sessionId = uuidv4();
  }

  private createStorage(config: AuditStorageConfig): AuditStorage {
    switch (config.type) {
      case 'memory':
        return new MemoryAuditStorage(config);
      case 'jsonl':
      default:
        return new JsonlAuditStorage(config);
    }
  }

  /**
   * Log an observability event
   */
  async log(
    type: ObservabilityEventType,
    data: Record<string, unknown>,
    options?: {
      duration?: number;
      success?: boolean;
      error?: Error;
    }
  ): Promise<ObservabilityEvent> {
    const event: ObservabilityEvent = {
      id: uuidv4(),
      type,
      timestamp: new Date(),
      sessionId: this.sessionId,
      data,
      metadata: {
        source: 'cam',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        ...this.defaultMetadata
      },
      duration: options?.duration,
      success: options?.success,
      error: options?.error ? {
        message: options.error.message,
        stack: options.error.stack,
        code: (options.error as any).code
      } : undefined
    };

    await this.storage.write(event);
    this.notifyListeners(event);

    return event;
  }

  /**
   * Log agent spawn
   */
  async logAgentSpawn(agentId: string, agentName: string, traits?: string[]): Promise<void> {
    await this.log('agent:spawn', { agentId, agentName, traits });
  }

  /**
   * Log skill invocation
   */
  async logSkillInvoke(skillName: string, inputs: Record<string, unknown>): Promise<void> {
    await this.log('skill:invoke', { skillName, inputs });
  }

  /**
   * Log memory operation
   */
  async logMemoryOp(
    tier: 'immediate' | 'short-term' | 'long-term',
    operation: 'read' | 'write' | 'delete',
    key?: string
  ): Promise<void> {
    await this.log('memory:write', { tier, operation, key });
  }

  /**
   * Query events
   */
  async query(filter: AuditFilter): Promise<ObservabilityEvent[]> {
    return this.storage.read(filter);
  }

  /**
   * Get basic metrics
   */
  async getMetrics(timeRange?: { start: Date; end: Date }): Promise<Partial<SystemMetrics>> {
    const filter: AuditFilter = timeRange ? {
      startTime: timeRange.start,
      endTime: timeRange.end
    } : {};

    const events = await this.storage.read(filter);

    const agentSpawns = events.filter(e => e.type === 'agent:spawn').length;
    const skillInvokes = events.filter(e => e.type === 'skill:invoke').length;
    const errors = events.filter(e => e.error).length;

    return {
      activeAgents: agentSpawns,
      averageResponseTime: this.calculateAvgDuration(events),
      errorRate: events.length > 0 ? errors / events.length : 0
    };
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(callback: (event: ObservabilityEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Rotate logs
   */
  async rotate(): Promise<number> {
    return this.storage.rotate();
  }

  /**
   * Close logger
   */
  async close(): Promise<void> {
    await this.storage.close();
  }

  private notifyListeners(event: ObservabilityEvent): void {
    this.listeners.forEach(l => l(event));
  }

  private calculateAvgDuration(events: ObservabilityEvent[]): number {
    const withDuration = events.filter(e => e.duration !== undefined);
    if (withDuration.length === 0) return 0;
    return withDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / withDuration.length;
  }
}
```

## Part 3: Create src/observability/audit/index.ts
```typescript
export { AuditLogger, AuditLoggerConfig } from './AuditLogger';
export {
  AuditStorage,
  JsonlAuditStorage,
  MemoryAuditStorage,
  AuditStorageConfig,
  AuditFilter
} from './AuditStorage';
```

## Part 4: Create tests/observability/audit/AuditLogger.test.ts
Write 15+ tests

[VERIFICATION]
Show me:
1. AuditStorage.ts content
2. AuditLogger.ts content
3. Test output

[SUCCESS CRITERIA]
✅ Structured event logging works
✅ Multiple storage backends functional
✅ Log rotation working
✅ 15+ tests passing
```

end of Prompt_34
