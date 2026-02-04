/**
 * AnthropicProvider
 *
 * Implementation of Anthropic Claude API integration.
 */

import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import {
  LLMConfig,
  LLMRequest,
  LLMResponse,
  LLMMessage,
  LLMError,
  StreamCallback,
  StreamingChunk,
  LLMTokenUsage,
} from './types';
import { calculateCost, validateConfig } from './LLMConfig';

export class AnthropicProvider extends EventEmitter {
  private client: Anthropic;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    super();
    validateConfig(config);
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  /**
   * Complete a request using Claude API
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const { systemPrompt, messages } = this.formatMessages(request.messages);

    const startTime = Date.now();
    this.emit('requestStarted', {
      model: this.config.model,
      messageCount: messages.length,
    });

    try {
      const response = await this.executeWithRetry(async () => {
        return this.client.messages.create({
          model: this.config.model,
          max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
          temperature: request.temperature ?? this.config.temperature,
          system: systemPrompt,
          messages,
          stop_sequences: request.stopSequences,
        });
      });

      const content = this.extractContent(response);
      const tokensUsed = this.extractTokenUsage(response);

      const llmResponse: LLMResponse = {
        content,
        tokensUsed,
        finishReason: this.mapStopReason(response.stop_reason),
        model: response.model,
        requestId: response.id,
      };

      this.emit('requestCompleted', {
        duration: Date.now() - startTime,
        tokensUsed,
        requestId: response.id,
      });

      return llmResponse;
    } catch (error) {
      const llmError = this.mapError(error);
      this.emit('requestFailed', { error: llmError, duration: Date.now() - startTime });
      throw new Error(`Anthropic API error: ${llmError.message}`);
    }
  }

  /**
   * Stream a completion request
   */
  async stream(request: LLMRequest, callback: StreamCallback): Promise<LLMResponse> {
    const { systemPrompt, messages } = this.formatMessages(request.messages);

    const startTime = Date.now();
    this.emit('streamStarted', {
      model: this.config.model,
      messageCount: messages.length,
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let requestId = '';
    let stopReason: string | null = null;

    try {
      const stream = this.client.messages.stream({
        model: this.config.model,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
        temperature: request.temperature ?? this.config.temperature,
        system: systemPrompt,
        messages,
        stop_sequences: request.stopSequences,
      });

      stream.on('message', (message) => {
        requestId = message.id;
        inputTokens = message.usage?.input_tokens ?? 0;
      });

      stream.on('text', (text) => {
        fullContent += text;
        callback({
          type: 'text',
          content: text,
          tokensUsed: { completion: outputTokens },
        });
      });

      stream.on('finalMessage', (message) => {
        outputTokens = message.usage?.output_tokens ?? 0;
        stopReason = message.stop_reason;
      });

      await stream.finalMessage();

      callback({
        type: 'done',
        content: '',
        tokensUsed: {
          prompt: inputTokens,
          completion: outputTokens,
          total: inputTokens + outputTokens,
        },
      });

      const tokensUsed: LLMTokenUsage = {
        prompt: inputTokens,
        completion: outputTokens,
        total: inputTokens + outputTokens,
        cost: calculateCost(this.config.model, inputTokens, outputTokens),
      };

      const llmResponse: LLMResponse = {
        content: fullContent,
        tokensUsed,
        finishReason: this.mapStopReason(stopReason),
        model: this.config.model,
        requestId,
      };

      this.emit('streamCompleted', {
        duration: Date.now() - startTime,
        tokensUsed,
        requestId,
      });

      return llmResponse;
    } catch (error) {
      const llmError = this.mapError(error);
      callback({
        type: 'error',
        content: llmError.message,
      });
      this.emit('streamFailed', { error: llmError, duration: Date.now() - startTime });
      throw new Error(`Anthropic streaming error: ${llmError.message}`);
    }
  }

  /**
   * Format messages for Anthropic API (separate system prompt)
   */
  private formatMessages(
    messages: LLMMessage[]
  ): { systemPrompt: string; messages: Anthropic.MessageParam[] } {
    let systemPrompt = '';
    const formattedMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Ensure first message is from user (Anthropic requirement)
    if (formattedMessages.length > 0 && formattedMessages[0].role !== 'user') {
      formattedMessages.unshift({
        role: 'user',
        content: 'Please proceed with the conversation.',
      });
    }

    return { systemPrompt, messages: formattedMessages };
  }

  /**
   * Extract text content from response
   */
  private extractContent(response: Anthropic.Message): string {
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }

  /**
   * Extract token usage from response
   */
  private extractTokenUsage(response: Anthropic.Message): LLMTokenUsage {
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    return {
      prompt: inputTokens,
      completion: outputTokens,
      total: inputTokens + outputTokens,
      cost: calculateCost(this.config.model, inputTokens, outputTokens),
    };
  }

  /**
   * Map Anthropic stop reason to our format
   */
  private mapStopReason(
    reason: string | null
  ): 'stop' | 'length' | 'error' | 'end_turn' | 'max_tokens' {
    switch (reason) {
      case 'end_turn':
        return 'end_turn';
      case 'max_tokens':
        return 'max_tokens';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }

  /**
   * Map API errors to our error format
   */
  private mapError(error: unknown): LLMError {
    if (error instanceof Anthropic.APIError) {
      return {
        code: error.status?.toString() ?? 'unknown',
        message: error.message,
        statusCode: error.status,
        retryable: this.isRetryable(error.status),
      };
    }

    if (error instanceof Error) {
      return {
        code: 'unknown',
        message: error.message,
        retryable: false,
      };
    }

    return {
      code: 'unknown',
      message: String(error),
      retryable: false,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(statusCode?: number): boolean {
    if (!statusCode) return false;
    // Retry on rate limits (429) and server errors (5xx)
    return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const retries = this.config.retries ?? {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
    };

    let lastError: unknown;
    let delay = retries.initialDelayMs;

    for (let attempt = 0; attempt <= retries.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        const llmError = this.mapError(error);
        if (!llmError.retryable || attempt === retries.maxRetries) {
          throw error;
        }

        this.emit('retrying', {
          attempt: attempt + 1,
          maxRetries: retries.maxRetries,
          delay,
          error: llmError,
        });

        await this.sleep(delay);
        delay = Math.min(delay * 2, retries.maxDelayMs);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...updates };
    if (updates.apiKey || updates.baseUrl) {
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });
    }
  }
}
