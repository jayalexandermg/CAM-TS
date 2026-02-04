/**
 * LLMClient Tests
 */

import { LLMClient } from '../../../src/orchestrator/llm/LLMClient';
import { LLMConfig, LLMMessage } from '../../../src/orchestrator/llm/types';

describe('LLMClient', () => {
  let client: LLMClient;

  const defaultConfig: LLMConfig = {
    provider: 'mock',
    model: 'mock-model',
  };

  beforeEach(() => {
    client = new LLMClient(defaultConfig);
  });

  describe('constructor', () => {
    it('should create with required config', () => {
      const config = client.getConfig();
      expect(config.provider).toBe('mock');
      expect(config.model).toBe('mock-model');
    });

    it('should apply default values', () => {
      const config = client.getConfig();
      expect(config.maxTokens).toBe(4096);
      expect(config.temperature).toBe(0.7);
    });

    it('should allow custom config values', () => {
      const customClient = new LLMClient({
        provider: 'mock',
        model: 'custom-model',
        maxTokens: 2048,
        temperature: 0.5,
      });

      const config = customClient.getConfig();
      expect(config.maxTokens).toBe(2048);
      expect(config.temperature).toBe(0.5);
    });
  });

  describe('complete', () => {
    it('should return a response with content', async () => {
      const response = await client.complete({
        messages: [{ role: 'user', content: 'Hello, world!' }],
      });

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
    });

    it('should return token usage information', async () => {
      const response = await client.complete({
        messages: [{ role: 'user', content: 'Hello, world!' }],
      });

      expect(response.tokensUsed).toBeDefined();
      expect(response.tokensUsed.prompt).toBeGreaterThan(0);
      expect(response.tokensUsed.completion).toBeGreaterThan(0);
      expect(response.tokensUsed.total).toBe(
        response.tokensUsed.prompt + response.tokensUsed.completion
      );
    });

    it('should return model information', async () => {
      const response = await client.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.model).toBe('mock-model');
    });

    it('should return finish reason', async () => {
      const response = await client.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.finishReason).toBe('stop');
    });

    it('should emit requestStarted event', async () => {
      const eventHandler = jest.fn();
      client.on('requestStarted', eventHandler);

      await client.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(eventHandler).toHaveBeenCalledWith({ messages: 1 });
    });

    it('should emit requestCompleted event', async () => {
      const eventHandler = jest.fn();
      client.on('requestCompleted', eventHandler);

      await client.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          finishReason: 'stop',
        })
      );
    });

    it('should handle multiple messages', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
      ];

      const response = await client.complete({ messages });

      expect(response.content).toContain('Second message');
    });

    it('should handle no user message', async () => {
      const response = await client.complete({
        messages: [{ role: 'system', content: 'System prompt' }],
      });

      expect(response.content).toContain('No user message provided');
    });
  });

  describe('chat', () => {
    it('should return a string response', async () => {
      const response = await client.chat('You are helpful.', 'Hello!');

      expect(typeof response).toBe('string');
      expect(response).toContain('Hello!');
    });

    it('should include system prompt in the request', async () => {
      const response = await client.chat(
        'You are a code assistant.',
        'Write a function'
      );

      expect(response).toBeDefined();
    });

    it('should handle chat history', async () => {
      const history: LLMMessage[] = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' },
      ];

      const response = await client.chat('System prompt', 'New message', history);

      expect(response).toContain('New message');
    });

    it('should work with empty history', async () => {
      const response = await client.chat('System prompt', 'User message', []);

      expect(response).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });

  describe('updateConfig', () => {
    it('should update specific config values', () => {
      client.updateConfig({ temperature: 0.9 });

      const config = client.getConfig();
      expect(config.temperature).toBe(0.9);
      expect(config.maxTokens).toBe(4096); // Other values unchanged
    });

    it('should update multiple config values', () => {
      client.updateConfig({
        maxTokens: 8192,
        temperature: 0.3,
      });

      const config = client.getConfig();
      expect(config.maxTokens).toBe(8192);
      expect(config.temperature).toBe(0.3);
    });
  });

  describe('getProvider', () => {
    it('should return the provider name', () => {
      expect(client.getProvider()).toBe('mock');
    });
  });

  describe('getModel', () => {
    it('should return the model name', () => {
      expect(client.getModel()).toBe('mock-model');
    });
  });
});
