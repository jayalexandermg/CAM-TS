/**
 * Infinite Aura - Learning Types
 *
 * Types for interestingness scoring and learning indicators.
 */

import { HookEvent } from '../hooks/types';

/**
 * Learning indicators that identify high-signal events
 */
export enum LearningIndicator {
  DECISION = 'decision', // Important choice made
  BREAKTHROUGH = 'breakthrough', // New insight discovered
  FAILURE = 'failure', // Error or mistake
  PATTERN = 'pattern', // Recurring theme
  USER_FEEDBACK = 'user_feedback', // Explicit user signal
  CONSTRAINT = 'constraint', // Limitation discovered
  OPTIMIZATION = 'optimization', // Improvement found
  QUESTION = 'question', // Unanswered question
  HYPOTHESIS = 'hypothesis', // Theory to test
  VALIDATION = 'validation', // Hypothesis confirmed/rejected
}

/**
 * Interestingness score for an event
 */
export interface InterestingnessScore {
  /** Score from 0.0 to 1.0 */
  score: number;
  /** Which learning indicators were detected */
  indicators: LearningIndicator[];
  /** Reasons explaining the score */
  reasons: string[];
  /** Confidence in the score (0.0-1.0) */
  confidence: number;
}

/**
 * Configuration for interestingness scoring
 */
export interface InterestingnessConfig {
  /** Minimum score required to promote to learned/ (default: 0.7) */
  minScoreForPromotion: number;
  /** Weight for each indicator (affects final score) */
  indicatorWeights: Partial<Record<LearningIndicator, number>>;
  /** Whether to automatically promote high-score events */
  enableAutoPromotion: boolean;
  /** Minimum confidence required for promotion (default: 0.5) */
  minConfidenceForPromotion: number;
}

/**
 * Default indicator weights
 */
export const DEFAULT_INDICATOR_WEIGHTS: Record<LearningIndicator, number> = {
  [LearningIndicator.DECISION]: 0.7,
  [LearningIndicator.BREAKTHROUGH]: 0.9,
  [LearningIndicator.FAILURE]: 0.8,
  [LearningIndicator.PATTERN]: 0.85,
  [LearningIndicator.USER_FEEDBACK]: 0.95,
  [LearningIndicator.CONSTRAINT]: 0.75,
  [LearningIndicator.OPTIMIZATION]: 0.8,
  [LearningIndicator.QUESTION]: 0.6,
  [LearningIndicator.HYPOTHESIS]: 0.7,
  [LearningIndicator.VALIDATION]: 0.85,
};

/**
 * Default interestingness configuration
 */
export const DEFAULT_INTERESTINGNESS_CONFIG: InterestingnessConfig = {
  minScoreForPromotion: 0.7,
  indicatorWeights: DEFAULT_INDICATOR_WEIGHTS,
  enableAutoPromotion: true,
  minConfidenceForPromotion: 0.5,
};

/**
 * A learned event that has been promoted to the learned/ directory
 */
export interface LearnedEvent {
  /** The original event that was promoted */
  originalEvent: HookEvent;
  /** The interestingness score that led to promotion */
  interestingnessScore: InterestingnessScore;
  /** ISO 8601 timestamp of when the event was promoted */
  promotedAt: string;
  /** Source directory where the event originated */
  learnedFrom: string;
}

/**
 * Result of a promotion attempt
 */
export interface PromotionResult {
  /** Whether promotion was attempted */
  attempted: boolean;
  /** Whether promotion was successful */
  success: boolean;
  /** Path where the learned event was written (if successful) */
  path?: string;
  /** Reason for not promoting (if not attempted) */
  reason?: string;
}

/**
 * Indicator detection configuration
 */
export interface IndicatorDetectionConfig {
  /** Keywords that indicate this learning indicator */
  keywords: string[];
  /** Regex patterns that indicate this learning indicator */
  patterns: RegExp[];
  /** Tags in metadata that indicate this learning indicator */
  tags: string[];
}

/**
 * Default indicator detection configuration
 */
