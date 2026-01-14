PROMPT 13D: Basic CLI Commands
Phase: 3 (CLI + Persona)
Status: 🆕 NEW - Basic command handlers
Time Estimate: 3-4 hours
Priority: IMPORTANT
Dependencies: Phase 2 complete
Parallel: ✅ Can run with 13A, 13B, 13C

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Implement basic CLI command handlers (help, version, init).

After this prompt:

✅ HelpCommand
✅ VersionCommand
✅ InitCommand
✅ 15-20 new tests
📦 REQUIREMENTS

1. Command Types (Reference)
   Note: These types will be created by PROMPT 13A. For now, define them locally in this file for reference:

typescript
Copy
// This will come from PROMPT 13A
interface Command {
name: string;
subcommand?: string;
flags: Map<string, boolean>;
options: Map<string, string>;
positional: string[];
}

interface CommandResult {
exitCode: number;
output?: string;
error?: string;
}

interface CommandHandler {
execute(command: Command): Promise<CommandResult>;
getHelp(): string;
getDescription(): string;
} 2. HelpCommand
Create src/cli/commands/HelpCommand.ts:

typescript
Copy
export class HelpCommand {
async execute(command: any): Promise<any> {
const helpText = this.getHelpText();
return {
exitCode: 0,
output: helpText
};
}

getHelp(): string {
return 'Display help information';
}

getDescription(): string {
return 'Show available commands and usage information';
}

private getHelpText(): string {
return `
CAM - Context-Aware Memory System

Usage:
cam [command] [options]

Commands:
help Show this help message
version Show version information
init Initialize CAM in current directory

Options:
--help, -h Show help
--version, -v Show version

Examples:
cam help
cam version
cam init
`.trim();
}
} 3. VersionCommand
Create src/cli/commands/VersionCommand.ts:

typescript
Copy
import _ as fs from 'fs';
import _ as path from 'path';

export class VersionCommand {
async execute(command: any): Promise<any> {
const version = this.getVersion();
return {
exitCode: 0,
output: `CAM version ${version}`
};
}

getHelp(): string {
return 'Display version information';
}

getDescription(): string {
return 'Show the current version of CAM';
}

private getVersion(): string {
try {
const packagePath = path.join(\_\_dirname, '../../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
return packageJson.version || '0.0.0';
} catch {
return '0.0.0';
}
}
} 4. InitCommand
Create src/cli/commands/InitCommand.ts:

typescript
Copy
import _ as fs from 'fs/promises';
import _ as path from 'path';

export class InitCommand {
async execute(command: any): Promise<any> {
try {
const targetDir = process.cwd();
const camDir = path.join(targetDir, '.infinite-aura-ts');

      // Check if already initialized
      try {
        await fs.access(camDir);
        return {
          exitCode: 1,
          error: 'CAM is already initialized in this directory'
        };
      } catch {
        // Directory doesn't exist, proceed with initialization
      }

      // Create directory structure
      await this.createDirectoryStructure(camDir);

      // Create CORE files
      await this.createCoreFiles(camDir);

      // Create default personas
      await this.createDefaultPersonas(camDir);

      return {
        exitCode: 0,
        output: 'CAM initialized successfully'
      };
    } catch (error) {
      return {
        exitCode: 1,
        error: error instanceof Error ? error.message : String(error)
      };
    }

}

getHelp(): string {
return 'Initialize CAM in the current directory';
}

getDescription(): string {
return 'Set up CAM directory structure and configuration files';
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
'skills'
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
    await fs.writeFile(
      path.join(coreDir, 'ACTIVE_PROJECTS.md'),
      '# ACTIVE PROJECTS\n\n'
    );

}

private async createDefaultPersonas(camDir: string): Promise<void> {
const personasDir = path.join(camDir, 'personas');

    const personas = [
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

    for (const persona of personas) {
      await fs.writeFile(
        path.join(personasDir, `${persona.name}.json`),
        JSON.stringify(persona, null, 2)
      );
    }

}
} 5. Index Export
Create src/cli/commands/index.ts:

typescript
Copy
export _ from './HelpCommand';
export _ from './VersionCommand';
export \* from './InitCommand';
📁 FILES TO CREATE
src/cli/commands/HelpCommand.ts
src/cli/commands/VersionCommand.ts
src/cli/commands/InitCommand.ts
src/cli/commands/index.ts
tests/cli/commands/HelpCommand.test.ts (5-7 tests)
tests/cli/commands/VersionCommand.test.ts (5-7 tests)
tests/cli/commands/InitCommand.test.ts (5-6 tests)
Total: 7 files, 15-20 tests

✅ SUCCESS CRITERIA
✅ HelpCommand working
✅ VersionCommand working
✅ InitCommand working
✅ 15-20 tests passing
✅ No TypeScript errors
END OF PROMPT 13D
