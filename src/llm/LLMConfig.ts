/**
 * LLM Configuration
 *
 * Default configuration and helpers for LLM client.
 */

import { LLMConfig, LLMModel } from './types';

/** Default model: Claude Opus 4.5 */
export const DEFAULT_MODEL: LLMModel = 'claude-opus-4-5-20251101';

/** Pricing per million tokens (USD) */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-5-20251101': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
};

/** Default configuration */
export const DEFAULT_CONFIG: LLMConfig = {
  provider: 'anthropic',
  model: DEFAULT_MODEL,
  maxTokens: 4096,
  temperature: 0.7,
  streaming: false,
  retries: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
};

/**
 * Calculate cost for token usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { input: number; output: number; total: number } {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
  };
}

/**
 * Get API key from environment
 */
export function getApiKeyFromEnv(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

/**
 * Create configuration with defaults
 */
export function createConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    ...DEFAULT_CONFIG,
    apiKey: getApiKeyFromEnv(),
    ...overrides,
    retries: {
      ...DEFAULT_CONFIG.retries!,
      ...overrides.retries,
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: LLMConfig): void {
  if (config.provider === 'anthropic' && !config.apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Set it in your environment or pass it in the config.'
    );
  }

  if (config.maxTokens && config.maxTokens < 1) {
    throw new Error('maxTokens must be at least 1');
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
    throw new Error('temperature must be between 0 and 1');
  }
}
