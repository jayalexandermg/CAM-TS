# Prompt 22: TraitLoader + Inference Implementation (Enhanced)

**Wave:** 2 (Depends on: Prompt 21)
**Time:** 5 hours
**Files:**

- `src/agents/factory/TraitLoader.ts`
- `src/agents/factory/TraitInference.ts`
- `src/agents/factory/index.ts`
- `tests/agents/factory/TraitLoader.test.ts`
- `tests/agents/factory/TraitInference.test.ts`

---

## Context

With traits defined in Prompt 21, we need to load them and infer traits from task descriptions. This enhanced version includes:

1. **Confidence Scoring System** - Categorized confidence levels (high/medium/low)
2. **Fallback Clarification** - Generate clarifying questions when confidence is low
3. **Intent Reasoning** - Detailed explanations for trait selections beyond keywords

---

## Part 1: Create src/agents/factory/TraitLoader.ts

```typescript
import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import { TraitsData, TraitDefinition, TraitCategory } from '../traits/types';

export class TraitLoader {
  private traitsData: TraitsData | null = null;
  private traitsPath: string;
  private loadPromise: Promise<TraitsData> | null = null;

  constructor(traitsPath?: string) {
    this.traitsPath = traitsPath || './src/agents/traits/Traits.yaml';
  }

  /**
   * Load traits from YAML file (cached)
   */
  async load(): Promise<TraitsData> {
    if (this.traitsData) return this.traitsData;

    if (!this.loadPromise) {
      this.loadPromise = this.loadFromFile();
    }

    return this.loadPromise;
  }

  private async loadFromFile(): Promise<TraitsData> {
    const content = await fs.readFile(this.traitsPath, 'utf-8');
    this.traitsData = yaml.parse(content) as TraitsData;
    this.validateTraitsData(this.traitsData);
    return this.traitsData;
  }

  /**
   * Validate loaded traits data
   */
  private validateTraitsData(data: TraitsData): void {
    if (!data.expertise || Object.keys(data.expertise).length < 10) {
      throw new Error('Traits.yaml must have at least 10 expertise areas');
    }
    if (!data.personality || Object.keys(data.personality).length < 8) {
      throw new Error('Traits.yaml must have at least 8 personality types');
    }
    if (!data.approach || Object.keys(data.approach).length < 6) {
      throw new Error('Traits.yaml must have at least 6 approach styles');
    }
    // Validate each trait has required fields
    for (const [key, trait] of Object.entries(data.expertise)) {
      if (!trait.name || !trait.description) {
        throw new Error(`Expertise "${key}" missing required fields`);
      }
    }
  }

  /**
   * Get a specific trait by category and name
   */
  getTrait(category: TraitCategory, name: string): TraitDefinition | undefined {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData[category]?.[name];
  }

  /**
   * Get all traits in a category
   */
  getAllTraits(category: TraitCategory): Record<string, TraitDefinition> {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData[category] || {};
  }

  /**
   * Get all trait names in a category
   */
  getTraitNames(category: TraitCategory): string[] {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return Object.keys(this.traitsData[category] || {});
  }

  /**
   * Get example composition
   */
  getExample(name: string): { description: string; traits: string[] } | undefined {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData.examples?.[name];
  }

  /**
   * Get all example names
   */
  getExampleNames(): string[] {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return Object.keys(this.traitsData.examples || {});
  }

  /**
   * Check if a trait exists
   */
  hasTrait(category: TraitCategory, name: string): boolean {
    if (!this.traitsData) return false;
    return name in (this.traitsData[category] || {});
  }

  /**
   * Reload traits from file
   */
  async reload(): Promise<TraitsData> {
    this.traitsData = null;
    this.loadPromise = null;
    return this.load();
  }
}
```

---

## Part 2: Create src/agents/factory/TraitInference.ts (Enhanced)

