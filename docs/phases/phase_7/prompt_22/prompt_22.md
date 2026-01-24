## Prompt_22

```
PROMPT 22: TraitLoader + Inference Implementation

[CONTEXT]
CAM Enhancement - Phase 7: Custom Agent Template System
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 21 (Traits.yaml and types)

With traits defined, implement loading and inference capabilities.

[TASK]
Create TraitLoader to read Traits.yaml and TraitInference to extract traits from natural language.

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

## Part 2: Create src/agents/factory/TraitInference.ts
```typescript
import { TraitsData, TraitCategory, TraitDefinition, TraitMatch } from '../traits/types';

export interface InferredTraits {
  expertise: string[];
  personality: string[];
  approach: string[];
  confidence: number;          // Overall confidence 0-1
  reasoning: string;           // Explanation of inference
  matches: TraitMatch[];       // Detailed match info
}

export class TraitInference {
  constructor(private traitsData: TraitsData) {}

  /**
   * Infer traits from a task description
   */
  inferFromTask(task: string): InferredTraits {
    const normalizedTask = task.toLowerCase();
    const matches: TraitMatch[] = [];

    // Match expertise based on keywords
    for (const [traitName, trait] of Object.entries(this.traitsData.expertise)) {
      const keywords = trait.keywords || [];
      const matchedKeywords = keywords.filter(kw =>
        normalizedTask.includes(kw.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        matches.push({
          trait: traitName,
          category: 'expertise',
          confidence: Math.min(matchedKeywords.length / keywords.length, 1),
          matchedKeywords
        });
      }
    }

    // Match personality based on task tone
    for (const [traitName, trait] of Object.entries(this.traitsData.personality)) {
      const personalityIndicators = this.getPersonalityIndicators(traitName);
      const matchedIndicators = personalityIndicators.filter(ind =>
        normalizedTask.includes(ind.toLowerCase())
      );

      if (matchedIndicators.length > 0) {
        matches.push({
          trait: traitName,
          category: 'personality',
          confidence: Math.min(matchedIndicators.length * 0.3, 0.9),
          matchedKeywords: matchedIndicators
        });
      }
    }

    // Match approach based on task requirements
    for (const [traitName, trait] of Object.entries(this.traitsData.approach)) {
      const approachIndicators = this.getApproachIndicators(traitName);
      const matchedIndicators = approachIndicators.filter(ind =>
        normalizedTask.includes(ind.toLowerCase())
      );

      if (matchedIndicators.length > 0) {
        matches.push({
          trait: traitName,
          category: 'approach',
          confidence: Math.min(matchedIndicators.length * 0.3, 0.9),
          matchedKeywords: matchedIndicators
        });
      }
    }

    // Sort and select best matches
    matches.sort((a, b) => b.confidence - a.confidence);

    const expertise = this.selectTopTraits(matches, 'expertise', 2);
    const personality = this.selectTopTraits(matches, 'personality', 2);
    const approach = this.selectTopTraits(matches, 'approach', 1);

    const overallConfidence = this.calculateOverallConfidence(matches);
    const reasoning = this.generateReasoning(task, matches);

    return {
      expertise,
      personality,
      approach,
      confidence: overallConfidence,
      reasoning,
      matches
    };
  }

  /**
   * Infer from explicit keywords
   */
  inferFromKeywords(keywords: string[]): InferredTraits {
    return this.inferFromTask(keywords.join(' '));
  }

  private selectTopTraits(matches: TraitMatch[], category: TraitCategory, limit: number): string[] {
    return matches
      .filter(m => m.category === category)
      .slice(0, limit)
      .map(m => m.trait);
  }

  private calculateOverallConfidence(matches: TraitMatch[]): number {
    if (matches.length === 0) return 0;
    const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    return Math.min(avgConfidence * (matches.length > 3 ? 1.2 : 1), 1);
  }

  private generateReasoning(task: string, matches: TraitMatch[]): string {
    if (matches.length === 0) {
      return 'No specific traits matched. Using default agent configuration.';
    }

    const expertiseMatches = matches.filter(m => m.category === 'expertise');
    const personalityMatches = matches.filter(m => m.category === 'personality');

    let reasoning = `Analyzed task: "${task.slice(0, 50)}..."\n`;

    if (expertiseMatches.length > 0) {
      reasoning += `Expertise: ${expertiseMatches.map(m => m.trait).join(', ')} `;
      reasoning += `(matched: ${expertiseMatches.flatMap(m => m.matchedKeywords).join(', ')})\n`;
    }

    if (personalityMatches.length > 0) {
      reasoning += `Personality: ${personalityMatches.map(m => m.trait).join(', ')}\n`;
    }

    return reasoning;
  }

  private getPersonalityIndicators(personality: string): string[] {
    const indicators: Record<string, string[]> = {
      skeptical: ['verify', 'prove', 'evidence', 'really', 'actually', 'sure'],
      enthusiastic: ['excited', 'love', 'great', 'awesome', 'amazing'],
      cautious: ['careful', 'safe', 'risk', 'edge case', 'failure'],
      bold: ['aggressive', 'push', 'ambitious', 'disrupt'],
      analytical: ['analyze', 'data', 'metrics', 'numbers', 'statistics'],
      creative: ['creative', 'innovative', 'new idea', 'brainstorm'],
      empathetic: ['user', 'customer', 'feel', 'experience', 'impact'],
      contrarian: ['devil\'s advocate', 'opposite', 'challenge', 'counter'],
      pragmatic: ['practical', 'realistic', 'works', 'feasible'],
      meticulous: ['detail', 'precise', 'exact', 'thorough', 'complete']
    };
    return indicators[personality] || [];
  }

  private getApproachIndicators(approach: string): string[] {
    const indicators: Record<string, string[]> = {
      thorough: ['comprehensive', 'complete', 'exhaustive', 'everything'],
      rapid: ['quick', 'fast', 'urgent', 'asap', 'immediately'],
      systematic: ['step by step', 'structured', 'organized', 'methodical'],
      exploratory: ['explore', 'investigate', 'discover', 'find out'],
      comparative: ['compare', 'versus', 'options', 'alternatives', 'trade-off'],
      synthesizing: ['combine', 'integrate', 'merge', 'synthesize'],
      adversarial: ['attack', 'break', 'exploit', 'red team', 'penetration'],
      consultative: ['advise', 'recommend', 'suggest', 'guidance']
    };
    return indicators[approach] || [];
  }
}
```

## Part 3: Create src/agents/factory/index.ts
```typescript
export { TraitLoader } from './TraitLoader';
export { TraitInference, InferredTraits } from './TraitInference';
```

## Part 4: Create tests/agents/factory/TraitLoader.test.ts
Write 12+ tests:
- Load returns valid TraitsData
- Caches loaded data
- getTrait returns correct trait
- getAllTraits returns category
- getExample returns example composition
- hasTrait checks existence
- reload clears cache
- Invalid path throws error
- Missing required fields throws validation error

## Part 5: Create tests/agents/factory/TraitInference.test.ts
Write 12+ tests:
- Security keywords match security expertise
- Research keywords match research expertise
- "verify" and "prove" match skeptical personality
- "quick" and "fast" match rapid approach
- Multiple matches ranked by confidence
- Empty input returns low confidence
- Combined keywords increase confidence
- Reasoning explains matches

[VERIFICATION]
Show me:
1. TraitLoader.ts content
2. TraitInference.ts content
3. Test output: pnpm test tests/agents/factory/

[SUCCESS CRITERIA]
✅ TraitLoader loads and caches Traits.yaml
✅ TraitInference extracts traits from text
✅ Keyword matching works accurately
✅ Confidence scores calculated correctly
✅ 24+ unit tests passing
```

end of Prompt_22
