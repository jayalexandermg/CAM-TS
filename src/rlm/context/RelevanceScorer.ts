/**
 * RLM Relevance Scorer
 *
 * Scores context items for relevance to the current reasoning task.
 * Uses multiple signals:
 * - Keyword matching (TF-IDF style)
 * - Semantic similarity (concept overlap)
 * - Recency (time decay)
 * - Priority (explicit importance)
 */

import { EventEmitter } from 'events';
import {
  ContextItem,
  RelevanceResult,
  RelevanceScorerConfig,
  DEFAULT_RELEVANCE_SCORER_CONFIG,
  PRIORITY_WEIGHTS,
  TYPE_WEIGHTS,
} from './types';

/**
 * Extract keywords from text
 */
function extractKeywords(text: string, stopWords: Set<string>, minLength: number): string[] {
  if (!text) return [];

  // Normalize and split
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= minLength && !stopWords.has(w));

  // Remove duplicates while preserving order
  return [...new Set(words)];
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate cosine similarity between keyword frequency vectors
 */
function cosineSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  // Build frequency maps
  const freq1 = new Map<string, number>();
  const freq2 = new Map<string, number>();

  for (const k of keywords1) {
    freq1.set(k, (freq1.get(k) || 0) + 1);
  }
  for (const k of keywords2) {
    freq2.set(k, (freq2.get(k) || 0) + 1);
  }

  // Get all unique keywords
  const allKeywords = new Set([...freq1.keys(), ...freq2.keys()]);

  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const k of allKeywords) {
    const v1 = freq1.get(k) || 0;
    const v2 = freq2.get(k) || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }

  if (mag1 === 0 || mag2 === 0) return 0;

  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * RLMRelevanceScorer - Scores context relevance for RLM reasoning
 */
export class RLMRelevanceScorer extends EventEmitter {
  private config: RelevanceScorerConfig;
  private queryKeywords: string[] = [];
  private queryConcepts: Set<string> = new Set();

  constructor(config?: Partial<RelevanceScorerConfig>) {
    super();
    this.config = { ...DEFAULT_RELEVANCE_SCORER_CONFIG, ...config };
  }

  /**
   * Set the current query/problem for relevance scoring
   */
  setQuery(query: string): void {
    this.queryKeywords = extractKeywords(
      query,
      this.config.stopWords,
      this.config.minKeywordLength
    );
    this.queryConcepts = this.extractConcepts(query);
  }

  /**
   * Score a single context item
   */
  score(item: ContextItem, query?: string): RelevanceResult {
    // Update query if provided
    if (query) {
      this.setQuery(query);
    }

    const keywordScore = this.scoreKeywords(item);
    const semanticScore = this.scoreSemantic(item);
    const recencyScore = this.scoreRecency(item);
    const priorityScore = this.scorePriority(item);

    // Calculate weighted overall score
    const overallScore =
      keywordScore * this.config.keywordWeight +
      semanticScore * this.config.semanticWeight +
      recencyScore * this.config.recencyWeight +
      priorityScore * this.config.priorityWeight;

    // Apply type weight modifier
    const typeWeight = TYPE_WEIGHTS[item.type] || 0.5;
    const finalScore = Math.min(1, overallScore * (0.5 + typeWeight * 0.5));

    const itemKeywords = extractKeywords(
      item.content,
      this.config.stopWords,
      this.config.minKeywordLength
    );

    const matchedKeywords = itemKeywords.filter((k) => this.queryKeywords.includes(k));

    return {
      score: finalScore,
      keywordScore,
      semanticScore,
      recencyScore,
      priorityScore,
      matchedKeywords,
      explanation: this.generateExplanation(
        finalScore,
        keywordScore,
        semanticScore,
        recencyScore,
        priorityScore,
        matchedKeywords
      ),
    };
  }

  /**
   * Score multiple items and sort by relevance
   */
  scoreAll(
    items: ContextItem[],
    query?: string
  ): Array<{
    item: ContextItem;
    result: RelevanceResult;
  }> {
    if (query) {
      this.setQuery(query);
    }

    const scored = items.map((item) => ({
      item,
      result: this.score(item),
    }));

    // Sort by score descending
    return scored.sort((a, b) => b.result.score - a.result.score);
  }

