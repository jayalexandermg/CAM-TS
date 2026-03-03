/**
 * ToolRegistry - Central registry for tool handlers
 *
 * Provides registration, lookup, and execution of tool handlers.
 * Skills register their tools here so SkillExecutor can dispatch real execution.
 */

/**
 * Result of executing a tool via the registry
 */
export interface ToolRegistryResult {
  success: boolean;
  output: unknown;
  error?: string;
  executionTime: number;
}

/**
 * A registered tool handler with metadata
 */
export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<ToolRegistryResult>;
}

/**
 * Central registry for tool handlers.
 * SkillExecutor uses this to look up and execute real tool implementations.
 */
export class ToolRegistry {
  private readonly tools: Map<string, ToolHandler>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a tool handler by name
   */
  registerTool(tool: ToolHandler): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Look up a tool by name
   */
  getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all registered tool names
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool by name with timing measurement and error wrapping
   */
  async executeTool(
    name: string,
    input: Record<string, unknown>
  ): Promise<ToolRegistryResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        output: null,
        error: `ToolNotFoundError: Tool "${name}" is not registered`,
        executionTime: 0,
      };
    }

    const start = Date.now();
    try {
      const result = await tool.handler(input);
      return {
        ...result,
        executionTime: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - start,
      };
    }
  }

  /**
   * Remove a tool from the registry
   */
  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get the total number of registered tools
   */
  get size(): number {
    return this.tools.size;
  }
}
