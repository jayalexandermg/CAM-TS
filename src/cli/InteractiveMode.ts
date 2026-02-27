/**
 * Infinite Aura - Interactive Mode
 *
 * REPL interface for interactive CLI sessions.
 * Provides a command-line interface for executing commands,
 * managing sessions, and integrating with personas and hooks.
 * Full UOCS integration for session tracking and history.
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
import { OrchestratorBridge } from './OrchestratorBridge';
import { CommandNotFoundError } from './errors';
import { SessionTranscript, Learning, Decision } from '../history/types';

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
 * - Session management with full UOCS integration
 * - Persona loading and switching with context
 * - SessionStart hook integration
 * - Command history with transcripts, learnings, and decisions
 */
/**
 * Interaction mode for CAM
 * - 'ideation': Natural conversation with persona, no task execution
 * - 'execution': Full orchestration with agent spawning and task execution
 */
export type InteractionMode = 'ideation' | 'execution';

export class InteractiveMode {
  private readonly router: CommandRouter;
  private readonly sessionManager: SessionManager;
  private readonly personaManager: PersonaManager;
  private readonly hookEmitter: HookEventEmitter;
  private readonly options: Required<InteractiveModeOptions>;
  private readonly bridge: OrchestratorBridge;

  private session?: Session;
  private rl?: readline.Interface;
  private isRunning: boolean = false;
  private sessionStartHook?: SessionStartHook;
  private uocsSessionStarted: boolean = false;
  private interactionMode: InteractionMode = 'ideation';

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
    options: InteractiveModeOptions = {},
    bridge?: OrchestratorBridge
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

