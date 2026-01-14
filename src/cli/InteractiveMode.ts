/**
 * Infinite Aura - Interactive Mode
 *
 * REPL interface for interactive CLI sessions.
 * Provides a command-line interface for executing commands,
 * managing sessions, and integrating with personas and hooks.
 */

import * as readline from 'readline';
import { CommandRouter } from './CommandRouter';
import { CommandParser } from './CommandParser';
import { SessionManager } from './session/SessionManager';
import { Session } from './session/Session';
import { PersonaManager } from '../persona/PersonaManager';
import { HookEventEmitter } from '../hooks/event-emitter';
import { SessionStartHook } from '../hooks/SessionStartHook';
import { EventType, SessionStartEvent } from '../hooks/types';
import { CoreManager } from '../memory/core';
import { PrepromptInjector } from '../context/PrepromptInjector';

/**
 * Options for InteractiveMode
 */
export interface InteractiveModeOptions {
  /** Custom input stream (default: process.stdin) */
  input?: NodeJS.ReadableStream;
  /** Custom output stream (default: process.stdout) */
  output?: NodeJS.WritableStream;
  /** Custom prompt string (default: 'cam> ') */
  prompt?: string;
  /** Whether to display welcome message (default: true) */
  showWelcome?: boolean;
  /** Custom output function for messages */
  outputFn?: (message: string) => void;
}

/**
 * Interactive REPL mode for the CLI
 *
 * Provides:
 * - Command parsing and routing
 * - Session management
 * - Persona loading
 * - SessionStart hook integration
 * - Command history
 */
export class InteractiveMode {
  private readonly router: CommandRouter;
  private readonly sessionManager: SessionManager;
  private readonly personaManager: PersonaManager;
  private readonly hookEmitter: HookEventEmitter;
  private readonly options: Required<InteractiveModeOptions>;

  private session?: Session;
  private rl?: readline.Interface;
  private isRunning: boolean = false;
  private sessionStartHook?: SessionStartHook;

  /**
   * Create a new InteractiveMode instance
   * @param router - Command router for handling commands
   * @param sessionManager - Session manager for session lifecycle
   * @param personaManager - Persona manager for persona loading
   * @param hookEmitter - Hook event emitter for session hooks
   * @param options - Configuration options
   */
  constructor(
    router: CommandRouter,
    sessionManager: SessionManager,
    personaManager: PersonaManager,
    hookEmitter: HookEventEmitter,
    options: InteractiveModeOptions = {}
  ) {
    this.router = router;
    this.sessionManager = sessionManager;
    this.personaManager = personaManager;
    this.hookEmitter = hookEmitter;

    this.options = {
      input: options.input ?? process.stdin,
      output: options.output ?? process.stdout,
      prompt: options.prompt ?? 'cam> ',
      showWelcome: options.showWelcome ?? true,
      outputFn: options.outputFn ?? console.log,
    };
  }