```typescript
import { TraitsData, TraitCategory, TraitDefinition, TraitMatch } from '../traits/types';

/**
 * Confidence Level Categories
 * - HIGH (0.8-1.0): Clear match - multiple keywords, explicit intent
 * - MEDIUM (0.5-0.79): Partial match - some keywords, implied intent
 * - LOW (0.0-0.49): Unclear - few/no keywords, ambiguous intent
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface InferredTraits {
  expertise: string[];
  personality: string[];
  approach: string[];

  // Enhanced Confidence Scoring
  confidence: number; // Overall confidence 0.0-1.0
  confidenceLevel: ConfidenceLevel; // Categorized: high/medium/low

  // Intent Reasoning (Enhanced)
  reasoning: string; // Detailed explanation of WHY traits were selected
  contextAnalysis: ContextAnalysis; // Breakdown of context factors

  // Fallback Clarification (New)
  clarificationNeeded: boolean; // True when confidence < 0.7
  clarificationQuestions: string[]; // Questions to ask user for clarity

  // Detailed match info
  matches: TraitMatch[];
}

export interface ContextAnalysis {
  keywordMatches: number; // Count of matched keywords
  intentClarity: number; // 0-1 how clear the intent is
  domainIndicators: string[]; // Domain-specific terms found
  ambiguousTerms: string[]; // Terms that could match multiple traits
  contextualFactors: string[]; // Additional context that influenced selection
}

export class TraitInference {
  private static readonly CLARIFICATION_THRESHOLD = 0.7;
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

  constructor(private traitsData: TraitsData) {}

  /**
   * Infer traits from a task description with enhanced confidence and clarification
   */
  inferFromTask(task: string): InferredTraits {
    const normalizedTask = task.toLowerCase();
    const matches: TraitMatch[] = [];
    const ambiguousTerms: string[] = [];
    const domainIndicators: string[] = [];

    // Match expertise based on keywords
    for (const [traitName, trait] of Object.entries(this.traitsData.expertise)) {
      const keywords = trait.keywords || [];
      const matchedKeywords = keywords.filter((kw) => normalizedTask.includes(kw.toLowerCase()));

      if (matchedKeywords.length > 0) {
        // Calculate confidence with enhanced scoring
        const keywordCoverage = matchedKeywords.length / keywords.length;
        const contextBonus = this.calculateContextBonus(normalizedTask, traitName, matchedKeywords);
        const confidence = Math.min(keywordCoverage + contextBonus, 1);

        matches.push({
          trait: traitName,
          category: 'expertise',
          confidence,
          matchedKeywords,
        });

        domainIndicators.push(...matchedKeywords);
      }
    }

    // Track terms that match multiple expertise areas (ambiguous)
    const keywordToTraits = this.buildKeywordToTraitMap();
    for (const [keyword, traits] of Object.entries(keywordToTraits)) {
      if (traits.length > 1 && normalizedTask.includes(keyword.toLowerCase())) {
        ambiguousTerms.push(keyword);
      }
    }

    // Match personality based on task tone
    for (const [traitName, trait] of Object.entries(this.traitsData.personality)) {
      const personalityIndicators = this.getPersonalityIndicators(traitName);
      const matchedIndicators = personalityIndicators.filter((ind) =>
        normalizedTask.includes(ind.toLowerCase())
      );

      if (matchedIndicators.length > 0) {
        matches.push({
          trait: traitName,
          category: 'personality',
          confidence: Math.min(matchedIndicators.length * 0.3, 0.9),
          matchedKeywords: matchedIndicators,
        });
      }
    }

    // Match approach based on task requirements
    for (const [traitName, trait] of Object.entries(this.traitsData.approach)) {
      const approachIndicators = this.getApproachIndicators(traitName);
      const matchedIndicators = approachIndicators.filter((ind) =>
        normalizedTask.includes(ind.toLowerCase())
      );

      if (matchedIndicators.length > 0) {
        matches.push({
          trait: traitName,
          category: 'approach',
          confidence: Math.min(matchedIndicators.length * 0.3, 0.9),
          matchedKeywords: matchedIndicators,
        });
      }
    }

    // Sort and select best matches
    matches.sort((a, b) => b.confidence - a.confidence);

    const expertise = this.selectTopTraits(matches, 'expertise', 2);
    const personality = this.selectTopTraits(matches, 'personality', 2);
    const approach = this.selectTopTraits(matches, 'approach', 1);

    // Calculate enhanced confidence
    const overallConfidence = this.calculateOverallConfidence(matches, ambiguousTerms.length);
    const confidenceLevel = this.categorizeConfidence(overallConfidence);

    // Intent clarity based on match quality
    const intentClarity = this.calculateIntentClarity(matches, task);

    // Context analysis
    const contextAnalysis: ContextAnalysis = {
      keywordMatches: matches.reduce((sum, m) => sum + m.matchedKeywords.length, 0),
      intentClarity,
      domainIndicators: [...new Set(domainIndicators)],
      ambiguousTerms: [...new Set(ambiguousTerms)],
      contextualFactors: this.extractContextualFactors(task, matches),
    };

    // Generate enhanced reasoning
    const reasoning = this.generateEnhancedReasoning(task, matches, contextAnalysis);

    // Determine if clarification is needed
    const clarificationNeeded = overallConfidence < TraitInference.CLARIFICATION_THRESHOLD;
    const clarificationQuestions = clarificationNeeded
      ? this.generateClarificationQuestions(task, matches, ambiguousTerms)
      : [];

    return {
      expertise,
      personality,
      approach,
      confidence: overallConfidence,
      confidenceLevel,
      reasoning,
      contextAnalysis,
      clarificationNeeded,
      clarificationQuestions,
      matches,
    };
  }

  /**
   * Infer from explicit keywords
   */
  inferFromKeywords(keywords: string[]): InferredTraits {
    return this.inferFromTask(keywords.join(' '));
  }

  /**
   * Calculate context-aware confidence bonus
   */
  private calculateContextBonus(
    task: string,
    traitName: string,
    matchedKeywords: string[]
  ): number {
    let bonus = 0;

    // Bonus for multiple keywords from same trait (strong signal)
    if (matchedKeywords.length >= 3) bonus += 0.15;
    else if (matchedKeywords.length >= 2) bonus += 0.08;

    // Bonus for task length indicating detailed request
    if (task.length > 100) bonus += 0.05;

    // Bonus for explicit intent phrases
    const intentPhrases = ['i need', 'please help', 'can you', 'looking for', 'want to'];
    if (intentPhrases.some((phrase) => task.includes(phrase))) bonus += 0.05;

    return bonus;
  }

  /**
   * Build a map of keywords to the traits they belong to (for ambiguity detection)
   */
  private buildKeywordToTraitMap(): Record<string, string[]> {
    const map: Record<string, string[]> = {};

    for (const [traitName, trait] of Object.entries(this.traitsData.expertise)) {
      for (const keyword of trait.keywords || []) {
        const lowerKeyword = keyword.toLowerCase();
        if (!map[lowerKeyword]) map[lowerKeyword] = [];
        map[lowerKeyword].push(traitName);
      }
    }

    return map;
  }

  /**
   * Calculate intent clarity score
   */
  private calculateIntentClarity(matches: TraitMatch[], task: string): number {
    if (matches.length === 0) return 0;

    // High clarity: one dominant match with high confidence
    const topMatch = matches[0];
    const secondMatch = matches[1];

    if (!secondMatch) {
      return topMatch.confidence > 0.7 ? 0.9 : topMatch.confidence;
    }

    // Clarity decreases if top two matches are close in confidence (ambiguous)
    const confidenceGap = topMatch.confidence - secondMatch.confidence;
    const clarityFromGap = Math.min(confidenceGap * 2, 0.5);

    return Math.min(topMatch.confidence * 0.6 + clarityFromGap + 0.2, 1);
  }

  /**
   * Extract contextual factors that influenced trait selection
   */
  private extractContextualFactors(task: string, matches: TraitMatch[]): string[] {
    const factors: string[] = [];

    // Check for urgency indicators
    if (/urgent|asap|immediately|critical/i.test(task)) {
      factors.push('Urgency detected - may require rapid approach');
    }

    // Check for scope indicators
    if (/comprehensive|complete|full|everything/i.test(task)) {
      factors.push('Comprehensive scope requested');
    }

    // Check for quality indicators
    if (/careful|thorough|detailed|precise/i.test(task)) {
      factors.push('High attention to detail requested');
    }

    // Check for collaboration indicators
    if (/team|collaborate|together|review/i.test(task)) {
      factors.push('Collaboration context detected');
    }

    return factors;
  }

  /**
   * Generate clarification questions when confidence is low
   */
  private generateClarificationQuestions(
    task: string,
    matches: TraitMatch[],
    ambiguousTerms: string[]
  ): string[] {
    const questions: string[] = [];

    // No matches - very ambiguous
    if (matches.length === 0) {
      questions.push(
        'Could you provide more details about the specific domain or field this task relates to?'
      );
      questions.push('What is the primary goal you want to achieve?');
      return questions;
    }

    // Ambiguous terms detected
    if (ambiguousTerms.length > 0) {
      const expertiseMatches = matches.filter((m) => m.category === 'expertise');
      if (expertiseMatches.length >= 2) {
        const trait1 = expertiseMatches[0].trait;
        const trait2 = expertiseMatches[1].trait;
        questions.push(
          `Did you mean ${trait1} analysis or ${trait2} analysis? ` +
            `(The term "${ambiguousTerms[0]}" could apply to both)`
        );
      }
    }

    // Low confidence on expertise
    const expertiseMatches = matches.filter((m) => m.category === 'expertise');
    if (expertiseMatches.length > 0 && expertiseMatches[0].confidence < 0.5) {
      questions.push(
        `I detected possible "${expertiseMatches[0].trait}" expertise needed. ` +
          `Is this correct, or is there a different focus area?`
      );
    }

    // No personality/approach detected
    const personalityMatches = matches.filter((m) => m.category === 'personality');
    if (personalityMatches.length === 0) {
      questions.push(
        'What tone or approach would you prefer? ' +
          '(e.g., cautious and thorough, or quick and practical)'
      );
    }

    // Generic clarification for low overall confidence
    if (questions.length === 0) {
      questions.push("Could you provide more context about what you're trying to accomplish?");
    }

    return questions.slice(0, 3); // Limit to 3 questions
  }

  /**
   * Generate enhanced reasoning with context beyond keywords
   */
  private generateEnhancedReasoning(
    task: string,
    matches: TraitMatch[],
    context: ContextAnalysis
  ): string {
    if (matches.length === 0) {
      return (
        'No specific traits matched from the input. ' +
        'Using default agent configuration. ' +
        'Consider providing more specific details about the domain and requirements.'
      );
    }

    const expertiseMatches = matches.filter((m) => m.category === 'expertise');
    const personalityMatches = matches.filter((m) => m.category === 'personality');
    const approachMatches = matches.filter((m) => m.category === 'approach');

    let reasoning = `**Task Analysis:** "${task.slice(0, 80)}${task.length > 80 ? '...' : ''}"\n\n`;

    // Expertise reasoning
    if (expertiseMatches.length > 0) {
      reasoning += '**Expertise Selection:**\n';
      for (const match of expertiseMatches.slice(0, 2)) {
        reasoning += `- Selected "${match.trait}" expertise because input mentions: `;
        reasoning += `"${match.matchedKeywords.join('", "')}"\n`;
        reasoning += `  (Confidence: ${(match.confidence * 100).toFixed(0)}%)\n`;
      }
    }

    // Personality reasoning
    if (personalityMatches.length > 0) {
      reasoning += '\n**Personality Selection:**\n';
      for (const match of personalityMatches.slice(0, 2)) {
        reasoning += `- Selected "${match.trait}" personality based on task tone indicators: `;
        reasoning += `"${match.matchedKeywords.join('", "')}"\n`;
      }
    }

    // Approach reasoning
    if (approachMatches.length > 0) {
      reasoning += '\n**Approach Selection:**\n';
      for (const match of approachMatches.slice(0, 1)) {
        reasoning += `- Selected "${match.trait}" approach because: `;
        reasoning += `"${match.matchedKeywords.join('", "')}"\n`;
      }
    }

    // Contextual factors
    if (context.contextualFactors.length > 0) {
      reasoning += '\n**Additional Context:**\n';
      for (const factor of context.contextualFactors) {
        reasoning += `- ${factor}\n`;
      }
    }

    // Ambiguity notes
    if (context.ambiguousTerms.length > 0) {
      reasoning +=
        '\n**Note:** Some terms are ambiguous and could match multiple expertise areas. ';
      reasoning += "Consider clarifying if results don't match expectations.\n";
    }

    return reasoning;
  }

  private selectTopTraits(matches: TraitMatch[], category: TraitCategory, limit: number): string[] {
    return matches
      .filter((m) => m.category === category)
      .slice(0, limit)
      .map((m) => m.trait);
  }

  private calculateOverallConfidence(matches: TraitMatch[], ambiguityCount: number): number {
    if (matches.length === 0) return 0;

    const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;

    // Boost for having matches in multiple categories
    const categories = new Set(matches.map((m) => m.category));
    const categoryBonus = categories.size >= 2 ? 0.1 : 0;

    // Penalty for ambiguity
    const ambiguityPenalty = ambiguityCount * 0.05;

    // Boost for multiple matches
    const matchCountBonus = matches.length > 3 ? 0.1 : matches.length > 1 ? 0.05 : 0;

    return Math.max(
      0,
      Math.min(avgConfidence + categoryBonus + matchCountBonus - ambiguityPenalty, 1)
    );
  }

  private categorizeConfidence(confidence: number): ConfidenceLevel {
    if (confidence >= TraitInference.HIGH_CONFIDENCE_THRESHOLD) return 'high';
    if (confidence >= TraitInference.MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
    return 'low';
  }

  private getPersonalityIndicators(personality: string): string[] {
    const indicators: Record<string, string[]> = {
      skeptical: [
        'verify',
        'prove',
        'evidence',
        'really',
        'actually',
        'sure',
        'validate',
        'confirm',
      ],
      enthusiastic: ['excited', 'love', 'great', 'awesome', 'amazing', 'fantastic', 'wonderful'],
      cautious: ['careful', 'safe', 'risk', 'edge case', 'failure', 'potential issue', 'concern'],
      bold: ['aggressive', 'push', 'ambitious', 'disrupt', 'bold', 'innovative', 'breakthrough'],
      analytical: ['analyze', 'data', 'metrics', 'numbers', 'statistics', 'measure', 'quantify'],
      creative: ['creative', 'innovative', 'new idea', 'brainstorm', 'imagine', 'novel'],
      empathetic: ['user', 'customer', 'feel', 'experience', 'impact', 'perspective', 'understand'],
      contrarian: ["devil's advocate", 'opposite', 'challenge', 'counter', 'alternative view'],
      pragmatic: ['practical', 'realistic', 'works', 'feasible', 'achievable', 'doable'],
      meticulous: [
        'detail',
        'precise',
        'exact',
        'thorough',
        'complete',
        'comprehensive',
        'accurate',
      ],
    };
    return indicators[personality] || [];
  }

  private getApproachIndicators(approach: string): string[] {
    const indicators: Record<string, string[]> = {
      thorough: ['comprehensive', 'complete', 'exhaustive', 'everything', 'all aspects', 'full'],
      rapid: ['quick', 'fast', 'urgent', 'asap', 'immediately', 'hurry', 'deadline'],
      systematic: ['step by step', 'structured', 'organized', 'methodical', 'process', 'framework'],
      exploratory: ['explore', 'investigate', 'discover', 'find out', 'research', 'dig into'],
      comparative: ['compare', 'versus', 'options', 'alternatives', 'trade-off', 'pros and cons'],
      synthesizing: ['combine', 'integrate', 'merge', 'synthesize', 'unify', 'bring together'],
      adversarial: [
        'attack',
        'break',
        'exploit',
        'red team',
        'penetration',
        'vulnerability',
        'hack',
      ],
      consultative: ['advise', 'recommend', 'suggest', 'guidance', 'counsel', 'opinion'],
    };
    return indicators[approach] || [];
  }
}
```

