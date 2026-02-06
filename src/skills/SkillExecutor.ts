/**
 * SkillExecutor - Execute skill tools and workflows
 *
 * Provides the execution layer for skills. When an agent requests a tool,
 * the SkillExecutor finds and runs the appropriate skill tool.
 */

import { SkillActivator } from './SkillActivator';
import {
  ToolDefinition,
  ToolExecutionResult,
} from '../orchestrator/llm/ToolSchema';
import { ActiveSkill } from './types';

/**
 * Result of executing a workflow
 */
export interface WorkflowExecutionResult {
  success: boolean;
  output: string;
  stepsCompleted: number;
  totalSteps: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Options for tool execution
 */
export interface ToolExecutionOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to capture detailed logs */
  verbose?: boolean;
}

/**
 * Executes skill tools and workflows
 */
export class SkillExecutor {
  private readonly skillActivator: SkillActivator;
  private readonly toolRegistry: Map<string, RegisteredTool>;

  constructor(skillActivator: SkillActivator) {
    this.skillActivator = skillActivator;
    this.toolRegistry = new Map();
  }

  /**
   * Execute a tool by name
   *
   * @param toolName - Name of the tool to execute
   * @param input - Input parameters for the tool
   * @param options - Execution options
   * @returns Result of the tool execution
   */
  async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    // Check if tool is registered
    const registered = this.toolRegistry.get(toolName);
    if (registered) {
      return this.executeRegisteredTool(registered, input, options);
    }

    // Check active skills for the tool
    const activeSkills = this.skillActivator.getActiveSkills();
    for (const activeSkill of activeSkills) {
      const tool = this.findToolInSkill(activeSkill, toolName);
      if (tool) {
        return this.executeSkillTool(activeSkill, tool, input, options);
      }
    }

