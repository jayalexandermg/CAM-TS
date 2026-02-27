/**
 * SkillActivator - Manages skill activation and context loading
 *
 * Activates skills based on intent routing, loads skill context into Layer 2
 * of the preprompt, and manages the skill lifecycle (activation/deactivation).
 */

import { SkillManager } from './SkillManager';
import { SkillRouter } from './SkillRouter';
import { PrepromptHydrator, SkillAgentContext } from '../context';
import { Skill, SkillContext, ActiveSkill, ActivationResult, ActivationOptions } from './types';
import { MemoryError, ErrorCodes } from '../exceptions';
import { ToolDefinition, ToolInputSchema } from '../orchestrator/llm/ToolSchema';

/**
 * Default minimum confidence for automatic activation
 */
const DEFAULT_MIN_CONFIDENCE = 0.5;

/**
 * Manages skill activation and context loading
 */
export class SkillActivator {
  private readonly skillManager: SkillManager;
  private readonly skillRouter: SkillRouter;
  private readonly prepromptHydrator: PrepromptHydrator;
  private readonly activeSkills: Map<string, ActiveSkill>;

  /**
   * Create a new SkillActivator
   * @param skillManager - SkillManager for retrieving skills
   * @param skillRouter - SkillRouter for routing requests to skills
   * @param prepromptHydrator - PrepromptHydrator for loading Layer 2 context
   */
  constructor(
    skillManager: SkillManager,
    skillRouter: SkillRouter,
    prepromptHydrator: PrepromptHydrator
  ) {
    this.skillManager = skillManager;
    this.skillRouter = skillRouter;
    this.prepromptHydrator = prepromptHydrator;
    this.activeSkills = new Map();
  }

  // =========================================================================
  // Activation from Request
  // =========================================================================

  /**
   * Activate a skill based on a user request
   *
   * Uses the SkillRouter to find the best matching skill and activates it.
   *
   * @param request - User request to match
   * @param options - Activation options
   * @returns ActivationResult with activation status and details
   */
  async activateFromRequest(
    request: string,
    options?: ActivationOptions
  ): Promise<ActivationResult> {
    const minConfidence = options?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    const preferredSkill = options?.preferredSkill;

    // Route the request to a skill
    const routing = await this.skillRouter.route(request, {
      minConfidence,
      preferredSkill,
    });

    // Check if routing was successful
    if (!routing.routed || !routing.skill) {
      return {
        activated: false,
        skill: null,
        reason: routing.reason,
        confidence: routing.confidence,
      };
    }

    // Activate the skill
    const context: SkillContext = {
      taskDescription: request,
    };

    try {
      await this.activateSkill(routing.skill.name, context, options);

      return {
        activated: true,
        skill: routing.skill,
        reason: `Activated skill: ${routing.skill.name}`,
        confidence: routing.confidence,
      };
    } catch (error) {
      return {
        activated: false,
        skill: null,
        reason: `Failed to activate skill: ${(error as Error).message}`,
        confidence: routing.confidence,
      };
    }
  }

  // =========================================================================
  // Direct Activation
  // =========================================================================

  /**
   * Activate a skill by name
   *
   * @param skillName - Name of the skill to activate
   * @param context - Optional context to provide to the skill
   * @param options - Activation options
   * @throws MemoryError if skill not found
   */
  async activateSkill(
    skillName: string,
    context?: SkillContext,
    options?: ActivationOptions
  ): Promise<void> {
    // Get the skill from SkillManager
    const skill = this.skillManager.getSkill(skillName);
    if (!skill) {
      throw new MemoryError(`Skill not found: ${skillName}`, ErrorCodes.FILE_NOT_FOUND, {
        skillName,
      });
    }

    // Check if skill is already active
    if (this.isSkillActive(skillName)) {
      // Update context if provided
      if (context) {
        await this.loadSkillContext(skill, context);
        // Update the active skill entry
        const activeSkill = this.activeSkills.get(skillName)!;
        activeSkill.context = context;
      }
      return;
    }

    // Check if another skill is active and force is not set
    if (this.getActiveSkillCount() > 0 && !options?.force) {
      // Deactivate all current skills first
      await this.deactivateAll();
    }

    // Load skill context into Layer 2
    await this.loadSkillContext(skill, context);

    // Track as active
    this.activeSkills.set(skillName, {
      skill,
      activatedAt: new Date(),
      context,
      workflows: skill.workflows,
      tools: skill.tools,
    });
  }

