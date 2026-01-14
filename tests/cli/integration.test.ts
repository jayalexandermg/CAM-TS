/**
 * CLI Integration Tests
 *
 * End-to-end tests for CLI components working together.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PassThrough } from 'stream';
import { CommandRouter } from '../../src/cli/CommandRouter';
import { CommandParser } from '../../src/cli/CommandParser';
import { HelpCommand } from '../../src/cli/commands/HelpCommand';
import { VersionCommand } from '../../src/cli/commands/VersionCommand';
import { InitCommand } from '../../src/cli/commands/InitCommand';
import { InteractiveMode } from '../../src/cli/InteractiveMode';
import { SessionManager } from '../../src/cli/session/SessionManager';
import { PersonaManager } from '../../src/persona/PersonaManager';
import { HookEventEmitter } from '../../src/hooks/event-emitter';

describe('CLI Integration', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-cli-integration');
  const sessionsDir = path.join(testBasePath, 'sessions');
  const personasDir = path.join(testBasePath, 'personas');
  const initTargetDir = path.join(testBasePath, 'init-target');

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up directories before each test
    await fs.promises.rm(sessionsDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.rm(personasDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.rm(initTargetDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(sessionsDir, { recursive: true });
    await fs.promises.mkdir(personasDir, { recursive: true });
    await fs.promises.mkdir(initTargetDir, { recursive: true });
  });

  // =========================================================================
  // Full Command Pipeline Tests
  // =========================================================================

  describe('full command pipeline', () => {
    it('should parse, route, and execute help command', async () => {
      const router = new CommandRouter();
      router.register('help', new HelpCommand());

      const parser = new CommandParser(['help']);
      const command = parser.parse();
      const result = await router.route(command);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Commands:');
      expect(result.output).toContain('help');
    });

    it('should parse, route, and execute version command', async () => {
      const router = new CommandRouter();
      router.register('version', new VersionCommand());

      const parser = new CommandParser(['version']);
      const command = parser.parse();
      const result = await router.route(command);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('CAM');
    });

    it('should parse, route, and execute init command', async () => {
      const router = new CommandRouter();
      router.register('init', new InitCommand(initTargetDir));

      const parser = new CommandParser(['init']);
      const command = parser.parse();
      const result = await router.route(command);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('initialized');

      // Verify directories were created (under .infinite-aura-ts)
      const memoryDir = path.join(initTargetDir, '.infinite-aura-ts', 'memory', 'CORE');
      expect(fs.existsSync(memoryDir)).toBe(true);
    });

    it('should handle unknown commands gracefully', async () => {
      const router = new CommandRouter();
      router.register('help', new HelpCommand());

      const parser = new CommandParser(['unknown-cmd']);
      const command = parser.parse();

      // CommandRouter throws CommandNotFoundError for unknown commands
      await expect(router.route(command)).rejects.toThrow('unknown-cmd');
    });

    it('should parse command with flags and options', async () => {
      const router = new CommandRouter();
      let capturedCommand: ReturnType<CommandParser['parse']> | null = null;

      router.register('test', {
        execute: async (cmd) => {
          capturedCommand = cmd;
          return { exitCode: 0, output: 'OK' };
        },
        getHelp: () => 'Test command',
        getDescription: () => 'Test command',
      });

      // Note: Parser treats first 2 non-flag args as command and subcommand
      // So positional starts at index 2 (arg2 in this case)
      const parser = new CommandParser([
        'test',
        '--verbose',
        '-f',
        '--output=file.txt',
        'sub',
        'arg1',
      ]);
      const command = parser.parse();
      await router.route(command);

      expect(capturedCommand).not.toBeNull();
      expect(capturedCommand!.flags.has('verbose')).toBe(true);
      expect(capturedCommand!.flags.has('f')).toBe(true);
      expect(capturedCommand!.options.get('output')).toBe('file.txt');
      expect(capturedCommand!.subcommand).toBe('sub');
      expect(capturedCommand!.positional).toContain('arg1');
    });
  });

  // =========================================================================
  // Interactive Mode Integration Tests
  // =========================================================================

  describe('interactive mode integration', () => {
    it('should create full interactive environment', async () => {
      const router = new CommandRouter();
      router.register('help', new HelpCommand());
      router.register('version', new VersionCommand());

      const sessionManager = new SessionManager(sessionsDir);
      const personaManager = new PersonaManager(personasDir);
      const hookEmitter = new HookEventEmitter({ throwOnErrors: false });

      const input = new PassThrough();
      const output = new PassThrough();
      const outputMessages: string[] = [];

      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        input,
        output,
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      const startPromise = interactive.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Process a command
      await interactive.processInput('help');

      expect(outputMessages.some((msg) => msg.includes('Commands:'))).toBe(true);

      // Clean up
      input.end();
      await startPromise.catch(() => {});
    });

    it('should maintain session state across commands', async () => {
      const router = new CommandRouter();
      let counter = 0;

      router.register('increment', {
        execute: async () => {
          counter++;
          return { exitCode: 0, output: `Count: ${counter}` };
        },
        getHelp: () => 'Increment counter',
        getDescription: () => 'Increment counter',
      });

      const sessionManager = new SessionManager(sessionsDir);
      const personaManager = new PersonaManager(personasDir);
      const hookEmitter = new HookEventEmitter({ throwOnErrors: false });

      const input = new PassThrough();
      const output = new PassThrough();
      const outputMessages: string[] = [];

      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        input,
        output,
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      const startPromise = interactive.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      await interactive.processInput('increment');
      await interactive.processInput('increment');
      await interactive.processInput('increment');

      const session = interactive.getSession();
      expect(session?.getTurnCount()).toBe(3);
      expect(counter).toBe(3);

      input.end();
      await startPromise.catch(() => {});
    });
  });

  // =========================================================================
  // Session Persistence Tests
  // =========================================================================

  describe('session persistence', () => {
    it('should save and load session with history', async () => {
      // Create session directly with specific ID and directory
      // (bypassing InteractiveMode to test SessionManager/Session directly)
      const sessionManager = new SessionManager(sessionsDir);
      const session = sessionManager.createSessionWithId('test-persist-session');

      // Add some history
      session.addTurn('echo hello', 'hello');
      session.addTurn('echo world', 'world');

      // Save the session
      await session.save();

      // Load the session
      const loadedSession = await sessionManager.loadSession('test-persist-session');
      expect(loadedSession.getTurnCount()).toBe(2);
      expect(loadedSession.getHistory()[0].input).toBe('echo hello');
      expect(loadedSession.getHistory()[1].input).toBe('echo world');
    });

    it('should work with interactive mode session', async () => {
      const router = new CommandRouter();
      router.register('echo', {
        execute: async (cmd) => ({
          exitCode: 0,
          output: [cmd.subcommand, ...cmd.positional].filter(Boolean).join(' '),
        }),
        getHelp: () => 'Echo command',
        getDescription: () => 'Echo input',
      });

      const sessionManager = new SessionManager(sessionsDir);
      const personaManager = new PersonaManager(personasDir);
      const hookEmitter = new HookEventEmitter({ throwOnErrors: false });

      const input = new PassThrough();
      const output = new PassThrough();

      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        input,
        output,
        showWelcome: false,
        outputFn: () => {},
      });

      const startPromise = interactive.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      await interactive.processInput('echo hello');
      await interactive.processInput('echo world');

      // Verify session has history
      const session = interactive.getSession();
      expect(session?.getTurnCount()).toBe(2);

      // Clean up
      input.end();
      await startPromise.catch(() => {});
    });
  });

  // =========================================================================
  // Error Recovery Tests
  // =========================================================================

  describe('error recovery', () => {
    it('should continue after command errors', async () => {
      const router = new CommandRouter();

      router.register('fail', {
        execute: async () => {
          throw new Error('Intentional failure');
        },
        getHelp: () => 'Failing command',
        getDescription: () => 'Always fails',
      });

      router.register('succeed', {
        execute: async () => ({ exitCode: 0, output: 'Success!' }),
        getHelp: () => 'Succeeding command',
        getDescription: () => 'Always succeeds',
      });

      const sessionManager = new SessionManager(sessionsDir);
      const personaManager = new PersonaManager(personasDir);
      const hookEmitter = new HookEventEmitter({ throwOnErrors: false });

      const input = new PassThrough();
      const output = new PassThrough();
      const outputMessages: string[] = [];

      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        input,
        output,
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      const startPromise = interactive.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should handle error gracefully
      await interactive.processInput('fail');
      expect(outputMessages.some((msg) => msg.includes('Error'))).toBe(true);

      // Should still work after error
      await interactive.processInput('succeed');
      expect(outputMessages.some((msg) => msg.includes('Success!'))).toBe(true);

      input.end();
      await startPromise.catch(() => {});
    });
  });

  // =========================================================================
  // Router Registration Tests
  // =========================================================================

  describe('router registration', () => {
    it('should support dynamic command registration', async () => {
      const router = new CommandRouter();
      const sessionManager = new SessionManager(sessionsDir);
      const personaManager = new PersonaManager(personasDir);
      const hookEmitter = new HookEventEmitter({ throwOnErrors: false });

      const input = new PassThrough();
      const output = new PassThrough();
      const outputMessages: string[] = [];

      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        input,
        output,
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      const startPromise = interactive.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Command doesn't exist yet
      await interactive.processInput('dynamic');
      expect(outputMessages.some((msg) => msg.includes('Error'))).toBe(true);

      // Register the command dynamically
      router.register('dynamic', {
        execute: async () => ({ exitCode: 0, output: 'Dynamic command works!' }),
        getHelp: () => 'Dynamic',
        getDescription: () => 'Dynamic',
      });

      // Now it should work
      await interactive.processInput('dynamic');
      expect(outputMessages.some((msg) => msg.includes('Dynamic command works!'))).toBe(true);

      input.end();
      await startPromise.catch(() => {});
    });
  });
});
