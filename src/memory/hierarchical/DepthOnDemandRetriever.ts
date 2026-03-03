/**
 * DepthOnDemandRetriever - Progressive retrieval engine.
 *
 * The key innovation: only burn tokens on full recall after confirming
 * relevance through cheaper layers.
 *
 * Step 1: L0 scan - keyword match against all entry tags (~5 tokens x N)
 * Step 2: L1 filter - load summaries for top candidates, score relevance
 * Step 3: L2 confirm - load overviews for remaining candidates, final ranking
 * Step 4: L3 load - load full content ONLY for top results
 */

import { HierarchicalEntry, MemoryLayer, RetrievalResult } from './types';
import { HierarchicalStore } from './HierarchicalStore';

export interface RetrievalOptions {
  /** Maximum depth to retrieve (default: L3) */
  maxDepth?: MemoryLayer;
  /** Number of final results to return (default: 5) */
  topK?: number;
  /** Number of L1 candidates to consider (default: 20) */
  l1CandidateLimit?: number;
  /** Filter by tier */
  tier?: 'work' | 'learning' | 'archive' | 'crystal';
}

/** Average token estimates per layer */
const TOKENS_PER_L0 = 5;
const TOKENS_PER_L3_AVG = 500;

export class DepthOnDemandRetriever {
  private readonly store: HierarchicalStore;

  constructor(store: HierarchicalStore) {
    this.store = store;
  }

  /**
   * Progressive retrieval: scan cheap layers first, only load expensive
   * L3 content for confirmed-relevant entries.
   */
  retrieve(query: string, options?: RetrievalOptions): RetrievalResult {
    const maxDepth = options?.maxDepth ?? MemoryLayer.L3;
    const topK = options?.topK ?? 5;
    const l1CandidateLimit = options?.l1CandidateLimit ?? 20;
    const layersAccessed: Set<MemoryLayer> = new Set();

    // Extract query keywords for matching
    const queryKeywords = this.extractKeywords(query);

    // Step 1: L0 scan - tag-based search across all entries
    layersAccessed.add(MemoryLayer.L0);
    const l0Matches = this.store.query(queryKeywords);
    let candidates = l0Matches;

    // Apply tier filter if specified
    if (options?.tier) {
      candidates = candidates.filter((id) => {
        const entry = this.store.get(id, MemoryLayer.L0);
        return entry?.tier === options.tier;
      });
    }

    const totalCandidates = candidates.length;

    if (maxDepth === MemoryLayer.L0 || candidates.length === 0) {
      return this.buildResult(candidates, topK, MemoryLayer.L0, layersAccessed, totalCandidates);
    }

    // Step 2: L1 filter - score summaries for top candidates
    layersAccessed.add(MemoryLayer.L1);
    const l1Scored = candidates
      .map((id) => {
        const entry = this.store.get(id, MemoryLayer.L1);
        if (!entry) return { id, score: 0 };
        const score = this.scoreRelevance(queryKeywords, entry.l1Summary, entry.l0Tags);
        return { id, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, l1CandidateLimit);

    candidates = l1Scored.map((s) => s.id);

    if (maxDepth === MemoryLayer.L1 || candidates.length === 0) {
      return this.buildResult(candidates, topK, MemoryLayer.L1, layersAccessed, totalCandidates);
    }

    // Step 3: L2 confirm - load overviews for final relevance ranking
    layersAccessed.add(MemoryLayer.L2);
    const l2Scored = candidates
      .map((id) => {
        const entry = this.store.get(id, MemoryLayer.L2);
        if (!entry) return { id, score: 0 };
        const score = this.scoreRelevance(
          queryKeywords,
          `${entry.l1Summary} ${entry.l2Overview}`,
          entry.l0Tags
        );
        return { id, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    candidates = l2Scored.map((s) => s.id);

    if (maxDepth === MemoryLayer.L2 || candidates.length === 0) {
      return this.buildResult(candidates, topK, MemoryLayer.L2, layersAccessed, totalCandidates);
    }

    // Step 4: L3 load - full content for top results only
    layersAccessed.add(MemoryLayer.L3);
    return this.buildResult(candidates, topK, MemoryLayer.L3, layersAccessed, totalCandidates);
  }

  private buildResult(
    candidateIds: string[],
    topK: number,
    layer: MemoryLayer,
    layersAccessed: Set<MemoryLayer>,
    totalCandidates: number
  ): RetrievalResult {
    const finalIds = candidateIds.slice(0, topK);
    const entries: HierarchicalEntry[] = [];

    for (const id of finalIds) {
      const entry = this.store.get(id, layer);
      if (entry) {
        entries.push(entry);
      }
    }

    // Estimate tokens saved:
    // Without hierarchy: all candidates would load L3 (~500 tokens each)
    // With hierarchy: only loaded L3 for final entries
    const l3LoadedCount = layer === MemoryLayer.L3 ? entries.length : 0;
    const wouldHaveLoaded = totalCandidates * TOKENS_PER_L3_AVG;
    const actuallyLoaded =
      totalCandidates * TOKENS_PER_L0 + l3LoadedCount * TOKENS_PER_L3_AVG;
    const tokensSaved = Math.max(0, wouldHaveLoaded - actuallyLoaded);

    return {
      entries,
      layersAccessed: Array.from(layersAccessed),
      tokensSaved,
      totalCandidates,
    };
  }

  /**
   * Extract keywords from a query string for matching.
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
      'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither',
      'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other',
      'some', 'such', 'than', 'too', 'very', 'just', 'about', 'how',
      'what', 'when', 'where', 'who', 'which', 'why', 'this', 'that', 'it',
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9_/.-]/g, ''))
      .filter((w) => w.length >= 2 && !stopWords.has(w));
  }

  /**
   * Score relevance of an entry against query keywords.
   * Uses keyword overlap between query and entry text + tags.
   */
  private scoreRelevance(queryKeywords: string[], text: string, tags: string[]): number {
    if (queryKeywords.length === 0) return 0;

    const textLower = text.toLowerCase();
    const tagsLower = tags.map((t) => t.toLowerCase());
    let matches = 0;

    for (const keyword of queryKeywords) {
      // Check text content
      if (textLower.includes(keyword)) {
        matches += 1;
      }
      // Check tags (weighted higher)
      if (tagsLower.some((tag) => tag.includes(keyword) || keyword.includes(tag))) {
        matches += 2;
      }
    }

    return matches / queryKeywords.length;
  }
}
