/**
 * Infinite Aura - Interestingness Scorer
 *
 * Analyzes events and calculates interestingness scores based on learning indicators.
 */

import { HookEvent } from '../hooks/types';
import {
  LearningIndicator,
  InterestingnessScore,
  InterestingnessConfig,
  IndicatorDetectionConfig,
  DEFAULT_INTERESTINGNESS_CONFIG,
  DEFAULT_INDICATOR_WEIGHTS,
  DEFAULT_INDICATOR_DETECTION,
} from './types';

/**
 * Options for creating an InterestingnessScorer
 */
export interface InterestingnessScorerOptions {
  /** Interestingness configuration */
  config?: Partial<InterestingnessConfig>;
  /** Custom indicator detection configuration */
  indicatorDetection?: Partial<Record<LearningIndicator, Partial<IndicatorDetectionConfig>>>;
}

/**
 * Scores events for interestingness based on learning indicators
 */
export class InterestingnessScorer {
  private readonly config: InterestingnessConfig;
  private readonly indicatorDetection: Record<LearningIndicator, IndicatorDetectionConfig>;

  constructor(options: InterestingnessScorerOptions = {}) {
    // Merge config with defaults
    this.config = {
      ...DEFAULT_INTERESTINGNESS_CONFIG,
      ...options.config,
      indicatorWeights: {
        ...DEFAULT_INDICATOR_WEIGHTS,
        ...options.config?.indicatorWeights,
      },
    };

    // Merge indicator detection with defaults
    this.indicatorDetection = { ...DEFAULT_INDICATOR_DETECTION };
    if (options.indicatorDetection) {
      for (const [indicator, detection] of Object.entries(options.indicatorDetection)) {
        const ind = indicator as LearningIndicator;
        if (detection) {
          this.indicatorDetection[ind] = {
            ...DEFAULT_INDICATOR_DETECTION[ind],
            ...detection,
            keywords: detection.keywords || DEFAULT_INDICATOR_DETECTION[ind].keywords,
            patterns: detection.patterns || DEFAULT_INDICATOR_DETECTION[ind].patterns,
            tags: detection.tags || DEFAULT_INDICATOR_DETECTION[ind].tags,
          };
        }
      }
    }
  }

  /**
   * Score an event for interestingness
   */
  score(event: HookEvent): InterestingnessScore {
    const indicators = this.detectIndicators(event);
    const score = this.calculateScore(indicators);
    const reasons = this.generateReasons(event, indicators);
    const confidence = this.calculateConfidence(event, indicators);

    return {
      score,
      indicators,
      reasons,
      confidence,
    };
  }

  /**
   * Detect learning indicators in an event
   */
  private detectIndicators(event: HookEvent): LearningIndicator[] {
    const detected: Set<LearningIndicator> = new Set();
    const content = event.content.toLowerCase();
    const metadataTags = this.extractMetadataTags(event);

    // Check each indicator
    for (const indicator of Object.values(LearningIndicator)) {
      if (this.detectSingleIndicator(indicator, content, metadataTags, event)) {
        detected.add(indicator);
      }
    }

    return Array.from(detected);
  }

