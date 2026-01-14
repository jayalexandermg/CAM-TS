PROMPT 13C: Persona System
Phase: 3 (CLI + Persona)
Status: 🆕 NEW - Persona management
Time Estimate: 3-4 hours
Priority: IMPORTANT
Dependencies: Phase 2 complete
Parallel: ✅ Can run with 13A, 13B, 13D

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Implement persona system with definitions, loading, and management.

After this prompt:

✅ Persona class
✅ PersonaManager class
✅ 3 default personas
✅ 20-25 new tests
📦 REQUIREMENTS
1. Persona Class
Create src/persona/Persona.ts:

typescript
Copy
import * as fs from 'fs/promises';

export interface PersonaDefinition {
  name: string;
  description: string;
  personality: string[];
  communicationStyle: string;
  expertise: string[];
  approach: string;
  constraints?: string[];
}

export class Persona {
  private definition: PersonaDefinition;

  constructor(definition: PersonaDefinition) {
    this.definition = definition;
    this.validate();
  }

  static async load(path: string): Promise<Persona> {
    const content = await fs.readFile(path, 'utf-8');
    const definition = JSON.parse(content);
    return new Persona(definition);
  }

  getName(): string {
    return this.definition.name;
  }

  getDescription(): string {
    return this.definition.description;
  }

  getDefinition(): PersonaDefinition {
    return { ...this.definition };
  }

  getContext(): string {
    let context = `# PERSONA: ${this.definition.name}\n\n`;
    context += `${this.definition.description}\n\n`;

    context += `## Personality Traits\n`;
    for (const trait of this.definition.personality) {
      context += `- ${trait}\n`;
    }
    context += `\n`;

    context += `## Communication Style\n`;
    context += `${this.definition.communicationStyle}\n\n`;

    context += `## Expertise\n`;
    for (const area of this.definition.expertise) {
      context += `- ${area}\n`;
    }
    context += `\n`;

    context += `## Approach\n`;
    context += `${this.definition.approach}\n`;

    if (this.definition.constraints && this.definition.constraints.length > 0) {
      context += `\n## Constraints\n`;
      for (const constraint of this.definition.constraints) {
        context += `- ${constraint}\n`;
      }
    }

    return context;
  }

  private validate(): void {
    const required = ['name', 'description', 'personality', 'communicationStyle', 'expertise', 'approach'];

    for (const field of required) {
      if (!(field in this.definition)) {
        throw new Error(`Persona definition missing required field: ${field}`);
      }
    }

    if (!Array.isArray(this.definition.personality) || this.definition.personality.length === 0) {
      throw new Error('Persona must have at least one personality trait');
    }

    if (!Array.isArray(this.definition.expertise) || this.definition.expertise.length === 0) {
      throw new Error('Persona must have at least one area of expertise');
    }
  }
}
2. PersonaManager Class
Create src/persona/PersonaManager.ts:

typescript
Copy
import * as fs from 'fs/promises';
import * as path from 'path';
import { Persona } from './Persona';

export class PersonaManager {
  private personas: Map<string, Persona>;
  private currentPersona?: Persona;
  private personasDir: string;

  constructor(personasDir?: string) {
    this.personas = new Map();
    this.personasDir = personasDir || path.join(
      process.env.HOME || '~',
      '.infinite-aura-ts',
      'personas'
    );
  }

  async loadPersonas(): Promise<void> {
    try {
      await fs.mkdir(this.personasDir, { recursive: true });
      const files = await fs.readdir(this.personasDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const personaPath = path.join(this.personasDir, file);
            const persona = await Persona.load(personaPath);
            this.personas.set(persona.getName(), persona);
          } catch (error) {
            console.warn(`Failed to load persona from ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load personas:', error);
    }
  }

  async switchPersona(name: string): Promise<void> {
    const persona = this.personas.get(name);
    if (!persona) {
      throw new Error(`Persona not found: ${name}`);
    }

    this.currentPersona = persona;
  }

  getCurrentPersona(): Persona | undefined {
    return this.currentPersona;
  }

  listPersonas(): string[] {
    return Array.from(this.personas.keys());
  }

  getPersona(name: string): Persona | undefined {
    return this.personas.get(name);
  }

  hasPersona(name: string): boolean {
    return this.personas.has(name);
  }

  async createDefaultPersonas(): Promise<void> {
    const defaults = [
      {
        name: 'default',
        description: 'Default CAM persona - balanced and helpful',
        personality: ['Helpful', 'Clear', 'Concise', 'Professional'],
        communicationStyle: 'Direct and informative',
        expertise: ['General assistance', 'Task coordination'],
        approach: 'Systematic and thorough'
      },
      {
        name: 'researcher',
        description: 'Research specialist - curious and thorough',
        personality: ['Curious', 'Analytical', 'Detail-oriented', 'Evidence-based'],
        communicationStyle: 'Inquisitive and thorough',
        expertise: ['Research methodology', 'Data analysis', 'Source evaluation'],
        approach: 'Break problems into searchable questions, validate sources, synthesize findings'
      },
      {
        name: 'coder',
        description: 'Coding specialist - pragmatic and precise',
        personality: ['Pragmatic', 'Precise', 'Quality-focused', 'Best-practices oriented'],
        communicationStyle: 'Technical and direct',
        expertise: ['Software development', 'Code review', 'Architecture design', 'Testing'],
        approach: 'Write clean, tested, maintainable code following best practices'
      }
    ];

    await fs.mkdir(this.personasDir, { recursive: true });

    for (const def of defaults) {
      const filePath = path.join(this.personasDir, `${def.name}.json`);
      await fs.writeFile(filePath, JSON.stringify(def, null, 2));
    }
  }
}
3. Index Export
Create src/persona/index.ts:

typescript
Copy
export * from './Persona';
export * from './PersonaManager';
📁 FILES TO CREATE
src/persona/Persona.ts
src/persona/PersonaManager.ts
src/persona/index.ts
tests/persona/Persona.test.ts (10-12 tests)
tests/persona/PersonaManager.test.ts (10-13 tests)
Total: 5 files, 20-25 tests

✅ SUCCESS CRITERIA
✅ Persona class working
✅ PersonaManager working
✅ Persona loading working
✅ Default personas created
✅ 20-25 tests passing
✅ No TypeScript errors
END OF PROMPT 13C
