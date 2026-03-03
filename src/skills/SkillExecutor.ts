/**
 * SkillExecutor - Execute skill tools and workflows
 *
 * Provides the execution layer for skills. When an agent requests a tool,
 * the SkillExecutor finds and runs the appropriate skill tool via ToolRegistry.
 * Optional GuardrailEngine integration enforces safety constraints before execution.
 */

import { SkillActivator } from './SkillActivator';
import { ToolDefinition, ToolExecutionResult } from '../orchestrator/llm/ToolSchema';
import { ActiveSkill } from './types';
import { ToolRegistry } from './ToolRegistry';
import { GuardrailEngine } from '../guardrails/GuardrailEngine';

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
  private readonly localToolRegistry: Map<string, RegisteredTool>;
  private externalToolRegistry: ToolRegistry | null;
  private guardrailEngine: GuardrailEngine | null;

  constructor(
    skillActivator: SkillActivator,
    toolRegistry?: ToolRegistry,
    guardrailEngine?: GuardrailEngine
  ) {
    this.skillActivator = skillActivator;
    this.localToolRegistry = new Map();
    this.externalToolRegistry = toolRegistry ?? null;
    this.guardrailEngine = guardrailEngine ?? null;
  }

  /**
   * Set the external ToolRegistry (for late binding)
   */
  setToolRegistry(registry: ToolRegistry): void {
    this.externalToolRegistry = registry;
  }

  /**
   * Set the GuardrailEngine (for late binding)
   */
  setGuardrailEngine(engine: GuardrailEngine): void {
    this.guardrailEngine = engine;
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
    // Run guardrail check if engine is available
    const guardrailCheck = this.checkGuardrails(toolName, input);
    if (guardrailCheck) {
      return guardrailCheck;
    }

    // Check local registered tools first
    const registered = this.localToolRegistry.get(toolName);
    if (registered) {
      return this.executeRegisteredTool(registered, input, options);
    }

    // Check external ToolRegistry
    if (this.externalToolRegistry?.hasTool(toolName)) {
      return this.executeViaToolRegistry(toolName, input, options);
    }

    // Check active skills for the tool
    const activeSkills = this.skillActivator.getActiveSkills();
    for (const activeSkill of activeSkills) {
      const tool = this.findToolInSkill(activeSkill, toolName);
      if (tool) {
        return this.executeSkillTool(activeSkill, tool, input, options);
      }
    }

    // Tool not found — clear error, no fake results
    return {
      success: false,
      result: `ToolNotFoundError: Tool "${toolName}" is not registered`,
      error: `ToolNotFoundError: Tool "${toolName}" is not registered. No active skill provides this tool.`,
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
  registerTool(name: string, definition: ToolDefinition, handler: ToolHandler): void {
    this.localToolRegistry.set(name, {
      name,
      definition,
      handler,
    });
  }

  /**
   * Unregister a custom tool
   */
  unregisterTool(name: string): void {
    this.localToolRegistry.delete(name);
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
    for (const registered of this.localToolRegistry.values()) {
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
    if (this.localToolRegistry.has(toolName)) {
      return true;
    }

    if (this.externalToolRegistry?.hasTool(toolName)) {
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

  /**
   * Check guardrails before tool execution.
   * Returns a ToolExecutionResult if blocked, null if allowed.
   */
  private checkGuardrails(
    toolName: string,
    input: Record<string, unknown>
  ): ToolExecutionResult | null {
    if (!this.guardrailEngine) return null;

    const result = this.guardrailEngine.evaluate({
      operation: 'tool_execute',
      tool: toolName,
      path: typeof input.path === 'string' ? input.path : undefined,
      content: typeof input.content === 'string' ? input.content : undefined,
      metadata: { toolInput: input },
    });

    if (!result.allowed) {
      const violationMessages = result.violations
        .map((v) => v.message)
        .join('; ');
      return {
        success: false,
        result: `Guardrail violation: ${violationMessages}`,
        error: `Tool "${toolName}" blocked by guardrails: ${violationMessages}`,
      };
    }

    return null;
  }

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

  private extractToolName(toolPath: string): string {
    // Extract name from path like "tools/search.ts" -> "search"
    const fileName = toolPath.split('/').pop() || toolPath;
    return fileName.replace(/\.(ts|js|json)$/, '');
  }

  private async executeRegisteredTool(
    registered: RegisteredTool,
    input: Record<string, unknown>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.withTimeout(registered.handler(input), options?.timeout ?? 30000);
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

  /**
   * Execute a tool via the external ToolRegistry
   */
  private async executeViaToolRegistry(
    toolName: string,
    input: Record<string, unknown>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    try {
      const registryPromise = this.externalToolRegistry!.executeTool(toolName, input);
      const registryResult = await this.withTimeout(
        registryPromise,
        options?.timeout ?? 30000
      );
      return {
        success: registryResult.success,
        result: typeof registryResult.output === 'string'
          ? registryResult.output
          : JSON.stringify(registryResult.output),
        error: registryResult.error,
        metadata: { executionTime: registryResult.executionTime },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        result: `Tool execution failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute a skill tool via ToolRegistry lookup.
   * If the tool is registered in the external registry, execute it there.
   * Otherwise return a clear error — no fake/simulated results.
   */
  private async executeSkillTool(
    activeSkill: ActiveSkill,
    tool: SkillTool,
    input: Record<string, unknown>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    // Try external ToolRegistry first
    if (this.externalToolRegistry?.hasTool(tool.name)) {
      const result = await this.executeViaToolRegistry(tool.name, input, options);
      return {
        ...result,
        metadata: {
          ...result.metadata,
          skill: activeSkill.skill.name,
          tool: tool.name,
        },
      };
    }

    // No registered handler — return clear error
    return {
      success: false,
      result: `ToolNotFoundError: Tool "${tool.name}" from skill "${activeSkill.skill.name}" has no registered handler`,
      error: `ToolNotFoundError: Tool "${tool.name}" is not registered in the ToolRegistry. Register a handler before execution.`,
    };
  }

  /**
   * Execute a workflow by iterating through its steps via ToolRegistry.
   * Each workflow step's tools are executed sequentially.
   * If any step fails, execution stops and partial results are returned.
   */
  private async executeSkillWorkflow(
    activeSkill: ActiveSkill,
    workflow: SkillWorkflow,
    input: Record<string, unknown>
  ): Promise<WorkflowExecutionResult> {
    // Workflow steps correspond to the tool files in the skill
    const toolNames = activeSkill.tools.map((t) => this.extractToolName(t));
    const totalSteps = toolNames.length;

    if (totalSteps === 0) {
      return {
        success: false,
        output: '',
        stepsCompleted: 0,
        totalSteps: 0,
        error: `Workflow "${workflow.name}" has no tool steps to execute`,
      };
    }

    const stepResults: Array<{ tool: string; result: ToolExecutionResult }> = [];
    let currentInput = { ...input };

    for (let i = 0; i < totalSteps; i++) {
      const toolName = toolNames[i];

      // Run guardrail check per step
      const guardrailCheck = this.checkGuardrails(toolName, currentInput);
      if (guardrailCheck) {
        return {
          success: false,
          output: JSON.stringify(stepResults.map((r) => r.result.result)),
          stepsCompleted: i,
          totalSteps,
          error: `Guardrail blocked step ${i + 1} (${toolName}): ${guardrailCheck.error}`,
          metadata: {
            skill: activeSkill.skill.name,
            workflow: workflow.name,
            stepResults,
          },
        };
      }

      let stepResult: ToolExecutionResult;

      if (this.externalToolRegistry?.hasTool(toolName)) {
        stepResult = await this.executeViaToolRegistry(toolName, currentInput);
      } else {
        stepResult = {
          success: false,
          result: `ToolNotFoundError: Tool "${toolName}" is not registered`,
          error: `ToolNotFoundError: Tool "${toolName}" is not registered in the ToolRegistry`,
        };
      }

      stepResults.push({ tool: toolName, result: stepResult });

      if (!stepResult.success) {
        return {
          success: false,
          output: JSON.stringify(stepResults.map((r) => r.result.result)),
          stepsCompleted: i,
          totalSteps,
          error: `Workflow failed at step ${i + 1} (${toolName}): ${stepResult.error}`,
          metadata: {
            skill: activeSkill.skill.name,
            workflow: workflow.name,
            stepResults,
          },
        };
      }

      // Pass previous step output as input to next step
      if (typeof stepResult.result === 'string') {
        try {
          currentInput = { ...currentInput, previousStepOutput: JSON.parse(stepResult.result) };
        } catch {
          currentInput = { ...currentInput, previousStepOutput: stepResult.result };
        }
      }
    }

    return {
      success: true,
      output: JSON.stringify(stepResults.map((r) => r.result.result)),
      stepsCompleted: totalSteps,
      totalSteps,
      metadata: {
        skill: activeSkill.skill.name,
        workflow: workflow.name,
        stepResults,
      },
    };
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
export type ToolHandler = (input: Record<string, unknown>) => Promise<ToolExecutionResult>;

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
