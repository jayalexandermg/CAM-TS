/**
 * LLMClient
 *
 * Client for interacting with LLM APIs.
 * Now uses real Anthropic Claude API when ANTHROPIC_API_KEY is set.
 */

import { EventEmitter } from 'events';
import { LLMConfig, LLMRequest, LLMResponse, LLMMessage, StreamCallback } from './types';
import { AnthropicProvider } from '../../llm/AnthropicProvider';
import { createConfig, calculateCost, DEFAULT_MODEL } from '../../llm/LLMConfig';

export class LLMClient extends EventEmitter {
  private config: LLMConfig;
  private provider: AnthropicProvider | null = null;

  constructor(config: Partial<LLMConfig>) {
    super();

    // Determine provider: respect explicit 'mock', otherwise use 'anthropic' if API key is available
    const effectiveProvider =
      config.provider === 'mock'
        ? 'mock'
        : config.provider === 'anthropic' || process.env.ANTHROPIC_API_KEY
          ? 'anthropic'
          : 'mock';

    // Use createConfig to apply defaults and load API key from env
    this.config = createConfig({
      maxTokens: 4096,
      temperature: 0.7,
      ...config,
      provider: effectiveProvider,
      model: config.model || DEFAULT_MODEL,
    });

    // Initialize real provider if using Anthropic
    if (this.config.provider === 'anthropic' && this.config.apiKey) {
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
      this.provider.on('retrying', (data) => this.emit('retrying', data));
    } catch (error) {
      // Provider initialization failed - will fall back to mock
      this.emit('providerInitFailed', { error });
      this.provider = null;
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    this.emit('requestStarted', { messages: request.messages.length });

    try {
      // Use real provider if available
      if (this.provider) {
        return await this.provider.complete(request);
      }

      // Fall back to mock
      const response = await this.mockComplete(request);

      this.emit('requestCompleted', {
        tokensUsed: response.tokensUsed,
        finishReason: response.finishReason,
      });

      return response;
    } catch (error) {
      this.emit('requestFailed', { error });
      throw error;
    }
  }

  /**
   * Stream a completion (real streaming with Anthropic, simulated with mock)
   */
  async stream(request: LLMRequest, callback: StreamCallback): Promise<LLMResponse> {
    if (this.provider) {
      return this.provider.stream(request, callback);
    }
    return this.mockStream(request, callback);
  }

  private async mockComplete(request: LLMRequest): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get the last user message
    const lastUserMessage = request.messages.filter((m) => m.role === 'user').pop();

    const content = lastUserMessage
      ? `[Mock Response] Processing: ${lastUserMessage.content.substring(0, 50)}...`
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

  private async mockStream(
    request: LLMRequest,
    callback: StreamCallback
  ): Promise<LLMResponse> {
    const response = await this.mockComplete(request);

    // Simulate streaming
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
   * Streaming chat convenience method
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

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.provider === 'anthropic' && !this.provider) {
      this.initProvider();
    } else if (this.provider) {
      this.provider.updateConfig(config);
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
    return this.provider !== null;
  }
}
