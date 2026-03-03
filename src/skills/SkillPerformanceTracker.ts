/**
 * SkillPerformanceTracker - Tracks and compares skill performance
 *
 * Records per-skill metrics (invocations, success rate, timing, corrections)
 * and determines promotion eligibility by comparing community skills to baseline.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Metrics for a single skill
 */
export interface SkillMetrics {
  skillName: string;
  pool: string;
  invocationCount: number;
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
  userCorrections: number;
  lastInvoked: Date;
}

/**
 * Result of a promotion check
 */
export interface PromotionCheck {
  eligible: boolean;
  threshold: number;
  current: number;
}

/**
 * Result of comparing a community skill to a baseline skill
 */
export interface ComparisonResult {
  shouldPromote: boolean;
  confidence: number;
  reason: string;
}

/**
 * Input for recording a skill invocation
 */
export interface InvocationRecord {
  success: boolean;
  executionTime: number;
  userCorrected?: boolean;
}

/** Minimum invocations required before promotion is considered */
const MIN_INVOCATIONS_FOR_PROMOTION = 20;

/** Community skill must beat baseline by this margin (15%) */
const PROMOTION_THRESHOLD = 0.15;

/**
 * Internal storage format for metrics (Date serialized as ISO string)
 */
interface StoredMetrics {
  skillName: string;
  pool: string;
  invocationCount: number;
  successCount: number;
  failureCount: number;
  totalExecutionTime: number;
  userCorrections: number;
  lastInvoked: string;
}

/**
 * Tracks skill performance and determines promotion eligibility.
 */
export class SkillPerformanceTracker {
  private readonly metrics: Map<string, StoredMetrics>;
  private readonly storagePath: string;

  constructor(storagePath: string) {
    this.metrics = new Map();
    this.storagePath = storagePath;
  }

  /**
   * Record a skill invocation with its result
   */
  recordInvocation(
    skillName: string,
    result: InvocationRecord,
    pool: string = 'baseline'
  ): void {
    let stored = this.metrics.get(skillName);
    if (!stored) {
      stored = {
        skillName,
        pool,
        invocationCount: 0,
        successCount: 0,
        failureCount: 0,
        totalExecutionTime: 0,
        userCorrections: 0,
        lastInvoked: new Date().toISOString(),
      };
    }

    stored.invocationCount++;
    stored.totalExecutionTime += result.executionTime;
    stored.lastInvoked = new Date().toISOString();

    if (result.success) {
      stored.successCount++;
    } else {
      stored.failureCount++;
    }

    if (result.userCorrected) {
      stored.userCorrections++;
    }

    this.metrics.set(skillName, stored);
  }

  /**
   * Get metrics for a specific skill
   */
  getMetrics(skillName: string): SkillMetrics {
    const stored = this.metrics.get(skillName);
    if (!stored) {
      return {
        skillName,
        pool: 'unknown',
        invocationCount: 0,
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0,
        userCorrections: 0,
        lastInvoked: new Date(0),
      };
    }

    return {
      skillName: stored.skillName,
      pool: stored.pool,
      invocationCount: stored.invocationCount,
      successCount: stored.successCount,
      failureCount: stored.failureCount,
      avgExecutionTime:
        stored.invocationCount > 0
          ? stored.totalExecutionTime / stored.invocationCount
          : 0,
      userCorrections: stored.userCorrections,
      lastInvoked: new Date(stored.lastInvoked),
    };
  }

  /**
   * Compare a community skill's performance to a baseline skill
   */
  compareToBaseline(
    communitySkillName: string,
    baselineSkillName: string
  ): ComparisonResult {
    const community = this.getMetrics(communitySkillName);
    const baseline = this.getMetrics(baselineSkillName);

    if (community.invocationCount < MIN_INVOCATIONS_FOR_PROMOTION) {
      return {
        shouldPromote: false,
        confidence: 0,
        reason: `Insufficient invocations: ${community.invocationCount}/${MIN_INVOCATIONS_FOR_PROMOTION} required`,
      };
    }

    const communitySuccessRate =
      community.invocationCount > 0
        ? community.successCount / community.invocationCount
        : 0;

    const baselineSuccessRate =
      baseline.invocationCount > 0
        ? baseline.successCount / baseline.invocationCount
        : 0;

    const improvement = communitySuccessRate - baselineSuccessRate;
    const shouldPromote = improvement > PROMOTION_THRESHOLD;

    // Confidence based on sample size — caps at 1.0 when both have 50+ invocations
    const sampleConfidence = Math.min(
      community.invocationCount / 50,
      baseline.invocationCount > 0 ? baseline.invocationCount / 50 : 0.5
    );
    const confidence = Math.min(sampleConfidence, 1.0);

    const reason = shouldPromote
      ? `Community skill outperforms baseline by ${(improvement * 100).toFixed(1)}% (threshold: ${PROMOTION_THRESHOLD * 100}%)`
      : `Improvement ${(improvement * 100).toFixed(1)}% does not meet threshold ${PROMOTION_THRESHOLD * 100}%`;

    return { shouldPromote, confidence, reason };
  }

  /**
   * Get top performing skills by success rate
   */
  getTopPerformers(limit: number): SkillMetrics[] {
    const allMetrics = Array.from(this.metrics.keys()).map((name) =>
      this.getMetrics(name)
    );

    return allMetrics
      .filter((m) => m.invocationCount > 0)
      .sort((a, b) => {
        const aRate = a.successCount / a.invocationCount;
        const bRate = b.successCount / b.invocationCount;
        return bRate - aRate;
      })
      .slice(0, limit);
  }

  /**
   * Check if a skill is eligible for promotion
   */
  checkPromotion(skillName: string): PromotionCheck {
    const metrics = this.getMetrics(skillName);
    const successRate =
      metrics.invocationCount > 0
        ? metrics.successCount / metrics.invocationCount
        : 0;

    return {
      eligible: metrics.invocationCount >= MIN_INVOCATIONS_FOR_PROMOTION,
      threshold: MIN_INVOCATIONS_FOR_PROMOTION,
      current: successRate,
    };
  }

  /**
   * Persist metrics to a JSON file
   */
  async save(): Promise<void> {
    const dir = path.dirname(this.storagePath);
    await fs.mkdir(dir, { recursive: true });

    const data = Object.fromEntries(this.metrics);
    await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load metrics from a JSON file
   */
  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      const data = JSON.parse(content) as Record<string, StoredMetrics>;
      this.metrics.clear();
      for (const [key, value] of Object.entries(data)) {
        this.metrics.set(key, value);
      }
    } catch {
      // File doesn't exist or is invalid — start fresh
    }
  }
}
