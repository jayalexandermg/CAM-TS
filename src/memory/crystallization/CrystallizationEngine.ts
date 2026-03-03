/**
 * CrystallizationEngine - Distills recurring patterns from learning tier
 * entries into dense "crystal" entries.
 *
 * Crystals are L2-only entries (they ARE the compressed form).
 * They capture patterns like: "When X conditions occur, do Y action."
 */

import { HierarchicalEntry } from '../hierarchical/types';

export interface Crystal {
  patternName: string;
  conditions: string[];
  recommendedAction: string;
  confidence: number;
  sourceCount: number;
  sourceIds: string[];
}

interface EntryCluster {
  entries: HierarchicalEntry[];
  sharedTags: string[];
}

/** Minimum tag overlap ratio to consider entries similar */
const MIN_OVERLAP_RATIO = 0.5;
/** Minimum cluster size before crystallization */
const MIN_CLUSTER_SIZE = 3;

export class CrystallizationEngine {
  /**
   * Check if there are enough similar entries to warrant crystallization.
   */
  shouldCrystallize(entries: HierarchicalEntry[]): boolean {
    const clusters = this.clusterByTags(entries);
    return clusters.some((c) => c.entries.length >= MIN_CLUSTER_SIZE);
  }

  /**
   * Analyze entries from learning tier, group by semantic similarity,
   * and synthesize each cluster into a crystal.
   */
  crystallize(entries: HierarchicalEntry[]): Crystal[] {
    const clusters = this.clusterByTags(entries);
    const crystals: Crystal[] = [];

    for (const cluster of clusters) {
      if (cluster.entries.length < MIN_CLUSTER_SIZE) continue;

      const crystal = this.synthesizeCrystal(cluster);
      crystals.push(crystal);
    }

    return crystals;
  }

  /**
   * Group entries by tag overlap. Entries with >50% shared tags
   * are placed in the same cluster.
   */
  private clusterByTags(entries: HierarchicalEntry[]): EntryCluster[] {
    const clusters: EntryCluster[] = [];
    const assigned = new Set<string>();

    for (const entry of entries) {
      if (assigned.has(entry.id)) continue;

      const cluster: EntryCluster = {
        entries: [entry],
        sharedTags: [...entry.l0Tags],
      };
      assigned.add(entry.id);

      // Find all entries similar to this one
      for (const candidate of entries) {
        if (assigned.has(candidate.id)) continue;

        const overlap = this.tagOverlap(entry.l0Tags, candidate.l0Tags);
        if (overlap >= MIN_OVERLAP_RATIO) {
          cluster.entries.push(candidate);
          assigned.add(candidate.id);

          // Update shared tags to intersection
          cluster.sharedTags = cluster.sharedTags.filter((tag) =>
            candidate.l0Tags.some(
              (ct) => ct.toLowerCase() === tag.toLowerCase()
            )
          );
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Calculate tag overlap ratio between two tag sets.
   * Returns the fraction of the smaller set that appears in the larger set.
   */
  private tagOverlap(tagsA: string[], tagsB: string[]): number {
    if (tagsA.length === 0 || tagsB.length === 0) return 0;

    const setA = new Set(tagsA.map((t) => t.toLowerCase()));
    const setB = new Set(tagsB.map((t) => t.toLowerCase()));
    const smaller = setA.size <= setB.size ? setA : setB;
    const larger = setA.size <= setB.size ? setB : setA;

    let overlapCount = 0;
    for (const tag of smaller) {
      if (larger.has(tag)) overlapCount++;
    }

    return overlapCount / smaller.size;
  }

  /**
   * Synthesize a crystal from a cluster of similar entries.
   * Extracts the common pattern, conditions, and recommended action.
   */
  private synthesizeCrystal(cluster: EntryCluster): Crystal {
    const entries = cluster.entries;

    // Pattern name from shared tags
    const patternName = cluster.sharedTags.length > 0
      ? cluster.sharedTags.slice(0, 3).join(' + ')
      : `Pattern from ${entries.length} entries`;

    // Extract conditions from L1 summaries (common themes)
    const conditions = this.extractConditions(entries);

    // Recommended action from L2 overviews (most common actionable phrase)
    const recommendedAction = this.extractRecommendedAction(entries);

    // Confidence based on cluster size and tag overlap
    const avgOverlap = this.averagePairwiseOverlap(entries);
    const sizeBonus = Math.min(entries.length / 10, 0.3);
    const confidence = Math.min(avgOverlap + sizeBonus, 1.0);

    return {
      patternName,
      conditions,
      recommendedAction,
      confidence,
      sourceCount: entries.length,
      sourceIds: entries.map((e) => e.id),
    };
  }

  /**
   * Extract common conditions from entry summaries.
   */
  private extractConditions(entries: HierarchicalEntry[]): string[] {
    // Use L1 summaries as condition sources
    const summaries = entries.map((e) => e.l1Summary).filter((s) => s.length > 0);
    if (summaries.length === 0) return ['No clear conditions identified'];

    // Find common keywords across summaries
    const wordCounts = new Map<string, number>();
    for (const summary of summaries) {
      const words = new Set(
        summary
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 4)
      );
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
    }

    // Words appearing in at least half the summaries are "conditions"
    const threshold = Math.ceil(summaries.length / 2);
    const commonWords = Array.from(wordCounts.entries())
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);

    if (commonWords.length === 0) {
      return [summaries[0]];
    }

    // Return top conditions as phrases
    return commonWords.slice(0, 5).map((w) => `Involves: ${w}`);
  }

  /**
   * Extract a recommended action from entry overviews.
   */
  private extractRecommendedAction(entries: HierarchicalEntry[]): string {
    // Use the longest L2 overview as the most informative action source
    const overviews = entries
      .map((e) => e.l2Overview)
      .filter((o) => o.length > 0)
      .sort((a, b) => b.length - a.length);

    if (overviews.length === 0) {
      // Fallback to L1 summaries
      const summaries = entries.map((e) => e.l1Summary).filter((s) => s.length > 0);
      return summaries[0] ?? 'No action identified';
    }

    // Take the first sentence of the most detailed overview
    const best = overviews[0];
    const firstSentence = best.match(/^(.+?[.!?])\s/);
    return firstSentence ? firstSentence[1] : best.slice(0, 200);
  }

  /**
   * Calculate average pairwise tag overlap in a set of entries.
   */
  private averagePairwiseOverlap(entries: HierarchicalEntry[]): number {
    if (entries.length < 2) return 0;

    let totalOverlap = 0;
    let pairs = 0;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        totalOverlap += this.tagOverlap(entries[i].l0Tags, entries[j].l0Tags);
        pairs++;
      }
    }

    return pairs > 0 ? totalOverlap / pairs : 0;
  }
}