  /**
   * Start the interactive mode
   * Creates a new session and begins the REPL loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Interactive mode is already running');
    }

    this.isRunning = true;

    // Create new session
    this.session = this.sessionManager.createSession();

    // Load personas
    try {
      await this.personaManager.loadPersonas();
    } catch {
      // Personas may not exist yet, that's ok
    }

    // Trigger SessionStart hook
    await this.triggerSessionStart();

    // Display welcome
    if (this.options.showWelcome) {
      this.displayWelcome();
    }

    // Start REPL
    this.rl = readline.createInterface({
      input: this.options.input,
      output: this.options.output,
      prompt: this.options.prompt,
    });

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      await this.processInput(input.trim());
      if (this.isRunning) {
        this.rl?.prompt();
      }
    });

    this.rl.on('close', async () => {
      await this.exit();
    });
  }

  /**
   * Trigger the SessionStart hook
   */
  private async triggerSessionStart(): Promise<void> {
    const event: SessionStartEvent = {
      type: EventType.SESSION_START,
      content: 'Session started',
      timestamp: new Date().toISOString(),
      metadata: {
        sessionId: this.session?.getId(),
      },
    };

    try {
      // Try to execute the session-start hook if registered
      if (this.hookEmitter.hasHandler('session-start')) {
        await this.hookEmitter.executeHook('session-start', event);
      } else {
        // Emit to any SESSION_START handlers
        await this.hookEmitter.emitSafe(event);
      }
    } catch (error) {
      // Log but don't fail - session start should be resilient
      this.options.outputFn(
        `[Warning] SessionStart hook failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Display welcome message
   */
  private displayWelcome(): void {
    this.options.outputFn('CAM - Context-Aware Memory System');
    this.options.outputFn('Type "help" for available commands, "exit" to quit\n');
  }

  /**
   * Process user input
   * @param input - Trimmed user input string
   */
  async processInput(input: string): Promise<void> {
    if (!input) {
      return;
    }

    // Handle exit
    if (input === 'exit' || input === 'quit') {
      this.rl?.close();
      return;
    }

    // Handle clear
    if (input === 'clear') {
      console.clear();
      if (this.options.showWelcome) {
        this.displayWelcome();
      }
      return;
    }

    // Handle history
    if (input === 'history') {
      this.displayHistory();
      return;
    }

    try {
      // Parse and route command
      const args = this.parseInputToArgs(input);
      const parser = new CommandParser(args);
      const command = parser.parse();

      const result = await this.router.route(command);

      if (result.output) {
        this.options.outputFn(result.output);
      }

      if (result.error) {
        this.options.outputFn(`Error: ${result.error}`);
      }

      // Add to session history
      this.session?.addTurn(input, result.output || result.error || '');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.outputFn(`Error: ${message}`);
      // Still add to history even on error
      this.session?.addTurn(input, `Error: ${message}`);
    }
  }

  /**
   * Parse input string into argument array
   * Handles quoted strings properly
   * @param input - Raw input string
   * @returns Array of arguments
   */
  private parseInputToArgs(input: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (!inQuote && (char === '"' || char === "'")) {
        inQuote = true;
        quoteChar = char;
      } else if (inQuote && char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      } else if (!inQuote && char === ' ') {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  /**
   * Display command history
   */
  private displayHistory(): void {
    const history = this.session?.getHistory() || [];

    if (history.length === 0) {
      this.options.outputFn('No history yet');
      return;
    }

    this.options.outputFn('\nSession History:');
    for (let i = 0; i < history.length; i++) {
      const turn = history[i];
      this.options.outputFn(`\n[${i + 1}] ${turn.timestamp.toLocaleTimeString()}`);
      this.options.outputFn(`> ${turn.input}`);
      if (turn.output) {
        this.options.outputFn(turn.output);
      }
    }
    this.options.outputFn('');
  }

  /**
   * Exit interactive mode and save session
   */
  async exit(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.options.outputFn('\nSaving session...');

    // End session
    this.session?.end();

    // Save session
    try {
      await this.session?.save();
      this.options.outputFn('Session saved');
    } catch (error) {
      this.options.outputFn(
        `Failed to save session: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this.options.outputFn('Goodbye!');
  }

  /**
   * Stop the interactive mode programmatically
   */
  stop(): void {
    if (this.isRunning) {
      this.rl?.close();
    }
  }

  /**
   * Check if interactive mode is running
   * @returns true if running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the current session
   * @returns Current session or undefined
   */
  getSession(): Session | undefined {
    return this.session;
  }

  /**
   * Get the command router
   * @returns Command router
   */
  getRouter(): CommandRouter {
    return this.router;
  }

  /**
   * Get the session manager
   * @returns Session manager
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Get the persona manager
   * @returns Persona manager
   */
  getPersonaManager(): PersonaManager {
    return this.personaManager;
  }

  /**
   * Get the hook event emitter
   * @returns Hook event emitter
   */
  getHookEmitter(): HookEventEmitter {
    return this.hookEmitter;
  }

  /**
   * Register a SessionStart hook with CoreManager and PrepromptInjector
   * @param coreManager - Core manager for loading context
   * @param prepromptInjector - Preprompt injector for system prompts
   */
  registerSessionStartHook(
    coreManager: CoreManager,
    prepromptInjector: PrepromptInjector
  ): void {
    this.sessionStartHook = new SessionStartHook(coreManager, prepromptInjector, {
      outputConfirmation: true,
      outputFn: this.options.outputFn,
    });
    this.hookEmitter.registerHandler(this.sessionStartHook);
  }

  /**
   * Get the registered SessionStart hook
   * @returns SessionStartHook or undefined
   */
  getSessionStartHook(): SessionStartHook | undefined {
    return this.sessionStartHook;
  }
}
