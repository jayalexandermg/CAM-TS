## Prompt_26

```
PROMPT 26: USE WHEN Intent Routing

[CONTEXT]
CAM Enhancement - Phase 8: Skills Enhancement
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 25 (Skill Template System)

Implement intent-based skill routing using USE WHEN triggers and keywords.

[TASK]
Create IntentRouter that matches user input to appropriate skills.

## Part 1: Create src/skills/routing/KeywordMatcher.ts
```typescript
export interface KeywordMatch {
  keyword: string;
  position: number;
  score: number;
}

export class KeywordMatcher {
  /**
   * Match keywords against text with scoring
   */
  match(text: string, keywords: string[]): KeywordMatch[] {
    const normalizedText = text.toLowerCase();
    const matches: KeywordMatch[] = [];

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      const position = normalizedText.indexOf(normalizedKeyword);

      if (position !== -1) {
        // Score based on: exact match bonus, position (earlier = better), length
        let score = 0.5; // Base score for match

        // Exact word match bonus
        const wordBoundary = new RegExp(`\\b${this.escapeRegex(normalizedKeyword)}\\b`);
        if (wordBoundary.test(normalizedText)) {
          score += 0.3;
        }

        // Position bonus (earlier in text = higher score)
        score += (1 - position / normalizedText.length) * 0.2;

        matches.push({ keyword, position, score: Math.min(score, 1) });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate aggregate match score
   */
  aggregateScore(matches: KeywordMatch[], totalKeywords: number): number {
    if (matches.length === 0 || totalKeywords === 0) return 0;

    const coverage = matches.length / totalKeywords;
    const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;

    return coverage * 0.4 + avgScore * 0.6;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```

## Part 2: Create src/skills/routing/IntentRouter.ts
```typescript
import { KeywordMatcher, KeywordMatch } from './KeywordMatcher';
import { SkillDefinition } from '../templates/SkillTemplate';

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

export interface SkillRegistry {
  skills: Map<string, SkillDefinition>;
  register(skill: SkillDefinition): void;
  get(name: string): SkillDefinition | undefined;
  getAll(): SkillDefinition[];
}

export class IntentRouter {
  private matcher: KeywordMatcher;
  private registry: SkillRegistry;

  constructor(registry: SkillRegistry) {
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
        alternatives: []
      };
    }

    const best = results[0];
    return {
      ...best,
      alternatives: results.slice(1).map(r => ({
        skill: r.skill,
        confidence: r.confidence,
        reason: `Matched: ${r.matchedKeywords.slice(0, 3).join(', ')}`
      }))
    };
  }

  /**
   * Get multiple matching skills ranked by confidence
   */
  async routeMultiple(userInput: string, limit: number = 5): Promise<RouteResult[]> {
    const skills = this.registry.getAll();
    const results: RouteResult[] = [];

    for (const skill of skills) {
      const { confidence, matchedKeywords, matchedTriggers } =
        this.scoreSkill(userInput, skill);

      if (confidence > 0.1) {
        results.push({
          skill: skill.name,
          confidence,
          matchedKeywords,
          matchedTriggers,
          alternatives: []
        });
      }
    }

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  private scoreSkill(input: string, skill: SkillDefinition): {
    confidence: number;
    matchedKeywords: string[];
    matchedTriggers: string[];
  } {
    // Score keywords
    const keywordMatches = this.matcher.match(input, skill.keywords);
    const keywordScore = this.matcher.aggregateScore(
      keywordMatches,
      skill.keywords.length
    );

    // Score USE WHEN triggers
    const triggerMatches = this.matchTriggers(input, skill.useWhen);
    const triggerScore = triggerMatches.length > 0
      ? triggerMatches.length / skill.useWhen.length
      : 0;

    // Combined confidence
    const confidence = keywordScore * 0.6 + triggerScore * 0.4;

    return {
      confidence,
      matchedKeywords: keywordMatches.map(m => m.keyword),
      matchedTriggers: triggerMatches
    };
  }

  private matchTriggers(input: string, triggers: string[]): string[] {
    const normalizedInput = input.toLowerCase();
    return triggers.filter(trigger => {
      // Extract key phrases from trigger
      const words = trigger.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      return words.some(word => normalizedInput.includes(word));
    });
  }
}
```

## Part 3: Create src/skills/routing/SkillRegistry.ts
```typescript
import { SkillDefinition } from '../templates/SkillTemplate';

export class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  remove(name: string): boolean {
    return this.skills.delete(name);
  }

  count(): number {
    return this.skills.size;
  }

  findByKeyword(keyword: string): SkillDefinition[] {
    return this.getAll().filter(skill =>
      skill.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
    );
  }
}
```

## Part 4: Create src/skills/routing/index.ts
```typescript
export { IntentRouter, RouteResult, RouteAlternative } from './IntentRouter';
export { KeywordMatcher, KeywordMatch } from './KeywordMatcher';
export { SkillRegistry } from './SkillRegistry';
```

## Part 5: Create tests/skills/routing/IntentRouter.test.ts
Write 15+ tests:
- Routes to skill with matching keywords
- Returns alternatives when multiple match
- Confidence increases with more keyword matches
- USE WHEN triggers boost confidence
- Returns default for no matches
- Handles empty input gracefully
- Multiple skills ranked correctly
- Keyword position affects scoring
- Exact word match scores higher
- Registry operations work correctly

[VERIFICATION]
Show me:
1. IntentRouter.ts content
2. KeywordMatcher.ts content
3. Test output: pnpm test tests/skills/routing/

[SUCCESS CRITERIA]
✅ IntentRouter matches skills to intents
✅ Keyword matching with scoring works
✅ Alternative suggestions provided
✅ 15+ tests passing
```

end of Prompt_26
