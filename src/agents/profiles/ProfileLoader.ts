import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { AgentProfile, ProfileFrontmatter, ProfileSchema } from './ProfileSchema';

export class ProfileLoader {
  private schema: ProfileSchema;
  private profilesDir: string;
  private cache: Map<string, AgentProfile> = new Map();

  constructor(profilesDir?: string) {
    this.schema = new ProfileSchema();
    this.profilesDir = profilesDir || './src/agents/definitions';
  }

  /**
   * Load a single profile from file
   */
  async load(profilePath: string): Promise<AgentProfile> {
    const content = await fs.readFile(profilePath, 'utf-8');
    return this.parse(content);
  }

  /**
   * Parse profile content (frontmatter + markdown)
   */
  parse(content: string): AgentProfile {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error('Invalid profile format: missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]) as ProfileFrontmatter;
    const markdownBody = frontmatterMatch[2];

    // Validate frontmatter
    const validation = this.schema.validateFrontmatter(frontmatter);
    if (!validation.valid) {
      throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);
    }

    // Parse markdown sections
    const capabilities = this.parseSection(markdownBody, 'Capabilities');
    const constraints = this.parseSection(markdownBody, 'Constraints');

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      model: frontmatter.model,
      color: frontmatter.color,
      voiceId: frontmatter.voiceId,
      permissions: frontmatter.permissions || [],
      skills: frontmatter.skills || [],
      traits: frontmatter.traits,
      systemPrompt: markdownBody.trim(),
      capabilities,
      constraints,
      contextFile: `${frontmatter.name}Context.md`,
    };
  }

  /**
   * Load all profiles from directory
   */
  async loadAll(): Promise<Map<string, AgentProfile>> {
    const files = await fs.readdir(this.profilesDir);
    const profiles = new Map<string, AgentProfile>();

    for (const file of files) {
      if (file.endsWith('.md') && !file.includes('Context')) {
        const profilePath = path.join(this.profilesDir, file);
        const profile = await this.load(profilePath);
        profiles.set(profile.name, profile);
        this.cache.set(profile.name, profile);
      }
    }

    return profiles;
  }

  /**
   * Get cached profile by name
   */
  get(name: string): AgentProfile | undefined {
    return this.cache.get(name);
  }

  /**
   * List available profile names
   */
  async listProfiles(): Promise<string[]> {
    const files = await fs.readdir(this.profilesDir);
    return files
      .filter((f) => f.endsWith('.md') && !f.includes('Context'))
      .map((f) => f.replace('.md', ''));
  }

  /**
   * Clear the profile cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if a profile is cached
   */
  isCached(name: string): boolean {
    return this.cache.has(name);
  }

  private parseSection(markdown: string, sectionName: string): string[] {
    const sectionRegex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = markdown.match(sectionRegex);

    if (!match) return [];

    // Parse numbered or bulleted list
    const items = match[1].match(/^[\d\-*]\.?\s*(.+)$/gm) || [];
    return items.map((item) => item.replace(/^[\d\-*]\.?\s*/, '').trim());
  }
}
