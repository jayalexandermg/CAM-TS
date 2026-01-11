/**
 * Infinite Aura - Context Cache
 *
 * Caches loaded context for performance with configurable expiration.
 */

import { ContextRequest, LoadedContext } from './types';

/**
 * Configuration for context cache
 */
export interface ContextCacheConfig {
  /** Cache expiry time in milliseconds (default: 5 minutes) */
  expiryMs: number;
  /** Maximum number of cached entries (default: 100) */
  maxEntries: number;
  /** Whether to enable cache (default: true) */
  enabled: boolean;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CONTEXT_CACHE_CONFIG: ContextCacheConfig = {
  expiryMs: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  enabled: true,
};

/**
 * Cached context entry
 */
interface CacheEntry {
  context: LoadedContext;
  cachedAt: number;
  signature: string;
}

/**
 * Caches loaded context for improved performance
 */
export class ContextCache {
  private readonly config: ContextCacheConfig;
  private readonly cache: Map<string, CacheEntry>;
  private hits: number;
  private misses: number;

  constructor(config: Partial<ContextCacheConfig> = {}) {
    this.config = {
      ...DEFAULT_CONTEXT_CACHE_CONFIG,
      ...config,
    };
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cached context for a request
   */
  get(request: ContextRequest): LoadedContext | undefined {
    if (!this.config.enabled) {
      this.misses++;
      return undefined;
    }

    const signature = this.generateSignature(request);
    const entry = this.cache.get(signature);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(signature);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.context;
  }

  /**
   * Set cached context for a request
   */
  set(request: ContextRequest, context: LoadedContext): void {
    if (!this.config.enabled) {
      return;
    }

    // Enforce max entries limit
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const signature = this.generateSignature(request);
    this.cache.set(signature, {
      context,
      cachedAt: Date.now(),
      signature,
    });
  }

  /**
   * Check if a request is cached and not expired
   */
  has(request: ContextRequest): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const signature = this.generateSignature(request);
    const entry = this.cache.get(signature);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(signature);
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache for a specific request
   */
  invalidate(request: ContextRequest): boolean {
    const signature = this.generateSignature(request);
    return this.cache.delete(signature);
  }

  /**
   * Invalidate all cache entries matching a filter
   */
  invalidateBy(filter: (request: ContextRequest) => boolean): number {
    let invalidated = 0;

    for (const [signature] of this.cache.entries()) {
      // Parse signature back to request to check filter
      const request = this.parseSignature(signature);
      if (filter(request)) {
        this.cache.delete(signature);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate cache entries for a specific project
   */
  invalidateProject(projectId: string): number {
    return this.invalidateBy((req) => req.projectId === projectId);
  }

  /**
   * Invalidate cache entries for a specific session
   */
  invalidateSession(sessionId: string): number {
    return this.invalidateBy((req) => req.sessionId === sessionId);
  }

  /**
   * Invalidate cache entries for a specific agent
   */
  invalidateAgent(agentId: string): number {
    return this.invalidateBy((req) => req.agentId === agentId);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    let pruned = 0;

    for (const [signature, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(signature);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    maxEntries: number;
    expiryMs: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      maxEntries: this.config.maxEntries,
      expiryMs: this.config.expiryMs,
    };
  }

  /**
   * Get cache configuration
   */
  getConfig(): Readonly<ContextCacheConfig> {
    return { ...this.config };
  }

  /**
   * Generate a signature (hash) for a request
   */
  generateSignature(request: ContextRequest): string {
    // Create deterministic string from request properties
    const parts: string[] = [];

    if (request.projectId) {
      parts.push(`p:${request.projectId}`);
    }
    if (request.sessionId) {
      parts.push(`s:${request.sessionId}`);
    }
    if (request.agentId) {
      parts.push(`a:${request.agentId}`);
    }
    if (request.taskType) {
      parts.push(`t:${request.taskType}`);
    }
    if (request.query) {
      parts.push(`q:${request.query}`);
    }
    if (request.maxTokens) {
      parts.push(`m:${request.maxTokens}`);
    }
    if (request.layers && request.layers.length > 0) {
      parts.push(`l:${request.layers.sort().join(',')}`);
    }

    return parts.join('|');
  }

  /**
   * Parse a signature back to a partial request
   */
  private parseSignature(signature: string): ContextRequest {
    const request: ContextRequest = {};
    const parts = signature.split('|');

    for (const part of parts) {
      const [prefix, value] = part.split(':');
      switch (prefix) {
        case 'p':
          request.projectId = value;
          break;
        case 's':
          request.sessionId = value;
          break;
        case 'a':
          request.agentId = value;
          break;
        case 't':
          request.taskType = value as ContextRequest['taskType'];
          break;
        case 'q':
          request.query = value;
          break;
        case 'm':
          request.maxTokens = parseInt(value, 10);
          break;
        case 'l':
          request.layers = value.split(',') as ContextRequest['layers'];
          break;
      }
    }

    return request;
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.cachedAt > this.config.expiryMs;
  }

  /**
   * Evict the oldest entry from cache
   */
  private evictOldest(): void {
    let oldest: { signature: string; cachedAt: number } | null = null;

    for (const [signature, entry] of this.cache.entries()) {
      if (!oldest || entry.cachedAt < oldest.cachedAt) {
        oldest = { signature, cachedAt: entry.cachedAt };
      }
    }

    if (oldest) {
      this.cache.delete(oldest.signature);
    }
  }
}
