/**
 * SignalCapture - Structured Telemetry Pipeline
 *
 * Captures structured signals (timing, retries, errors, satisfaction, corrections, workflows)
 * and provides querying, metrics aggregation, and simple pattern detection.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Signal {
  id: string;
  type: 'timing' | 'retry' | 'error' | 'satisfaction' | 'correction' | 'workflow';
  source: string; // which tool/skill/agent produced this
  value: number | string;
  context: Record<string, unknown>;
  timestamp: Date;
}

export interface SignalQueryOptions {
  type?: Signal['type'];
  source?: string;
  since?: Date;
}

export interface SourceMetrics {
  source: string;
  count: number;
  avgTiming: number | null;
  errorRate: number;
  retryRate: number;
}

export interface PatternResult {
  pattern: string;
  source: string;
  detail: string;
}

/**
 * Serialize a signal for JSON storage (Date -> ISO string)
 */
function serializeSignal(signal: Signal): Record<string, unknown> {
  return {
    ...signal,
    timestamp: signal.timestamp.toISOString(),
  };
}

/**
 * Deserialize a JSON object back to Signal
 */
function deserializeSignal(data: Record<string, unknown>): Signal {
  return {
    id: data.id as string,
    type: data.type as Signal['type'],
    source: data.source as string,
    value: data.value as number | string,
    context: (data.context as Record<string, unknown>) ?? {},
    timestamp: new Date(data.timestamp as string),
  };
}

export class SignalCapture {
  private buffer: Signal[] = [];
  private readonly signalsDirectory: string;
  private readonly flushThreshold: number;

  constructor(signalsDirectory: string, flushThreshold: number = 100) {
    this.signalsDirectory = signalsDirectory;
    this.flushThreshold = flushThreshold;
  }

  /**
   * Capture a signal into the in-memory buffer.
   * Auto-flushes when buffer reaches threshold.
   */
  capture(signal: Signal): void {
    this.buffer.push(signal);
    if (this.buffer.length >= this.flushThreshold) {
      this.flush();
    }
  }

  /**
   * Write buffered signals to disk as a JSON file.
   */
  flush(): string | null {
    if (this.buffer.length === 0) return null;

    try {
      if (!fs.existsSync(this.signalsDirectory)) {
        fs.mkdirSync(this.signalsDirectory, { recursive: true });
      }
    } catch {
      // Cannot create directory
      return null;
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const filename = `signals_${timestamp}_${random}.json`;
    const filePath = path.join(this.signalsDirectory, filename);

    const serialized = this.buffer.map(serializeSignal);

    try {
      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2));
      this.buffer = [];
      return filePath;
    } catch {
      return null;
    }
  }

  /**
   * Query signals matching criteria.
   * Searches both in-memory buffer and persisted files on disk.
   */
  query(options: SignalQueryOptions = {}): Signal[] {
    const all = [...this.buffer, ...this.loadFromDisk()];
    return all.filter((signal) => {
      if (options.type && signal.type !== options.type) return false;
      if (options.source && signal.source !== options.source) return false;
      if (options.since && signal.timestamp < options.since) return false;
      return true;
    });
  }

  /**
   * Aggregate metrics for a given source.
   */
  getMetrics(source: string): SourceMetrics {
    const signals = this.query({ source });
    const count = signals.length;

    // Average timing
    const timingSignals = signals.filter(
      (s) => s.type === 'timing' && typeof s.value === 'number'
    );
    const avgTiming =
      timingSignals.length > 0
        ? timingSignals.reduce((sum, s) => sum + (s.value as number), 0) / timingSignals.length
        : null;

    // Error rate
    const errorCount = signals.filter((s) => s.type === 'error').length;
    const errorRate = count > 0 ? errorCount / count : 0;

    // Retry rate
    const retryCount = signals.filter((s) => s.type === 'retry').length;
    const retryRate = count > 0 ? retryCount / count : 0;

    return { source, count, avgTiming, errorRate, retryRate };
  }

  /**
   * Simple pattern detection: repeated errors, improving/degrading performance trends.
   */
  detectPatterns(): PatternResult[] {
    const patterns: PatternResult[] = [];
    const all = [...this.buffer, ...this.loadFromDisk()];

    // Group by source
    const bySource = new Map<string, Signal[]>();
    for (const signal of all) {
      const existing = bySource.get(signal.source) ?? [];
      existing.push(signal);
      bySource.set(signal.source, existing);
    }

    for (const [source, signals] of bySource) {
      // Detect repeated errors (3+ consecutive errors)
      const errors = signals
        .filter((s) => s.type === 'error')
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (errors.length >= 3) {
        patterns.push({
          pattern: 'repeated-errors',
          source,
          detail: `${errors.length} errors detected from ${source}`,
        });
      }

      // Detect performance trends from timing signals
      const timings = signals
        .filter((s) => s.type === 'timing' && typeof s.value === 'number')
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (timings.length >= 3) {
        const values = timings.map((s) => s.value as number);
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (avgSecond > avgFirst * 1.5) {
          patterns.push({
            pattern: 'degrading-performance',
            source,
            detail: `Average timing increased from ${avgFirst.toFixed(0)}ms to ${avgSecond.toFixed(0)}ms`,
          });
        } else if (avgSecond < avgFirst * 0.5) {
          patterns.push({
            pattern: 'improving-performance',
            source,
            detail: `Average timing decreased from ${avgFirst.toFixed(0)}ms to ${avgSecond.toFixed(0)}ms`,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Get the current buffer size.
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  // --- Private ---

  private loadFromDisk(): Signal[] {
    const signals: Signal[] = [];
    try {
      if (!fs.existsSync(this.signalsDirectory)) return signals;
      const files = fs.readdirSync(this.signalsDirectory);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const filePath = path.join(this.signalsDirectory, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw) as Record<string, unknown>[];
          for (const entry of data) {
            signals.push(deserializeSignal(entry));
          }
        } catch {
          // Skip corrupted files
        }
      }
    } catch {
      // Directory read failed
    }
    return signals;
  }
}
