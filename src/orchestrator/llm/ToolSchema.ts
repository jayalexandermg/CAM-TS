/**
 * Tool Schema Types
 *
 * Type definitions for Anthropic's tool_use API format.
 * These types enable agents to use tools during LLM interactions.
 */

/**
 * JSON Schema for tool input parameters
 * Includes index signature for compatibility with Anthropic SDK
 */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
  // Index signature for Anthropic SDK compatibility
  [key: string]: unknown;
}

/**
 * Property schema for tool input parameters
 */
export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
  required?: string[];
  default?: unknown;
}

/**
 * Tool definition compatible with Anthropic's API
 */
export interface ToolDefinition {
  /** Unique name of the tool */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** JSON Schema for the tool's input parameters */
  input_schema: ToolInputSchema;
  /** Optional cache control hints */
  cache_control?: {
    type: 'ephemeral';
  };
}

/**
 * Tool use request from the LLM
 */
export interface ToolUseRequest {
  /** Type identifier for tool use content blocks */
  type: 'tool_use';
  /** Unique ID for this tool use (for matching results) */
  id: string;
  /** Name of the tool being called */
  name: string;
  /** Input parameters for the tool */
  input: Record<string, unknown>;
}

/**
 * Tool result to send back to the LLM
 */
export interface ToolResult {
  /** Type identifier for tool result content blocks */
  type: 'tool_result';
  /** ID of the tool use this is a result for */
  tool_use_id: string;
  /** Result content (string or structured content blocks) */
  content: string | ToolResultContent[];
  /** Whether the tool execution encountered an error */
  is_error?: boolean;
}

/**
 * Content block for tool results
 */
export interface ToolResultContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

/**
 * Content block types that can appear in messages
 */
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

/**
 * Text content block
 */
export interface TextBlock {
  type: 'text';
  text: string;
}

/**
 * Tool use content block (from assistant messages)
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result content block (for user messages)
 */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ToolResultContent[];
  is_error?: boolean;
}

/**
 * Message with content blocks (for tool use conversations)
 */
export interface MessageWithContent {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

/**
 * Response from LLM with potential tool use
 */
export interface ToolUseResponse {
  /** Response content (may include text and tool_use blocks) */
  content: ContentBlock[];
  /** Stop reason indicating if tool use was requested */
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  /** Model used */
  model: string;
  /** Token usage */
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  /** Request ID */
  id: string;
}

/**
 * Tool executor function signature
 */
export type ToolExecutor = (
  name: string,
  input: Record<string, unknown>
) => Promise<ToolExecutionResult>;

/**
 * Result of executing a tool
 */
export interface ToolExecutionResult {
  /** Whether the execution was successful */
  success: boolean;
  /** Result content (will be sent back to LLM) */
  result: string | ToolResultContent[];
  /** Optional error message if success is false */
  error?: string;
  /** Optional metadata about the execution */
  metadata?: Record<string, unknown>;
}

/**
 * Options for the tool execution loop
 */
export interface ToolLoopOptions {
  /** Maximum number of tool use iterations */
  maxIterations?: number;
  /** Callback for each tool use */
  onToolUse?: (request: ToolUseRequest, result: ToolExecutionResult) => void;
  /** Callback for each LLM response */
  onResponse?: (response: ToolUseResponse) => void;
}

/**
 * Result of a complete tool loop execution
 */
export interface ToolLoopResult {
  /** Final text response from the LLM */
  finalResponse: string;
  /** All tool uses that occurred */
  toolUses: Array<{
    request: ToolUseRequest;
    result: ToolExecutionResult;
  }>;
  /** Total number of iterations */
  iterations: number;
  /** Total token usage */
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  /** Whether the loop completed successfully */
  success: boolean;
  /** Error if the loop failed */
  error?: string;
}

/**
 * Extract tool use blocks from a response
 */
export function extractToolUseBlocks(content: ContentBlock[]): ToolUseBlock[] {
  return content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
}

/**
 * Extract text content from a response
 */
export function extractTextContent(content: ContentBlock[]): string {
  return content
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/**
 * Create a tool result block
 */
export function createToolResult(
  toolUseId: string,
  result: string | ToolResultContent[],
  isError: boolean = false
): ToolResultBlock {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content: result,
    is_error: isError,
  };
}

/**
 * Check if a response requires tool use
 */
export function requiresToolUse(stopReason: string): boolean {
  return stopReason === 'tool_use';
}
