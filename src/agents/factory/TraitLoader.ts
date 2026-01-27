import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import { TraitsData, TraitDefinition, TraitCategory } from '../traits/types';

export class TraitLoader {
  private traitsData: TraitsData | null = null;
  private traitsPath: string;
  private loadPromise: Promise<TraitsData> | null = null;

  constructor(traitsPath?: string) {
    this.traitsPath = traitsPath || './src/agents/traits/Traits.yaml';
  }

  /**
   * Load traits from YAML file (cached)
   */
  async load(): Promise<TraitsData> {
    if (this.traitsData) return this.traitsData;

    if (!this.loadPromise) {
      this.loadPromise = this.loadFromFile();
    }

    return this.loadPromise;
  }

  private async loadFromFile(): Promise<TraitsData> {
    const content = await fs.readFile(this.traitsPath, 'utf-8');
    this.traitsData = yaml.parse(content) as TraitsData;
    this.validateTraitsData(this.traitsData);
    return this.traitsData;
  }

  /**
   * Validate loaded traits data
   */
  private validateTraitsData(data: TraitsData): void {
    if (!data.expertise || Object.keys(data.expertise).length < 10) {
      throw new Error('Traits.yaml must have at least 10 expertise areas');
    }
    if (!data.personality || Object.keys(data.personality).length < 8) {
      throw new Error('Traits.yaml must have at least 8 personality types');
    }
    if (!data.approach || Object.keys(data.approach).length < 6) {
      throw new Error('Traits.yaml must have at least 6 approach styles');
    }
    // Validate each trait has required fields
    for (const [key, trait] of Object.entries(data.expertise)) {
      if (!trait.name || !trait.description) {
        throw new Error(`Expertise "${key}" missing required fields`);
      }
    }
  }

  /**
   * Get a specific trait by category and name
   */
  getTrait(category: TraitCategory, name: string): TraitDefinition | undefined {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData[category]?.[name];
  }

  /**
   * Get all traits in a category
   */
  getAllTraits(category: TraitCategory): Record<string, TraitDefinition> {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData[category] || {};
  }

  /**
   * Get all trait names in a category
   */
  getTraitNames(category: TraitCategory): string[] {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return Object.keys(this.traitsData[category] || {});
  }

  /**
   * Get example composition
   */
  getExample(name: string): { description: string; traits: string[] } | undefined {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData.examples?.[name];
  }

  /**
   * Get all example names
   */
  getExampleNames(): string[] {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return Object.keys(this.traitsData.examples || {});
  }

  /**
   * Check if a trait exists
   */
  hasTrait(category: TraitCategory, name: string): boolean {
    if (!this.traitsData) return false;
    return name in (this.traitsData[category] || {});
  }

  /**
   * Reload traits from file
   */
  async reload(): Promise<TraitsData> {
    this.traitsData = null;
    this.loadPromise = null;
    return this.load();
  }
}
