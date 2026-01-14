import { CommandParser } from '../../src/cli/CommandParser';

describe('CommandParser', () => {
  // =========================================================================
  // Basic Parsing Tests
  // =========================================================================

  describe('parse', () => {
    it('should parse a simple command', () => {
      const parser = new CommandParser(['help']);
      const command = parser.parse();

      expect(command.name).toBe('help');
      expect(command.subcommand).toBeUndefined();
      expect(command.flags.size).toBe(0);
      expect(command.options.size).toBe(0);
      expect(command.positional).toHaveLength(0);
    });

    it('should default to "help" for empty args', () => {
      const parser = new CommandParser([]);
      const command = parser.parse();

      expect(command.name).toBe('help');
    });

    it('should parse command with subcommand', () => {
      const parser = new CommandParser(['memory', 'list']);
      const command = parser.parse();

      expect(command.name).toBe('memory');
      expect(command.subcommand).toBe('list');
    });

    it('should parse command with positional arguments', () => {
      const parser = new CommandParser(['memory', 'add', 'key1', 'value1']);
      const command = parser.parse();

      expect(command.name).toBe('memory');
      expect(command.subcommand).toBe('add');
      expect(command.positional).toEqual(['key1', 'value1']);
    });
  });

  // =========================================================================
  // Flag Parsing Tests
  // =========================================================================

  describe('extractFlags', () => {
    it('should parse long flags', () => {
      const parser = new CommandParser(['command', '--verbose', '--debug']);
      const command = parser.parse();

      expect(command.flags.get('verbose')).toBe(true);
      expect(command.flags.get('debug')).toBe(true);
    });

    it('should parse short flags', () => {
      const parser = new CommandParser(['command', '-v', '-d']);
      const command = parser.parse();

      expect(command.flags.get('v')).toBe(true);
      expect(command.flags.get('d')).toBe(true);
    });

    it('should not parse options as flags', () => {
      const parser = new CommandParser(['command', '--key=value']);
      const command = parser.parse();

      expect(command.flags.has('key')).toBe(false);
      expect(command.flags.has('key=value')).toBe(false);
    });

    it('should handle mixed flags and options', () => {
      const parser = new CommandParser(['command', '--verbose', '--format=json', '-d']);
      const command = parser.parse();

      expect(command.flags.get('verbose')).toBe(true);
      expect(command.flags.get('d')).toBe(true);
      expect(command.flags.has('format')).toBe(false);
    });
  });

  // =========================================================================
  // Option Parsing Tests
  // =========================================================================

  describe('extractOptions', () => {
    it('should parse options with values', () => {
      const parser = new CommandParser(['command', '--format=json']);
      const command = parser.parse();

      expect(command.options.get('format')).toBe('json');
    });

    it('should parse multiple options', () => {
      const parser = new CommandParser(['command', '--format=json', '--output=file.txt']);
      const command = parser.parse();

      expect(command.options.get('format')).toBe('json');
      expect(command.options.get('output')).toBe('file.txt');
    });

    it('should handle options with equals in value', () => {
      const parser = new CommandParser(['command', '--config=key=value']);
      const command = parser.parse();

      expect(command.options.get('config')).toBe('key=value');
    });

    it('should handle empty option values', () => {
      const parser = new CommandParser(['command', '--empty=']);
      const command = parser.parse();

      expect(command.options.get('empty')).toBe('');
    });
  });

  // =========================================================================
  // Positional Arguments Tests
  // =========================================================================

  describe('extractPositional', () => {
    it('should exclude command and subcommand from positional', () => {
      const parser = new CommandParser(['memory', 'add', 'item1']);
      const command = parser.parse();

      expect(command.positional).toEqual(['item1']);
      expect(command.positional).not.toContain('memory');
      expect(command.positional).not.toContain('add');
    });

    it('should handle multiple positional arguments', () => {
      const parser = new CommandParser(['copy', 'src', 'file1', 'file2', 'file3']);
      const command = parser.parse();

      expect(command.positional).toEqual(['file1', 'file2', 'file3']);
    });

    it('should not include flags in positional', () => {
      const parser = new CommandParser(['command', 'sub', '--flag', 'arg1']);
      const command = parser.parse();

      expect(command.positional).toEqual(['arg1']);
      expect(command.positional).not.toContain('--flag');
    });
  });

  // =========================================================================
  // Complex Parsing Tests
  // =========================================================================

  describe('complex parsing scenarios', () => {
    it('should handle full command with all parts', () => {
      const parser = new CommandParser([
        'memory',
        'search',
        '--verbose',
        '--format=json',
        '-d',
        'query',
        'extra',
      ]);
      const command = parser.parse();

      expect(command.name).toBe('memory');
      expect(command.subcommand).toBe('search');
      expect(command.flags.get('verbose')).toBe(true);
      expect(command.flags.get('d')).toBe(true);
      expect(command.options.get('format')).toBe('json');
      expect(command.positional).toEqual(['query', 'extra']);
    });

    it('should handle flags before command', () => {
      const parser = new CommandParser(['--verbose', 'command', 'subcommand']);
      const command = parser.parse();

      expect(command.name).toBe('command');
      expect(command.subcommand).toBe('subcommand');
      expect(command.flags.get('verbose')).toBe(true);
    });

    it('should handle only flags', () => {
      const parser = new CommandParser(['--verbose', '--debug', '-v']);
      const command = parser.parse();

      expect(command.name).toBe('help');
      expect(command.flags.get('verbose')).toBe(true);
      expect(command.flags.get('debug')).toBe(true);
      expect(command.flags.get('v')).toBe(true);
    });

    it('should handle interleaved flags and arguments', () => {
      const parser = new CommandParser(['memory', '--verbose', 'list', '--format=json', 'pattern']);
      const command = parser.parse();

      expect(command.name).toBe('memory');
      expect(command.subcommand).toBe('list');
      expect(command.flags.get('verbose')).toBe(true);
      expect(command.options.get('format')).toBe('json');
      expect(command.positional).toEqual(['pattern']);
    });
  });
});