---

## Part 3: Create src/agents/factory/index.ts

```typescript
export { TraitLoader } from './TraitLoader';
export { TraitInference, InferredTraits, ConfidenceLevel, ContextAnalysis } from './TraitInference';
```

---

## Part 4: Create tests/agents/factory/TraitLoader.test.ts

Write **12+ tests** covering:

1. Load returns valid TraitsData
2. Caches loaded data (second call returns cached)
3. getTrait returns correct trait by category and name
4. getAllTraits returns all traits in category
5. getTraitNames returns list of trait names
6. getExample returns example composition
7. getExampleNames returns all example names
8. hasTrait checks existence correctly
9. reload clears cache and reloads
10. Invalid path throws descriptive error
11. Missing required fields throws validation error
12. Validates minimum trait counts per category

---

## Part 5: Create tests/agents/factory/TraitInference.test.ts (Enhanced - 18+ tests)

Write **18+ tests** covering:

### Confidence Scoring Tests (6 tests)

1. **High confidence (0.8+)**: Multiple security keywords → security expertise with high confidence
2. **High confidence**: "Analyze vulnerabilities and perform penetration testing audit" → confidence >= 0.8
3. **Medium confidence (0.5-0.79)**: Single keyword match → medium confidence level
4. **Medium confidence**: "Check the code for issues" → confidence between 0.5-0.79
5. **Low confidence (< 0.5)**: Vague input "help me with something" → low confidence level
6. **Low confidence**: Empty or very short input returns confidence < 0.5

