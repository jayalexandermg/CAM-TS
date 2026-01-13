/**
 * Infinite Aura - Preprompt Hydrator
 *
 * Two-layer preprompt hydration orchestrator.
 * Layer 1 (Global): CORE context loaded at session start
 * Layer 2 (Agent-Specific): Skill context loaded on demand
 */

import { CoreManager, CoreContext } from '../memory/core';
import { SkillManager, Skill } from '../skills';
import { PrepromptInjector } from './PrepromptInjector';
import { TokenManager } from './TokenManager';
import { RelevanceScorer } from './relevance-scorer';
import {
  SkillAgentContext,
  CachedLayer,
  PrepromptHydratorConfig,
  DEFAULT_PREPROMPT_HYDRATOR_CONFIG,
  LAYER_1_PRIORITIES,
  LAYER_2_PRIORITIES,
  LAYER_1_MARKERS,
  LAYER_2_MARKERS,
  LAYER_NAMES,
} from './preprompt-hydrator-types';

/**
 * Two-layer preprompt hydration orchestrator
 *
 * Manages context hydration in two layers:
 * - Layer 1 (Global): CORE context - USER.md, PREFERENCES.md, ACTIVE_PROJECTS.md
 *   - Priority 0-9
 *   - Loaded at session start
 *   - Cached for session duration
 *
 * - Layer 2 (Agent-Specific): Skill context
 *   - Priority 10+
 *   - Loaded on demand when skill activates
 *   - Cleared when skill deactivates
 */
export class PrepromptHydrator {
  private readonly coreManager: CoreManager;
  private readonly skillManager: SkillManager;
  private readonly prepromptInjector: PrepromptInjector;
  private readonly tokenManager: TokenManager;
  private readonly relevanceScorer: RelevanceScorer;
  private readonly config: PrepromptHydratorConfig;

  // Caches
  private layer1Cache: CachedLayer | null = null;
  private layer2Cache: CachedLayer | null = null;
  private activeSkillName: string | null = null;

  /**
   * Create a new PrepromptHydrator
   * @param coreManager - CoreManager for loading CORE context
   * @param skillManager - SkillManager for loading skill context
   * @param prepromptInjector - PrepromptInjector for system prompt injection
   * @param config - Configuration options
   */
  constructor(
    coreManager: CoreManager,
    skillManager: SkillManager,
    prepromptInjector: PrepromptInjector,
    config: Partial<PrepromptHydratorConfig> = {}
  ) {
    this.coreManager = coreManager;
    this.skillManager = skillManager;
    this.prepromptInjector = prepromptInjector;
    this.tokenManager = new TokenManager();
    this.relevanceScorer = new RelevanceScorer();
    this.config = {
      ...DEFAULT_PREPROMPT_HYDRATOR_CONFIG,
      ...config,
    };
  }

  // =========================================================================
  // Layer 1: Global Context
  // =========================================================================

  /**
   * Load Layer 1 (Global) context from CORE
   *
   * Loads USER.md, PREFERENCES.md, ACTIVE_PROJECTS.md from CORE directory
   * and injects them into the preprompt with appropriate priorities.
   *
   * @returns Formatted Layer 1 content
   */
  async loadLayer1(): Promise<string> {
    // Check if cache is still valid
    if (this.layer1Cache && !this.isCacheExpired(this.layer1Cache)) {
      return this.layer1Cache.content;
    }

    // Load CORE context
    const isValid = await this.coreManager.validateCore();
    if (!isValid) {
      await this.coreManager.initialize();
    }
    const coreContext = await this.coreManager.loadCore();

    // Format Layer 1 content
    const formattedContent = this.formatLayer1(coreContext);

    // Enforce token limit
    const limitedContent = this.tokenManager.enforceLimit(
      formattedContent,
      this.config.maxLayer1Tokens
    );

    // Cache the content
    this.layer1Cache = this.createCacheEntry(limitedContent, 'layer1');

    // Inject into preprompt
    this.injectLayer1(coreContext);

    return limitedContent;
  }

  /**
   * Check if Layer 1 is loaded
   */
  hasLayer1(): boolean {
    return this.layer1Cache !== null && !this.isCacheExpired(this.layer1Cache);
  }

  /**
   * Get Layer 1 content from cache
   */
  getLayer1Content(): string | null {
    if (!this.layer1Cache || this.isCacheExpired(this.layer1Cache)) {
      return null;
    }
    return this.layer1Cache.content;
  }