  /**
   * Filter items by minimum relevance score
   */
  filter(items: ContextItem[], minScore: number, query?: string): ContextItem[] {
    const scored = this.scoreAll(items, query);
    return scored.filter((s) => s.result.score >= minScore).map((s) => s.item);
  }

  /**
   * Update relevance scores on all items
   */
  updateScores(items: ContextItem[], query: string): ContextItem[] {
    this.setQuery(query);

    return items.map((item) => {
      const result = this.score(item);
      return {
        ...item,
        relevanceScore: result.score,
      };
    });
  }

  /**
   * Calculate keyword overlap score
   */
  private scoreKeywords(item: ContextItem): number {
    if (this.queryKeywords.length === 0) {
      return 0.5; // Neutral if no query
    }

    const itemKeywords = extractKeywords(
      item.content,
      this.config.stopWords,
      this.config.minKeywordLength
    );

    if (itemKeywords.length === 0) {
      return 0;
    }

    // Use cosine similarity for keyword matching
    return cosineSimilarity(this.queryKeywords, itemKeywords);
  }

  /**
   * Calculate semantic similarity score
   */
  private scoreSemantic(item: ContextItem): number {
    if (this.queryConcepts.size === 0) {
      return 0.5; // Neutral if no query
    }

    const itemConcepts = this.extractConcepts(item.content);

    if (itemConcepts.size === 0) {
      return 0;
    }

    return jaccardSimilarity(this.queryConcepts, itemConcepts);
  }

  /**
   * Calculate recency score (time decay)
   */
  private scoreRecency(item: ContextItem): number {
    // Handle missing timestamp (e.g., during initial scoring)
    if (!item.timestamp) {
      return 1.0; // Assume very recent if no timestamp
    }

    const now = Date.now();
    const itemTime = item.timestamp.getTime();
    const ageHours = (now - itemTime) / (1000 * 60 * 60);

    // Exponential decay: score = e^(-decay_rate * age)
    // Max score of 1.0 for very recent, decays over time
    const decayFactor = Math.exp(-0.1 * ageHours);

    return Math.max(0, Math.min(1, decayFactor));
  }

  /**
   * Calculate priority score
   */
  private scorePriority(item: ContextItem): number {
    return PRIORITY_WEIGHTS[item.priority] || 0.5;
  }

  /**
   * Extract semantic concepts from text
   * Uses n-grams and common phrase patterns
   */
  private extractConcepts(text: string): Set<string> {
    if (!text) return new Set();

    const concepts = new Set<string>();
    const normalized = text.toLowerCase();

    // Extract single important words (nouns, verbs)
    const words = extractKeywords(text, this.config.stopWords, this.config.minKeywordLength);

    for (const word of words) {
      if (word.length >= 4) {
        concepts.add(word);
      }
    }

    // Extract bigrams (two-word phrases)
    const tokens = normalized.split(/\s+/);
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      if (
        !this.config.stopWords.has(tokens[i]) &&
        !this.config.stopWords.has(tokens[i + 1]) &&
        tokens[i].length >= 3 &&
        tokens[i + 1].length >= 3
      ) {
        concepts.add(bigram);
      }
    }

    // Extract common technical patterns
    const patterns = [
      /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g, // CamelCase
      /\b[a-z]+_[a-z]+(?:_[a-z]+)*\b/g, // snake_case
      /\b[a-z]+-[a-z]+(?:-[a-z]+)*\b/g, // kebab-case
      /\b\d+(?:\.\d+)+\b/g, // version numbers
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          concepts.add(match.toLowerCase());
        }
      }
    }

    return concepts;
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    overall: number,
    keyword: number,
    semantic: number,
    recency: number,
    priority: number,
    matched: string[]
  ): string {
    const parts: string[] = [];

    parts.push(`Overall: ${(overall * 100).toFixed(0)}%`);

    if (matched.length > 0) {
      parts.push(`Keywords: ${matched.slice(0, 5).join(', ')}`);
    }

    const scores = [
      { name: 'keyword', value: keyword },
      { name: 'semantic', value: semantic },
      { name: 'recency', value: recency },
      { name: 'priority', value: priority },
    ];

    const topFactors = scores
      .filter((s) => s.value >= 0.5)
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
      .map((s) => `${s.name}(${(s.value * 100).toFixed(0)}%)`);

    if (topFactors.length > 0) {
      parts.push(`Top factors: ${topFactors.join(', ')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<RelevanceScorerConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RelevanceScorerConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