  /**
   * Detect a single indicator
   */
  private detectSingleIndicator(
    indicator: LearningIndicator,
    content: string,
    metadataTags: string[],
    event: HookEvent
  ): boolean {
    const detection = this.indicatorDetection[indicator];

    // Check keywords
    for (const keyword of detection.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // Check patterns
    for (const pattern of detection.patterns) {
      if (pattern.test(event.content)) {
        return true;
      }
    }

    // Check tags
    for (const tag of detection.tags) {
      if (metadataTags.includes(tag.toLowerCase())) {
        return true;
      }
    }

    // Special case: FAILURE indicator for error event types
    if (indicator === LearningIndicator.FAILURE) {
      if (event.metadata.error || event.metadata.exception || event.metadata.isError) {
        return true;
      }
    }

    // Special case: USER_FEEDBACK indicator for user feedback flag
    if (indicator === LearningIndicator.USER_FEEDBACK) {
      if (event.metadata.userFeedback || event.metadata.isUserFeedback) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract tags from event metadata
   */
  private extractMetadataTags(event: HookEvent): string[] {
    const tags: string[] = [];

    if (Array.isArray(event.metadata.tags)) {
      for (const tag of event.metadata.tags) {
        if (typeof tag === 'string') {
          tags.push(tag.toLowerCase());
        }
      }
    }

    // Also check for indicator-specific metadata
    if (event.metadata.learningIndicators && Array.isArray(event.metadata.learningIndicators)) {
      for (const indicator of event.metadata.learningIndicators) {
        if (typeof indicator === 'string') {
          tags.push(indicator.toLowerCase());
        }
      }
    }

    return tags;
  }

  /**
   * Calculate score based on detected indicators
   */
  private calculateScore(indicators: LearningIndicator[]): number {
    if (indicators.length === 0) {
      return 0;
    }

    // Calculate weighted average
    let totalWeight = 0;
    for (const indicator of indicators) {
      const weight =
        this.config.indicatorWeights[indicator] ?? DEFAULT_INDICATOR_WEIGHTS[indicator];
      totalWeight += weight;
    }

    // Average weight, capped at 1.0
    const score = totalWeight / indicators.length;
    return Math.min(score, 1.0);
  }

  /**
   * Generate reasons explaining the score
   */
  private generateReasons(event: HookEvent, indicators: LearningIndicator[]): string[] {
    const reasons: string[] = [];
    const content = event.content.toLowerCase();
    const metadataTags = this.extractMetadataTags(event);

    for (const indicator of indicators) {
      const detection = this.indicatorDetection[indicator];
      const indicatorName = this.formatIndicatorName(indicator);

      // Find which keyword matched
      for (const keyword of detection.keywords) {
        if (content.includes(keyword.toLowerCase())) {
          reasons.push(`Detected ${indicatorName} indicator (keyword: '${keyword}')`);
          break;
        }
      }

      // Find which pattern matched
      for (const pattern of detection.patterns) {
        if (pattern.test(event.content)) {
          reasons.push(`Detected ${indicatorName} indicator (pattern match)`);
          break;
        }
      }

      // Find which tag matched
      for (const tag of detection.tags) {
        if (metadataTags.includes(tag.toLowerCase())) {
          reasons.push(`Detected ${indicatorName} indicator (tag: '${tag}')`);
          break;
        }
      }

      // Special cases
      if (indicator === LearningIndicator.FAILURE) {
        if (event.metadata.error || event.metadata.exception || event.metadata.isError) {
          reasons.push(`Detected ${indicatorName} indicator (error metadata)`);
        }
      }

      if (indicator === LearningIndicator.USER_FEEDBACK) {
        if (event.metadata.userFeedback || event.metadata.isUserFeedback) {
          reasons.push(`Detected ${indicatorName} indicator (user feedback metadata)`);
        }
      }
    }

    if (reasons.length === 0 && indicators.length === 0) {
      reasons.push('No learning indicators detected');
    }

    // Remove duplicates
    return [...new Set(reasons)];
  }

  /**
   * Format indicator name for display
   */
  private formatIndicatorName(indicator: LearningIndicator): string {
    return indicator
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Calculate confidence in the score
   */
  private calculateConfidence(event: HookEvent, indicators: LearningIndicator[]): number {
    if (indicators.length === 0) {
      return 0.1; // Low confidence when no indicators
    }

    let confidence = 0;
    const content = event.content.toLowerCase();
    const metadataTags = this.extractMetadataTags(event);

    // Base confidence from number of indicators
    // Multiple indicators = higher confidence
    if (indicators.length >= 3) {
      confidence += 0.4;
    } else if (indicators.length >= 2) {
      confidence += 0.3;
    } else {
      confidence += 0.2;
    }

    // Confidence boost from clear keywords
    let keywordMatches = 0;
    for (const indicator of indicators) {
      const detection = this.indicatorDetection[indicator];
      for (const keyword of detection.keywords) {
        if (content.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }
    }
    confidence += Math.min(keywordMatches * 0.1, 0.3);

    // Confidence boost from metadata tags
    let tagMatches = 0;
    for (const indicator of indicators) {
      const detection = this.indicatorDetection[indicator];
      for (const tag of detection.tags) {
        if (metadataTags.includes(tag.toLowerCase())) {
          tagMatches++;
        }
      }
    }
    confidence += Math.min(tagMatches * 0.15, 0.3);

    // Confidence boost from content length (longer content = more context)
    if (event.content.length > 100) {
      confidence += 0.1;
    } else if (event.content.length > 50) {
      confidence += 0.05;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
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

    return true;
  }

  /**
   * Get the highest weighted indicator from a list
   */
  getHighestWeightedIndicator(indicators: LearningIndicator[]): LearningIndicator | undefined {
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
   * Get the current configuration
   */
  getConfig(): Readonly<InterestingnessConfig> {
    return { ...this.config };
  }

  /**
   * Get indicator detection configuration
   */
  getIndicatorDetection(): Readonly<Record<LearningIndicator, IndicatorDetectionConfig>> {
    return { ...this.indicatorDetection };
  }
}
