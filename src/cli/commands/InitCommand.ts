/**
 * InitCommand
 *
 * Initializes CAM in the current directory.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseCommandHandler, Command, CommandResult } from '../types';

/**
 * Persona configuration structure
 */
interface PersonaConfig {
  name: string;
  description: string;
  personality: string[];
  communicationStyle: string;
  expertise: string[];
  approach: string;
}

/**
 * Init command handler - initializes CAM directory structure
 */
export class InitCommand extends BaseCommandHandler {
  private targetDir: string;

  constructor(targetDir?: string) {
    super();
    this.targetDir = targetDir || process.cwd();
  }

  async execute(_command: Command): Promise<CommandResult> {
    try {
      const camDir = path.join(this.targetDir, '.infinite-aura-ts');

      // Check if already initialized
      const exists = await this.directoryExists(camDir);
      if (exists) {
        return this.failure('CAM is already initialized in this directory');
      }

      // Create directory structure
      await this.createDirectoryStructure(camDir);

      // Create CORE files
      await this.createCoreFiles(camDir);

      // Create default personas
      await this.createDefaultPersonas(camDir);

      return this.success('CAM initialized successfully');
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : String(error));
    }
  }

  getHelp(): string {
    return 'Initialize CAM in the current directory';
  }

  getDescription(): string {
    return 'Set up CAM directory structure and configuration files';
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      await fs.access(dir);
      return true;
    } catch {
      return false;
    }
  }

  private async createDirectoryStructure(camDir: string): Promise<void> {
    const dirs = [
      'memory/CORE',
      'memory/work/INBOX',
      'memory/work/SCRATCHPAD',
      'memory/work/OBSERVATIONS',
      'memory/learning/PATTERNS',
      'memory/learning/INSIGHTS',
      'memory/learning/LEARNINGS',
      'memory/learning/DECISIONS',
      'memory/archive/KNOWLEDGE',
      'memory/archive/PROCEDURES',
      'memory/archive/REFERENCE',
      'memory/archive/ARCHIVE',
      'personas',
      'sessions',
      'skills',
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(camDir, dir), { recursive: true });
    }
  }

  private async createCoreFiles(camDir: string): Promise<void> {
    const coreDir = path.join(camDir, 'memory/CORE');

    // USER.md
    await fs.writeFile(
      path.join(coreDir, 'USER.md'),
      '# USER\n\n## Identity\n\n## Preferences\n\n## Goals\n'
    );

    // PREFERENCES.md
    await fs.writeFile(
      path.join(coreDir, 'PREFERENCES.md'),
      '# PREFERENCES\n\n## Communication\n\n## Workflow\n\n## Tools\n'
    );

    // ACTIVE_PROJECTS.md
    await fs.writeFile(path.join(coreDir, 'ACTIVE_PROJECTS.md'), '# ACTIVE PROJECTS\n\n');
  }

  private async createDefaultPersonas(camDir: string): Promise<void> {
    const personasDir = path.join(camDir, 'personas');

    const personas: PersonaConfig[] = [
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

    for (const persona of personas) {
      await fs.writeFile(
        path.join(personasDir, `${persona.name}.json`),
        JSON.stringify(persona, null, 2)
      );
    }
  }
}
