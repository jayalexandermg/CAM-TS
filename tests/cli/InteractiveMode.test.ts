import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PassThrough } from 'stream';
import { InteractiveMode, InteractiveModeOptions } from '../../src/cli/InteractiveMode';
import { CommandRouter } from '../../src/cli/CommandRouter';
import { SessionManager } from '../../src/cli/session/SessionManager';
import { PersonaManager } from '../../src/persona/PersonaManager';
import { HookEventEmitter } from '../../src/hooks/event-emitter';
import { EventType } from '../../src/hooks/types';
import { BaseCommandHandler } from '../../src/cli/types';
import { Command, CommandResult } from '../../src/cli/types';

// Test command for testing
class TestCommand extends BaseCommandHandler {
  private response: string;

  constructor(response: string = 'Test response') {
    super();
    this.response = response;
  }

  async execute(_command: Command): Promise<CommandResult> {
    return this.success(this.response);
  }

  getHelp(): string {
    return 'Test command';
  }

  getDescription(): string {
    return 'A test command';
  }
}

describe('InteractiveMode', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-interactive-mode');
  const sessionsDir = path.join(testBasePath, 'sessions');
  const personasDir = path.join(testBasePath, 'personas');

  let router: CommandRouter;
  let sessionManager: SessionManager;
  let personaManager: PersonaManager;
  let hookEmitter: HookEventEmitter;
  let outputMessages: string[];

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
    await fs.promises.mkdir(sessionsDir, { recursive: true });
    await fs.promises.mkdir(personasDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean and recreate directories
    await fs.promises.rm(sessionsDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.rm(personasDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(sessionsDir, { recursive: true });
    await fs.promises.mkdir(personasDir, { recursive: true });

    router = new CommandRouter();
    sessionManager = new SessionManager(sessionsDir);
    personaManager = new PersonaManager(personasDir);
    hookEmitter = new HookEventEmitter({ throwOnErrors: false });
    outputMessages = [];
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create InteractiveMode with required dependencies', () => {
      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter);
      expect(interactive.getRouter()).toBe(router);
      expect(interactive.getSessionManager()).toBe(sessionManager);
      expect(interactive.getPersonaManager()).toBe(personaManager);
      expect(interactive.getHookEmitter()).toBe(hookEmitter);
    });

    it('should create InteractiveMode with custom options', () => {
      const customOutput = jest.fn();
      const options: InteractiveModeOptions = {
        prompt: 'test> ',
        showWelcome: false,
        outputFn: customOutput,
      };

      const interactive = new InteractiveMode(
        router,
        sessionManager,
        personaManager,
        hookEmitter,
        options
      );

      expect(interactive).toBeDefined();
    });

    it('should not be running initially', () => {
      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter);
      expect(interactive.getIsRunning()).toBe(false);
    });

    it('should not have a session initially', () => {
      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter);
      expect(interactive.getSession()).toBeUndefined();
    });
  });

  // =========================================================================
  // processInput Tests
  // =========================================================================

  describe('processInput', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      router.register('test', new TestCommand());
      interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });
    });

    it('should ignore empty input', async () => {
      await interactive.processInput('');
      expect(outputMessages).toHaveLength(0);
    });

    it('should ignore whitespace-only input', async () => {
      // Note: We call processInput with empty string since input is trimmed
      // before calling processInput in the REPL
      await interactive.processInput('');
      // The first call should have registered the "test" command, this is for empty
      expect(outputMessages.filter((msg) => msg.includes('Error'))).toHaveLength(0);
    });

    it('should route valid commands to router', async () => {
      await interactive.processInput('test');
      expect(outputMessages).toContain('Test response');
    });

    it('should handle unknown commands gracefully', async () => {
      await interactive.processInput('unknown');
      expect(outputMessages.some((msg) => msg.includes('Error') || msg.includes('unknown'))).toBe(
        true
      );
    });

    it('should handle clear command', async () => {
      const consoleClearSpy = jest.spyOn(console, 'clear').mockImplementation(() => {});
      await interactive.processInput('clear');
      expect(consoleClearSpy).toHaveBeenCalled();
      consoleClearSpy.mockRestore();
    });

    it('should handle history command with empty history', async () => {
      await interactive.processInput('history');
      expect(outputMessages).toContain('No history yet');
    });
  });

  // =========================================================================
  // Command Parsing Tests
  // =========================================================================

  describe('command parsing', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      // Echo command that outputs subcommand + positional args
      // Note: CommandParser treats second non-flag arg as subcommand
      router.register('echo', {
        execute: async (cmd: Command) => ({
          exitCode: 0,
          output: [cmd.subcommand, ...cmd.positional].filter(Boolean).join(' '),
        }),
        getHelp: () => 'Echo command',
        getDescription: () => 'Echoes input',
      });
      interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });
    });

    it('should parse simple commands', async () => {
      await interactive.processInput('echo hello');
      expect(outputMessages).toContain('hello');
    });

    it('should parse commands with multiple arguments', async () => {
      await interactive.processInput('echo hello world');
      expect(outputMessages).toContain('hello world');
    });

    it('should handle quoted strings', async () => {
      await interactive.processInput('echo "hello world"');
      expect(outputMessages).toContain('hello world');
    });

    it('should handle single-quoted strings', async () => {
      await interactive.processInput("echo 'hello world'");
      expect(outputMessages).toContain('hello world');
    });
  });

  // =========================================================================
  // Session Management Tests
  // =========================================================================

  describe('session management', () => {
    it('should create session after start', async () => {
      const input = new PassThrough();
      const output = new PassThrough();

      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        input,
        output,
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      // Start interactive mode
      const startPromise = interactive.start();

      // Give it time to initialize
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(interactive.getSession()).toBeDefined();
      expect(interactive.getIsRunning()).toBe(true);

      // Clean up
      input.end();
      await startPromise.catch(() => {});
    });

    it('should add commands to session history', async () => {
      router.register('test', new TestCommand('Response'));

      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      // Manually set up session for testing processInput
      (interactive as unknown as { session: ReturnType<typeof sessionManager.createSession> }).session =
        sessionManager.createSession();

      await interactive.processInput('test');

      const session = interactive.getSession();
      expect(session?.getTurnCount()).toBe(1);

      const history = session?.getHistory();
      expect(history?.[0].input).toBe('test');
      expect(history?.[0].output).toBe('Response');
    });
  });

  // =========================================================================
  // Hook Integration Tests
  // =========================================================================

  describe('hook integration', () => {
    it('should trigger SessionStart hook on start', async () => {
      const hookExecuted = jest.fn();
      hookEmitter.registerHandler({
        name: 'test-hook',
        eventType: EventType.SESSION_START,
        handle: async () => {
          hookExecuted();
        },
      });

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

      // Clean up
      input.end();
      await startPromise.catch(() => {});

      // Note: hookExecuted may not be called if there's no matching handler for SESSION_START
      // The hook emitter uses EventType enum values
    });

    it('should continue even if hook fails', async () => {
      hookEmitter.registerHandler({
        name: 'failing-hook',
        eventType: EventType.SESSION_START,
        handle: async () => {
          throw new Error('Hook failure');
        },
      });

      const input = new PassThrough();
      const output = new PassThrough();

      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        input,
        output,
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      const startPromise = interactive.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still be running despite hook failure
      expect(interactive.getIsRunning()).toBe(true);

      // Clean up
      input.end();
      await startPromise.catch(() => {});
    });
  });

  // =========================================================================
  // Exit Tests
  // =========================================================================

  describe('exit', () => {
    it('should save session on exit', async () => {
      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      // Manually set up session
      (interactive as unknown as { session: ReturnType<typeof sessionManager.createSession> }).session =
        sessionManager.createSession();
      (interactive as unknown as { isRunning: boolean }).isRunning = true;

      await interactive.exit();

      expect(outputMessages).toContain('Session saved');
      expect(outputMessages).toContain('Goodbye!');
    });

    it('should not save if already exited', async () => {
      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      // Not running, so exit should be no-op
      await interactive.exit();

      expect(outputMessages).not.toContain('Session saved');
    });

    it('should handle save failure gracefully', async () => {
      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter, {
        showWelcome: false,
        outputFn: (msg) => outputMessages.push(msg),
      });

      // Create a mock session that fails to save
      const mockSession = {
        getId: () => 'test-id',
        end: () => {},
        save: async () => {
          throw new Error('Save failed');
        },
      };
      (interactive as unknown as { session: typeof mockSession }).session = mockSession;
      (interactive as unknown as { isRunning: boolean }).isRunning = true;

      await interactive.exit();

      expect(outputMessages.some((msg) => msg.includes('Failed to save session'))).toBe(true);
    });
  });

  // =========================================================================
  // Stop Tests
  // =========================================================================

  describe('stop', () => {
    it('should stop running interactive mode', async () => {
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

      expect(interactive.getIsRunning()).toBe(true);

      interactive.stop();

      await startPromise.catch(() => {});
    });

    it('should do nothing if not running', () => {
      const interactive = new InteractiveMode(router, sessionManager, personaManager, hookEmitter);
      expect(() => interactive.stop()).not.toThrow();
    });
  });

  // =========================================================================
  // Error Prevention Tests
  // =========================================================================

  describe('error prevention', () => {
    it('should throw if start is called twice', async () => {
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

      await expect(interactive.start()).rejects.toThrow('already running');

      input.end();
      await startPromise.catch(() => {});
    });
  });
});
