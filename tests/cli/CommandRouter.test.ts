import { CommandRouter } from '../../src/cli/CommandRouter';
import { Command, CommandResult, BaseCommandHandler } from '../../src/cli/types';

// Mock command handler for testing
class MockHandler extends BaseCommandHandler {
  constructor(
    private output: string = 'success',
    private shouldThrow: boolean = false,
  ) {
    super();
  }

  async execute(_command: Command): Promise<CommandResult> {
    if (this.shouldThrow) {
      throw new Error('Handler error');
    }
    return this.success(this.output);
  }

  getHelp(): string {
    return 'Mock help text';
  }

  getDescription(): string {
    return 'Mock command description';
  }
}

describe('CommandRouter', () => {
  let router: CommandRouter;

  beforeEach(() => {
    router = new CommandRouter();
  });

  // =========================================================================
  // Registration Tests
  // =========================================================================

  describe('register', () => {
    it('should register a command handler', () => {
      const handler = new MockHandler();
      router.register('test', handler);

      expect(router.hasCommand('test')).toBe(true);
    });

    it('should overwrite existing handler', () => {
      const handler1 = new MockHandler('first');
      const handler2 = new MockHandler('second');

      router.register('test', handler1);
      router.register('test', handler2);

      expect(router.getHandler('test')).toBe(handler2);
    });
  });

  describe('unregister', () => {
    it('should unregister a command handler', () => {
      const handler = new MockHandler();
      router.register('test', handler);
      router.unregister('test');

      expect(router.hasCommand('test')).toBe(false);
    });

    it('should handle unregistering non-existent command', () => {
      expect(() => router.unregister('nonexistent')).not.toThrow();
    });
  });

  // =========================================================================
  // Routing Tests
  // =========================================================================

  describe('route', () => {
    it('should route command to registered handler', async () => {
      const handler = new MockHandler('test output');
      router.register('test', handler);

      const command: Command = {
        name: 'test',
        flags: new Map(),
        options: new Map(),
        positional: [],
      };

      const result = await router.route(command);

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe('test output');
    });

    it('should return error result for unknown command', async () => {
      const command: Command = {
        name: 'unknown',
        flags: new Map(),
        options: new Map(),
        positional: [],
      };

      const result = await router.route(command);
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Unknown command: unknown');
    });

    it('should catch handler errors and return failure result', async () => {
      const handler = new MockHandler('', true);
      router.register('error', handler);

      const command: Command = {
        name: 'error',
        flags: new Map(),
        options: new Map(),
        positional: [],
      };

      const result = await router.route(command);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Handler error');
    });
  });

  // =========================================================================
  // Utility Methods Tests
  // =========================================================================

  describe('getCommands', () => {
    it('should return list of registered commands', () => {
      router.register('cmd1', new MockHandler());
      router.register('cmd2', new MockHandler());
      router.register('cmd3', new MockHandler());

      const commands = router.getCommands();

      expect(commands).toHaveLength(3);
      expect(commands).toContain('cmd1');
      expect(commands).toContain('cmd2');
      expect(commands).toContain('cmd3');
    });

    it('should return empty array when no commands registered', () => {
      const commands = router.getCommands();

      expect(commands).toHaveLength(0);
    });
  });

  describe('hasCommand', () => {
    it('should return true for registered commands', () => {
      router.register('test', new MockHandler());

      expect(router.hasCommand('test')).toBe(true);
    });

    it('should return false for unregistered commands', () => {
      expect(router.hasCommand('unknown')).toBe(false);
    });
  });

  describe('getHandler', () => {
    it('should return handler for registered command', () => {
      const handler = new MockHandler();
      router.register('test', handler);

      expect(router.getHandler('test')).toBe(handler);
    });

    it('should return undefined for unregistered command', () => {
      expect(router.getHandler('unknown')).toBeUndefined();
    });
  });
});
