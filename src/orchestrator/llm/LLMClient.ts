/**
 * LLMClient
 *
 * Client for interacting with LLM APIs.
 * Now uses real Anthropic Claude API when ANTHROPIC_API_KEY is set.
 * Supports tool use for agentic workflows.
 */

import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig, LLMRequest, LLMResponse, LLMMessage, StreamCallback } from './types';
import { AnthropicProvider } from '../../llm/AnthropicProvider';
import { createConfig, calculateCost } from '../../llm/LLMConfig';
import {
  ToolDefinition,
  ToolUseResponse,
  ToolExecutor,
  ToolLoopOptions,
  ToolLoopResult,
  ContentBlock,
  MessageWithContent,
  extractToolUseBlocks,
  extractTextContent,
  createToolResult,
  requiresToolUse,
} from './ToolSchema';

/** Default model for orchestrator LLM client, overridable via CAM_DEFAULT_MODEL env var */
const ORCHESTRATOR_DEFAULT_MODEL = process.env.CAM_DEFAULT_MODEL || 'claude-sonnet-4-6';

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
      model: config.model || ORCHESTRATOR_DEFAULT_MODEL,
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

  private async mockStream(request: LLMRequest, callback: StreamCallback): Promise<LLMResponse> {
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

  /**
   * Complete a request with tool definitions
   *
   * Sends a request to the LLM with tools available. The response
   * may contain tool_use blocks that need to be executed.
   *
   * @param request - LLM request with messages
   * @param tools - Available tool definitions
   * @returns Response with potential tool use blocks
   */
  async completeWithTools(request: LLMRequest, tools: ToolDefinition[]): Promise<ToolUseResponse> {
    this.emit('requestStarted', { messages: request.messages.length, tools: tools.length });

    try {
      if (this.provider) {
        return await this.providerCompleteWithTools(request, tools);
      }

      // Mock implementation
      return this.mockCompleteWithTools(request, tools);
    } catch (error) {
      this.emit('requestFailed', { error });
      throw error;
    }
  }

  /**
   * Execute an agentic tool loop
   *
   * Repeatedly calls the LLM and executes tools until the LLM
   * responds with end_turn or max iterations is reached.
   *
   * @param systemPrompt - System prompt for the conversation
   * @param userMessage - Initial user message
   * @param tools - Available tools
   * @param executor - Function to execute tools
   * @param options - Loop configuration options
   * @returns Final response and all tool uses
   */
  async executeToolLoop(
    systemPrompt: string,
    userMessage: string,
    tools: ToolDefinition[],
    executor: ToolExecutor,
    options: ToolLoopOptions = {}
  ): Promise<ToolLoopResult> {
    const maxIterations = options.maxIterations ?? 10;
    const toolUses: ToolLoopResult['toolUses'] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Build initial messages
    const messages: MessageWithContent[] = [{ role: 'user', content: userMessage }];

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Build request
      const request: LLMRequest = {
        messages: [{ role: 'system', content: systemPrompt }, ...this.flattenMessages(messages)],
      };

      // Call LLM with tools
      const response = await this.completeWithTools(request, tools);

      // Track tokens
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Notify callback
      options.onResponse?.(response);

      // Check if we need to use tools
      if (!requiresToolUse(response.stop_reason)) {
        // LLM is done - extract final text response
        const finalResponse = extractTextContent(response.content);
        return {
          finalResponse,
          toolUses,
          iterations: iteration + 1,
          totalTokens: {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalInputTokens + totalOutputTokens,
          },
          success: true,
        };
      }

      // Extract tool use requests
      const toolUseBlocks = extractToolUseBlocks(response.content);

      if (toolUseBlocks.length === 0) {
        // No tools to use but stop_reason was tool_use - unexpected
        return {
          finalResponse: extractTextContent(response.content),
          toolUses,
          iterations: iteration + 1,
          totalTokens: {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalInputTokens + totalOutputTokens,
          },
          success: true,
        };
      }

      // Add assistant message with tool uses
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Execute each tool and collect results
      const toolResults: ContentBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        try {
          const result = await executor(toolUse.name, toolUse.input);

          // Track tool use
          toolUses.push({
            request: {
              type: 'tool_use',
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
            },
            result,
          });

          // Notify callback
          options.onToolUse?.(
            {
              type: 'tool_use',
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
            },
            result
          );

          // Create result block
          toolResults.push(createToolResult(toolUse.id, result.result, !result.success));
        } catch (error) {
          // Tool execution failed
          const errorMessage = error instanceof Error ? error.message : String(error);

          toolUses.push({
            request: {
              type: 'tool_use',
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
            },
            result: {
              success: false,
              result: `Error: ${errorMessage}`,
              error: errorMessage,
            },
          });

          toolResults.push(createToolResult(toolUse.id, `Error: ${errorMessage}`, true));
        }
      }

      // Add user message with tool results
      messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    // Max iterations reached
    return {
      finalResponse: '',
      toolUses,
      iterations: maxIterations,
      totalTokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      success: false,
      error: `Max iterations (${maxIterations}) reached`,
    };
  }

  /**
   * Complete with tools using the real Anthropic provider
   */
  private async providerCompleteWithTools(
    request: LLMRequest,
    tools: ToolDefinition[]
  ): Promise<ToolUseResponse> {
    // The AnthropicProvider needs to be extended to support tools
    // For now, use the Anthropic SDK directly
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: this.config.apiKey });

    const { systemPrompt, messages } = this.formatMessagesForTools(request.messages);

    // Cast messages to SDK-compatible type (our types are structurally compatible)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdkMessages = messages as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdkTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Record<string, unknown>,
    })) as Anthropic.Tool[];

    const response = await client.messages.create({
      model: this.config.model,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
      temperature: request.temperature ?? this.config.temperature,
      system: systemPrompt,
      messages: sdkMessages,
      tools: sdkTools,
    });

    // Map response to our type
    return {
      content: response.content.map((block) => {
        if (block.type === 'text') {
          return { type: 'text' as const, text: block.text };
        } else if (block.type === 'tool_use') {
          return {
            type: 'tool_use' as const,
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          };
        }
        // Handle other block types if needed
        return { type: 'text' as const, text: '' };
      }),
      stop_reason: response.stop_reason as ToolUseResponse['stop_reason'],
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      id: response.id,
    };
  }

  /**
   * Mock implementation of completeWithTools
   */
  private async mockCompleteWithTools(
    request: LLMRequest,
    tools: ToolDefinition[]
  ): Promise<ToolUseResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get the last user message
    const lastUserMessage = request.messages.filter((m) => m.role === 'user').pop();
    const userContent = lastUserMessage?.content || '';

    // Simple mock: if tools are available and message mentions a tool-like action, simulate tool use
    if (tools.length > 0 && userContent.toLowerCase().includes('search')) {
      const tool = tools.find((t) => t.name.toLowerCase().includes('search')) || tools[0];
      return {
        content: [
          {
            type: 'tool_use',
            id: `tool_${Date.now()}`,
            name: tool.name,
            input: { query: userContent },
          },
        ],
        stop_reason: 'tool_use',
        model: this.config.model,
        usage: { input_tokens: 100, output_tokens: 50 },
        id: `msg_${Date.now()}`,
      };
    }

    // Default: return text response
    return {
      content: [
        {
          type: 'text',
          text: `[Mock Response] Processing: ${userContent.substring(0, 50)}...`,
        },
      ],
      stop_reason: 'end_turn',
      model: this.config.model,
      usage: { input_tokens: 100, output_tokens: 50 },
      id: `msg_${Date.now()}`,
    };
  }

  /**
   * Format messages for tool use API
   */
  private formatMessagesForTools(messages: LLMMessage[]): {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }>;
  } {
    let systemPrompt = '';
    const formattedMessages: Array<{
      role: 'user' | 'assistant';
      content: string | ContentBlock[];
    }> = [];

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

    // Ensure first message is from user
    if (formattedMessages.length > 0 && formattedMessages[0].role !== 'user') {
      formattedMessages.unshift({
        role: 'user',
        content: 'Please proceed with the conversation.',
      });
    }

    return { systemPrompt, messages: formattedMessages };
  }

  /**
   * Flatten MessageWithContent to LLMMessage for request building
   */
  private flattenMessages(messages: MessageWithContent[]): LLMMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));
  }
}
