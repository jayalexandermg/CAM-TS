import { HelpCommand } from '../../../src/cli/commands/HelpCommand';
import { Command } from '../../../src/cli/types';

describe('HelpCommand', () => {
  let helpCommand: HelpCommand;

  beforeEach(() => {
    helpCommand = new HelpCommand();
  });

  // Helper to create a Command object
  const createCommand = (
    name: string = 'help',
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
      const result = await helpCommand.execute(createCommand());

      expect(result.exitCode).toBe(0);
    });

    it('should return help text in output', async () => {
      const result = await helpCommand.execute(createCommand());

      expect(result.output).toBeDefined();
      expect(result.output).toContain('CAM - Context-Aware Memory System');
    });

    it('should not return an error', async () => {
      const result = await helpCommand.execute(createCommand());

      expect(result.error).toBeUndefined();
    });

    it('should include usage information', async () => {
      const result = await helpCommand.execute(createCommand());

      expect(result.output).toContain('Usage:');
      expect(result.output).toContain('cam [command] [options]');
    });

    it('should list available commands', async () => {
      const result = await helpCommand.execute(createCommand());

      expect(result.output).toContain('help');
      expect(result.output).toContain('version');
      expect(result.output).toContain('init');
    });

    it('should include examples', async () => {
      const result = await helpCommand.execute(createCommand());

      expect(result.output).toContain('Examples:');
      expect(result.output).toContain('cam help');
    });
  });

  // =========================================================================
  // Interface Methods Tests
  // =========================================================================

  describe('getHelp', () => {
    it('should return help description', () => {
      const help = helpCommand.getHelp();

      expect(help).toBe('Display help information');
    });
  });

  describe('getDescription', () => {
    it('should return command description', () => {
      const description = helpCommand.getDescription();

      expect(description).toBe('Show available commands and usage information');
    });
  });
});
