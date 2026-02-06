export type AgentStatus = 'idle' | 'active' | 'waiting' | 'completed' | 'failed';

export interface AgentDefinition {
  name: string;
  description: string;
  expertise: string[];
  personality: string[];
  communicationStyle: string;
  approach: string;
  availableSkills: string[];
  constraints?: string[];
}

export interface AgentConfig {
  id?: string;
  definition: AgentDefinition;
  sessionId: string;
  parentAgentId?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface AgentState {
  id: string;
  status: AgentStatus;
  definition: AgentDefinition;
  sessionId: string;
  parentAgentId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  currentTask?: string;
  result?: AgentResult;
  error?: Error;
  retryCount: number;
  maxRetries: number;
}

export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  metadata?: {
    duration: number;
    retries: number;
    skillsUsed: string[];
    toolUses?: number;
    totalTokens?: number;
  };
}

/**
 * Execution context passed to agent during task execution
 */
export interface ExecutionContext {
  /** System prompt with hydrated context */
  systemPrompt: string;
  /** Tool executor function for running skill tools */
  toolExecutor: (name: string, input: Record<string, unknown>) => Promise<ToolExecutionResult>;
  /** Available tool definitions for LLM */
  toolDefinitions: ToolDefinitionRef[];
  /** LLM client for making requests */
  llmClient: LLMClientRef;
  /** Session ID for tracking */
  sessionId: string;
  /** Additional context data */
  contextData?: Record<string, unknown>;
}

/**
 * Reference to LLM client (avoids circular imports)
 * Uses 'any' for complex types to avoid circular dependency issues
 */
export interface LLMClientRef {
  executeToolLoop: (
    systemPrompt: string,
    userMessage: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: any[],
    executor: (name: string, input: Record<string, unknown>) => Promise<ToolExecutionResult>,
    options?: { maxIterations?: number }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chat: (systemPrompt: string, userMessage: string, history?: any[]) => Promise<string>;
}

/**
 * Tool definition reference (avoids circular imports)
 */
export interface ToolDefinitionRef {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input_schema: any;
}

/**
 * Tool execution result reference
 */
export interface ToolExecutionResult {
  success: boolean;
  result: string | unknown[];
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tool loop result reference
 */
export interface ToolLoopResultRef {
  finalResponse: string;
  toolUses: Array<{
    request: { name: string; input: Record<string, unknown> };
    result: ToolExecutionResult;
  }>;
  iterations: number;
  totalTokens: { input: number; output: number; total: number };
  success: boolean;
  error?: string;
}