  // =========================================================================
  // Deactivation
  // =========================================================================

  /**
   * Deactivate a skill by name
   *
   * @param skillName - Name of the skill to deactivate
   */
  async deactivateSkill(skillName: string): Promise<void> {
    if (!this.isSkillActive(skillName)) {
      return;
    }

    // Clear Layer 2 context
    this.prepromptHydrator.clearLayer2();

    // Remove from active skills
    this.activeSkills.delete(skillName);
  }

  /**
   * Deactivate all active skills
   */
  async deactivateAll(): Promise<void> {
    if (this.activeSkills.size === 0) {
      return;
    }

    // Clear Layer 2 context
    this.prepromptHydrator.clearLayer2();

    // Clear all active skills
    this.activeSkills.clear();
  }

  // =========================================================================
  // Active Skill Queries
  // =========================================================================

  /**
   * Get all active skills
   * @returns Array of ActiveSkill objects
   */
  getActiveSkills(): ActiveSkill[] {
    return Array.from(this.activeSkills.values());
  }

  /**
   * Get active skill by name
   * @param skillName - Name of the skill
   * @returns ActiveSkill or undefined
   */
  getActiveSkill(skillName: string): ActiveSkill | undefined {
    return this.activeSkills.get(skillName);
  }

  /**
   * Check if a specific skill is active
   * @param skillName - Name of the skill to check
   * @returns true if skill is active
   */
  isSkillActive(skillName: string): boolean {
    return this.activeSkills.has(skillName);
  }

  /**
   * Get the number of active skills
   * @returns Number of active skills
   */
  getActiveSkillCount(): number {
    return this.activeSkills.size;
  }

  /**
   * Check if any skill is active
   * @returns true if at least one skill is active
   */
  hasActiveSkill(): boolean {
    return this.activeSkills.size > 0;
  }

  /**
   * Get the name of the first active skill (primary skill)
   * @returns Name of the active skill or null
   */
  getPrimaryActiveSkillName(): string | null {
    if (this.activeSkills.size === 0) {
      return null;
    }
    return this.activeSkills.keys().next().value ?? null;
  }

  // =========================================================================
  // Context Management
  // =========================================================================

  /**
   * Update context for an active skill
   *
   * @param skillName - Name of the skill to update
   * @param context - New context to apply
   * @throws MemoryError if skill is not active
   */
  async updateSkillContext(skillName: string, context: SkillContext): Promise<void> {
    const activeSkill = this.activeSkills.get(skillName);
    if (!activeSkill) {
      throw new MemoryError(`Skill is not active: ${skillName}`, ErrorCodes.VALIDATION_FAILED, {
        skillName,
      });
    }

    // Load updated context
    await this.loadSkillContext(activeSkill.skill, context);

    // Update stored context
    activeSkill.context = context;
  }

  /**
   * Get the current context for an active skill
   * @param skillName - Name of the skill
   * @returns SkillContext or undefined
   */
  getSkillContext(skillName: string): SkillContext | undefined {
    return this.activeSkills.get(skillName)?.context;
  }

  // =========================================================================
  // Workflow and Tool Access
  // =========================================================================

  /**
   * Get available workflows for an active skill
   * @param skillName - Name of the skill
   * @returns Array of workflow file paths or empty array
   */
  getActiveWorkflows(skillName: string): string[] {
    return this.activeSkills.get(skillName)?.workflows ?? [];
  }

