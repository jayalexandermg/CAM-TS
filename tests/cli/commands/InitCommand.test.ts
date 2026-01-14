import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { InitCommand } from '../../../src/cli/commands/InitCommand';
import { Command } from '../../../src/cli/types';

describe('InitCommand', () => {
  let testDir: string;
  let initCommand: InitCommand;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cam-test-'));
    initCommand = new InitCommand(testDir);
  });

  afterEach(async () => {
    // Clean up the temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  // Helper to create a Command object
  const createCommand = (
    name: string = 'init',
    options: Partial<Command> = {}
  ): Command => ({
    name,
    flags: new Map(),
    options: new Map(),
    positional: [],
    ...options,
  });

  // =========================================================================
  // Execute Tests
  // =========================================================================

  describe('execute', () => {
    it('should return exit code 0 on success', async () => {
      const result = await initCommand.execute(createCommand());

      expect(result.exitCode).toBe(0);
    });

    it('should return success message', async () => {
      const result = await initCommand.execute(createCommand());

      expect(result.output).toBe('CAM initialized successfully');
      expect(result.error).toBeUndefined();
    });

    it('should create .infinite-aura-ts directory', async () => {
      await initCommand.execute(createCommand());

      const camDir = path.join(testDir, '.infinite-aura-ts');
      const stats = await fs.stat(camDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should fail if already initialized', async () => {
      // First initialization
      await initCommand.execute(createCommand());

      // Second initialization should fail
      const result = await initCommand.execute(createCommand());

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('CAM is already initialized in this directory');
    });

    it('should create memory directory structure', async () => {
      await initCommand.execute(createCommand());

      const camDir = path.join(testDir, '.infinite-aura-ts');
      const memoryDirs = [
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
      ];

      for (const dir of memoryDirs) {
        const dirPath = path.join(camDir, dir);
        const stats = await fs.stat(dirPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });

    it('should create CORE files', async () => {
      await initCommand.execute(createCommand());

      const coreDir = path.join(testDir, '.infinite-aura-ts/memory/CORE');

      // Check USER.md
      const userContent = await fs.readFile(path.join(coreDir, 'USER.md'), 'utf-8');
      expect(userContent).toContain('# USER');
      expect(userContent).toContain('## Identity');

      // Check PREFERENCES.md
      const prefsContent = await fs.readFile(path.join(coreDir, 'PREFERENCES.md'), 'utf-8');
      expect(prefsContent).toContain('# PREFERENCES');
      expect(prefsContent).toContain('## Communication');

      // Check ACTIVE_PROJECTS.md
      const projectsContent = await fs.readFile(
        path.join(coreDir, 'ACTIVE_PROJECTS.md'),
        'utf-8'
      );
      expect(projectsContent).toContain('# ACTIVE PROJECTS');
    });

    it('should create default personas', async () => {
      await initCommand.execute(createCommand());

      const personasDir = path.join(testDir, '.infinite-aura-ts/personas');

      // Check default persona
      const defaultPersona = JSON.parse(
        await fs.readFile(path.join(personasDir, 'default.json'), 'utf-8')
      );
      expect(defaultPersona.name).toBe('default');
      expect(defaultPersona.description).toContain('Default CAM persona');
      expect(defaultPersona.personality).toContain('Helpful');

      // Check researcher persona
      const researcherPersona = JSON.parse(
        await fs.readFile(path.join(personasDir, 'researcher.json'), 'utf-8')
      );
      expect(researcherPersona.name).toBe('researcher');
      expect(researcherPersona.expertise).toContain('Research methodology');

      // Check coder persona
      const coderPersona = JSON.parse(
        await fs.readFile(path.join(personasDir, 'coder.json'), 'utf-8')
      );
      expect(coderPersona.name).toBe('coder');
      expect(coderPersona.expertise).toContain('Software development');
    });

    it('should create sessions and skills directories', async () => {
      await initCommand.execute(createCommand());

      const camDir = path.join(testDir, '.infinite-aura-ts');

      const sessionsDir = path.join(camDir, 'sessions');
      const sessionsStats = await fs.stat(sessionsDir);
      expect(sessionsStats.isDirectory()).toBe(true);

      const skillsDir = path.join(camDir, 'skills');
      const skillsStats = await fs.stat(skillsDir);
      expect(skillsStats.isDirectory()).toBe(true);
    });
  });

  // =========================================================================
  // Interface Methods Tests
  // =========================================================================

  describe('getHelp', () => {
    it('should return help description', () => {
      const help = initCommand.getHelp();

      expect(help).toBe('Initialize CAM in the current directory');
    });
  });

  describe('getDescription', () => {
    it('should return command description', () => {
      const description = initCommand.getDescription();

      expect(description).toBe('Set up CAM directory structure and configuration files');
    });
  });
});