### Fallback Clarification Tests (5 tests)

7. **Clarification needed**: confidence < 0.7 triggers clarificationNeeded = true
8. **No clarification**: confidence >= 0.7 returns clarificationNeeded = false
9. **Ambiguous terms generate questions**: "review" (matches security + code) generates clarifying question
10. **Questions are relevant**: clarificationQuestions mention detected traits
11. **Question limit**: Never returns more than 3 clarification questions

### Intent Reasoning Tests (5 tests)

12. **Reasoning explains keyword matches**: reasoning includes matched keywords
13. **Reasoning mentions confidence**: reasoning includes confidence percentages
14. **Reasoning handles no matches**: returns helpful message for default config
15. **Context factors captured**: "urgent security audit" includes urgency in contextualFactors
16. **Ambiguity noted**: reasoning mentions ambiguous terms when detected

### Core Functionality Tests (7 tests)

17. Security keywords ("vulnerability", "threat", "CVE") match security expertise
18. Research keywords ("analyze", "study", "investigate") match research expertise
19. "verify" and "prove" match skeptical personality
20. "quick" and "fast" match rapid approach
21. Multiple matches ranked by confidence (highest first)
22. Combined keywords increase overall confidence
23. inferFromKeywords works same as inferFromTask with joined keywords

---

