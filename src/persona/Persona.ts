/**
 * Persona - Represents a persona definition with personality traits and expertise
 *
 * Personas define how the assistant should behave, communicate, and approach problems.
 * Each persona has a unique combination of personality traits, communication style,
 * areas of expertise, and approach methodology.
 */

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

/**
 * Represents a loaded and validated persona
 */
export class Persona {
  private definition: PersonaDefinition;

  constructor(definition: PersonaDefinition) {
    this.definition = definition;
    this.validate();
  }

  /**
   * Load a persona from a JSON file
   * @param path - Path to the persona JSON file
   * @returns Loaded Persona instance
   */
  static async load(path: string): Promise<Persona> {
    const content = await fs.readFile(path, 'utf-8');
    const definition = JSON.parse(content);
    return new Persona(definition);
  }

  /**
   * Get the persona name
   * @returns Persona name
   */
  getName(): string {
    return this.definition.name;
  }

  /**
   * Get the persona description
   * @returns Persona description
   */
  getDescription(): string {
    return this.definition.description;
  }

  /**
   * Get a copy of the full persona definition
   * @returns Copy of the persona definition
   */
  getDefinition(): PersonaDefinition {
    return { ...this.definition };
  }

  /**
   * Generate context string for preprompt injection
   * @returns Formatted persona context
   */
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

  /**
   * Validate the persona definition
   * @throws Error if validation fails
   */
  private validate(): void {
    const required = [
      'name',
      'description',
      'personality',
      'communicationStyle',
      'expertise',
      'approach',
    ];

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
