/**
 * HierarchicalStore - In-memory Map-based store for hierarchical memory entries.
 *
 * Stores entries with 4-layer progressive disclosure (L0/L1/L2/L3).
 * Auto-generates L0/L1/L2 from L3 content via SummaryGenerator.
 */

import { randomUUID } from 'crypto';
import {
  HierarchicalEntry,
  MemoryLayer,
  QueryOptions,
  RetrievalStats,
  StoreConfig,
} from './types';
import { SummaryGenerator } from './SummaryGenerator';

export class HierarchicalStore {
  private readonly entries: Map<string, HierarchicalEntry> = new Map();
  private readonly summaryGenerator: SummaryGenerator;
  private readonly config: Required<StoreConfig>;

  constructor(summaryGenerator?: SummaryGenerator, config?: StoreConfig) {
    this.summaryGenerator = summaryGenerator ?? new SummaryGenerator();
    this.config = {
      maxEntries: config?.maxEntries ?? 10000,
      defaultTier: config?.defaultTier ?? 'work',
    };
  }

  /**
   * Store new content. Auto-generates L0/L1/L2 from the L3 full content.
   * Returns the entry ID.
   */
  async store(
    content: string,
    metadata?: {
      tier?: 'work' | 'learning' | 'archive' | 'crystal';
      metadata?: Record<string, unknown>;
      l3ContentRef?: string;
    }
  ): Promise<string> {
    const id = randomUUID();
    const layers = await this.summaryGenerator.generate(content);

    const entry: HierarchicalEntry = {
      id,
      l0Tags: layers.l0Tags,
      l1Summary: layers.l1Summary,
      l2Overview: layers.l2Overview,
      l3ContentRef: metadata?.l3ContentRef ?? `inline:${id}`,
      l3Content: content,
      tier: metadata?.tier ?? this.config.defaultTier,
      timestamp: new Date(),
      metadata: metadata?.metadata ?? {},
    };

    this.entries.set(id, entry);
    return id;
  }

  /**
   * Retrieve an entry at a specified layer depth.
   * Lower layers are cheaper (fewer tokens returned).
   */
  get(id: string, layer: MemoryLayer = MemoryLayer.L1): HierarchicalEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;

    // Return a copy with only the requested depth
    switch (layer) {
      case MemoryLayer.L0:
        return {
          ...entry,
          l1Summary: '',
          l2Overview: '',
          l3Content: undefined,
        };
      case MemoryLayer.L1:
        return {
          ...entry,
          l2Overview: '',
          l3Content: undefined,
        };
      case MemoryLayer.L2:
        return {
          ...entry,
          l3Content: undefined,
        };
      case MemoryLayer.L3:
        return { ...entry };
    }
  }

  /**
   * L0 tag-based search. Returns matching entry IDs.
   */
  query(tags: string[]): string[] {
    const lowerTags = tags.map((t) => t.toLowerCase());
    const results: string[] = [];

    for (const [id, entry] of this.entries) {
      const entryTagsLower = entry.l0Tags.map((t) => t.toLowerCase());
      const hasOverlap = lowerTags.some((tag) =>
        entryTagsLower.some((entryTag) => entryTag.includes(tag) || tag.includes(entryTag))
      );
      if (hasOverlap) {
        results.push(id);
      }
    }

    return results;
  }

  /**
   * Partial update of an entry.
   */
  update(id: string, updates: Partial<Omit<HierarchicalEntry, 'id'>>): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    const updated: HierarchicalEntry = {
      ...entry,
      ...updates,
      id: entry.id, // ID is immutable
    };
    this.entries.set(id, updated);
    return true;
  }

  /**
   * Remove an entry.
   */
  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Paginated listing with optional tier filter.
   */
  list(options?: QueryOptions): HierarchicalEntry[] {
    let results = Array.from(this.entries.values());

    if (options?.tier) {
      results = results.filter((e) => e.tier === options.tier);
    }

    if (options?.dateStart) {
      results = results.filter((e) => e.timestamp >= options.dateStart!);
    }

    if (options?.dateEnd) {
      results = results.filter((e) => e.timestamp <= options.dateEnd!);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Statistics about the store.
   */
  getStats(): RetrievalStats {
    const entriesByTier: Record<string, number> = {};
    let storageEstimateBytes = 0;

    for (const entry of this.entries.values()) {
      entriesByTier[entry.tier] = (entriesByTier[entry.tier] ?? 0) + 1;

      // Estimate storage: tags + summary + overview + content ref + content
      storageEstimateBytes += entry.l0Tags.join(',').length * 2;
      storageEstimateBytes += entry.l1Summary.length * 2;
      storageEstimateBytes += entry.l2Overview.length * 2;
      storageEstimateBytes += entry.l3ContentRef.length * 2;
      if (entry.l3Content) {
        storageEstimateBytes += entry.l3Content.length * 2;
      }
    }

    return {
      totalEntries: this.entries.size,
      entriesByTier,
      storageEstimateBytes,
    };
  }

  /**
   * Check if an entry exists.
   */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Get total entry count.
   */
  get size(): number {
    return this.entries.size;
  }
}
