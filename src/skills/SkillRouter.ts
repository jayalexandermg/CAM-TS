/**
 * SkillRouter - Routes user requests to the most appropriate skill
 *
 * Uses IntentMatcher to analyze requests and makes routing decisions
 * based on confidence thresholds, preferred skills, and ambiguity handling.
 */

import { IntentMatcher } from './IntentMatcher';
import { RoutingOptions, RoutingResult, RoutingEntry, IntentMatch } from './types';

/**
 * Default minimum confidence threshold for routing
 */
const DEFAULT_MIN_CONFIDENCE = 0.5;

/**
 * Threshold for considering matches as "ambiguous"
 * If multiple matches are within this ratio of the top score, they're ambiguous
 */
const AMBIGUITY_THRESHOLD = 0.9;

/**
 * Routes user requests to skills based on intent matching
 */
export class SkillRouter {
  private readonly intentMatcher: IntentMatcher;
  private readonly routingHistory: RoutingEntry[];

  /**
   * Create a new SkillRouter
   * @param intentMatcher - IntentMatcher instance for scoring skills
   */
  constructor(intentMatcher: IntentMatcher) {
    this.intentMatcher = intentMatcher;
    this.routingHistory = [];
  }

  /**
   * Route a request to the most appropriate skill
   * @param request - User request to route
   * @param options - Routing options
   * @returns RoutingResult with skill and decision details
   */
  async route(request: string, options?: RoutingOptions): Promise<RoutingResult> {
    const minConfidence = options?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    const allowMultiple = options?.allowMultiple ?? false;
    const preferredSkill = options?.preferredSkill;

    // Get all matches from intent matcher
    const matches = await this.intentMatcher.matchIntent(request);

    // Handle no matches
    if (matches.length === 0) {
      const result = this.createNoMatchResult();
      this.recordRouting(request, null, 0, result.reason);
      return result;
    }

    // If preferred skill is specified and matches, use it
    if (preferredSkill) {
      const preferredMatch = matches.find((m) => m.skill.name === preferredSkill);
      if (preferredMatch && preferredMatch.confidence >= minConfidence) {
        const result: RoutingResult = {
          skill: preferredMatch.skill,
          confidence: preferredMatch.confidence,
          alternatives: matches.filter((m) => m.skill.name !== preferredSkill),
          routed: true,
          reason: `Matched preferred skill: ${preferredSkill}`,
        };
        this.recordRouting(
          request,
          preferredMatch.skill.name,
          preferredMatch.confidence,
          result.reason
        );
        return result;
      }
    }

    // Get top match
    const topMatch = matches[0];

    // Check if top match meets confidence threshold
    if (topMatch.confidence < minConfidence) {
      const result: RoutingResult = {
        skill: null,
        confidence: topMatch.confidence,
        alternatives: matches,
        routed: false,
        reason: `No skill matched with sufficient confidence (threshold: ${minConfidence}, best: ${topMatch.confidence.toFixed(2)})`,
      };
      this.recordRouting(request, null, topMatch.confidence, result.reason);
      return result;
    }

    // Check for ambiguous matches (multiple matches close to top score)
    const ambiguousMatches = this.findAmbiguousMatches(matches, minConfidence);

    if (ambiguousMatches.length > 1 && !allowMultiple) {
      const skillNames = ambiguousMatches.map((m) => m.skill.name).join(', ');
      const result: RoutingResult = {
        skill: null,
        confidence: topMatch.confidence,
        alternatives: ambiguousMatches,
        routed: false,
        reason: `Ambiguous: multiple skills matched with similar confidence (${skillNames})`,
      };
      this.recordRouting(request, null, topMatch.confidence, result.reason);
      return result;
    }

    // Clear match - route to top skill
    const result: RoutingResult = {
      skill: topMatch.skill,
      confidence: topMatch.confidence,
      alternatives: matches.slice(1),
      routed: true,
      reason: `Matched skill: ${topMatch.skill.name}`,
    };
    this.recordRouting(request, topMatch.skill.name, topMatch.confidence, result.reason);
    return result;
  }

  /**
   * Get the routing history
   * @returns Array of RoutingEntry objects
   */
  getHistory(): RoutingEntry[] {
    return [...this.routingHistory];
  }

  /**
   * Clear the routing history
   */
  clearHistory(): void {
    this.routingHistory.length = 0;
  }

  /**
   * Get the number of entries in the routing history
   * @returns Number of routing entries
   */
  getHistoryCount(): number {
    return this.routingHistory.length;
  }

  /**
   * Record a routing decision in history
   * @param request - The user request
   * @param skill - The selected skill name (or null)
   * @param confidence - The confidence score
   * @param reason - The reason for the decision
   */
  private recordRouting(
    request: string,
    skill: string | null,
    confidence: number,
    reason: string
  ): void {
    this.routingHistory.push({
      timestamp: new Date(),
      request,
      skill,
      confidence,
      reason,
    });
  }

  /**
   * Create a result for when no matches are found
   * @returns RoutingResult for no match scenario
   */
  private createNoMatchResult(): RoutingResult {
    return {
      skill: null,
      confidence: 0,
      alternatives: [],
      routed: false,
      reason: 'No skill matched the request',
    };
  }

  /**
   * Find matches that are ambiguously close to the top match
   * @param matches - All matches sorted by confidence
   * @param minConfidence - Minimum confidence threshold
   * @returns Array of ambiguous matches
   */
  private findAmbiguousMatches(matches: IntentMatch[], minConfidence: number): IntentMatch[] {
    if (matches.length === 0) {
      return [];
    }

    const topConfidence = matches[0].confidence;

    // Find all matches that are within the ambiguity threshold of the top match
    // and meet the minimum confidence requirement
    return matches.filter(
      (m) => m.confidence >= minConfidence && m.confidence >= topConfidence * AMBIGUITY_THRESHOLD
    );
  }
}
