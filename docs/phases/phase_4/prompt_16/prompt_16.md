PROMPT 16: Integration & Testing
Phase: 4 (Orchestrator) - FINAL
Status: 🆕 NEW - Ties everything together
Time Estimate: 15-20 minutes (at your pace!)
Priority: CRITICAL
Dependencies: PROMPT 15 complete

⚠️ PACKAGE MANAGER: PNPM ONLY
📋 OBJECTIVE
Create end-to-end integration tests and wire CLI to Orchestrator.

After this prompt:

✅ CLI connected to Orchestrator
✅ End-to-end request flow working
✅ Integration tests
✅ CAM MVP COMPLETE! 🎉
📦 REQUIREMENTS
1. CLI-Orchestrator Bridge
Create src/cli/OrchestratorBridge.ts:

typescript
Copy
import { Orchestrator } from '../orchestrator/Orchestrator';
import { TaskRequest, TaskResult } from '../orchestrator/types';
import { Session } from './Session';

export class OrchestratorBridge {
  private orchestrator: Orchestrator;

  constructor(orchestrator?: Orchestrator) {
    this.orchestrator = orchestrator || new Orchestrator();
  }

  async processInput(
    input: string,
    session: Session
  ): Promise<string> {
    const request: TaskRequest = {
      input,
      sessionId: session.getId(),
      context: {
        persona: session.getPersona(),
        turnCount: session.getTurnCount()
      }
    };

    const result = await this.orchestrator.process(request);

    // Add to session history
    session.addTurn({
      role: 'user',
      content: input,
      timestamp: new Date()
    });

    if (result.success && result.output) {
      session.addTurn({
        role: 'assistant',
        content: result.output,
        timestamp: new Date()
      });
      return result.output;
    } else {
      const errorMessage = result.error?.message || 'Unknown error';
      session.addTurn({
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date()
      });
      return `Error: ${errorMessage}`;
    }
  }

  getOrchestrator(): Orchestrator {
    return this.orchestrator;
  }

  async shutdown(): Promise<void> {
    await this.orchestrator.shutdown();
  }
}
2. Update InteractiveMode
Update src/cli/InteractiveMode.ts to use OrchestratorBridge:

typescript
Copy
// Add to imports
import { OrchestratorBridge } from './OrchestratorBridge';

// Add to class properties
private bridge: OrchestratorBridge;

// In constructor, add:
this.bridge = new OrchestratorBridge();

// Update processUserInput method to use bridge for non-command inputs:
private async processUserInput(input: string): Promise<void> {
  // Check if it's a built-in command first
  if (this.isBuiltInCommand(input)) {
    await this.handleBuiltInCommand(input);
    return;
  }

  // Process through orchestrator
  try {
    const response = await this.bridge.processInput(input, this.session);
    console.log(`\n${response}\n`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
  }
}

// Add helper method
private isBuiltInCommand(input: string): boolean {
  const commands = ['help', 'version', 'history', 'clear', 'exit', 'quit'];
  return commands.includes(input.toLowerCase().trim());
}
3. Integration Tests
Create tests/integration/orchestrator-flow.test.ts:

typescript
Copy
import { Orchestrator } from '../../src/orchestrator/Orchestrator';
import { TaskRequest } from '../../src/orchestrator/types';

describe('Orchestrator Integration', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('End-to-End Flow', () => {
    it('should process a simple request', async () => {
      const request: TaskRequest = {
        input: 'Hello, how are you?',
        sessionId: 'test-session-1'
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.taskId).toBeDefined();
    });

    it('should spawn an agent for the request', async () => {
      const request: TaskRequest = {
        input: 'Help me with coding',
        sessionId: 'test-session-2'
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(true);
      expect(result.metadata.agentId).toBeDefined();
    });

    it('should handle multiple requests in sequence', async () => {
      const sessionId = 'test-session-3';

      const result1 = await orchestrator.process({
        input: 'First message',
        sessionId
      });

      const result2 = await orchestrator.process({
        input: 'Second message',
        sessionId
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reject invalid input', async () => {
      const request: TaskRequest = {
        input: '<script>alert("xss")</script>',
        sessionId: 'test-session-4'
      };

      const result = await orchestrator.process(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track orchestrator state', async () => {
      await orchestrator.process({
        input: 'Test message',
        sessionId: 'test-session-5'
      });

      const state = orchestrator.getState();

      expect(state.completedTasks).toBeGreaterThanOrEqual(1);
      expect(state.uptime).toBeGreaterThan(0);
    });
  });

  describe('Component Integration', () => {
    it('should integrate with TaskManager', async () => {
      const taskManager = orchestrator.getTaskManager();

      await orchestrator.process({
        input: 'Test',
        sessionId: 'test-session-6'
      });

      const stats = taskManager.getStats();
      expect(stats.completed).toBeGreaterThanOrEqual(1);
    });

    it('should integrate with SecurityManager', async () => {
      const securityManager = orchestrator.getSecurityManager();
      const usage = securityManager.getResourceUsage();

      expect(usage).toBeDefined();
      expect(usage.agentCount).toBeGreaterThanOrEqual(0);
    });

    it('should integrate with AgentSpawner', async () => {
      const spawner = orchestrator.getAgentSpawner();
      const definitions = spawner.listAgentDefinitions();

      expect(definitions).toContain('default');
      expect(definitions).toContain('researcher');
      expect(definitions).toContain('coder');
    });
  });
});
Create tests/integration/cli-orchestrator.test.ts:

typescript
Copy
import { OrchestratorBridge } from '../../src/cli/OrchestratorBridge';
import { Session } from '../../src/cli/Session';

describe('CLI-Orchestrator Integration', () => {
  let bridge: OrchestratorBridge;
  let session: Session;

  beforeEach(() => {
    bridge = new OrchestratorBridge();
    session = new Session({ id: 'test-cli-session' });
  });

  afterEach(async () => {
    await bridge.shutdown();
  });

  it('should process input through orchestrator', async () => {
    const response = await bridge.processInput('Hello', session);

    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
  });

  it('should add turns to session history', async () => {
    await bridge.processInput('Test message', session);

    const history = session.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2); // user + assistant
  });

  it('should handle errors gracefully', async () => {
    // Force an error by using invalid input
    const response = await bridge.processInput(
      '<script>malicious</script>',
      session
    );

    expect(response).toContain('Error');
  });

  it('should pass session context to orchestrator', async () => {
    session.setPersona('researcher');

    const response = await bridge.processInput('Research AI', session);

    expect(response).toBeDefined();
  });
});
4. Update Exports
Update src/cli/index.ts:

typescript
Copy
export * from './types';
export * from './Session';
export * from './SessionManager';
export * from './Persona';
export * from './PersonaManager';
export * from './CommandParser';
export * from './CommandRouter';
export * from './InteractiveMode';
export * from './OrchestratorBridge';
export * from './commands';
📁 FILES TO CREATE/UPDATE
src/cli/OrchestratorBridge.ts (NEW)
src/cli/InteractiveMode.ts (UPDATE)
src/cli/index.ts (UPDATE)
tests/integration/orchestrator-flow.test.ts (NEW)
tests/integration/cli-orchestrator.test.ts (NEW)
Total: 5 files, 15-20 tests

✅ SUCCESS CRITERIA
✅ OrchestratorBridge connects CLI to Orchestrator
✅ InteractiveMode uses bridge for non-command input
✅ End-to-end flow working
✅ Integration tests passing
✅ 15-20 tests passing
✅ No TypeScript errors
END OF PROMPT 16
