/**
 * Hierarchical Memory Types
 *
 * 4-layer progressive disclosure system:
 * - L0: Tags (~5-10 tokens) - cheapest scan
 * - L1: Summary (~20-30 tokens) - one-sentence filter
 * - L2: Overview (~100-200 tokens) - 3-5 sentence confirm
 * - L3: Full content - only loaded when confirmed relevant
 */

export enum MemoryLayer {
  L0 = 'L0',
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
}

export interface HierarchicalEntry {
  id: string;
  /** ~5-10 tokens: topics, keywords, entity names, file paths */
  l0Tags: string[];
  /** ~20-30 tokens: one-sentence imperative summary */
  l1Summary: string;
  /** ~100-200 tokens: 3-5 sentence overview with key details */
  l2Overview: string;
  /** File path or inline content reference for full memory */
  l3ContentRef: string;
  /** Lazily loaded full content (only populated on L3 retrieval) */
  l3Content?: string;
  tier: 'work' | 'learning' | 'archive' | 'crystal';
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface QueryOptions {
  /** Filter by tier */
  tier?: 'work' | 'learning' | 'archive' | 'crystal';
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Date range start (inclusive) */
  dateStart?: Date;
  /** Date range end (inclusive) */
  dateEnd?: Date;
}

export interface RetrievalResult {
  entries: HierarchicalEntry[];
  layersAccessed: MemoryLayer[];
  tokensSaved: number;
  totalCandidates: number;
}

export interface RetrievalStats {
  totalEntries: number;
  entriesByTier: Record<string, number>;
  storageEstimateBytes: number;
}

export interface StoreConfig {
  /** Maximum entries before eviction warnings (default: 10000) */
  maxEntries?: number;
  /** Default tier for new entries (default: 'work') */
  defaultTier?: 'work' | 'learning' | 'archive' | 'crystal';
}
