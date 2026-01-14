import { VersionCommand } from '../../../src/cli/commands/VersionCommand';
import { Command } from '../../../src/cli/types';

describe('VersionCommand', () => {
  let versionCommand: VersionCommand;

  beforeEach(() => {
    versionCommand = new VersionCommand();
  });

  // Helper to create a Command object
  const createCommand = (
    name: string = 'version',
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
    it('should return exit code 0', async () => {
      const result = await versionCommand.execute(createCommand());

      expect(result.exitCode).toBe(0);
    });

    it('should return version output', async () => {
      const result = await versionCommand.execute(createCommand());

      expect(result.output).toBeDefined();
      expect(result.output).toContain('CAM version');
    });

    it('should not return an error', async () => {
      const result = await versionCommand.execute(createCommand());

      expect(result.error).toBeUndefined();
    });

    it('should return a version number in semver format', async () => {
      const result = await versionCommand.execute(createCommand());

      // Version should match semver pattern (major.minor.patch)
      expect(result.output).toMatch(/CAM version \d+\.\d+\.\d+/);
    });

    it('should return the version from package.json', async () => {
      const result = await versionCommand.execute(createCommand());

      // Based on the package.json, version is 0.1.0
      expect(result.output).toBe('CAM version 0.1.0');
    });
  });

  // =========================================================================
  // Interface Methods Tests
  // =========================================================================

  describe('getHelp', () => {
    it('should return help description', () => {
      const help = versionCommand.getHelp();

      expect(help).toBe('Display version information');
    });
  });

  describe('getDescription', () => {
    it('should return command description', () => {
      const description = versionCommand.getDescription();

      expect(description).toBe('Show the current version of CAM');
    });
  });
});
