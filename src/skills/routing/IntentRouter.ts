/**
 * IntentRouter - Intent-based skill routing
 *
 * Routes user input to appropriate skills using USE WHEN triggers
 * and keyword matching.
 */

import { KeywordMatcher } from './KeywordMatcher';
import { SkillDefinition } from './SkillRegistry';

export interface RouteResult {
  skill: string;
  confidence: number;
  matchedKeywords: string[];
  matchedTriggers: string[];
  alternatives: RouteAlternative[];
}

export interface RouteAlternative {
  skill: string;
  confidence: number;
  reason: string;
}

export interface SkillRegistryInterface {
  register(skill: SkillDefinition): void;
  get(name: string): SkillDefinition | undefined;
  getAll(): SkillDefinition[];
}

export class IntentRouter {
  private matcher: KeywordMatcher;
  private registry: SkillRegistryInterface;

  constructor(registry: SkillRegistryInterface) {
    this.matcher = new KeywordMatcher();
    this.registry = registry;
  }

  /**
   * Route user input to best matching skill
   */
  async route(userInput: string): Promise<RouteResult> {
    const results = await this.routeMultiple(userInput, 5);

    if (results.length === 0) {
      return {
        skill: 'default',
        confidence: 0,
        matchedKeywords: [],
        matchedTriggers: [],
        alternatives: [],
      };
    }

    const best = results[0];
    return {
      ...best,
      alternatives: results.slice(1).map((r) => ({
        skill: r.skill,
        confidence: r.confidence,
        reason: `Matched: ${r.matchedKeywords.slice(0, 3).join(', ')}`,
      })),
    };
  }

  /**
   * Get multiple matching skills ranked by confidence
   */
  async routeMultiple(userInput: string, limit: number = 5): Promise<RouteResult[]> {
    const skills = this.registry.getAll();
    const results: RouteResult[] = [];

    for (const skill of skills) {
      const { confidence, matchedKeywords, matchedTriggers } = this.scoreSkill(userInput, skill);

      if (confidence > 0.1) {
        results.push({
          skill: skill.name,
          confidence,
          matchedKeywords,
          matchedTriggers,
          alternatives: [],
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  }

  private scoreSkill(
    input: string,
    skill: SkillDefinition
  ): {
    confidence: number;
    matchedKeywords: string[];
    matchedTriggers: string[];
  } {
    // Score keywords
    const keywordMatches = this.matcher.match(input, skill.keywords);
    const keywordScore = this.matcher.aggregateScore(keywordMatches, skill.keywords.length);

    // Score USE WHEN triggers
    const triggerMatches = this.matchTriggers(input, skill.useWhen);
    const triggerScore =
      triggerMatches.length > 0 ? triggerMatches.length / skill.useWhen.length : 0;

    // Combined confidence
    const confidence = keywordScore * 0.6 + triggerScore * 0.4;

    return {
      confidence,
      matchedKeywords: keywordMatches.map((m) => m.keyword),
      matchedTriggers: triggerMatches,
    };
  }

  private matchTriggers(input: string, triggers: string[]): string[] {
    const normalizedInput = input.toLowerCase();
    return triggers.filter((trigger) => {
      // Extract key phrases from trigger
      const words = trigger
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      return words.some((word) => normalizedInput.includes(word));
    });
  }
}