    this.bridge = bridge || new OrchestratorBridge();
  }

  /**
   * Start the interactive mode
   * Creates a new session, starts UOCS tracking, and begins the REPL loop
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

    // Initialize and start UOCS session via orchestrator
    await this.startUOCSSession();

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
   * Start UOCS session tracking via the orchestrator
   */
  private async startUOCSSession(): Promise<void> {
    if (!this.session) {
      return;
    }

    try {
      const orchestrator = this.bridge.getOrchestrator();
      await orchestrator.initialize();
      await orchestrator.startSession(this.session.getId());
      this.uocsSessionStarted = true;
    } catch (error) {
      // Log but don't fail - UOCS tracking is supplementary
      this.options.outputFn(
        `[Warning] Failed to start UOCS session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
    this.options.outputFn('Type "help" for commands, "personas" to list personas, "exit" to quit');
    if (this.uocsSessionStarted) {
      this.options.outputFn(`Session tracking: active (ID: ${this.session?.getId()})`);
    }
    this.options.outputFn('');
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

    // Handle mode switching
    if (input === '/chat' || input === '/ideate') {
      this.setMode('ideation');
      this.options.outputFn('\nSwitched to ideation mode - natural conversation with CAM');
      this.options.outputFn('Use /do or /execute to switch to execution mode\n');
      return;
    }

    if (input === '/do' || input === '/execute') {
      this.setMode('execution');
      this.options.outputFn(
        '\nSwitched to execution mode - CAM will orchestrate agents to execute tasks'
      );
      this.options.outputFn('Use /chat or /ideate to switch to ideation mode\n');
      return;
    }

    // Handle mode query
    if (input === '/mode') {
      this.options.outputFn(`\nCurrent mode: ${this.interactionMode}`);
      this.options.outputFn(
        this.interactionMode === 'ideation'
          ? 'In ideation mode - conversing naturally'
          : 'In execution mode - orchestrating agents'
      );
      this.options.outputFn('');
      return;
    }

    // Handle persona switching
    if (input.startsWith('persona ')) {
      await this.handlePersonaSwitch(input.substring(8).trim());
      return;
    }

    // Handle persona list
    if (input === 'personas') {
      this.displayPersonas();
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
      // If command not found, process based on current mode
      if (error instanceof CommandNotFoundError && this.session) {
        await this.processNaturalLanguage(input);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.options.outputFn(`Error: ${message}`);
        // Still add to history even on error
        this.session?.addTurn(input, `Error: ${message}`);
      }
    }
  }

  /**
   * Process natural language input based on current mode
   */
  private async processNaturalLanguage(input: string): Promise<void> {
    if (!this.session) return;

    try {
      if (this.interactionMode === 'ideation') {
        // Ideation mode: Stream response for real-time conversation feel
        const output = this.options.output as NodeJS.WritableStream;
        const isStreamable = output && typeof (output as { write?: unknown }).write === 'function';

        if (isStreamable) {
          (output as NodeJS.WritableStream).write('\n');
          const response = await this.bridge.processIdeationStreaming(
            input,
            this.session,
            (chunk: string) => {
              (output as NodeJS.WritableStream).write(chunk);
            }
          );
          (output as NodeJS.WritableStream).write('\n\n');
          this.session.addTurn(input, response);
        } else {
          // Fallback to non-streaming
          const response = await this.bridge.processIdeation(input, this.session);
          this.options.outputFn(`\n${response}\n`);
          this.session.addTurn(input, response);
        }
      } else {
        // Execution mode: Full orchestration with agents
        const response = await this.bridge.processInput(input, this.session);
        this.options.outputFn(`\n${response}\n`);
        this.session.addTurn(input, response);
      }
    } catch (bridgeError) {
      const bridgeMessage =
        bridgeError instanceof Error ? bridgeError.message : String(bridgeError);
      this.options.outputFn(`Error: ${bridgeMessage}`);
      this.session.addTurn(input, `Error: ${bridgeMessage}`);
    }
  }

  /**
   * Set the interaction mode
   */
  setMode(mode: InteractionMode): void {
    this.interactionMode = mode;
  }

  /**
   * Get the current interaction mode
   */
  getMode(): InteractionMode {
    return this.interactionMode;
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
   * Display command history from session
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
   * Handle persona switching with context preservation
   * @param personaName - Name of the persona to switch to
   */
  private async handlePersonaSwitch(personaName: string): Promise<void> {
    if (!personaName) {
      const current = this.personaManager.getCurrentPersona();
      if (current) {
        this.options.outputFn(`Current persona: ${current.getName()}`);
      } else {
        this.options.outputFn('No persona currently selected');
      }
      return;
    }

    try {
      await this.personaManager.switchPersona(personaName);
      this.session?.setPersona(personaName);

      // Capture persona switch in UOCS
      if (this.uocsSessionStarted && this.session) {
        const uocs = this.bridge.getOrchestrator().getUOCS();
        uocs.captureTurn(this.session.getId(), {
          role: 'system',
          content: `Switched to persona: ${personaName}`,
          timestamp: new Date(),
        });
      }

      const persona = this.personaManager.getCurrentPersona();
      this.options.outputFn(`\nSwitched to persona: ${personaName}`);
      if (persona) {
        this.options.outputFn(`Description: ${persona.getDescription()}`);
        this.options.outputFn(`Style: ${persona.getDefinition().communicationStyle}`);
      }
      this.options.outputFn('');
    } catch (error) {
      this.options.outputFn(
        `Failed to switch persona: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Display available personas
   */
  private displayPersonas(): void {
    const personas = this.personaManager.listPersonas();
    const current = this.personaManager.getCurrentPersona();

    if (personas.length === 0) {
      this.options.outputFn('No personas available');
      return;
    }

    this.options.outputFn('\nAvailable Personas:');
    for (const name of personas) {
      const marker = current?.getName() === name ? ' (active)' : '';
      const persona = this.personaManager.getPersona(name);
      this.options.outputFn(`  ${name}${marker}`);
      if (persona) {
        this.options.outputFn(`    ${persona.getDescription()}`);
      }
    }
    this.options.outputFn('\nUse "persona <name>" to switch');
    this.options.outputFn('');
  }

  /**
   * Get session history from UOCS
   * @returns Session transcript if available
   */
  async getUOCSHistory(): Promise<SessionTranscript | null> {
    if (!this.session || !this.uocsSessionStarted) {
      return null;
    }

    try {
      const uocs = this.bridge.getOrchestrator().getUOCS();
      return await uocs.getSessionTranscript(this.session.getId());
    } catch {
      return null;
    }
  }

  /**
   * Get learnings from UOCS for a topic
   * @param topic - Topic to search for
   * @returns Array of learnings matching the topic
   */
  async searchLearnings(topic: string): Promise<Learning[]> {
    if (!this.uocsSessionStarted) {
      return [];
    }

    try {
      const uocs = this.bridge.getOrchestrator().getUOCS();
      return await uocs.searchLearnings(topic);
    } catch {
      return [];
    }
  }

  /**
   * Capture a decision in UOCS
   * @param question - The question being decided
   * @param decision - The decision made
   * @param reasoning - The reasoning behind the decision
   * @param alternatives - Alternative options considered
   * @returns The captured decision or null on failure
   */
  async captureDecision(
    question: string,
    decision: string,
    reasoning: string,
    alternatives?: string[]
  ): Promise<Decision | null> {
    if (!this.session || !this.uocsSessionStarted) {
      return null;
    }

    try {
      const uocs = this.bridge.getOrchestrator().getUOCS();
      return await uocs.captureDecision(
        this.session.getId(),
        question,
        decision,
        reasoning,
        alternatives
      );
    } catch {
      return null;
    }
  }

  /**
   * Capture a learning in UOCS
   * @param topic - The topic of the learning
   * @param insight - The insight gained
   * @param confidence - Confidence level (0-1)
   * @param source - Source of the learning
   * @returns The captured learning or null on failure
   */
  async captureLearning(
    topic: string,
    insight: string,
    confidence?: number,
    source?: string
  ): Promise<Learning | null> {
    if (!this.session || !this.uocsSessionStarted) {
      return null;
    }

    try {
      const uocs = this.bridge.getOrchestrator().getUOCS();
      return await uocs.captureLearning(this.session.getId(), topic, insight, confidence, source);
    } catch {
      return null;
    }
  }

  /**
   * Check if UOCS session is active
   * @returns true if UOCS session is started
   */
  isUOCSSessionActive(): boolean {
    return this.uocsSessionStarted;
  }

  /**
   * Exit interactive mode and save session
   * Properly ends UOCS session via StopHook
   */
  async exit(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.options.outputFn('\nSaving session...');

    // End UOCS session via StopHook if active
    if (this.uocsSessionStarted && this.session) {
      try {
        const orchestrator = this.bridge.getOrchestrator();
        const stopHook = orchestrator.getStopHook();
        await stopHook.execute({
          sessionId: this.session.getId(),
          agentId: undefined,
          reason: 'complete',
          finalOutput: `Session ended with ${this.session.getTurnCount()} turns`,
        });
        this.uocsSessionStarted = false;
      } catch (error) {
        this.options.outputFn(
          `[Warning] Failed to end UOCS session: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

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

    // Shutdown orchestrator bridge
    try {
      await this.bridge.shutdown();
    } catch {
      // Ignore shutdown errors
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
   * Get the orchestrator bridge
   * @returns Orchestrator bridge
   */
  getBridge(): OrchestratorBridge {
    return this.bridge;
  }

  /**
   * Register a SessionStart hook with CoreManager and PrepromptInjector
   * @param coreManager - Core manager for loading context
   * @param prepromptInjector - Preprompt injector for system prompts
   */
  registerSessionStartHook(coreManager: CoreManager, prepromptInjector: PrepromptInjector): void {
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
