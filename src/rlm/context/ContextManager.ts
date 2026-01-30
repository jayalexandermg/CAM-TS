/**
 * RLM Context Manager
 *
 * Manages context for the Recursive Language Model:
 * - Maintains context items within token limits
 * - Scores and ranks items by relevance
 * - Compresses context when needed
 * - Handles context lifecycle (add, update, remove, expire)
 */

import { EventEmitter } from 'events';
import {
  ContextItem,
  ContextType,
  ContextPriority,
  ContextManagerConfig,
  ContextWindow,
  FitResult,
  DEFAULT_CONTEXT_MANAGER_CONFIG,
} from './types';
import { RLMRelevanceScorer } from './RelevanceScorer';
import { ContextCompressor } from './ContextCompressor';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * ContextManager - Main context management for RLM
 */
export class ContextManager extends EventEmitter {
  private config: ContextManagerConfig;
  private items: Map<string, ContextItem>;
  private relevanceScorer: RLMRelevanceScorer;
  private compressor: ContextCompressor;
  private currentQuery: string = '';

  constructor(config?: Partial<ContextManagerConfig>) {
    super();
    this.config = { ...DEFAULT_CONTEXT_MANAGER_CONFIG, ...config };
    this.items = new Map();
    this.relevanceScorer = new RLMRelevanceScorer();
    this.compressor = new ContextCompressor();
  }

  /**
   * Add a context item
   */
  add(
    content: string,
    type: ContextType,
    priority: ContextPriority = 'medium',
    options?: {
      source?: string;
      relatedProblemIds?: string[];
      metadata?: Record<string, unknown>;
    }
  ): ContextItem {
    const tokenCount = this.estimateTokens(content);
    const relevanceScore = this.currentQuery
      ? this.relevanceScorer.score({ content } as ContextItem, this.currentQuery).score
      : 0.5;

    const item: ContextItem = {
      id: generateId('ctx'),
      content,
      type,
      priority,
      timestamp: new Date(),
      relevanceScore,
      tokenCount,
      source: options?.source,
      relatedProblemIds: options?.relatedProblemIds,
      isCompressed: false,
      metadata: options?.metadata,
    };

    this.items.set(item.id, item);
    this.emit('itemAdded', { item });

    // Check if we need to compress or evict
    this.ensureWithinLimits();

    return item;
  }

  /**
   * Add problem context
   */
  addProblem(description: string, problemId?: string): ContextItem {
    return this.add(description, 'problem', 'critical', {
      relatedProblemIds: problemId ? [problemId] : undefined,
    });
  }

  /**
   * Add solution context
   */
  addSolution(solution: string, problemId: string): ContextItem {
    return this.add(solution, 'solution', 'high', {
      relatedProblemIds: [problemId],
    });
  }

  /**
   * Add reasoning step context
   */
  addReasoning(reasoning: string, problemId?: string): ContextItem {
    return this.add(reasoning, 'reasoning', 'medium', {
      relatedProblemIds: problemId ? [problemId] : undefined,
    });
  }

  /**
   * Add constraint
   */
  addConstraint(constraint: string): ContextItem {
    return this.add(constraint, 'constraint', 'high');
  }

  /**
   * Add background knowledge
   */
  addKnowledge(knowledge: string, source?: string): ContextItem {
    return this.add(knowledge, 'knowledge', 'medium', { source });
  }

  /**
   * Get a context item by ID
   */
  get(id: string): ContextItem | undefined {
    return this.items.get(id);
  }

  /**
   * Update a context item
   */
  update(id: string, updates: Partial<Omit<ContextItem, 'id'>>): ContextItem | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;

    const updated: ContextItem = {
      ...item,
      ...updates,
      id: item.id, // Preserve ID
    };

    // Recalculate token count if content changed
    if (updates.content) {
      updated.tokenCount = this.estimateTokens(updates.content);
    }

