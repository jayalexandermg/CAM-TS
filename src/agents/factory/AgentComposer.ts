/**
 * AgentComposer - High-level interface for dynamic agent creation
 *
 * Provides a unified API for composing agents from tasks, traits, or examples.
 * Wraps AgentFactory with additional convenience methods.
 */

import { AgentFactory, GeneratedAgent } from './AgentFactory';

export interface ComposeInput {
  task?: string;
  traits?: string[];
  example?: string;
  name?: string;
  autoSpawn?: boolean;
}

export interface ComposeResult {
  agent: GeneratedAgent;
  spawned?: boolean;
  spawnId?: string;
}

export interface ExampleInfo {
  name: string;
  description: string;
  traits: string[];
}

export interface TraitsByCategory {
  expertise: string[];
  personality: string[];
  approach: string[];
}

export interface ValidationResult {
  valid: boolean;
  invalid: string[];
}

export class AgentComposer {
  private factory: AgentFactory;

  constructor(traitsPath?: string, templatePath?: string) {
    this.factory = new AgentFactory(traitsPath, templatePath);
  }

  /**
   * Initialize the composer (loads traits and templates)
   */
  async initialize(): Promise<void> {
    await this.factory.initialize();
  }

  /**
   * Check if the composer is initialized
   */
  isInitialized(): boolean {
    return this.factory.isInitialized();
  }

  /**
   * Compose an agent from various inputs
   *
   * Supports three modes:
   * - Task-based: Infers traits from task description
   * - Trait-based: Uses explicit trait names
   * - Example-based: Uses predefined example composition
   */
  async compose(input: ComposeInput): Promise<ComposeResult> {
    await this.ensureInitialized();

    let agent: GeneratedAgent;

    if (input.example) {
      agent = await this.factory.createFromExample(input.example, {
        name: input.name,
        task: input.task,
      });
    } else if (input.traits && input.traits.length > 0) {
      agent = await this.factory.createFromTraits(input.traits, {
        name: input.name,
        task: input.task,
      });
    } else if (input.task) {
      agent = await this.factory.createFromTask(input.task, {
        name: input.name,
      });
    } else {
      throw new Error('Must provide task, traits, or example');
    }

    const result: ComposeResult = { agent };

    // Auto-spawn placeholder - would integrate with AgentSpawner when available
    if (input.autoSpawn) {
      result.spawned = false; // Not implemented yet
      result.spawnId = undefined;
    }

    return result;
  }

  /**
   * Preview agent system prompt without spawning
   */
  async preview(input: ComposeInput): Promise<string> {
    const result = await this.compose({ ...input, autoSpawn: false });
    return result.agent.systemPrompt;
  }

  /**
   * List available example compositions
   */
  async listExamples(): Promise<ExampleInfo[]> {
    await this.ensureInitialized();
    return this.factory.listExamples();
  }

  /**
   * List all available traits by category
   */
  async listTraits(): Promise<TraitsByCategory> {
    await this.ensureInitialized();
    return this.factory.getAvailableTraits();
  }

  /**
   * Validate trait names
   */
  async validateTraits(traits: string[]): Promise<ValidationResult> {
    await this.ensureInitialized();
    return this.factory.validateTraits(traits);
  }

  /**
   * Infer traits from a task description without creating an agent
   */
  async inferTraits(task: string): Promise<{
    expertise: string[];
    personality: string[];
    approach: string[];
    confidence: number;
  }> {
    await this.ensureInitialized();
    return this.factory.inferTraits(task);
  }

  /**
   * Get underlying factory instance (for advanced use)
   */
  getFactory(): AgentFactory {
    return this.factory;
  }

  /**
   * Ensure the composer is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.factory.isInitialized()) {
      await this.factory.initialize();
    }
  }
}