export const DEFAULT_INDICATOR_DETECTION: Record<LearningIndicator, IndicatorDetectionConfig> = {
  [LearningIndicator.DECISION]: {
    keywords: ['decided', 'chose', 'selected', 'picked', 'opted', 'choice', 'decision'],
    patterns: [
      /decided to \w+/i,
      /chose \w+ over \w+/i,
      /selected \w+/i,
      /made (?:a |the )?decision/i,
    ],
    tags: ['decision', 'choice', 'selected'],
  },
  [LearningIndicator.BREAKTHROUGH]: {
    keywords: [
      'discovered',
      'realized',
      'found',
      'breakthrough',
      'insight',
      'eureka',
      'revelation',
    ],
    patterns: [/discovered that \w+/i, /realized \w+/i, /breakthrough[:\s]/i, /new insight/i],
    tags: ['insight', 'discovery', 'breakthrough', 'eureka'],
  },
  [LearningIndicator.FAILURE]: {
    keywords: ['failed', 'error', 'mistake', 'wrong', 'bug', 'crash', 'exception', 'broken'],
    patterns: [/failed to \w+/i, /error[:\s]/i, /mistake[:\s]/i, /went wrong/i],
    tags: ['error', 'failure', 'bug', 'crash', 'exception'],
  },
  [LearningIndicator.PATTERN]: {
    keywords: ['pattern', 'recurring', 'always', 'never', 'trend', 'consistent', 'repeatedly'],
    patterns: [/noticed that \w+/i, /pattern[:\s]/i, /always \w+/i, /never \w+/i, /trend[:\s]/i],
    tags: ['pattern', 'trend', 'recurring', 'consistent'],
  },
  [LearningIndicator.USER_FEEDBACK]: {
    keywords: [
      'user said',
      'feedback',
      'user wants',
      'user prefers',
      'user requested',
      'user asked',
    ],
    patterns: [/user feedback[:\s]/i, /user (?:said|wants|prefers|requested)/i, /feedback from/i],
    tags: ['feedback', 'user-input', 'user-feedback', 'user-request'],
  },
  [LearningIndicator.CONSTRAINT]: {
    keywords: ['limitation', 'constraint', "can't", 'cannot', 'unable', 'blocked', 'restricted'],
    patterns: [
      /can't do \w+/i,
      /unable to \w+/i,
      /blocked by/i,
      /limitation[:\s]/i,
      /constraint[:\s]/i,
    ],
    tags: ['constraint', 'limitation', 'blocked', 'restricted'],
  },
  [LearningIndicator.OPTIMIZATION]: {
    keywords: ['improved', 'optimized', 'faster', 'better', 'enhanced', 'performance', 'efficient'],
    patterns: [/improved \w+ by/i, /optimized \w+/i, /\d+% (?:faster|better|improvement)/i],
    tags: ['optimization', 'improvement', 'performance', 'enhanced'],
  },
  [LearningIndicator.QUESTION]: {
    keywords: ['why', 'how', 'what if', 'should we', 'question', 'wondering', 'curious'],
    patterns: [/why does \w+/i, /how to \w+/i, /what if \w+/i, /should we \w+/i, /question[:\s]/i],
    tags: ['question', 'inquiry', 'wondering'],
  },
  [LearningIndicator.HYPOTHESIS]: {
    keywords: ['hypothesis', 'theory', 'might', 'could', 'possibly', 'suspect', 'assume'],
    patterns: [/hypothesis[:\s]/i, /theory[:\s]/i, /might be \w+/i, /could be \w+/i, /i suspect/i],
    tags: ['hypothesis', 'theory', 'assumption'],
  },
  [LearningIndicator.VALIDATION]: {
    keywords: ['confirmed', 'validated', 'verified', 'proved', 'disproved', 'tested', 'proven'],
    patterns: [/confirmed that \w+/i, /validated \w+/i, /verified \w+/i, /proved \w+/i],
    tags: ['validation', 'verification', 'confirmed', 'proven'],
  },
};
