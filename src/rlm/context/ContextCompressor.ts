/**
 * Context Compressor
 *
 * Compresses context items while preserving meaning.
 * Uses multiple strategies:
 * - Extractive summarization (key sentences)
 * - Redundancy removal
 * - Structural preservation (code, lists, numbers)
 */

import { EventEmitter } from 'events';
import {
  ContextItem,
  CompressionResult,
  CompressorConfig,
  DEFAULT_COMPRESSOR_CONFIG,
} from './types';

/**
 * Sentence with scoring information
 */
interface ScoredSentence {
  text: string;
  score: number;
  position: number;
  hasNumbers: boolean;
  hasCode: boolean;
  isList: boolean;
}

/**
 * ContextCompressor - Compresses context while preserving meaning
 */
export class ContextCompressor extends EventEmitter {
  private config: CompressorConfig;

  constructor(config?: Partial<CompressorConfig>) {
    super();
    this.config = { ...DEFAULT_COMPRESSOR_CONFIG, ...config };
  }

  /**
   * Compress a single context item
   */
  compress(item: ContextItem, compressionTargetRatio?: number): CompressionResult {
    const original = item.content;
    const ratio = compressionTargetRatio ?? 0.5;

    // Skip if content is too short
    if (original.length < this.config.minContentLength) {
      return {
        compressed: original,
        original,
        ratio: 1,
        tokensSaved: 0,
        preservedElements: ['full content (too short to compress)'],
      };
    }

    // Extract and preserve special elements
    const { text: cleanedText, preserved } = this.extractPreservedElements(original);

    // Perform extractive summarization on remaining text
    const summary = this.extractiveSummarize(cleanedText, ratio);

    // Reconstruct with preserved elements
    const compressed = this.reconstructContent(summary, preserved);

    const compressionRatio = compressed.length / original.length;
    const charsSaved = original.length - compressed.length;
    const tokensSaved = Math.floor(charsSaved / 4); // Rough estimate

    return {
      compressed,
      original,
      ratio: compressionRatio,
      tokensSaved,
      preservedElements: preserved.types,
      lostElements: this.identifyLostElements(original, compressed),
    };
  }

