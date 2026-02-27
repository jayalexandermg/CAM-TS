/**
 * Audit Logger
 *
 * Enhanced audit logging with structured events and storage backends.
 * Provides logging for agent spawns, skill invocations, memory operations,
 * and other observability events.
 */

import * as crypto from 'crypto';
import { ObservabilityEvent, ObservabilityEventType, EventMetadata, SystemMetrics } from '../types';
import {
  AuditStorage,
  JsonlAuditStorage,
  MemoryAuditStorage,
  AuditFilter,
  AuditStorageConfig,
} from './AuditStorage';

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
    this.sessionId = crypto.randomUUID();
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
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      sessionId: this.sessionId,
      data,
      metadata: {
        source: 'cam',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        ...this.defaultMetadata,
      },
      duration: options?.duration,
      success: options?.success,
      error: options?.error
        ? {
            message: options.error.message,
            stack: options.error.stack,
            code: (options.error as Error & { code?: string }).code,
          }
        : undefined,
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
    const filter: AuditFilter = timeRange
      ? {
          startTime: timeRange.start,
          endTime: timeRange.end,
        }
      : {};

    const events = await this.storage.read(filter);

    const agentSpawns = events.filter((e) => e.type === 'agent:spawn').length;
    const errors = events.filter((e) => e.error).length;

    return {
      activeAgents: agentSpawns,
      averageResponseTime: this.calculateAvgDuration(events),
      errorRate: events.length > 0 ? errors / events.length : 0,
    };
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(callback: (event: ObservabilityEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
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

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  private notifyListeners(event: ObservabilityEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  private calculateAvgDuration(events: ObservabilityEvent[]): number {
    const withDuration = events.filter((e) => e.duration !== undefined);
    if (withDuration.length === 0) return 0;
    return withDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / withDuration.length;
  }
}