  /**
   * Get available tools for an active skill
   * @param skillName - Name of the skill
   * @returns Array of tool file paths or empty array
   */
  getActiveTools(skillName: string): string[] {
    return this.activeSkills.get(skillName)?.tools ?? [];
  }

  /**
   * Get all available workflows from all active skills
   * @returns Array of workflow file paths
   */
  getAllActiveWorkflows(): string[] {
    const workflows: string[] = [];
    for (const activeSkill of this.activeSkills.values()) {
      workflows.push(...activeSkill.workflows);
    }
    return workflows;
  }

  /**
   * Get all available tools from all active skills
   * @returns Array of tool file paths
   */
  getAllActiveTools(): string[] {
    const tools: string[] = [];
    for (const activeSkill of this.activeSkills.values()) {
      tools.push(...activeSkill.tools);
    }
    return tools;
  }

  /**
   * Get tool definitions for all active skills
   *
   * Converts active skill tools into Anthropic ToolDefinition format
   * for use with LLM tool calling.
   *
   * @returns Array of ToolDefinition objects
   */
  getToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];

    for (const activeSkill of this.activeSkills.values()) {
      for (const toolPath of activeSkill.tools) {
        const toolName = this.extractToolName(toolPath);
        const definition = this.buildToolDefinition(toolName, toolPath, activeSkill);
        definitions.push(definition);
      }
    }

    return definitions;
  }

  /**
   * Extract tool name from file path
   */
  private extractToolName(toolPath: string): string {
    const fileName = toolPath.split('/').pop() || toolPath;
    return fileName.replace(/\.(ts|js|json)$/, '');
  }

  /**
   * Build a ToolDefinition from skill tool info
   */
  private buildToolDefinition(
    toolName: string,
    toolPath: string,
    activeSkill: ActiveSkill
  ): ToolDefinition {
    // Build description from skill context
    const skillName = activeSkill.skill.name;
    const skillDescription = activeSkill.skill.definition?.description || '';

    return {
      name: toolName,
      description: `Tool from ${skillName} skill. ${skillDescription}`.trim(),
      input_schema: this.buildDefaultInputSchema(toolName),
    };
  }

  /**
   * Build a default input schema for a tool
   *
   * In a full implementation, this would read the tool's actual schema
   */
  private buildDefaultInputSchema(toolName: string): ToolInputSchema {
    const toolLower = toolName.toLowerCase();

    // Common tool patterns
    if (toolLower.includes('search') || toolLower.includes('find')) {
      return {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
          },
        },
        required: ['query'],
      };
    }

    if (toolLower.includes('read') || toolLower.includes('get')) {
      return {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the resource',
          },
        },
        required: ['path'],
      };
    }

    if (toolLower.includes('write') || toolLower.includes('create')) {
      return {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to write to',
          },
          content: {
            type: 'string',
            description: 'Content to write',
          },
        },
        required: ['path', 'content'],
      };
    }

    // Default generic schema
    return {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Input for the tool',
        },
      },
      required: [],
    };
  }

  // =========================================================================
  // Integration Access
  // =========================================================================

  /**
   * Get the SkillManager
   */
  getSkillManager(): SkillManager {
    return this.skillManager;
  }

  /**
   * Get the SkillRouter
   */
  getSkillRouter(): SkillRouter {
    return this.skillRouter;
  }

  /**
   * Get the PrepromptHydrator
   */
  getPrepromptHydrator(): PrepromptHydrator {
    return this.prepromptHydrator;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Load skill context into Layer 2 via PrepromptHydrator
   *
   * @param skill - Skill to load context for
   * @param context - Optional context to include
   */
  private async loadSkillContext(skill: Skill, context?: SkillContext): Promise<void> {
    // Build agent context for Layer 2
    const agentContext: SkillAgentContext = {
      skillName: skill.name,
      agentPersonality: skill.definition.context,
      taskContext: context?.taskDescription,
      relevantMemory: context?.relevantMemory,
    };

    // Load into Layer 2 using PrepromptHydrator
    await this.prepromptHydrator.loadLayer2(skill.name, agentContext);
  }
}