    this.items.set(id, updated);
    return updated;
  }

  /**
   * Remove a context item
   */
  remove(id: string, reason: string = 'manual removal'): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    this.items.delete(id);
    this.emit('itemRemoved', { item, reason });
    return true;
  }

  /**
   * Set the current query for relevance scoring
   */
  setQuery(query: string): void {
    this.currentQuery = query;
    this.relevanceScorer.setQuery(query);
    this.updateAllRelevanceScores();
    this.emit('relevanceUpdated', { query, itemCount: this.items.size });
  }

  /**
   * Get all context items sorted by relevance
   */
  getAll(): ContextItem[] {
    const items = Array.from(this.items.values());
    return items.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get items filtered by type
   */
  getByType(type: ContextType): ContextItem[] {
    return this.getAll().filter((item) => item.type === type);
  }

  /**
   * Get items filtered by priority
   */
  getByPriority(priority: ContextPriority): ContextItem[] {
    return this.getAll().filter((item) => item.priority === priority);
  }

  /**
   * Get items related to a problem
   */
  getByProblem(problemId: string): ContextItem[] {
    return this.getAll().filter((item) =>
      item.relatedProblemIds?.includes(problemId)
    );
  }

  /**
   * Get context window state
   */
  getWindow(): ContextWindow {
    const items = this.getAll();
    const totalTokens = items.reduce((sum, item) => sum + item.tokenCount, 0);
    const availableTokens = this.config.maxTokens - this.config.reservedTokens - totalTokens;
    const usageRatio = totalTokens / (this.config.maxTokens - this.config.reservedTokens);

    return {
      items,
      totalTokens,
      availableTokens: Math.max(0, availableTokens),
      usageRatio: Math.min(1, usageRatio),
      compressionActive: usageRatio > this.config.compressionThreshold,
      currentQuery: this.currentQuery,
    };
  }

  /**
   * Fit context within token limits
   */
  fitToLimit(maxTokens?: number): FitResult {
    const limit = maxTokens ?? (this.config.maxTokens - this.config.reservedTokens);
    const items = this.getAll();
    let totalTokens = items.reduce((sum, item) => sum + item.tokenCount, 0);

    // If already within limits, return as-is
    if (totalTokens <= limit) {
      return {
        included: items,
        excluded: [],
        tokensUsed: totalTokens,
        compressionApplied: false,
        itemsCompressed: 0,
      };
    }

    // First, try removing low-relevance items
    const minScore = this.config.minRelevanceScore;
    const relevant = items.filter((item) => item.relevanceScore >= minScore);
    const excluded = items.filter((item) => item.relevanceScore < minScore);

    totalTokens = relevant.reduce((sum, item) => sum + item.tokenCount, 0);

    if (totalTokens <= limit) {
      return {
        included: relevant,
        excluded,
        tokensUsed: totalTokens,
        compressionApplied: false,
        itemsCompressed: 0,
      };
    }

    // Try compression
    if (this.config.enableCompression) {
      const compressed = this.compressor.compressToFit(
        relevant,
        limit,
        this.config.charsPerToken
      );

      const compressedTokens = compressed.reduce((sum, item) => sum + item.tokenCount, 0);
      const itemsCompressedCount = compressed.filter((item) => item.isCompressed).length;

      // Update items in the map
      for (const item of compressed) {
        if (item.isCompressed) {
          this.items.set(item.id, item);
        }
      }

      const beforeTokens = relevant.reduce((sum, item) => sum + item.tokenCount, 0);
      this.emit('compressed', {
        before: beforeTokens,
        after: compressedTokens,
        ratio: compressedTokens / beforeTokens,
      });

      return {
        included: compressed,
        excluded,
        tokensUsed: compressedTokens,
        compressionApplied: true,
        itemsCompressed: itemsCompressedCount,
      };
    }

    // Last resort: truncate by relevance
    const sorted = relevant.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const included: ContextItem[] = [];
    let usedTokens = 0;

    for (const item of sorted) {
      if (usedTokens + item.tokenCount <= limit) {
        included.push(item);
        usedTokens += item.tokenCount;
      } else {
        excluded.push(item);
      }
    }

    return {
      included,
      excluded,
      tokensUsed: usedTokens,
      compressionApplied: false,
      itemsCompressed: 0,
    };
  }

  /**
   * Build context string for LLM prompt
   */
  buildContextString(maxTokens?: number): string {
    const fitResult = this.fitToLimit(maxTokens);
    const parts: string[] = [];

    // Group by type for better organization
    const byType = new Map<ContextType, ContextItem[]>();

    for (const item of fitResult.included) {
      const typeItems = byType.get(item.type) || [];
      typeItems.push(item);
      byType.set(item.type, typeItems);
    }

    // Order types by importance
    const typeOrder: ContextType[] = [
      'problem',
      'constraint',
      'knowledge',
      'reasoning',
      'solution',
      'history',
      'metadata',
    ];

    for (const type of typeOrder) {
      const typeItems = byType.get(type);
      if (typeItems && typeItems.length > 0) {
        const header = this.getTypeHeader(type);
        parts.push(`## ${header}`);
        for (const item of typeItems) {
          parts.push(item.content);
        }
        parts.push('');
      }
    }

    return parts.join('\n').trim();
  }

  /**
   * Clear all context
   */
  clear(): void {
    const count = this.items.size;
    this.items.clear();
    this.currentQuery = '';
    this.emit('cleared', { itemCount: count });
  }

  /**
   * Remove expired items
   */
  removeExpired(): number {
    if (!this.config.enableRelevanceDecay) return 0;

    const now = Date.now();
    const maxAgeMs = this.config.maxAgeHours * 60 * 60 * 1000;
    let removed = 0;

    for (const [id, item] of this.items) {
      const age = now - item.timestamp.getTime();
      if (age > maxAgeMs && item.priority !== 'critical') {
        this.remove(id, 'expired');
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get statistics
   */
  getStats(): {
    itemCount: number;
    totalTokens: number;
    availableTokens: number;
    usageRatio: number;
    byType: Record<ContextType, number>;
    byPriority: Record<ContextPriority, number>;
    compressedCount: number;
    averageRelevance: number;
  } {
    const window = this.getWindow();
    const items = Array.from(this.items.values());

    const byType: Record<ContextType, number> = {
      problem: 0,
      solution: 0,
      reasoning: 0,
      constraint: 0,
      knowledge: 0,
      history: 0,
      metadata: 0,
    };

    const byPriority: Record<ContextPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let compressedCount = 0;
    let totalRelevance = 0;

    for (const item of items) {
      byType[item.type]++;
      byPriority[item.priority]++;
      if (item.isCompressed) compressedCount++;
      totalRelevance += item.relevanceScore;
    }

    return {
      itemCount: items.length,
      totalTokens: window.totalTokens,
      availableTokens: window.availableTokens,
      usageRatio: window.usageRatio,
      byType,
      byPriority,
      compressedCount,
      averageRelevance: items.length > 0 ? totalRelevance / items.length : 0,
    };
  }

  /**
   * Check if context fits within limits
   */
  isWithinLimits(): boolean {
    const window = this.getWindow();
    return window.totalTokens <= this.config.maxTokens - this.config.reservedTokens;
  }

  /**
   * Get remaining token capacity
   */
  getRemainingTokens(): number {
    return this.getWindow().availableTokens;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<ContextManagerConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ContextManagerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // === Private Methods ===

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / this.config.charsPerToken);
  }

  /**
   * Update relevance scores for all items
   */
  private updateAllRelevanceScores(): void {
    if (!this.currentQuery) return;

    for (const [id, item] of this.items) {
      const result = this.relevanceScorer.score(item, this.currentQuery);
      const updated = { ...item, relevanceScore: result.score };

      // Apply time decay if enabled
      if (this.config.enableRelevanceDecay) {
        const ageHours = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60);
        const decay = Math.exp(-this.config.relevanceDecayRate * ageHours);
        updated.relevanceScore *= decay;
      }

      this.items.set(id, updated);
    }
  }

  /**
   * Ensure context is within limits
   */
  private ensureWithinLimits(): void {
    const window = this.getWindow();
    const threshold = this.config.maxTokens - this.config.reservedTokens;

    if (window.totalTokens > threshold) {
      this.emit('tokenLimitWarning', {
        current: window.totalTokens,
        max: threshold,
      });

      // Fit to limits
      this.fitToLimit();
    }
  }

  /**
   * Get human-readable header for context type
   */
  private getTypeHeader(type: ContextType): string {
    const headers: Record<ContextType, string> = {
      problem: 'Problem',
      solution: 'Previous Solutions',
      reasoning: 'Reasoning',
      constraint: 'Constraints',
      knowledge: 'Background Knowledge',
      history: 'History',
      metadata: 'Additional Information',
    };
    return headers[type] || type;
  }
}
