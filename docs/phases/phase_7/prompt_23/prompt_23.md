 Prompt_23

```
PROMPT 23: AgentFactory Core

[CONTEXT]
CAM Enhancement - Phase 7: Custom Agent Template System
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 22 (TraitLoader + Inference)

Create the core factory that composes agents from traits using Handlebars templates.

[TASK]
Implement AgentFactory that generates agent definitions from trait combinations.

## Part 1: Create src/agents/templates/DynamicAgent.hbs
```handlebars
# {{name}}

You are a specialized agent composed for this specific task.

{{#if expertise}}
## Expertise Areas
{{#each expertise}}
### {{this.name}}
{{this.description}}
{{#if this.prompt_fragment}}

**Guidance:** {{this.prompt_fragment}}
{{/if}}

{{/each}}
{{/if}}

{{#if personality}}
## Personality Traits
{{#each personality}}
- **{{this.name}}:** {{this.description}}
{{#if this.prompt_fragment}}
  - *{{this.prompt_fragment}}*
{{/if}}
{{/each}}
{{/if}}

{{#if approach}}
## Working Approach
{{#each approach}}
- **{{this.name}}:** {{this.description}}
{{#if this.prompt_fragment}}
  - *{{this.prompt_fragment}}*
{{/if}}
{{/each}}
{{/if}}

{{#if task}}
## Current Task
{{task}}
{{/if}}

## Guidelines
1. Apply your expertise areas to analyze and solve the problem
2. Maintain your personality traits throughout the interaction
3. Follow your working approach methodology consistently
4. Provide clear, actionable insights and recommendations
5. Acknowledge when something is outside your expertise

{{#if voiceEnabled}}
## Voice
Your voice ID is {{voiceId}}. Speak naturally with confidence.
{{/if}}
```

## Part 2: Create src/agents/factory/AgentFactory.ts
```typescript
import * as fs from 'fs/promises';
import * as Handlebars from 'handlebars';
import { TraitLoader } from './TraitLoader';
import { TraitInference, InferredTraits } from './TraitInference';
import { ComposedTraits, TraitDefinition, TraitsData } from '../traits/types';

export interface AgentFactoryOptions {
  task?: string;
  traits?: string[];
  name?: string;
  outputFormat?: 'prompt' | 'json' | 'yaml' | 'md';
  voiceEnabled?: boolean;
}

export interface GeneratedAgent {
  name: string;
  systemPrompt: string;
  traits: ComposedTraits;
  voiceId?: string;
  metadata: {
    generatedAt: Date;
    inferredFrom?: string;
    explicitTraits?: string[];
    confidence?: number;
    source: 'task' | 'traits' | 'example';
  };
}

interface TemplateData {
  name: string;
  expertise: TraitDefinition[];
  personality: TraitDefinition[];
  approach: TraitDefinition[];
  task?: string;
  voiceEnabled: boolean;
  voiceId?: string;
}

export class AgentFactory {
  private loader: TraitLoader;
  private inference: TraitInference | null = null;
  private template: Handlebars.TemplateDelegate | null = null;
  private traitsData: TraitsData | null = null;
  private initialized: boolean = false;

  constructor(traitsPath?: string) {
    this.loader = new TraitLoader(traitsPath);
  }

  /**
   * Initialize the factory (must be called before use)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load traits
    this.traitsData = await this.loader.load();
    this.inference = new TraitInference(this.traitsData);

    // Load and compile template
    const templatePath = './src/agents/templates/DynamicAgent.hbs';
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    this.template = Handlebars.compile(templateContent);

    this.initialized = true;
  }

  /**
   * Create agent from task description (traits inferred)
   */
  async createFromTask(task: string, options?: AgentFactoryOptions): Promise<GeneratedAgent> {
    await this.ensureInitialized();

    const inferred = this.inference!.inferFromTask(task);
    const traits = this.resolveTraits(inferred);
    const name = options?.name || this.generateName(inferred);

    const templateData: TemplateData = {
      name,
      expertise: traits.expertise,
      personality: traits.personality,
      approach: traits.approach,
      task,
      voiceEnabled: options?.voiceEnabled || false,
      voiceId: this.selectVoice(inferred)
    };

    const systemPrompt = this.template!(templateData);

    return {
      name,
      systemPrompt,
      traits,
      voiceId: templateData.voiceId,
      metadata: {
        generatedAt: new Date(),
        inferredFrom: task,
        confidence: inferred.confidence,
        source: 'task'
      }
    };
  }

  /**
   * Create agent from explicit trait names
   */
  async createFromTraits(traitNames: string[], options?: AgentFactoryOptions): Promise<GeneratedAgent> {
    await this.ensureInitialized();

    const traits = this.resolveExplicitTraits(traitNames);
    const name = options?.name || this.generateNameFromTraits(traitNames);

    const templateData: TemplateData = {
      name,
      expertise: traits.expertise,
      personality: traits.personality,
      approach: traits.approach,
      task: options?.task,
      voiceEnabled: options?.voiceEnabled || false
    };

    const systemPrompt = this.template!(templateData);

    return {
      name,
      systemPrompt,
      traits,
      metadata: {
        generatedAt: new Date(),
        explicitTraits: traitNames,
        source: 'traits'
      }
    };
  }

  /**
   * Create agent from predefined example
   */
  async createFromExample(exampleName: string, options?: AgentFactoryOptions): Promise<GeneratedAgent> {
    await this.ensureInitialized();

    const example = this.loader.getExample(exampleName);
    if (!example) {
      throw new Error(`Example "${exampleName}" not found`);
    }

    const agent = await this.createFromTraits(example.traits, {
      ...options,
      name: options?.name || exampleName
    });

    return {
      ...agent,
      metadata: {
        ...agent.metadata,
        source: 'example'
      }
    };
  }

  /**
   * List available examples
   */
  async listExamples(): Promise<{ name: string; description: string; traits: string[] }[]> {
    await this.ensureInitialized();

    const exampleNames = this.loader.getExampleNames();
    return exampleNames.map(name => {
      const example = this.loader.getExample(name)!;
      return { name, ...example };
    });
  }

  /**
   * Validate trait names
   */
  async validateTraits(traitNames: string[]): Promise<{ valid: boolean; invalid: string[] }> {
    await this.ensureInitialized();

    const invalid = traitNames.filter(name => {
      return !this.loader.hasTrait('expertise', name) &&
             !this.loader.hasTrait('personality', name) &&
             !this.loader.hasTrait('approach', name);
    });

    return { valid: invalid.length === 0, invalid };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private resolveTraits(inferred: InferredTraits): ComposedTraits {
    return {
      expertise: inferred.expertise.map(name =>
        this.loader.getTrait('expertise', name)!
      ).filter(Boolean),
      personality: inferred.personality.map(name =>
        this.loader.getTrait('personality', name)!
      ).filter(Boolean),
      approach: inferred.approach.map(name =>
        this.loader.getTrait('approach', name)!
      ).filter(Boolean)
    };
  }

  private resolveExplicitTraits(traitNames: string[]): ComposedTraits {
    const traits: ComposedTraits = {
      expertise: [],
      personality: [],
      approach: []
    };

    for (const name of traitNames) {
      if (this.loader.hasTrait('expertise', name)) {
        traits.expertise.push(this.loader.getTrait('expertise', name)!);
      } else if (this.loader.hasTrait('personality', name)) {
        traits.personality.push(this.loader.getTrait('personality', name)!);
      } else if (this.loader.hasTrait('approach', name)) {
        traits.approach.push(this.loader.getTrait('approach', name)!);
      }
    }

    return traits;
  }

  private generateName(inferred: InferredTraits): string {
    const parts: string[] = [];
    if (inferred.expertise[0]) parts.push(this.capitalize(inferred.expertise[0]));
    if (inferred.personality[0]) parts.push(this.capitalize(inferred.personality[0]));
    return parts.join(' ') + ' Agent';
  }

  private generateNameFromTraits(traitNames: string[]): string {
    return traitNames.slice(0, 2).map(this.capitalize).join(' ') + ' Agent';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private selectVoice(inferred: InferredTraits): string | undefined {
    // Default voice selection based on traits
    if (inferred.expertise.includes('security')) return 'adam';
    if (inferred.personality.includes('enthusiastic')) return 'bella';
    return 'charlotte'; // default
  }
}
```

## Part 3: Create tests/agents/factory/AgentFactory.test.ts
Write 25+ tests

[VERIFICATION]
Show me:
1. DynamicAgent.hbs content
2. AgentFactory.ts content
3. Test output: pnpm test tests/agents/factory/AgentFactory.test.ts

[SUCCESS CRITERIA]
✅ AgentFactory creates agents from tasks
✅ AgentFactory creates agents from explicit traits
✅ AgentFactory creates agents from examples
✅ Handlebars template renders correctly
✅ 25+ tests passing
```

end of Prompt_23
