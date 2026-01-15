import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { StopHook, StopContext } from '../../src/hooks/StopHook';
import { UOCS } from '../../src/history/UOCS';
import { HistoryStorage } from '../../src/history/HistoryStorage';

describe('StopHook', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-stop-hook');
  let storage: HistoryStorage;
  let uocs: UOCS;
  let hook: StopHook;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.promises.rm(testBasePath, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(testBasePath, { recursive: true });
    storage = new HistoryStorage(testBasePath);
    uocs = new UOCS(storage);
    await uocs.initialize();
    hook = new StopHook(uocs);
  });

  const createStopContext = (overrides: Partial<StopContext> = {}): StopContext => ({
    sessionId: 'test-session-123',
    reason: 'complete',
    ...overrides
  });

  // =========================================================================
  // Hook Properties Tests
  // =========================================================================

  describe('properties', () => {
    it('should have correct name', () => {
      expect(hook.name).toBe('Stop');
    });

    it('should return UOCS instance', () => {
      expect(hook.getUOCS()).toBe(uocs);
    });

    it('should allow setting UOCS instance', () => {
      const newUocs = new UOCS();
      hook.setUOCS(newUocs);
      expect(hook.getUOCS()).toBe(newUocs);
    });

    it('should create with default UOCS if none provided', () => {
      const defaultHook = new StopHook();
      expect(defaultHook.getUOCS()).toBeDefined();
    });
  });

  // =========================================================================
  // Execute Tests - Session Ending
  // =========================================================================

  describe('execute - session ending', () => {
    it('should end session in UOCS', async () => {
      uocs.startSession('session-to-end');
      const context = createStopContext({ sessionId: 'session-to-end' });

      await hook.execute(context);

      const activeIds = uocs.getActiveSessionIds();
      expect(activeIds).not.toContain('session-to-end');
    });

    it('should end session with summary', async () => {
      uocs.startSession('session-with-summary');
      const context = createStopContext({
        sessionId: 'session-with-summary',
        summary: 'Task completed successfully'
      });

      await hook.execute(context);

      const transcript = await storage.getSessionTranscript('session-with-summary');
      expect(transcript?.summary).toBe('Task completed successfully');
    });

    it('should return success result on successful execution', async () => {
      uocs.startSession('success-session');
      const context = createStopContext({ sessionId: 'success-session' });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.sessionEnded).toBe(true);
      expect(result.data?.reason).toBe('complete');
    });

    it('should return duration in result', async () => {
      uocs.startSession('duration-session');
      const context = createStopContext({ sessionId: 'duration-session' });

      const result = await hook.execute(context);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Execute Tests - Final Output Capture
  // =========================================================================

  describe('execute - final output capture', () => {
    it('should capture final output if provided', async () => {
      uocs.startSession('output-session');

      let capturedEntry: unknown = null;
      uocs.on('outputCaptured', (entry) => {
        capturedEntry = entry;
      });

      const context = createStopContext({
        sessionId: 'output-session',
        finalOutput: 'Final task output'
      });

      await hook.execute(context);

      expect(capturedEntry).not.toBeNull();
      expect((capturedEntry as { content: string }).content).toBe('Final task output');
    });

    it('should capture final output with metadata', async () => {
      uocs.startSession('metadata-session');

      let capturedEntry: unknown = null;
      uocs.on('outputCaptured', (entry) => {
        capturedEntry = entry;
      });

      const context = createStopContext({
        sessionId: 'metadata-session',
        reason: 'user_exit',
        finalOutput: 'User exited'
      });

      await hook.execute(context);

      expect((capturedEntry as { metadata: Record<string, unknown> }).metadata?.reason).toBe('user_exit');
      expect((capturedEntry as { metadata: Record<string, unknown> }).metadata?.final).toBe(true);
    });

    it('should not capture output if not provided', async () => {
      uocs.startSession('no-output-session');

      let outputCaptured = false;
      uocs.on('outputCaptured', () => {
        outputCaptured = true;
      });

      const context = createStopContext({ sessionId: 'no-output-session' });

      await hook.execute(context);

      expect(outputCaptured).toBe(false);
    });

    it('should include agentId in output if provided', async () => {
      uocs.startSession('agent-output-session');

      let capturedEntry: unknown = null;
      uocs.on('outputCaptured', (entry) => {
        capturedEntry = entry;
      });

      const context = createStopContext({
        sessionId: 'agent-output-session',
        agentId: 'main-agent',
        finalOutput: 'Agent output'
      });

      await hook.execute(context);

      expect((capturedEntry as { agentId: string }).agentId).toBe('main-agent');
    });
  });

  // =========================================================================
  // Execute Tests - Stop Reasons
  // =========================================================================

  describe('execute - stop reasons', () => {
    it('should handle user_exit reason', async () => {
      uocs.startSession('user-exit-session');
      const context = createStopContext({
        sessionId: 'user-exit-session',
        reason: 'user_exit'
      });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.reason).toBe('user_exit');
    });

    it('should handle timeout reason', async () => {
      uocs.startSession('timeout-session');
      const context = createStopContext({
        sessionId: 'timeout-session',
        reason: 'timeout'
      });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.reason).toBe('timeout');
    });

    it('should handle error reason', async () => {
      uocs.startSession('error-session');
      const context = createStopContext({
        sessionId: 'error-session',
        reason: 'error'
      });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.reason).toBe('error');
    });

    it('should handle complete reason', async () => {
      uocs.startSession('complete-session');
      const context = createStopContext({
        sessionId: 'complete-session',
        reason: 'complete'
      });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.reason).toBe('complete');
    });
  });

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe('error handling', () => {
    it('should return error result on UOCS failure', async () => {
      // Create a mock UOCS that throws
      const failingUocs = {
        endSession: jest.fn().mockRejectedValue(new Error('Storage failure')),
        captureOutput: jest.fn()
      } as unknown as UOCS;

      hook.setUOCS(failingUocs);
      const context = createStopContext();

      const result = await hook.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Storage failure');
    });

    it('should handle non-existent session gracefully', async () => {
      const context = createStopContext({ sessionId: 'non-existent-session' });

      const result = await hook.execute(context);

      expect(result.success).toBe(true);
    });

    it('should include duration even on error', async () => {
      const failingUocs = {
        endSession: jest.fn().mockRejectedValue(new Error('Test error')),
        captureOutput: jest.fn()
      } as unknown as UOCS;

      hook.setUOCS(failingUocs);
      const context = createStopContext();

      const result = await hook.execute(context);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
