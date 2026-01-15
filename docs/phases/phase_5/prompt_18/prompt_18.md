 PROMPT 18: History Integration
  Phase: 5 (History & Hooks) - FINAL
  Sequential: Must run after 17A, 17B, 17C

  ⚠️ PACKAGE MANAGER: PNPM ONLY
  📋 OBJECTIVE
  Integrate History system with Orchestrator and all hooks.

  📦 REQUIREMENTS
  1. Update Orchestrator to use UOCS
  Update src/orchestrator/Orchestrator.ts:

  typescript
  Copy
  // Add import
  import { UOCS } from '../history/UOCS';
  import { PostToolUseHook } from '../hooks/PostToolUseHook';
  import { StopHook } from '../hooks/StopHook';
  import { SubagentStopHook } from '../hooks/SubagentStopHook';

  // Add to class properties
  private uocs: UOCS;
  private postToolUseHook: PostToolUseHook;
  private stopHook: StopHook;
  private subagentStopHook: SubagentStopHook;

  // In constructor, add:
  this.uocs = new UOCS();
  this.postToolUseHook = new PostToolUseHook(this.uocs);
  this.stopHook = new StopHook(this.uocs);
  this.subagentStopHook = new SubagentStopHook(this.uocs);

  // Initialize UOCS
  await this.uocs.initialize();

  // Add method to start session tracking
  async startSession(sessionId: string): Promise<void> {
  this.uocs.startSession(sessionId);
  }

  // Update shutdown to use StopHook
  async shutdown(): Promise<void> {
  // End all active sessions
  for (const sessionId of this.uocs.getActiveSessionIds()) {
  await this.stopHook.execute({
  sessionId,
  agentId: undefined,
  timestamp: new Date(),
  reason: 'complete'
  });
  }

  // ... rest of shutdown
  }

  // Add getter
  getUOCS(): UOCS {
  return this.uocs;
  }
  2. Integration Tests
  Create tests/integration/history-integration.test.ts:

  typescript
  Copy
  import { Orchestrator } from '../../src/orchestrator/Orchestrator';
  import { UOCS } from '../../src/history/UOCS';

  describe('History Integration', () => {
  let orchestrator: Orchestrator;

  beforeEach(async () => {
  orchestrator = new Orchestrator();
  });

  afterEach(async () => {
  await orchestrator.shutdown();
  });

  it('should capture session transcripts', async () => {
  const sessionId = 'history-test-1';
  await orchestrator.startSession(sessionId);

  await orchestrator.process({
  input: 'Hello',
  sessionId
  });

  const uocs = orchestrator.getUOCS();
  const transcript = await uocs.getSessionTranscript(sessionId);

  expect(transcript).toBeDefined();
  expect(transcript?.turns.length).toBeGreaterThan(0);
  });

  it('should capture outputs', async () => {
  const sessionId = 'history-test-2';

  await orchestrator.process({
  input: 'Test message',
  sessionId
  });

  // Outputs should be captured
  const uocs = orchestrator.getUOCS();
  expect(uocs.getActiveSessionIds()).toContain(sessionId);
  });

  // Add more integration tests...
  });
  📁 FILES TO CREATE/UPDATE
  Update src/orchestrator/Orchestrator.ts
  tests/integration/history-integration.test.ts (10-15 tests)
  Total: 2 files, 10-15 tests

  ✅ SUCCESS CRITERIA
  ✅ Orchestrator uses UOCS
  ✅ All hooks integrated
  ✅ Session transcripts captured
  ✅ 10-15 tests passing
  END OF PROMPT 18 