  /**
   * Clear Layer 1 cache (forces reload on next access)
   */
  clearLayer1Cache(): void {
    this.layer1Cache = null;
    // Clear Layer 1 layers from preprompt
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER1_USER);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER1_PREFERENCES);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER1_PROJECTS);
  }

  // =========================================================================
  // Layer 2: Agent-Specific Context
  // =========================================================================

  /**
   * Load Layer 2 (Agent-Specific) context for a skill
   *
   * Loads skill definition, agent personality, task context, and relevant memory.
   *
   * @param skillName - Name of the skill to load context for
   * @param agentContext - Optional agent-specific context
   * @returns Formatted Layer 2 content
   */
  async loadLayer2(skillName: string, agentContext?: SkillAgentContext): Promise<string> {
    // Get skill from SkillManager
    const skill = this.skillManager.getSkill(skillName);

    // Format Layer 2 content (works even if skill is undefined)
    const formattedContent = this.formatLayer2(skill, agentContext);

    // Enforce token limit
    const limitedContent = this.tokenManager.enforceLimit(
      formattedContent,
      this.config.maxLayer2Tokens
    );

    // Cache the content
    this.layer2Cache = this.createCacheEntry(limitedContent, `layer2-${skillName}`);
    this.activeSkillName = skillName;

    // Inject into preprompt
    this.injectLayer2(skill, agentContext);

    return limitedContent;
  }

  /**
   * Check if Layer 2 is loaded
   */
  hasLayer2(): boolean {
    return this.layer2Cache !== null && !this.isCacheExpired(this.layer2Cache);
  }

  /**
   * Get Layer 2 content from cache
   */
  getLayer2Content(): string | null {
    if (!this.layer2Cache || this.isCacheExpired(this.layer2Cache)) {
      return null;
    }
    return this.layer2Cache.content;
  }

  /**
   * Clear Layer 2 (deactivate skill context)
   */
  clearLayer2(): void {
    this.layer2Cache = null;
    this.activeSkillName = null;

    // Clear Layer 2 layers from preprompt
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_SKILL);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_CONTEXT);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_PERSONALITY);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_TASK);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_MEMORY);
  }

  /**
   * Get active skill name if Layer 2 is loaded
   */
  getActiveSkillName(): string | null {
    return this.activeSkillName;
  }

  // =========================================================================
  // Combined Context
  // =========================================================================

  /**
   * Get fully hydrated context (Layer 1 + Layer 2)
   *
   * @returns Combined hydrated context string
   */
  getHydratedContext(): string {
    const parts: string[] = [];

    // Add Layer 1 if loaded
    const layer1 = this.getLayer1Content();
    if (layer1) {
      parts.push(layer1);
    }

    // Add Layer 2 if loaded
    const layer2 = this.getLayer2Content();
    if (layer2) {
      parts.push(layer2);
    }

    return parts.join('\n\n');
  }

  /**
   * Get the underlying PrepromptInjector
   */
  getPrepromptInjector(): PrepromptInjector {
    return this.prepromptInjector;
  }

  // =========================================================================
  // Token Management
  // =========================================================================

  /**
   * Get estimated token count for current context
   */
  getEstimatedTokens(): number {
    return this.tokenManager.estimateTokens(this.getHydratedContext());
  }

  /**
   * Check if context is within token limits
   */
  isWithinTokenLimits(): boolean {
    return this.getEstimatedTokens() <= this.config.maxTotalTokens;
  }

  // =========================================================================
  // Configuration
  // =========================================================================

  /**
   * Get configuration
   */
  getConfig(): Readonly<PrepromptHydratorConfig> {
    return { ...this.config };
  }

  /**
   * Get CoreManager
   */
  getCoreManager(): CoreManager {
    return this.coreManager;
  }

  /**
   * Get SkillManager
   */
  getSkillManager(): SkillManager {
    return this.skillManager;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Format Layer 1 content
   */
  private formatLayer1(coreContext: CoreContext): string {
    const sections: string[] = [];

    sections.push(LAYER_1_MARKERS.START);
    sections.push('');

    // Add user identity section
    if (coreContext.user && coreContext.user.trim()) {
      sections.push(`## User Identity\n${coreContext.user}`);
    }

    // Add preferences section
    if (coreContext.preferences && coreContext.preferences.trim()) {
      sections.push(`## User Preferences\n${coreContext.preferences}`);
    }

    // Add active projects section
    if (coreContext.activeProjects && coreContext.activeProjects.trim()) {
      sections.push(`## Active Projects\n${coreContext.activeProjects}`);
    }

    sections.push('');
    sections.push(LAYER_1_MARKERS.END);

    return sections.join('\n');
  }

  /**
   * Format Layer 2 content
   */
  private formatLayer2(skill: Skill | undefined, agentContext?: SkillAgentContext): string {
    const sections: string[] = [];

    sections.push(LAYER_2_MARKERS.START);
    sections.push('');

    // Add active skill section
    if (skill) {
      const skillSection = [
        '## Active Skill',
        `**Name:** ${skill.definition.name}`,
        `**Description:** ${skill.definition.description}`,
      ];
      if (skill.definition.capabilities.length > 0) {
        skillSection.push(`**Capabilities:** ${skill.definition.capabilities.join(', ')}`);
      }
      sections.push(skillSection.join('\n'));

      // Add skill context if present
      if (skill.definition.context) {
        sections.push(`## Skill Context\n${skill.definition.context}`);
      }
    } else if (agentContext?.skillName) {
      // Skill not found, but we have a name
      sections.push(`## Active Skill\n**Name:** ${agentContext.skillName}`);
    }

    // Add agent personality if provided
    if (agentContext?.agentPersonality) {
      sections.push(`## Agent Personality\n${agentContext.agentPersonality}`);
    }

    // Add task context if provided
    if (agentContext?.taskContext) {
      sections.push(`## Task Context\n${agentContext.taskContext}`);
    }

    // Add relevant memory if provided
    if (agentContext?.relevantMemory && agentContext.relevantMemory.length > 0) {
      // Score and filter relevant memory
      const query = agentContext.taskContext || agentContext.skillName || '';
      const scored = this.relevanceScorer.rankContexts(agentContext.relevantMemory, query);
      const filtered = this.relevanceScorer.filterByScore(scored, this.config.minRelevanceScore);

      // If no memory passes the filter, include all (they were explicitly provided)
      const memoryToInclude = filtered.length > 0 ? filtered : agentContext.relevantMemory;

      if (memoryToInclude.length > 0) {
        sections.push(`## Relevant Memory\n${memoryToInclude.join('\n\n')}`);
      }
    }

    sections.push('');
    sections.push(LAYER_2_MARKERS.END);

    return sections.join('\n');
  }

  /**
   * Inject Layer 1 into preprompt
   */
  private injectLayer1(coreContext: CoreContext): void {
    // Inject user identity
    if (coreContext.user && coreContext.user.trim()) {
      this.prepromptInjector.injectContext(
        LAYER_NAMES.LAYER1_USER,
        `## User Identity\n${coreContext.user}`,
        LAYER_1_PRIORITIES.USER_IDENTITY
      );
    }

    // Inject preferences
    if (coreContext.preferences && coreContext.preferences.trim()) {
      this.prepromptInjector.injectContext(
        LAYER_NAMES.LAYER1_PREFERENCES,
        `## User Preferences\n${coreContext.preferences}`,
        LAYER_1_PRIORITIES.USER_PREFERENCES
      );
    }

    // Inject active projects
    if (coreContext.activeProjects && coreContext.activeProjects.trim()) {
      this.prepromptInjector.injectContext(
        LAYER_NAMES.LAYER1_PROJECTS,
        `## Active Projects\n${coreContext.activeProjects}`,
        LAYER_1_PRIORITIES.ACTIVE_PROJECTS
      );
    }
  }

  /**
   * Inject Layer 2 into preprompt
   */
  private injectLayer2(skill: Skill | undefined, agentContext?: SkillAgentContext): void {
    // Clear existing Layer 2
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_SKILL);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_CONTEXT);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_PERSONALITY);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_TASK);
    this.prepromptInjector.clearLayer(LAYER_NAMES.LAYER2_MEMORY);

    // Inject skill info
    if (skill) {
      const skillContent = [
        '## Active Skill',
        `**Name:** ${skill.definition.name}`,
        `**Description:** ${skill.definition.description}`,
      ];
      if (skill.definition.capabilities.length > 0) {
        skillContent.push(`**Capabilities:** ${skill.definition.capabilities.join(', ')}`);
      }
      this.prepromptInjector.injectContext(
        LAYER_NAMES.LAYER2_SKILL,
        skillContent.join('\n'),
        LAYER_2_PRIORITIES.ACTIVE_SKILL
      );

      // Inject skill context
      if (skill.definition.context) {
        this.prepromptInjector.injectContext(
          LAYER_NAMES.LAYER2_CONTEXT,
          `## Skill Context\n${skill.definition.context}`,
          LAYER_2_PRIORITIES.SKILL_CONTEXT
        );
      }
    }

    // Inject agent personality
    if (agentContext?.agentPersonality) {
      this.prepromptInjector.injectContext(
        LAYER_NAMES.LAYER2_PERSONALITY,
        `## Agent Personality\n${agentContext.agentPersonality}`,
        LAYER_2_PRIORITIES.AGENT_PERSONALITY
      );
    }

    // Inject task context
    if (agentContext?.taskContext) {
      this.prepromptInjector.injectContext(
        LAYER_NAMES.LAYER2_TASK,
        `## Task Context\n${agentContext.taskContext}`,
        LAYER_2_PRIORITIES.TASK_CONTEXT
      );
    }

    // Inject relevant memory
    if (agentContext?.relevantMemory && agentContext.relevantMemory.length > 0) {
      const query = agentContext.taskContext || agentContext.skillName || '';
      const scored = this.relevanceScorer.rankContexts(agentContext.relevantMemory, query);
      const filtered = this.relevanceScorer.filterByScore(scored, this.config.minRelevanceScore);
      const memoryToInclude = filtered.length > 0 ? filtered : agentContext.relevantMemory;

      if (memoryToInclude.length > 0) {
        this.prepromptInjector.injectContext(
          LAYER_NAMES.LAYER2_MEMORY,
          `## Relevant Memory\n${memoryToInclude.join('\n\n')}`,
          LAYER_2_PRIORITIES.RELEVANT_MEMORY
        );
      }
    }
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(cache: CachedLayer): boolean {
    const cachedAt = new Date(cache.cachedAt).getTime();
    const now = Date.now();
    return now - cachedAt > this.config.cacheExpiryMs;
  }

  /**
   * Create cache entry
   */
  private createCacheEntry(content: string, key: string): CachedLayer {
    return {
      content,
      cachedAt: new Date().toISOString(),
      key,
    };
  }
}
