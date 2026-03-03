/**
 * SkillLibrary - Manages skill pools with baseline, community, and custom separation
 *
 * Provides dynamic mounting/unmounting of skills from different pools.
 * Skills can be promoted from community to baseline based on performance.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SkillDefinition } from './types';
import { SkillParser } from './SkillParser';

/**
 * Pool types for organizing skills
 */
export type SkillPoolName = 'baseline' | 'community' | 'custom';

/**
 * A pool of skills
 */
export interface SkillPool {
  name: SkillPoolName;
  directory: string;
  skills: Map<string, SkillDefinition>;
}

/**
 * Summary of a skill in the library
 */
export interface LibraryScanResult {
  pool: SkillPoolName;
  skillCount: number;
  skillNames: string[];
}

/**
 * Manages skill pools with baseline + community + custom separation and dynamic mounting.
 */
export class SkillLibrary {
  private readonly basePath: string;
  private readonly pools: Map<SkillPoolName, SkillPool>;
  private readonly mountedSkills: Map<string, SkillDefinition>;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.pools = new Map();
    this.mountedSkills = new Map();

    // Initialize pool structures
    const poolNames: SkillPoolName[] = ['baseline', 'community', 'custom'];
    for (const name of poolNames) {
      this.pools.set(name, {
        name,
        directory: path.join(basePath, name),
        skills: new Map(),
      });
    }
  }

  /**
   * Load skills from a specific pool directory
   */
  async loadPool(pool: SkillPoolName): Promise<void> {
    const poolObj = this.pools.get(pool);
    if (!poolObj) return;

    poolObj.skills.clear();

    try {
      await fs.mkdir(poolObj.directory, { recursive: true });
      const entries = await fs.readdir(poolObj.directory, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillMdPath = path.join(poolObj.directory, entry.name, 'SKILL.md');
        try {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const definition = SkillParser.parseSkillFile(content);
          poolObj.skills.set(entry.name, definition);
        } catch {
          // Skip directories without valid SKILL.md
          continue;
        }
      }
    } catch {
      // Pool directory doesn't exist yet — leave empty
    }
  }

  /**
   * Get all baseline skills
   */
  getBaseline(): Map<string, SkillDefinition> {
    return new Map(this.pools.get('baseline')?.skills ?? new Map());
  }

  /**
   * Get all community skills
   */
  getCommunity(): Map<string, SkillDefinition> {
    return new Map(this.pools.get('community')?.skills ?? new Map());
  }

  /**
   * Mount a skill from a library pool for the current session
   */
  mountSkill(skillName: string, fromPool: SkillPoolName): boolean {
    const pool = this.pools.get(fromPool);
    if (!pool) return false;

    const skill = pool.skills.get(skillName);
    if (!skill) return false;

    this.mountedSkills.set(skillName, skill);
    return true;
  }

  /**
   * Unmount a skill (deactivate for current session)
   */
  unmountSkill(skillName: string): boolean {
    return this.mountedSkills.delete(skillName);
  }

  /**
   * Add a new skill definition to a pool
   */
  async addToLibrary(skill: SkillDefinition, pool: 'community' | 'custom'): Promise<void> {
    const poolObj = this.pools.get(pool);
    if (!poolObj) return;

    const skillDir = path.join(poolObj.directory, skill.name);
    await fs.mkdir(skillDir, { recursive: true });

    const content = SkillParser.generateSkillFile(skill);
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8');

    // Create subdirectories
    await fs.mkdir(path.join(skillDir, 'Workflows'), { recursive: true });
    await fs.mkdir(path.join(skillDir, 'Tools'), { recursive: true });
    await fs.mkdir(path.join(skillDir, 'Reference'), { recursive: true });

    poolObj.skills.set(skill.name, skill);
  }

  /**
   * Scan all pools and return a summary
   */
  scanLibrary(): LibraryScanResult[] {
    const results: LibraryScanResult[] = [];
    for (const [name, pool] of this.pools) {
      results.push({
        pool: name,
        skillCount: pool.skills.size,
        skillNames: Array.from(pool.skills.keys()),
      });
    }
    return results;
  }

  /**
   * Get currently mounted skills
   */
  getMountedSkills(): Map<string, SkillDefinition> {
    return new Map(this.mountedSkills);
  }

  /**
   * Get the base path for the library
   */
  getBasePath(): string {
    return this.basePath;
  }
}
