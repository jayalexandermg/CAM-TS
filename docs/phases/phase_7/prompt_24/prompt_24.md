 Prompt_24

```
PROMPT 24: AgentComposer + CLI Integration

[CONTEXT]
CAM Enhancement - Phase 7: Custom Agent Template System
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 23 (AgentFactory Core)

Create high-level composer and integrate with CAM CLI.

[TASK]
Create AgentComposer wrapper and CLI commands for agent creation.

## Part 1: Create src/agents/factory/AgentComposer.ts
```typescript
import { AgentFactory, GeneratedAgent, AgentFactoryOptions } from './AgentFactory';
// Import existing AgentSpawner from CAM
// import { AgentSpawner, SpawnedAgent } from '../AgentSpawner';

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

export class AgentComposer {
  private factory: AgentFactory;
  // private spawner: AgentSpawner;

  constructor() {
    this.factory = new AgentFactory();
  }

  /**
   * Initialize the composer
   */
  async initialize(): Promise<void> {
    await this.factory.initialize();
  }

  /**
   * Compose an agent from various inputs
   */
  async compose(input: ComposeInput): Promise<ComposeResult> {
    let agent: GeneratedAgent;

    if (input.example) {
      agent = await this.factory.createFromExample(input.example, {
        name: input.name,
        task: input.task
      });
    } else if (input.traits && input.traits.length > 0) {
      agent = await this.factory.createFromTraits(input.traits, {
        name: input.name,
        task: input.task
      });
    } else if (input.task) {
      agent = await this.factory.createFromTask(input.task, {
        name: input.name
      });
    } else {
      throw new Error('Must provide task, traits, or example');
    }

    const result: ComposeResult = { agent };

    // Auto-spawn if requested
    // if (input.autoSpawn) {
    //   const spawned = await this.spawner.spawn(agent);
    //   result.spawned = true;
    //   result.spawnId = spawned.id;
    // }

    return result;
  }

  /**
   * List available examples
   */
  async listExamples(): Promise<{ name: string; description: string; traits: string[] }[]> {
    return this.factory.listExamples();
  }

  /**
   * List all available traits by category
   */
  async listTraits(): Promise<{
    expertise: string[];
    personality: string[];
    approach: string[];
  }> {
    await this.factory.initialize();
    // Access through factory's loader
    return {
      expertise: [], // TODO: Expose through factory
      personality: [],
      approach: []
    };
  }

  /**
   * Validate trait names
   */
  async validateTraits(traits: string[]): Promise<{ valid: boolean; invalid: string[] }> {
    return this.factory.validateTraits(traits);
  }

  /**
   * Preview agent without spawning
   */
  async preview(input: ComposeInput): Promise<string> {
    const result = await this.compose({ ...input, autoSpawn: false });
    return result.agent.systemPrompt;
  }
}
```

## Part 2: Create src/cli/commands/agent-factory.ts
```typescript
import { Command } from 'commander';
import { AgentComposer } from '../../agents/factory/AgentComposer';

export function registerAgentFactoryCommands(program: Command): void {
  const composer = new AgentComposer();

  program
    .command('agent:create')
    .description('Create a dynamic agent from traits or task')
    .option('-t, --task <task>', 'Task description to infer traits from')
    .option('--traits <traits>', 'Comma-separated trait names')
    .option('-e, --example <name>', 'Use predefined example composition')
    .option('-n, --name <name>', 'Custom agent name')
    .option('-f, --format <format>', 'Output format (prompt|json|yaml)', 'prompt')
    .option('--spawn', 'Automatically spawn the agent')
    .action(async (options) => {
      try {
        await composer.initialize();

        const traits = options.traits?.split(',').map((t: string) => t.trim());

        const result = await composer.compose({
          task: options.task,
          traits,
          example: options.example,
          name: options.name,
          autoSpawn: options.spawn
        });

        if (options.format === 'json') {
          console.log(JSON.stringify(result.agent, null, 2));
        } else if (options.format === 'yaml') {
          const yaml = await import('yaml');
          console.log(yaml.stringify(result.agent));
        } else {
          console.log('\n=== Generated Agent ===\n');
          console.log(`Name: ${result.agent.name}`);
          console.log(`Source: ${result.agent.metadata.source}`);
          if (result.agent.metadata.confidence) {
            console.log(`Confidence: ${(result.agent.metadata.confidence * 100).toFixed(1)}%`);
          }
          console.log('\n--- System Prompt ---\n');
          console.log(result.agent.systemPrompt);
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program
    .command('agent:list-traits')
    .description('List available traits by category')
    .action(async () => {
      try {
        await composer.initialize();
        const traits = await composer.listTraits();

        console.log('\n=== Available Traits ===\n');

        console.log('Expertise:');
        traits.expertise.forEach(t => console.log(`  - ${t}`));

        console.log('\nPersonality:');
        traits.personality.forEach(t => console.log(`  - ${t}`));

        console.log('\nApproach:');
        traits.approach.forEach(t => console.log(`  - ${t}`));
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program
    .command('agent:list-examples')
    .description('List predefined example compositions')
    .action(async () => {
      try {
        await composer.initialize();
        const examples = await composer.listExamples();

        console.log('\n=== Example Compositions ===\n');

        for (const ex of examples) {
          console.log(`${ex.name}:`);
          console.log(`  Description: ${ex.description}`);
          console.log(`  Traits: ${ex.traits.join(', ')}`);
          console.log();
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program
    .command('agent:preview <task>')
    .description('Preview agent that would be created for a task')
    .action(async (task) => {
      try {
        await composer.initialize();
        const prompt = await composer.preview({ task });
        console.log(prompt);
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });
}
```

## Part 3: Update src/cli/index.ts to register new commands

## Part 4: Create tests/agents/factory/AgentComposer.test.ts
Write 20+ tests

## Part 5: Create tests/cli/agent-factory.test.ts
Test CLI commands work correctly

[VERIFICATION]
Show me:
1. AgentComposer.ts content
2. agent-factory.ts CLI commands
3. Test output
4. Example CLI usage: pnpm cli agent:create -t "Review security of this API"

[SUCCESS CRITERIA]
✅ AgentComposer provides unified interface
✅ CLI commands work correctly
✅ Multiple output formats supported
✅ Example compositions listable
✅ 20+ tests passing
```

end of Prompt_24
