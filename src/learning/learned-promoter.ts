/**
 * Infinite Aura - Learned Event Promoter
 *
 * Promotes high-score events to the learned/ directory for future reference.
 */

import { HookEvent } from '../hooks/types';
import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { FileNamingConvention } from '../memory/file-naming';
import {
  LearningIndicator,
  InterestingnessScore,
  InterestingnessConfig,
  LearnedEvent,
  PromotionResult,
  DEFAULT_INTERESTINGNESS_CONFIG,
  DEFAULT_INDICATOR_WEIGHTS,
} from './types';

/**
 * Options for creating a LearnedPromoter
 */
export interface LearnedPromoterOptions {
  /** Interestingness configuration */
  config?: Partial<InterestingnessConfig>;
  /** Base directory for learned events (default: 'learned') */
  learnedBaseDir?: string;
}

/**
 * Promotes high-score events to the learned/ directory
 */
export class LearnedPromoter {
  private readonly config: InterestingnessConfig;
  private readonly learnedBaseDir: string;
  private readonly filenameCache: Map<string, string> = new Map();
  private readonly fileNaming: FileNamingConvention;

  constructor(
    private readonly fileOps: FileOperations,
    private readonly dirOps: DirectoryOperations,
    options: LearnedPromoterOptions = {}
  ) {
    this.config = {
      ...DEFAULT_INTERESTINGNESS_CONFIG,
      ...options.config,
      indicatorWeights: {
        ...DEFAULT_INDICATOR_WEIGHTS,
        ...options.config?.indicatorWeights,
      },
    };
    this.learnedBaseDir = options.learnedBaseDir || 'learned';
    this.fileNaming = new FileNamingConvention();
  }

  /**
   * Promote an event to the learned/ directory
   */
  async promote(
    event: HookEvent,
    score: InterestingnessScore,
    sourceDirectory: string
  ): Promise<PromotionResult> {
    // Check if promotion should occur
    if (!this.shouldPromote(score)) {
      return {
        attempted: false,
        success: false,
        reason: this.getNoPromotionReason(score),
      };
    }

    try {
      // Create learned event
      const learnedEvent = this.createLearnedEvent(event, score, sourceDirectory);

      // Write to learned directory
      const filePath = await this.writeLearnedEvent(learnedEvent, score);

      return {
        attempted: true,
        success: true,
        path: filePath,
      };
    } catch (error) {
      return {
        attempted: true,
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error during promotion',
      };
    }
  }

  /**
   * Check if a score meets promotion criteria
   */
  shouldPromote(score: InterestingnessScore): boolean {
    if (!this.config.enableAutoPromotion) {
      return false;
    }

    if (score.score < this.config.minScoreForPromotion) {
      return false;
    }

    if (score.confidence < this.config.minConfidenceForPromotion) {
      return false;
    }

    if (score.indicators.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get reason why promotion was not done
   */
  private getNoPromotionReason(score: InterestingnessScore): string {
    if (!this.config.enableAutoPromotion) {
      return 'Auto-promotion is disabled';
    }

    if (score.score < this.config.minScoreForPromotion) {
      return `Score ${score.score.toFixed(2)} is below threshold ${this.config.minScoreForPromotion}`;
    }

    if (score.confidence < this.config.minConfidenceForPromotion) {
      return `Confidence ${score.confidence.toFixed(2)} is below threshold ${this.config.minConfidenceForPromotion}`;
    }

    if (score.indicators.length === 0) {
      return 'No learning indicators detected';
    }

    return 'Unknown reason';
  }

  /**
   * Create a LearnedEvent wrapper
   */
  createLearnedEvent(
    event: HookEvent,
    score: InterestingnessScore,
    sourceDirectory: string
  ): LearnedEvent {
    return {
      originalEvent: event,
      interestingnessScore: score,
      promotedAt: new Date().toISOString(),
      learnedFrom: sourceDirectory,
    };
  }

  /**
   * Write a learned event to the learned/ directory
   */
  private async writeLearnedEvent(
    learnedEvent: LearnedEvent,
    score: InterestingnessScore
  ): Promise<string> {
    // Ensure learned directory exists
    await this.dirOps.ensureDirectory(this.learnedBaseDir);

    // Get or generate filename
    const filename = this.getOrGenerateFilename(score);
    const filePath = `${this.learnedBaseDir}/${filename}`;

    // Write as JSONL (append if file exists)
    const jsonLine = JSON.stringify(learnedEvent);
    await this.fileOps.appendFile(filePath, jsonLine);

    return filePath;
  }

  /**
   * Get or generate a filename for the learned event
   */
  private getOrGenerateFilename(score: InterestingnessScore): string {
    // Generate a cache key based on the current day and highest indicator
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const highestIndicator = this.getHighestWeightedIndicator(score.indicators);
    const cacheKey = `${today}_${highestIndicator || 'general'}`;

    // Check cache
    const cached = this.filenameCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate new filename
    const indicatorType = highestIndicator?.toUpperCase() || 'LEARNED';
    const description = this.generateDescription(score);
    const filename = this.fileNaming.generateFilename(indicatorType, description, 'jsonl');

    // Cache it
    this.filenameCache.set(cacheKey, filename);

    return filename;
  }

  /**
   * Generate a description for the filename
   */
  private generateDescription(score: InterestingnessScore): string {
    if (score.indicators.length === 0) {
      return 'general-events';
    }

    if (score.indicators.length === 1) {
      return score.indicators[0].replace('_', '-');
    }

    // Multiple indicators - use top 2
    const sorted = [...score.indicators].sort((a, b) => {
      const weightA = this.config.indicatorWeights[a] ?? DEFAULT_INDICATOR_WEIGHTS[a];
      const weightB = this.config.indicatorWeights[b] ?? DEFAULT_INDICATOR_WEIGHTS[b];
      return weightB - weightA;
    });

    return `${sorted[0].replace('_', '-')}-${sorted[1].replace('_', '-')}`;
  }

  /**
   * Get the highest weighted indicator from a list
   */
  private getHighestWeightedIndicator(
    indicators: LearningIndicator[]
  ): LearningIndicator | undefined {
    if (indicators.length === 0) {
      return undefined;
    }

    let highest: LearningIndicator = indicators[0];
    let highestWeight = this.config.indicatorWeights[highest] ?? DEFAULT_INDICATOR_WEIGHTS[highest];

    for (const indicator of indicators) {
      const weight =
        this.config.indicatorWeights[indicator] ?? DEFAULT_INDICATOR_WEIGHTS[indicator];
      if (weight > highestWeight) {
        highest = indicator;
        highestWeight = weight;
      }
    }

    return highest;
  }

  /**
   * Force promotion of an event (bypasses threshold checks)
   */
  async forcePromote(
    event: HookEvent,
    score: InterestingnessScore,
    sourceDirectory: string
  ): Promise<PromotionResult> {
    try {
      const learnedEvent = this.createLearnedEvent(event, score, sourceDirectory);
      const filePath = await this.writeLearnedEvent(learnedEvent, score);

      return {
        attempted: true,
        success: true,
        path: filePath,
      };
    } catch (error) {
      return {
        attempted: true,
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error during force promotion',
      };
    }
  }

  /**
   * Reset filename cache (useful for testing or new sessions)
   */
  resetFilenameCache(): void {
    this.filenameCache.clear();
  }

  /**
   * Get the number of cached filenames
   */
  getCachedFilenameCount(): number {
    return this.filenameCache.size;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<InterestingnessConfig> {
    return { ...this.config };
  }

  /**
   * Get the learned base directory
   */
  getLearnedBaseDir(): string {
    return this.learnedBaseDir;
  }
}
