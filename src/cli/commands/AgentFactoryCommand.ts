/**
 * AgentFactoryCommand
 *
 * CLI commands for creating dynamic agents from traits, tasks, or examples.
 * Provides agent:create, agent:list-traits, agent:list-examples, and agent:preview.
 */

import * as yaml from 'yaml';
import { BaseCommandHandler, Command, CommandResult } from '../types';
import { AgentComposer, ComposeInput } from '../../agents/factory/AgentComposer';

/**
 * Agent factory command handler - creates and manages dynamic agents
 */
export class AgentFactoryCommand extends BaseCommandHandler {
  private composer: AgentComposer;
  private initialized: boolean = false;

  constructor(traitsPath?: string, templatePath?: string) {
    super();
    this.composer = new AgentComposer(traitsPath, templatePath);
  }

  async execute(command: Command): Promise<CommandResult> {
    const subcommand = command.subcommand || 'create';

    try {
      await this.ensureInitialized();

      switch (subcommand) {
        case 'create':
          return await this.handleCreate(command);
        case 'list-traits':
          return await this.handleListTraits();
        case 'list-examples':
          return await this.handleListExamples();
        case 'preview':
          return await this.handlePreview(command);
        case 'validate':
          return await this.handleValidate(command);
        case 'infer':
          return await this.handleInfer(command);
        default:
          return this.failure(`Unknown subcommand: ${subcommand}. Use 'help agent' for usage.`);
      }
    } catch (error) {
      return this.failure((error as Error).message);
    }
  }

  getHelp(): string {
    return `
agent <subcommand> [options]

Create and manage dynamic agents using the trait-based composition system.

Subcommands:
  create        Create a new agent from task, traits, or example
  list-traits   List available traits by category
  list-examples List predefined example compositions
  preview       Preview agent prompt without spawning
  validate      Validate trait names
  infer         Infer traits from a task description

Create Options:
  --task, -t <task>     Task description to infer traits from
  --traits <traits>     Comma-separated trait names
  --example, -e <name>  Use predefined example composition
  --name, -n <name>     Custom agent name
  --format, -f <format> Output format: prompt, json, yaml (default: prompt)

Examples:
  agent create --task "Review security of this API"
  agent create --traits "security,thorough,methodical"
  agent create --example "code-reviewer"
  agent create --task "Analyze performance" --format json
  agent list-traits
  agent list-examples
  agent preview "Help me write unit tests"
  agent validate security,unknown-trait
  agent infer "Debug this memory leak"
    `.trim();
  }

  getDescription(): string {
    return 'Create dynamic agents from tasks, traits, or examples';
  }

  /**
   * Handle agent create command
   */
  private async handleCreate(command: Command): Promise<CommandResult> {
    const task = command.options.get('task') || command.options.get('t');
    const traitsStr = command.options.get('traits');
    const example = command.options.get('example') || command.options.get('e');
    const name = command.options.get('name') || command.options.get('n');
    const format = command.options.get('format') || command.options.get('f') || 'prompt';

    // Parse traits if provided
    const traits = traitsStr?.split(',').map((t) => t.trim()).filter(Boolean);

    // Validate we have at least one input
    if (!task && !traits?.length && !example) {
      return this.failure('Must provide --task, --traits, or --example');
    }

    const input: ComposeInput = {
      task,
      traits,
      example,
      name,
    };

    const result = await this.composer.compose(input);
    const agent = result.agent;

    // Format output based on requested format
    let output: string;

    switch (format) {
      case 'json':
        output = JSON.stringify(agent, null, 2);
        break;
      case 'yaml':
        output = yaml.stringify(agent);
        break;
      case 'prompt':
      default:
        output = this.formatAgentOutput(agent);
        break;
    }

    return this.success(output);
  }

  /**
   * Handle list-traits command
   */
  private async handleListTraits(): Promise<CommandResult> {
    const traits = await this.composer.listTraits();

    const lines: string[] = [
      '\n=== Available Traits ===\n',
      'Expertise:',
      ...traits.expertise.map((t) => `  - ${t}`),
      '',
      'Personality:',
      ...traits.personality.map((t) => `  - ${t}`),
      '',
      'Approach:',
      ...traits.approach.map((t) => `  - ${t}`),
      '',
    ];

    return this.success(lines.join('\n'));
  }

