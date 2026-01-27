/**
 * SkillRegistry - Skill registration and lookup
 *
 * Maintains a registry of available skills for routing.
 */

import { TemplateSkillDefinition } from '../templates/SkillTemplate';

// Export SkillDefinition alias for routing purposes
export type SkillDefinition = TemplateSkillDefinition;

export class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  remove(name: string): boolean {
    return this.skills.delete(name);
  }

  count(): number {
    return this.skills.size;
  }

  findByKeyword(keyword: string): SkillDefinition[] {
    return this.getAll().filter(skill =>
      skill.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
    );
  }
}
