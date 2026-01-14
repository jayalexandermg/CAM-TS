/**
 * PersonaManager - Manages persona loading, switching, and lifecycle
 *
 * Handles persona directory operations, loading personas from JSON files,
 * switching between personas, and creating default personas.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Persona } from './Persona';

/**
 * Manages persona loading and switching
 */
export class PersonaManager {
  private personas: Map<string, Persona>;
  private currentPersona?: Persona;
  private personasDir: string;

  /**
   * Create a new PersonaManager instance
   * @param personasDir - Optional custom personas directory path
   */
  constructor(personasDir?: string) {
    this.personas = new Map();
    this.personasDir =
      personasDir || path.join(process.env.HOME || '~', '.infinite-aura-ts', 'personas');
  }

  /**
   * Load all personas from the personas directory
   * Creates the directory if it doesn't exist
   */
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

  /**
   * Switch to a different persona
   * @param name - Name of the persona to switch to
   * @throws Error if persona not found
   */
  async switchPersona(name: string): Promise<void> {
    const persona = this.personas.get(name);
    if (!persona) {
      throw new Error(`Persona not found: ${name}`);
    }

    this.currentPersona = persona;
  }

  /**
   * Get the currently active persona
   * @returns Current persona or undefined if none selected
   */
  getCurrentPersona(): Persona | undefined {
    return this.currentPersona;
  }

  /**
   * List all available persona names
   * @returns Array of persona names
   */
  listPersonas(): string[] {
    return Array.from(this.personas.keys());
  }

  /**
   * Get a persona by name
   * @param name - Persona name
   * @returns Persona or undefined if not found
   */
  getPersona(name: string): Persona | undefined {
    return this.personas.get(name);
  }

  /**
   * Check if a persona exists
   * @param name - Persona name
   * @returns true if persona exists
   */
  hasPersona(name: string): boolean {
    return this.personas.has(name);
  }

  /**
   * Create default personas in the personas directory
   * Creates default, researcher, and coder personas
   */
  async createDefaultPersonas(): Promise<void> {
    const defaults = [
      {
        name: 'default',
        description: 'Default CAM persona - balanced and helpful',
        personality: ['Helpful', 'Clear', 'Concise', 'Professional'],
        communicationStyle: 'Direct and informative',
        expertise: ['General assistance', 'Task coordination'],
        approach: 'Systematic and thorough',
      },
      {
        name: 'researcher',
        description: 'Research specialist - curious and thorough',
        personality: ['Curious', 'Analytical', 'Detail-oriented', 'Evidence-based'],
        communicationStyle: 'Inquisitive and thorough',
        expertise: ['Research methodology', 'Data analysis', 'Source evaluation'],
        approach: 'Break problems into searchable questions, validate sources, synthesize findings',
      },
      {
        name: 'coder',
        description: 'Coding specialist - pragmatic and precise',
        personality: ['Pragmatic', 'Precise', 'Quality-focused', 'Best-practices oriented'],
        communicationStyle: 'Technical and direct',
        expertise: ['Software development', 'Code review', 'Architecture design', 'Testing'],
        approach: 'Write clean, tested, maintainable code following best practices',
      },
    ];

    await fs.mkdir(this.personasDir, { recursive: true });

    for (const def of defaults) {
      const filePath = path.join(this.personasDir, `${def.name}.json`);
      await fs.writeFile(filePath, JSON.stringify(def, null, 2));
    }
  }

  /**
   * Get the personas directory path
   * @returns Personas directory path
   */
  getPersonasDir(): string {
    return this.personasDir;
  }

  /**
   * Get the count of loaded personas
   * @returns Number of loaded personas
   */
  getPersonaCount(): number {
    return this.personas.size;
  }

  /**
   * Clear the current persona selection
   */
  clearCurrentPersona(): void {
    this.currentPersona = undefined;
  }
}