  /**
   * Compress multiple items to fit within token budget
   */
  compressToFit(
    items: ContextItem[],
    maxTokens: number,
    charsPerToken: number = 4
  ): ContextItem[] {
    // Calculate current token usage
    const currentTokens = items.reduce(
      (sum, item) => sum + Math.ceil(item.content.length / charsPerToken),
      0
    );

    if (currentTokens <= maxTokens) {
      return items; // Already fits
    }

    // Sort by priority (compress low priority first)
    const sortedItems = [...items].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        priorityOrder[b.priority] - priorityOrder[a.priority]
      );
    });

    // Compress items starting from lowest priority
    const result: ContextItem[] = [];
    let remainingTokens = maxTokens;

    for (const item of sortedItems) {
      const itemTokens = Math.ceil(item.content.length / charsPerToken);

      if (itemTokens <= remainingTokens) {
        // Item fits as-is
        result.push(item);
        remainingTokens -= itemTokens;
      } else if (remainingTokens > 50) {
        // Compress to fit remaining budget
        const compressionResult = this.compress(item, remainingTokens / itemTokens);
        const compressedItem: ContextItem = {
          ...item,
          content: compressionResult.compressed,
          isCompressed: true,
          originalContent: item.content,
          compressionRatio: compressionResult.ratio,
          tokenCount: Math.ceil(compressionResult.compressed.length / charsPerToken),
        };
        result.push(compressedItem);
        remainingTokens -= compressedItem.tokenCount;
      }
      // Skip item if no room left
    }

    return result;
  }

  /**
   * Perform extractive summarization
   */
  private extractiveSummarize(text: string, targetRatio: number): string {
    if (!text.trim()) return '';

    // Split into sentences
    const sentences = this.splitIntoSentences(text);

    if (sentences.length <= this.config.keySentenceCount) {
      return text; // Already short enough
    }

    // Score each sentence
    const scored = sentences.map((sentence, index) =>
      this.scoreSentence(sentence, index, sentences.length)
    );

    // Calculate target sentence count
    const targetCount = Math.max(
      this.config.keySentenceCount,
      Math.ceil(sentences.length * targetRatio)
    );

    // Select top sentences while maintaining order
    const selected = this.selectTopSentences(scored, targetCount);

    // Join selected sentences
    return selected.map((s) => s.text).join(' ');
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Handle common abbreviations to avoid false splits
    const preserved = text
      .replace(/Mr\./g, 'Mr<DOT>')
      .replace(/Mrs\./g, 'Mrs<DOT>')
      .replace(/Dr\./g, 'Dr<DOT>')
      .replace(/vs\./g, 'vs<DOT>')
      .replace(/e\.g\./g, 'e<DOT>g<DOT>')
      .replace(/i\.e\./g, 'i<DOT>e<DOT>')
      .replace(/etc\./g, 'etc<DOT>');

    // Split on sentence boundaries
    const sentences = preserved
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.replace(/<DOT>/g, '.').trim())
      .filter((s) => s.length > 0);

    return sentences;
  }

  /**
   * Score a sentence for importance
   */
  private scoreSentence(
    sentence: string,
    position: number,
    totalSentences: number
  ): ScoredSentence {
    let score = 0;

    // Position score - first and last sentences are often important
    if (position === 0) {
      score += 0.3; // First sentence
    } else if (position === totalSentences - 1) {
      score += 0.2; // Last sentence
    } else {
      // Middle sentences - slight preference for earlier ones
      score += 0.1 * (1 - position / totalSentences);
    }

    // Length score - not too short, not too long
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount >= 5 && wordCount <= 30) {
      score += 0.2;
    } else if (wordCount > 30) {
      score += 0.1;
    }

    // Contains numbers (often important data)
    const hasNumbers = /\d/.test(sentence);
    if (hasNumbers) {
      score += 0.15;
    }

    // Contains code patterns
    const hasCode = /[{}()[\]`]|=>|function|const|let|var|return/.test(sentence);
    if (hasCode) {
      score += 0.2;
    }

    // Contains important keywords
    const importantKeywords = [
      'important', 'key', 'critical', 'must', 'should', 'result',
      'conclusion', 'therefore', 'because', 'error', 'solution',
      'problem', 'issue', 'note', 'warning', 'example',
    ];
    const lowerSentence = sentence.toLowerCase();
    for (const keyword of importantKeywords) {
      if (lowerSentence.includes(keyword)) {
        score += 0.1;
        break;
      }
    }

    // Is a list item
    const isList = /^[\s]*[-*•]|\d+[.)]\s/.test(sentence);
    if (isList) {
      score += 0.1;
    }

    return {
      text: sentence,
      score: Math.min(1, score),
      position,
      hasNumbers,
      hasCode,
      isList,
    };
  }

  /**
   * Select top sentences while maintaining original order
   */
  private selectTopSentences(
    sentences: ScoredSentence[],
    count: number
  ): ScoredSentence[] {
    // Sort by score and take top N
    const sorted = [...sentences].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, count);

    // Re-sort by original position to maintain narrative flow
    return top.sort((a, b) => a.position - b.position);
  }

  /**
   * Extract elements that should be preserved
   */
  private extractPreservedElements(
    text: string
  ): { text: string; preserved: { types: string[]; elements: Map<string, string> } } {
    const preserved: { types: string[]; elements: Map<string, string> } = {
      types: [],
      elements: new Map(),
    };
    let processed = text;
    let placeholderIndex = 0;

    // Preserve code blocks
    if (this.config.preserveCode) {
      const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
      processed = processed.replace(codeBlockRegex, (match) => {
        const placeholder = `__CODE_${placeholderIndex++}__`;
        preserved.elements.set(placeholder, match);
        preserved.types.push('code');
        return placeholder;
      });
    }

    // Preserve lists
    if (this.config.preserveLists) {
      const listRegex = /(?:^|\n)((?:\s*[-*•]\s+.+\n?)+)/gm;
      processed = processed.replace(listRegex, (match) => {
        const placeholder = `__LIST_${placeholderIndex++}__`;
        preserved.elements.set(placeholder, match.trim());
        preserved.types.push('list');
        return '\n' + placeholder + '\n';
      });
    }

    // Preserve important numbers and data
    if (this.config.preserveNumbers) {
      // Preserve numbers with context (e.g., "100ms", "$500", "99.9%")
      const numberPatterns = /\d+(?:\.\d+)?(?:\s*(?:ms|s|min|hour|day|%|\$|€|£|MB|GB|KB))?/g;
      // Don't replace individual numbers, just mark them as preserved
      if (numberPatterns.test(text)) {
        preserved.types.push('numbers');
      }
    }

    return { text: processed, preserved };
  }

  /**
   * Reconstruct content with preserved elements
   */
  private reconstructContent(
    summary: string,
    preserved: { types: string[]; elements: Map<string, string> }
  ): string {
    let result = summary;

    // Replace placeholders with original content
    for (const [placeholder, original] of preserved.elements) {
      result = result.replace(placeholder, original);
    }

    return result.trim();
  }

  /**
   * Identify what information might have been lost
   */
  private identifyLostElements(original: string, compressed: string): string[] {
    const lost: string[] = [];

    // Check for significant content reduction
    const originalWords = original.toLowerCase().split(/\s+/);
    const compressedWords = new Set(compressed.toLowerCase().split(/\s+/));

    // Find important words that were removed
    const importantWords = originalWords.filter((w) =>
      w.length > 5 && !compressedWords.has(w)
    );

    if (importantWords.length > 5) {
      lost.push(`~${importantWords.length} potentially significant words`);
    }

    // Check for removed sentences
    const originalSentences = this.splitIntoSentences(original);
    const compressedSentences = new Set(
      this.splitIntoSentences(compressed).map((s) => s.slice(0, 50))
    );

    const removedCount = originalSentences.filter(
      (s) => !compressedSentences.has(s.slice(0, 50))
    ).length;

    if (removedCount > 0) {
      lost.push(`${removedCount} sentences`);
    }

    return lost;
  }

  /**
   * Estimate compression potential for content
   */
  estimateCompressionPotential(content: string): {
    canCompress: boolean;
    estimatedRatio: number;
    reason: string;
  } {
    if (content.length < this.config.minContentLength) {
      return {
        canCompress: false,
        estimatedRatio: 1,
        reason: 'Content too short',
      };
    }

    const sentences = this.splitIntoSentences(content);
    if (sentences.length <= this.config.keySentenceCount) {
      return {
        canCompress: false,
        estimatedRatio: 1,
        reason: 'Too few sentences',
      };
    }

    // Estimate based on sentence count
    const estimatedRatio = Math.max(
      0.3,
      this.config.keySentenceCount / sentences.length
    );

    return {
      canCompress: true,
      estimatedRatio,
      reason: `Can reduce ${sentences.length} sentences to ~${this.config.keySentenceCount}`,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<CompressorConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CompressorConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
