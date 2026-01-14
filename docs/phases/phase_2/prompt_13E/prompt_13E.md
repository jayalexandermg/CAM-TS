PROMPT 13E: CLI Integration & Entry Point
Phase: 3 (CLI + Persona)
Status: 🆕 NEW - Final integration
Time Estimate: 2-3 hours
Priority: CRITICAL
Dependencies: PROMPT 13A, 13B, 13C, 13D complete
Parallel: ❌ Must run after Wave 1

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Integrate all CLI components and create entry point with interactive mode.

After this prompt:

✅ CLI entry point working
✅ Interactive REPL working
✅ All commands registered
✅ SessionStart hook integration
✅ 20-25 new tests
📦 REQUIREMENTS

1. Update CLI Entry Point
   Modify src/cli/index.ts (created by 13A):

typescript
Copy
#!/usr/bin/env node

import { CommandRouter } from './CommandRouter';
import { CommandParser } from './CommandParser';
import { HelpCommand } from './commands/HelpCommand';
import { VersionCommand } from './commands/VersionCommand';
import { InitCommand } from './commands/InitCommand';
import { InteractiveMode } from './InteractiveMode';
import { SessionManager } from './SessionManager';
import { PersonaManager } from '../persona/PersonaManager';
import { HookManager } from '../hooks/HookManager';

async function main() {
try {
const args = process.argv.slice(2);

    // If no arguments, start interactive mode
    if (args.length === 0) {
      const sessionManager = new SessionManager();
      const personaManager = new PersonaManager();
      const hookManager = new HookManager();
      const router = createRouter();

      const interactive = new InteractiveMode(
        router,
        sessionManager,
        personaManager,
        hookManager
      );

      await interactive.start();
      return;
    }

    // Parse and route command
    const parser = new CommandParser(args);
    const command = parser.parse();

    const router = createRouter();
    const result = await router.route(command);

    if (result.output) {
      console.log(result.output);
    }

    if (result.error) {
      console.error(result.error);
    }

    process.exit(result.exitCode);

} catch (error) {
console.error('Error:', error instanceof Error ? error.message : String(error));
process.exit(1);
}
}

function createRouter(): CommandRouter {
const router = new CommandRouter();

router.register('help', new HelpCommand());
router.register('version', new VersionCommand());
router.register('init', new InitCommand());

return router;
}

main(); 2. Create InteractiveMode
Create src/cli/InteractiveMode.ts:

typescript
Copy
import \* as readline from 'readline';
import { CommandRouter } from './CommandRouter';
import { SessionManager } from './SessionManager';
import { Session } from './Session';
import { PersonaManager } from '../persona/PersonaManager';
import { HookManager } from '../hooks/HookManager';
import { SessionStartEvent } from '../hooks/types';

export class InteractiveMode {
private router: CommandRouter;
private sessionManager: SessionManager;
private personaManager: PersonaManager;
private hookManager: HookManager;
private session?: Session;
private readline?: readline.Interface;

constructor(
router: CommandRouter,
sessionManager: SessionManager,
personaManager: PersonaManager,
hookManager: HookManager
) {
this.router = router;
this.sessionManager = sessionManager;
this.personaManager = personaManager;
this.hookManager = hookManager;
}

async start(): Promise<void> {
// Create new session
this.session = this.sessionManager.createSession();

    // Load personas
    await this.personaManager.loadPersonas();

    // Trigger SessionStart hook
    const event: SessionStartEvent = {
      type: 'session_start',
      sessionId: this.session.getId(),
      timestamp: new Date()
    };

    try {
      await this.hookManager.executeHook('SessionStart', event);
    } catch (error) {
      console.warn('SessionStart hook failed:', error);
    }

    // Display welcome
    this.displayWelcome();

    // Start REPL
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'cam> '
    });

    this.readline.prompt();

    this.readline.on('line', async (input) => {
      await this.processInput(input.trim());
      this.readline!.prompt();
    });

    this.readline.on('close', async () => {
      await this.exit();
    });

}

private displayWelcome(): void {
console.log('CAM - Context-Aware Memory System');
console.log('Type "help" for available commands, "exit" to quit\n');
}

private async processInput(input: string): Promise<void> {
if (!input) {
return;
}

    // Handle exit
    if (input === 'exit' || input === 'quit') {
      this.readline?.close();
      return;
    }

    // Handle clear
    if (input === 'clear') {
      console.clear();
      this.displayWelcome();
      return;
    }

    // Handle history
    if (input === 'history') {
      this.displayHistory();
      return;
    }

    try {
      // Parse and route command
      const args = input.split(' ');
      const parser = new (require('./CommandParser').CommandParser)(args);
      const command = parser.parse();

      const result = await this.router.route(command);

      if (result.output) {
        console.log(result.output);
      }

      if (result.error) {
        console.error(result.error);
      }

      // Add to session history
      this.session?.addTurn(input, result.output || result.error || '');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }

}

private displayHistory(): void {
const history = this.session?.getHistory() || [];

    if (history.length === 0) {
      console.log('No history yet');
      return;
    }

    console.log('\nSession History:');
    for (let i = 0; i < history.length; i++) {
      const turn = history[i];
      console.log(`\n[${i + 1}] ${turn.timestamp.toLocaleTimeString()}`);
      console.log(`> ${turn.input}`);
      if (turn.output) {
        console.log(turn.output);
      }
    }
    console.log();

}

private async exit(): Promise<void> {
console.log('\nSaving session...');

    // End session
    this.session?.end();

    // Save session
    try {
      await this.session?.save();
      console.log('Session saved');
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    console.log('Goodbye!');
    process.exit(0);

}
} 3. Update package.json
Modify package.json:

json
Copy
{
"bin": {
"cam": "./dist/cli/index.js"
},
"scripts": {
"build": "tsc",
"build:cli": "tsc && chmod +x dist/cli/index.js",
"test": "jest",
"dev": "ts-node src/cli/index.ts"
}
}
📁 FILES TO CREATE/MODIFY
CREATE:
src/cli/InteractiveMode.ts
tests/cli/InteractiveMode.test.ts (15-20 tests)
tests/cli/integration.test.ts (5-10 tests)
MODIFY:
src/cli/index.ts (add interactive mode)
package.json (add bin entry)
Total: 5 files, 20-30 tests

✅ SUCCESS CRITERIA
✅ CLI entry point working
✅ Interactive REPL working
✅ All commands registered
✅ SessionStart hook fires
✅ Can run cam to start REPL
✅ Can run cam help
✅ Can run cam version
✅ Can run cam init
✅ 20-30 tests passing
✅ No TypeScript errors
END OF PROMPT 13E
