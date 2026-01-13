/**
 * Infinite Aura - Token Manager
 *
 * Manages token estimation and limits for context.
 * Uses a simple character-based estimation (1 token ≈ 4 characters).
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for TokenManager
 */
export interface TokenManagerConfig {
  /** Characters per token estimate (default: 4) */
  charsPerToken: number;
  /** Default max tokens (default: 4000) */
  defaultMaxTokens: number;
  /** Truncation indicator (default: '\n\n[Content truncated...]') */
  truncationIndicator: string;
}

/**
 * Default TokenManager configuration
 */
export const DEFAULT_TOKEN_MANAGER_CONFIG: TokenManagerConfig = {
  charsPerToken: 4,
  defaultMaxTokens: 4000,
  truncationIndicator: '\n\n[Content truncated...]',
};

// ============================================================================
// TokenManager Class
// ============================================================================

/**
 * Manages token estimation and limits for context
 *
 * Uses a simple character-based estimation where 1 token ≈ 4 characters.
 * This is a rough approximation that works well for English text.
 */
export class TokenManager {
  private readonly config: TokenManagerConfig;

  /**
   * Create a new TokenManager
   * @param config - Configuration options
   */
  constructor(config: Partial<TokenManagerConfig> = {}) {
    this.config = {
      ...DEFAULT_TOKEN_MANAGER_CONFIG,
      ...config,
    };
  }

  /**
   * Estimate token count for text
   *
   * Uses a simple formula: tokens ≈ characters / 4
   * This is a rough approximation that works reasonably well for English text.
   *
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    if (!text) {
      return 0;
    }

    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / this.config.charsPerToken);
  }

  /**
   * Enforce token limit by truncating text
   *
   * If the text exceeds the token limit, it will be truncated
   * and a truncation indicator will be appended.
   *
   * @param text - Text to truncate
   * @param maxTokens - Maximum allowed tokens (defaults to config default)
   * @returns Truncated text with indicator if needed, original text otherwise
   */
  enforceLimit(text: string, maxTokens?: number): string {
    if (!text) {
      return '';
    }

    const limit = maxTokens ?? this.config.defaultMaxTokens;
    const currentTokens = this.estimateTokens(text);

    if (currentTokens <= limit) {
      return text;
    }

    // Calculate max characters for the limit, accounting for truncation indicator
    const indicatorTokens = this.estimateTokens(this.config.truncationIndicator);
    const maxChars = (limit - indicatorTokens) * this.config.charsPerToken;

    if (maxChars <= 0) {
      return this.config.truncationIndicator;
    }

    // Try to truncate at a word boundary
    let truncated = text.slice(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastNewline = truncated.lastIndexOf('\n');
    const breakPoint = Math.max(lastSpace, lastNewline);

    if (breakPoint > maxChars * 0.8) {
      truncated = truncated.slice(0, breakPoint);
    }

    return truncated.trim() + this.config.truncationIndicator;
  }

  /**
   * Fit multiple contexts within a total token budget
   *
   * Distributes the token budget across contexts, prioritizing earlier contexts.
   * If all contexts fit, they are returned as-is.
   * Otherwise, later contexts are truncated more aggressively.
   *
   * @param contexts - Array of context strings
   * @param maxTokens - Total token budget (defaults to config default)
   * @returns Array of truncated contexts that fit within budget
   */
  truncateToFit(contexts: string[], maxTokens?: number): string[] {
    if (contexts.length === 0) {
      return [];
    }

    const limit = maxTokens ?? this.config.defaultMaxTokens;

    // Calculate total tokens
    const totalTokens = contexts.reduce((sum, ctx) => sum + this.estimateTokens(ctx), 0);

    // If all fit, return as-is
    if (totalTokens <= limit) {
      return contexts;
    }

    // Distribute budget across contexts
    // Earlier contexts get more of the budget
    const result: string[] = [];
    let remainingTokens = limit;

    for (let i = 0; i < contexts.length; i++) {
      const ctx = contexts[i];
      const ctxTokens = this.estimateTokens(ctx);

      // Calculate share for remaining contexts
      const remainingContexts = contexts.length - i;
      const sharePerContext = Math.floor(remainingTokens / remainingContexts);

      if (ctxTokens <= sharePerContext) {
        // Context fits in its share
        result.push(ctx);
        remainingTokens -= ctxTokens;
      } else if (remainingTokens > 0) {
        // Context needs truncation
        const truncated = this.enforceLimit(ctx, sharePerContext);
        result.push(truncated);
        remainingTokens -= this.estimateTokens(truncated);
      }
      // Skip if no budget left
    }

    return result;
  }

  /**
   * Calculate remaining tokens after given text
   *
   * @param text - Current text
   * @param maxTokens - Total budget (defaults to config default)
   * @returns Remaining tokens (can be negative if over budget)
   */
  remainingTokens(text: string, maxTokens?: number): number {
    const limit = maxTokens ?? this.config.defaultMaxTokens;
    return limit - this.estimateTokens(text);
  }

  /**
   * Check if text is within token limit
   *
   * @param text - Text to check
   * @param maxTokens - Maximum allowed tokens (defaults to config default)
   * @returns true if text is within limit
   */
  isWithinLimit(text: string, maxTokens?: number): boolean {
    return this.remainingTokens(text, maxTokens) >= 0;
  }

  /**
   * Convert token count to approximate character count
   *
   * @param tokens - Number of tokens
   * @returns Approximate character count
   */
  tokensToChars(tokens: number): number {
    return tokens * this.config.charsPerToken;
  }

  /**
   * Get configuration
   * @returns Configuration (read-only copy)
   */
  getConfig(): Readonly<TokenManagerConfig> {
    return { ...this.config };
  }
}