  /**
   * Handle list-examples command
   */
  private async handleListExamples(): Promise<CommandResult> {
    const examples = await this.composer.listExamples();

    if (examples.length === 0) {
      return this.success('\nNo example compositions defined.\n');
    }

    const lines: string[] = ['\n=== Example Compositions ===\n'];

    for (const ex of examples) {
      lines.push(`${ex.name}:`);
      lines.push(`  Description: ${ex.description}`);
      lines.push(`  Traits: ${ex.traits.join(', ')}`);
      lines.push('');
    }

    return this.success(lines.join('\n'));
  }

  /**
   * Handle preview command
   */
  private async handlePreview(command: Command): Promise<CommandResult> {
    // Get task from positional argument or option
    const task = command.positional[0] || command.options.get('task') || command.options.get('t');

    if (!task) {
      return this.failure('Must provide a task description for preview');
    }

    const prompt = await this.composer.preview({ task });

    return this.success(`\n=== Agent Preview ===\n\n${prompt}\n`);
  }

  /**
   * Handle validate command
   */
  private async handleValidate(command: Command): Promise<CommandResult> {
    const traitsStr = command.positional[0] || command.options.get('traits');

    if (!traitsStr) {
      return this.failure('Must provide traits to validate');
    }

    const traits = traitsStr.split(',').map((t) => t.trim()).filter(Boolean);
    const result = await this.composer.validateTraits(traits);

    if (result.valid) {
      return this.success(`\nAll ${traits.length} traits are valid.\n`);
    } else {
      const lines = [
        '',
        `Validation failed: ${result.invalid.length} invalid trait(s)`,
        '',
        'Invalid traits:',
        ...result.invalid.map((t) => `  - ${t}`),
        '',
      ];
      return this.failure(lines.join('\n'));
    }
  }

  /**
   * Handle infer command
   */
  private async handleInfer(command: Command): Promise<CommandResult> {
    const task = command.positional[0] || command.options.get('task') || command.options.get('t');

    if (!task) {
      return this.failure('Must provide a task description');
    }

    const inferred = await this.composer.inferTraits(task);

    const lines: string[] = [
      '\n=== Inferred Traits ===',
      '',
      `Confidence: ${(inferred.confidence * 100).toFixed(1)}%`,
      '',
      'Expertise:',
      ...inferred.expertise.map((t) => `  - ${t}`),
      '',
      'Personality:',
      ...inferred.personality.map((t) => `  - ${t}`),
      '',
      'Approach:',
      ...inferred.approach.map((t) => `  - ${t}`),
      '',
    ];

    return this.success(lines.join('\n'));
  }

  /**
   * Format agent output in human-readable form
   */
  private formatAgentOutput(agent: {
    name: string;
    systemPrompt: string;
    voiceId?: string;
    metadata: {
      source: string;
      confidence?: number;
      inferredFrom?: string;
      explicitTraits?: string[];
    };
  }): string {
    const lines: string[] = [
      '\n=== Generated Agent ===\n',
      `Name: ${agent.name}`,
      `Source: ${agent.metadata.source}`,
    ];

    if (agent.metadata.confidence !== undefined) {
      lines.push(`Confidence: ${(agent.metadata.confidence * 100).toFixed(1)}%`);
    }

    if (agent.metadata.inferredFrom) {
      lines.push(`Inferred From: ${agent.metadata.inferredFrom}`);
    }

    if (agent.metadata.explicitTraits?.length) {
      lines.push(`Traits: ${agent.metadata.explicitTraits.join(', ')}`);
    }

    if (agent.voiceId) {
      lines.push(`Voice ID: ${agent.voiceId}`);
    }

    lines.push('\n--- System Prompt ---\n');
    lines.push(agent.systemPrompt);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Ensure composer is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.composer.initialize();
      this.initialized = true;
    }
  }
}