    // Tool not found
    return {
      success: false,
      result: `Tool not found: ${toolName}`,
      error: `No active skill provides tool: ${toolName}`,
    };
  }

  /**
   * Execute a workflow by name
   *
   * @param skillName - Name of the skill containing the workflow
   * @param workflowName - Name of the workflow to execute
   * @param input - Input for the workflow
   * @returns Result of the workflow execution
   */
  async executeWorkflow(
    skillName: string,
    workflowName: string,
    input: Record<string, unknown>
  ): Promise<WorkflowExecutionResult> {
    const activeSkill = this.skillActivator.getActiveSkill(skillName);
    if (!activeSkill) {
      return {
        success: false,
        output: '',
        stepsCompleted: 0,
        totalSteps: 0,
        error: `Skill not active: ${skillName}`,
      };
    }

    const workflow = this.findWorkflowInSkill(activeSkill, workflowName);
    if (!workflow) {
      return {
        success: false,
        output: '',
        stepsCompleted: 0,
        totalSteps: 0,
        error: `Workflow not found: ${workflowName} in skill ${skillName}`,
      };
    }

    return this.executeSkillWorkflow(activeSkill, workflow, input);
  }

  /**
   * Register a custom tool handler
   *
   * @param name - Tool name
   * @param definition - Tool definition
   * @param handler - Function to execute the tool
   */
  registerTool(
    name: string,
    definition: ToolDefinition,
    handler: ToolHandler
  ): void {
    this.toolRegistry.set(name, {
      name,
      definition,
      handler,
    });
  }

  /**
   * Unregister a custom tool
   */
  unregisterTool(name: string): void {
    this.toolRegistry.delete(name);
  }

  /**
   * Get all available tool definitions
   *
   * Combines registered tools with tools from active skills.
   *
   * @returns Array of tool definitions for LLM
   */
  getAvailableToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];

    // Add registered tools
    for (const registered of this.toolRegistry.values()) {
      definitions.push(registered.definition);
    }

    // Add tools from active skills
    const skillDefinitions = this.skillActivator.getToolDefinitions();
    definitions.push(...skillDefinitions);

    return definitions;
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(toolName: string): boolean {
    if (this.toolRegistry.has(toolName)) {
      return true;
    }

    const activeSkills = this.skillActivator.getActiveSkills();
    for (const activeSkill of activeSkills) {
      if (this.findToolInSkill(activeSkill, toolName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create tool executor function for LLM tool loop
   *
   * @returns Executor function compatible with LLMClient.executeToolLoop
   */
  createToolExecutor(): (
    name: string,
    input: Record<string, unknown>
  ) => Promise<ToolExecutionResult> {
    return async (name: string, input: Record<string, unknown>) => {
      return this.executeTool(name, input);
    };
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private findToolInSkill(activeSkill: ActiveSkill, toolName: string): SkillTool | null {
    // Tools in skills are file paths - check if tool name matches
    for (const toolPath of activeSkill.tools) {
      // Extract tool name from path (e.g., "tools/search.ts" -> "search")
      const pathToolName = this.extractToolName(toolPath);
      if (pathToolName === toolName || toolPath === toolName) {
        return {
          name: toolName,
          path: toolPath,
          skill: activeSkill.skill,
        };
      }
    }
    return null;
  }

  private findWorkflowInSkill(
    activeSkill: ActiveSkill,
    workflowName: string
  ): SkillWorkflow | null {
    for (const workflowPath of activeSkill.workflows) {
      const pathWorkflowName = this.extractToolName(workflowPath);
      if (pathWorkflowName === workflowName || workflowPath === workflowName) {
        return {
          name: workflowName,
          path: workflowPath,
          skill: activeSkill.skill,
        };
      }
    }
    return null;
  }

  private extractToolName(path: string): string {
    // Extract name from path like "tools/search.ts" -> "search"
    const fileName = path.split('/').pop() || path;
    return fileName.replace(/\.(ts|js|json)$/, '');
  }

  private async executeRegisteredTool(
    registered: RegisteredTool,
    input: Record<string, unknown>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.withTimeout(
        registered.handler(input),
        options?.timeout ?? 30000
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        result: `Tool execution failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  private async executeSkillTool(
    activeSkill: ActiveSkill,
    tool: SkillTool,
    input: Record<string, unknown>,
    _options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    // For now, skill tools return a simulated result
    // In a full implementation, this would load and execute the tool module
    try {
      const result = await this.simulateToolExecution(tool.name, input, activeSkill);
      return {
        success: true,
        result,
        metadata: {
          skill: activeSkill.skill.name,
          tool: tool.name,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        result: `Skill tool execution failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  private async executeSkillWorkflow(
    activeSkill: ActiveSkill,
    workflow: SkillWorkflow,
    input: Record<string, unknown>
  ): Promise<WorkflowExecutionResult> {
    // Placeholder workflow execution
    return {
      success: true,
      output: `Workflow ${workflow.name} executed for skill ${activeSkill.skill.name}`,
      stepsCompleted: 1,
      totalSteps: 1,
      metadata: {
        skill: activeSkill.skill.name,
        workflow: workflow.name,
        input,
      },
    };
  }

  private async simulateToolExecution(
    toolName: string,
    input: Record<string, unknown>,
    activeSkill: ActiveSkill
  ): Promise<string> {
    // Simulate different tool behaviors based on name
    const toolLower = toolName.toLowerCase();

    if (toolLower.includes('search') || toolLower.includes('find')) {
      return JSON.stringify({
        query: input.query || input.term || 'unknown',
        results: [
          { title: 'Result 1', relevance: 0.95 },
          { title: 'Result 2', relevance: 0.82 },
        ],
        skill: activeSkill.skill.name,
      });
    }

    if (toolLower.includes('read') || toolLower.includes('get')) {
      return JSON.stringify({
        content: `Content retrieved for ${JSON.stringify(input)}`,
        skill: activeSkill.skill.name,
      });
    }

    if (toolLower.includes('write') || toolLower.includes('create')) {
      return JSON.stringify({
        created: true,
        path: input.path || 'unknown',
        skill: activeSkill.skill.name,
      });
    }

    // Default response
    return JSON.stringify({
      tool: toolName,
      input,
      result: 'executed',
      skill: activeSkill.skill.name,
    });
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

/**
 * Handler function for custom tools
 */
export type ToolHandler = (
  input: Record<string, unknown>
) => Promise<ToolExecutionResult>;

/**
 * Registered tool with handler
 */
interface RegisteredTool {
  name: string;
  definition: ToolDefinition;
  handler: ToolHandler;
}

/**
 * Internal skill tool reference
 */
interface SkillTool {
  name: string;
  path: string;
  skill: ActiveSkill['skill'];
}

/**
 * Internal skill workflow reference
 */
interface SkillWorkflow {
  name: string;
  path: string;
  skill: ActiveSkill['skill'];
}
