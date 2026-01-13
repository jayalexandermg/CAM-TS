/**
 * IntentMatcher - Matches user requests to skills based on USE WHEN conditions
 *
 * Analyzes user requests, scores them against each skill's USE WHEN conditions,
 * and returns ranked matches with confidence scores.
 */

import { SkillManager } from './SkillManager';
import { Skill, IntentMatch } from './types';

/**
 * Common English stop words to filter out during keyword extraction
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
  'if', 'or', 'because', 'until', 'while', 'about', 'against', 'this',
  'that', 'these', 'those', 'am', 'it', 'its', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'she', 'him', 'her', 'they', 'them',
  'what', 'which', 'who', 'whom', 'whose', 'also', 'any', 'both',
  'go', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
]);

/**
 * Minimum keyword length to consider
 */
const MIN_KEYWORD_LENGTH = 2;

/**
 * Matches user requests to skills based on USE WHEN conditions
 */
export class IntentMatcher {
  private readonly skillManager: SkillManager;

  /**
   * Create a new IntentMatcher
   * @param skillManager - SkillManager instance to get skills from
   */
  constructor(skillManager: SkillManager) {
    this.skillManager = skillManager;
  }

  /**
   * Match a request against all available skills
   * Returns matches sorted by confidence (highest first)
   * @param request - User request to match
   * @returns Array of IntentMatch objects sorted by confidence
   */
  async matchIntent(request: string): Promise<IntentMatch[]> {
    const skills = this.skillManager.listSkills();
    const matches: IntentMatch[] = [];

    for (const skill of skills) {
      const result = this.scoreSkill(request, skill);
      if (result.confidence > 0) {
        matches.push(result);
      }
    }

    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get the best matching skill for a request
   * @param request - User request to match
   * @param minConfidence - Minimum confidence threshold (default: 0.5)
   * @returns Best matching IntentMatch or null if no match meets threshold
   */
  async getBestMatch(request: string, minConfidence: number = 0.5): Promise<IntentMatch | null> {
    const matches = await this.matchIntent(request);

    if (matches.length === 0) {
      return null;
    }

    const best = matches[0];
    if (best.confidence < minConfidence) {
      return null;
    }

    return best;
  }

  /**
   * Score a request against a single skill
   * @param request - User request to score
   * @param skill - Skill to score against
   * @returns IntentMatch with score details
   */
  scoreSkill(request: string, skill: Skill): IntentMatch {
    const requestKeywords = this.extractKeywords(request);
    const conditions = skill.definition.useWhen;

    let totalScore = 0;
    const matchedConditions: string[] = [];

    for (const condition of conditions) {
      const conditionKeywords = this.extractKeywords(condition);
      const matchScore = this.matchConditions(requestKeywords, conditionKeywords);

      if (matchScore > 0) {
        totalScore += matchScore;
        matchedConditions.push(condition);
      }
    }

    // Normalize score based on number of conditions
    // More matched conditions = higher confidence
    const confidence = conditions.length > 0
      ? Math.min(totalScore / Math.max(conditions.length, 1), 1.0)
      : 0;

    // Generate reason based on matches
    let reason: string;
    if (matchedConditions.length === 0) {
      reason = 'No matching conditions';
    } else if (matchedConditions.length === 1) {
      reason = `Matched: "${matchedConditions[0]}"`;
    } else {
      reason = `Matched ${matchedConditions.length} conditions`;
    }

    return {
      skill,
      confidence,
      matchedConditions,
      reason,
    };
  }

  /**
   * Extract meaningful keywords from text
   * Filters out stop words, punctuation, and short words
   * @param text - Text to extract keywords from
   * @returns Array of lowercase keywords
   */
  extractKeywords(text: string): string[] {
    // Remove punctuation and convert to lowercase
    const cleaned = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into words and filter
    const words = cleaned.split(' ');
    const keywords: string[] = [];

    for (const word of words) {
      // Skip stop words and short words
      if (word.length >= MIN_KEYWORD_LENGTH && !STOP_WORDS.has(word)) {
        keywords.push(word);
      }
    }

    return keywords;
  }

  /**
   * Calculate match score between request keywords and condition keywords
   * Uses bidirectional partial matching
   * @param requestKeywords - Keywords from user request
   * @param conditionKeywords - Keywords from USE WHEN condition
   * @returns Match score (0.0 to 1.0)
   */
  matchConditions(requestKeywords: string[], conditionKeywords: string[]): number {
    if (requestKeywords.length === 0 || conditionKeywords.length === 0) {
      return 0;
    }

    let matchCount = 0;

    for (const reqWord of requestKeywords) {
      for (const condWord of conditionKeywords) {
        // Check for exact match or partial match (one contains the other)
        if (
          reqWord === condWord ||
          reqWord.includes(condWord) ||
          condWord.includes(reqWord)
        ) {
          matchCount++;
          break; // Only count each request word once
        }
      }
    }

    // Calculate score as ratio of matched words to total request words
    // This gives a score between 0 and 1
    return matchCount / requestKeywords.length;
  }
}
