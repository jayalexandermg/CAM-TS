/**
 * GapDetector - Detects capability gaps from misses, fallbacks, and corrections
 *
 * Monitors IntentMatcher misses, orchestrator fallbacks to raw LLM, and user
 * corrections. Aggregates signals into a gap report for SkillJacked consumption.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * A detected capability gap
 */
export interface CapabilityGap {
  id: string;
  description: string;
  domain: string;
  frequency: number;
  firstDetected: Date;
  lastDetected: Date;
  suggestedSources: string[];
  status: 'open' | 'addressed' | 'ignored';
}

/**
 * Gap report summary
 */
export interface GapReport {
  gaps: CapabilityGap[];
  totalMisses: number;
  topDomains: string[];
}

/**
 * Internal record of a single miss/fallback/correction signal
 */
interface GapSignal {
  type: 'miss' | 'fallback' | 'correction';
  query: string;
  context: string;
  timestamp: string;
}

/**
 * Serialized gap data for persistence
 */
interface StoredGapData {
  signals: GapSignal[];
  gaps: Array<Omit<CapabilityGap, 'firstDetected' | 'lastDetected'> & {
    firstDetected: string;
    lastDetected: string;
  }>;
}

/**
 * Detects capability gaps and outputs acquisition targets.
 */
export class GapDetector {
  private signals: GapSignal[];
  private gaps: Map<string, CapabilityGap>;
  private readonly storagePath: string;

  constructor(storagePath: string) {
    this.signals = [];
    this.gaps = new Map();
    this.storagePath = storagePath;
  }

  /**
   * Record an IntentMatcher miss or low-confidence route
   */
  recordMiss(query: string, context: string): void {
    this.signals.push({
      type: 'miss',
      query,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record when orchestrator fell back to raw LLM
   */
  recordFallback(query: string, reason: string): void {
    this.signals.push({
      type: 'fallback',
      query,
      context: reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record a user correction (they wanted something different)
   */
  recordCorrection(query: string, correction: string): void {
    this.signals.push({
      type: 'correction',
      query,
      context: correction,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Analyze signals and aggregate into capability gaps.
   * Groups similar queries by extracting domain keywords.
   */
  analyzeGaps(): CapabilityGap[] {
    // Group signals by domain (first significant keyword)
    const domainGroups = new Map<string, GapSignal[]>();

    for (const signal of this.signals) {
      const domain = this.extractDomain(signal.query);
      const existing = domainGroups.get(domain) ?? [];
      existing.push(signal);
      domainGroups.set(domain, existing);
    }

    // Convert groups to gaps
    for (const [domain, signals] of domainGroups) {
      const gapId = `gap-${domain}`;
      const existing = this.gaps.get(gapId);

      const timestamps = signals.map((s) => new Date(s.timestamp));
      const firstDetected = existing?.firstDetected ?? new Date(Math.min(...timestamps.map((t) => t.getTime())));
      const lastDetected = new Date(Math.max(...timestamps.map((t) => t.getTime())));

      this.gaps.set(gapId, {
        id: gapId,
        description: `Missing capability for "${domain}" domain queries`,
        domain,
        frequency: signals.length,
        firstDetected,
        lastDetected,
        suggestedSources: this.suggestSources(domain, signals),
        status: existing?.status ?? 'open',
      });
    }

    return Array.from(this.gaps.values());
  }

  /**
   * Get a formatted gap report
   */
  getGapReport(): GapReport {
    const gaps = this.analyzeGaps();

    // Count domains by frequency
    const domainFreq = new Map<string, number>();
    for (const gap of gaps) {
      domainFreq.set(gap.domain, (domainFreq.get(gap.domain) ?? 0) + gap.frequency);
    }

    const topDomains = Array.from(domainFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => domain);

    return {
      gaps: gaps.filter((g) => g.status === 'open'),
      totalMisses: this.signals.length,
      topDomains,
    };
  }

  /**
   * Mark a gap as addressed (skill has been acquired)
   */
  markAddressed(gapId: string): void {
    const gap = this.gaps.get(gapId);
    if (gap) {
      gap.status = 'addressed';
    }
  }

  /**
   * Persist gap data to JSON file
   */
  async save(): Promise<void> {
    const dir = path.dirname(this.storagePath);
    await fs.mkdir(dir, { recursive: true });

    const data: StoredGapData = {
      signals: this.signals,
      gaps: Array.from(this.gaps.values()).map((g) => ({
        ...g,
        firstDetected: g.firstDetected.toISOString(),
        lastDetected: g.lastDetected.toISOString(),
      })),
    };

    await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load gap data from JSON file
   */
  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      const data = JSON.parse(content) as StoredGapData;

      this.signals = data.signals ?? [];
      this.gaps.clear();

      for (const stored of data.gaps ?? []) {
        this.gaps.set(stored.id, {
          ...stored,
          firstDetected: new Date(stored.firstDetected),
          lastDetected: new Date(stored.lastDetected),
        });
      }
    } catch {
      // File doesn't exist or is invalid — start fresh
    }
  }

  /**
   * Extract a domain keyword from a query string
   */
  private extractDomain(query: string): string {
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    // Skip common verbs/articles, return first meaningful noun-like word
    const skipWords = new Set([
      'what', 'when', 'where', 'which', 'would', 'could', 'should',
      'have', 'that', 'this', 'with', 'from', 'they', 'been', 'were',
      'will', 'your', 'their', 'about', 'there', 'please', 'help',
      'want', 'need', 'like', 'make', 'know', 'find', 'show', 'tell',
    ]);

    for (const word of words) {
      if (!skipWords.has(word)) {
        return word;
      }
    }

    return words[0] ?? 'unknown';
  }

  /**
   * Suggest sources for addressing a gap based on domain and signals
   */
  private suggestSources(domain: string, signals: GapSignal[]): string[] {
    const sources: string[] = [];

    // Suggest based on signal types
    const hasMisses = signals.some((s) => s.type === 'miss');
    const hasCorrections = signals.some((s) => s.type === 'correction');

    if (hasMisses) {
      sources.push(`community-skills/${domain}`);
    }
    if (hasCorrections) {
      sources.push(`user-defined-skill/${domain}`);
    }
    if (signals.length >= 5) {
      sources.push(`skilljacked/${domain}`);
    }

    return sources;
  }
}