## Verification Checklist

Show me:

1. `tree src/agents/factory/` - directory structure
2. TraitLoader.ts content (full file)
3. TraitInference.ts content (full file with all enhancements)
4. Test output: `pnpm test tests/agents/factory/`
5. Confidence level distribution for sample inputs:
   - "Perform a comprehensive security vulnerability audit with penetration testing" (should be HIGH)
   - "Check the code" (should be MEDIUM or LOW)
   - "help" (should be LOW)

---

## Success Criteria

✅ TraitLoader loads and caches Traits.yaml
✅ TraitInference extracts traits from text
✅ **Confidence scoring with levels (high/medium/low)**
✅ **Clarification questions generated when confidence < 0.7**
✅ **Enhanced reasoning explains WHY traits were selected**
✅ **ContextAnalysis provides keyword matches, intent clarity, domain indicators**
✅ Keyword matching works accurately
✅ **30+ unit tests passing** (12 TraitLoader + 18 TraitInference)

---

## Enhancement Summary

| Feature       | Original           | Enhanced                         |
| ------------- | ------------------ | -------------------------------- |
| Confidence    | Single number 0-1  | Number + Level (high/medium/low) |
| Clarification | None               | Questions when confidence < 0.7  |
| Reasoning     | Basic keyword list | Full explanation with context    |
| Context       | None               | ContextAnalysis object           |
| Test Count    | 24                 | 30+                              |
