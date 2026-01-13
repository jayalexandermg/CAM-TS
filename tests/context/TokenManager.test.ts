import { TokenManager, DEFAULT_TOKEN_MANAGER_CONFIG } from '../../src/context/TokenManager';

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager();
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create TokenManager with default config', () => {
      const tm = new TokenManager();
      const config = tm.getConfig();
      expect(config.charsPerToken).toBe(4);
      expect(config.defaultMaxTokens).toBe(4000);
      expect(config.truncationIndicator).toBe('\n\n[Content truncated...]');
    });

    it('should accept custom config', () => {
      const tm = new TokenManager({
        charsPerToken: 3,
        defaultMaxTokens: 2000,
      });
      const config = tm.getConfig();
      expect(config.charsPerToken).toBe(3);
      expect(config.defaultMaxTokens).toBe(2000);
    });

    it('should merge custom config with defaults', () => {
      const tm = new TokenManager({ charsPerToken: 5 });
      const config = tm.getConfig();
      expect(config.charsPerToken).toBe(5);
      expect(config.defaultMaxTokens).toBe(DEFAULT_TOKEN_MANAGER_CONFIG.defaultMaxTokens);
      expect(config.truncationIndicator).toBe(DEFAULT_TOKEN_MANAGER_CONFIG.truncationIndicator);
    });
  });

  // =========================================================================
  // estimateTokens Tests
  // =========================================================================

  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(tokenManager.estimateTokens('')).toBe(0);
    });

    it('should return 0 for null/undefined input', () => {
      expect(tokenManager.estimateTokens(null as unknown as string)).toBe(0);
      expect(tokenManager.estimateTokens(undefined as unknown as string)).toBe(0);
    });

    it('should estimate tokens at ~4 chars per token', () => {
      // 16 chars = 4 tokens
      expect(tokenManager.estimateTokens('1234567890123456')).toBe(4);
      // 17 chars = 5 tokens (ceil)
      expect(tokenManager.estimateTokens('12345678901234567')).toBe(5);
    });

    it('should handle whitespace correctly', () => {
      // Whitespace counts as characters
      const text = 'hello world'; // 11 chars = 3 tokens
      expect(tokenManager.estimateTokens(text)).toBe(3);
    });

    it('should handle unicode characters', () => {
      // Unicode chars are still counted by length
      const text = '你好世界'; // 4 chars (each is 1 char in JS) = 1 token
      expect(tokenManager.estimateTokens(text)).toBe(1);
    });

    it('should handle multiline text', () => {
      const text = 'line1\nline2\nline3'; // 17 chars = 5 tokens
      expect(tokenManager.estimateTokens(text)).toBe(5);
    });
  });

  // =========================================================================
  // enforceLimit Tests
  // =========================================================================

  describe('enforceLimit', () => {
    it('should return empty string for empty input', () => {
      expect(tokenManager.enforceLimit('')).toBe('');
    });

    it('should return text unchanged if under limit', () => {
      const text = 'Short text'; // 10 chars = 3 tokens
      expect(tokenManager.enforceLimit(text, 100)).toBe(text);
    });

    it('should truncate text exceeding limit', () => {
      // Create text that is definitely over limit
      const text = 'a'.repeat(100); // 100 chars = 25 tokens
      const result = tokenManager.enforceLimit(text, 10);
      expect(result).toContain('[Content truncated...]');
      expect(tokenManager.estimateTokens(result)).toBeLessThanOrEqual(10);
    });

    it('should add truncation indicator when truncating', () => {
      const text = 'a'.repeat(200);
      const result = tokenManager.enforceLimit(text, 20);
      expect(result.endsWith('[Content truncated...]')).toBe(true);
    });

    it('should handle edge case of exact limit', () => {
      // 40 chars = exactly 10 tokens
      const text = 'a'.repeat(40);
      expect(tokenManager.enforceLimit(text, 10)).toBe(text);
    });

    it('should use default max tokens if not specified', () => {
      const text = 'a'.repeat(20000); // 5000 tokens, over default 4000
      const result = tokenManager.enforceLimit(text);
      expect(tokenManager.estimateTokens(result)).toBeLessThanOrEqual(4000);
    });

    it('should try to truncate at word boundary', () => {
      const text = 'This is a long sentence with multiple words that needs truncation.';
      const result = tokenManager.enforceLimit(text, 10);
      // Should contain the truncation indicator
      expect(result).toContain('[Content truncated...]');
      // The result should be truncated
      expect(result.length).toBeLessThan(text.length);
    });
  });

  // =========================================================================
  // truncateToFit Tests
  // =========================================================================

  describe('truncateToFit', () => {
    it('should return empty array for empty input', () => {
      expect(tokenManager.truncateToFit([])).toEqual([]);
    });

    it('should return all contexts unchanged if under budget', () => {
      const contexts = ['short', 'texts', 'here'];
      const result = tokenManager.truncateToFit(contexts, 1000);
      expect(result).toEqual(contexts);
    });

    it('should truncate when over budget', () => {
      const contexts = ['a'.repeat(100), 'b'.repeat(100), 'c'.repeat(100)];
      // 300 chars total = 75 tokens, limit to 30
      const result = tokenManager.truncateToFit(contexts, 30);
      const totalTokens = result.reduce(
        (sum, ctx) => sum + tokenManager.estimateTokens(ctx),
        0
      );
      expect(totalTokens).toBeLessThanOrEqual(30);
    });

    it('should prioritize earlier contexts', () => {
      const contexts = ['first context', 'second context', 'third context'];
      const result = tokenManager.truncateToFit(contexts, 10);
      // First context should be more preserved
      expect(result[0].length).toBeGreaterThanOrEqual(result[result.length - 1].length);
    });

    it('should handle single context', () => {
      const contexts = ['single long context ' + 'x'.repeat(100)];
      const result = tokenManager.truncateToFit(contexts, 10);
      expect(result).toHaveLength(1);
      expect(tokenManager.estimateTokens(result[0])).toBeLessThanOrEqual(10);
    });
  });

  // =========================================================================
  // remainingTokens Tests
  // =========================================================================

  describe('remainingTokens', () => {
    it('should return full budget for empty text', () => {
      expect(tokenManager.remainingTokens('', 100)).toBe(100);
    });

    it('should calculate remaining correctly', () => {
      const text = 'a'.repeat(40); // 10 tokens
      expect(tokenManager.remainingTokens(text, 100)).toBe(90);
    });

    it('should return negative when over budget', () => {
      const text = 'a'.repeat(400); // 100 tokens
      expect(tokenManager.remainingTokens(text, 50)).toBe(-50);
    });

    it('should use default max tokens if not specified', () => {
      const text = 'a'.repeat(40); // 10 tokens
      expect(tokenManager.remainingTokens(text)).toBe(3990); // 4000 - 10
    });
  });

  // =========================================================================
  // isWithinLimit Tests
  // =========================================================================

  describe('isWithinLimit', () => {
    it('should return true for empty text', () => {
      expect(tokenManager.isWithinLimit('')).toBe(true);
    });

    it('should return true when under limit', () => {
      const text = 'a'.repeat(40); // 10 tokens
      expect(tokenManager.isWithinLimit(text, 100)).toBe(true);
    });

    it('should return true when at exact limit', () => {
      const text = 'a'.repeat(400); // 100 tokens
      expect(tokenManager.isWithinLimit(text, 100)).toBe(true);
    });

    it('should return false when over limit', () => {
      const text = 'a'.repeat(400); // 100 tokens
      expect(tokenManager.isWithinLimit(text, 50)).toBe(false);
    });
  });

  // =========================================================================
  // tokensToChars Tests
  // =========================================================================

  describe('tokensToChars', () => {
    it('should convert tokens to characters', () => {
      expect(tokenManager.tokensToChars(10)).toBe(40);
      expect(tokenManager.tokensToChars(100)).toBe(400);
    });

    it('should return 0 for 0 tokens', () => {
      expect(tokenManager.tokensToChars(0)).toBe(0);
    });

    it('should use custom charsPerToken from config', () => {
      const tm = new TokenManager({ charsPerToken: 3 });
      expect(tm.tokensToChars(10)).toBe(30);
    });
  });

  // =========================================================================
  // getConfig Tests
  // =========================================================================

  describe('getConfig', () => {
    it('should return read-only copy of config', () => {
      const config1 = tokenManager.getConfig();
      const config2 = tokenManager.getConfig();
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object references
    });
  });
});
