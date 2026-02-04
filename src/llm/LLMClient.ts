/**
 * LLMClient
 *
 * Main client interface for LLM operations.
 * Supports both real Anthropic API and mock mode for testing.
 */

import { EventEmitter } from 'events';
import {
  LLMConfig,
  LLMRequest,
  LLMResponse,
  LLMMessage,
  StreamCallback,
  LLMTokenUsage,
} from './types';
import { AnthropicProvider } from './AnthropicProvider';
import { createConfig, calculateCost } from './LLMConfig';

export class LLMClient extends EventEmitter {
  private config: LLMConfig;
  private provider: AnthropicProvider | null = null;

  constructor(config?: Partial<LLMConfig>) {
    super();
    this.config = createConfig(config);

    if (this.config.provider === 'anthropic') {
      this.initProvider();
    }
  }

  private initProvider(): void {
    try {
      this.provider = new AnthropicProvider(this.config);

      // Forward provider events
      this.provider.on('requestStarted', (data) => this.emit('requestStarted', data));
      this.provider.on('requestCompleted', (data) => this.emit('requestCompleted', data));
      this.provider.on('requestFailed', (data) => this.emit('requestFailed', data));
      this.provider.on('streamStarted', (data) => this.emit('streamStarted', data));
      this.provider.on('streamCompleted', (data) => this.emit('streamCompleted', data));
      this.provider.on('streamFailed', (data) => this.emit('streamFailed', data));
      this.provider.on('retrying', (data) => this.emit('retrying', data));
    } catch (error) {
      // Provider initialization failed - will use mock
      this.emit('providerInitFailed', { error });
    }
  }

  /**
   * Complete a request
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (this.provider && this.config.provider === 'anthropic') {
      return this.provider.complete(request);
    }
    return this.mockComplete(request);
  }

  /**
   * Stream a completion
   */
  async stream(request: LLMRequest, callback: StreamCallback): Promise<LLMResponse> {
    if (this.provider && this.config.provider === 'anthropic') {
      return this.provider.stream(request, callback);
    }
    return this.mockStream(request, callback);
  }

  /**
   * Convenience method for chat-style completions
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    history: LLMMessage[] = []
  ): Promise<string> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const response = await this.complete({ messages });
    return response.content;
  }

  /**
   * Streaming chat
   */
  async chatStream(
    systemPrompt: string,
    userMessage: string,
    history: LLMMessage[] = [],
    callback: StreamCallback
  ): Promise<string> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const response = await this.stream({ messages }, callback);
    return response.content;
  }

  /**
   * Mock completion for testing
   */
  private async mockComplete(request: LLMRequest): Promise<LLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const lastUserMessage = request.messages.filter((m) => m.role === 'user').pop();

    const content = lastUserMessage
      ? `[Mock Response] Processing: ${lastUserMessage.content.substring(0, 100)}...`
      : '[Mock Response] No user message provided';

    const promptTokens = this.estimateTokens(request.messages);
    const completionTokens = this.estimateTokens([{ role: 'assistant', content }]);

    return {
      content,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
        cost: calculateCost(this.config.model, promptTokens, completionTokens),
      },
      finishReason: 'stop',
      model: this.config.model,
    };
  }

  /**
   * Mock streaming for testing
   */
  private async mockStream(
    request: LLMRequest,
    callback: StreamCallback
  ): Promise<LLMResponse> {
    const response = await this.mockComplete(request);

    // Simulate streaming by breaking response into chunks
    const words = response.content.split(' ');
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      callback({
        type: 'text',
        content: word + ' ',
      });
    }

    callback({
      type: 'done',
      content: '',
      tokensUsed: response.tokensUsed,
    });

    return response;
  }

  private estimateTokens(messages: LLMMessage[]): number {
    // Rough estimate: ~4 characters per token
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...updates };
    if (this.config.provider === 'anthropic') {
      if (this.provider) {
        this.provider.updateConfig(updates);
      } else {
        this.initProvider();
      }
    }
  }

  getProvider(): string {
    return this.config.provider;
  }

  getModel(): string {
    return this.config.model;
  }

  /**
   * Check if using real API
   */
  isRealProvider(): boolean {
    return this.provider !== null && this.config.provider === 'anthropic';
  }

  /**
   * Get token usage stats (for tracking)
   */
  calculateCost(inputTokens: number, outputTokens: number): LLMTokenUsage['cost'] {
    return calculateCost(this.config.model, inputTokens, outputTokens);
  }
}

export default LLMClient;
