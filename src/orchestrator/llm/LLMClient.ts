/**
 * LLMClient
 *
 * Client for interacting with LLM APIs.
 * This is a mock implementation for testing - in production,
 * it would call actual LLM APIs.
 */

import { EventEmitter } from 'events';
import { LLMConfig, LLMRequest, LLMResponse, LLMMessage } from './types';

export class LLMClient extends EventEmitter {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    super();
    this.config = {
      maxTokens: 4096,
      temperature: 0.7,
      ...config,
    };
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    this.emit('requestStarted', { messages: request.messages.length });

    try {
      // This is a placeholder implementation
      // In production, this would call the actual LLM API
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

  private async mockComplete(request: LLMRequest): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get the last user message
    const lastUserMessage = request.messages.filter((m) => m.role === 'user').pop();

    const content = lastUserMessage
      ? `Response to: ${lastUserMessage.content.substring(0, 50)}...`
      : 'No user message provided';

    const promptTokens = this.estimateTokens(request.messages);
    const completionTokens = this.estimateTokens([{ role: 'assistant', content }]);

    return {
      content,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
      finishReason: 'stop',
      model: this.config.model,
    };
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

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getProvider(): string {
    return this.config.provider;
  }

  getModel(): string {
    return this.config.model;
  }
}
