/**
 * LLM Types
 *
 * Extended type definitions for LLM client with Anthropic support.
 */

export type LLMProvider = 'anthropic' | 'openai' | 'mock';

export type LLMModel =
  | 'claude-opus-4-5-20251101'
  | 'claude-sonnet-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  | string;

export interface LLMConfig {
  provider: LLMProvider;
  model: LLMModel;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  /** Extended thinking budget for complex reasoning (Opus 4.5) */
  thinkingBudget?: number;
  /** Enable streaming responses */
  streaming?: boolean;
  /** Retry configuration */
  retries?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  /** Enable streaming for this request */
  stream?: boolean;
  /** Extended thinking budget for this request */
  thinkingBudget?: number;
}

export interface LLMTokenUsage {
  prompt: number;
  completion: number;
  total: number;
  /** Cost in USD */
  cost?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface LLMResponse {
  content: string;
  tokensUsed: LLMTokenUsage;
  finishReason: 'stop' | 'length' | 'error' | 'end_turn' | 'max_tokens';
  model: string;
  /** Request ID for debugging */
  requestId?: string;
}

export interface StreamingChunk {
  type: 'text' | 'thinking' | 'done' | 'error';
  content: string;
  /** Accumulated tokens so far */
  tokensUsed?: Partial<LLMTokenUsage>;
}

export type StreamCallback = (chunk: StreamingChunk) => void;

export interface LLMError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
}
