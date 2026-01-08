import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  HookEventEmitter,
  CaptureAllHandler,
  StopHandler,
  SubagentStopHandler,
  SessionSummaryHandler,
  HookEvent,
  EventType,
} from '../../../src/hooks';
import { FileOperations } from '../../../src/memory/file-operations';
import { DirectoryOperations } from '../../../src/memory/directory-operations';
import { PathValidator } from '../../../src/memory/path-validator';

describe('Hook System Integration', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let emitter: HookEventEmitter;

  let captureAllHandler: CaptureAllHandler;
  let stopHandler: StopHandler;
  let subagentStopHandler: SubagentStopHandler;
  let sessionSummaryHandler: SessionSummaryHandler;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hook-integration-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);

    emitter = new HookEventEmitter();

    captureAllHandler = new CaptureAllHandler(fileOperations, directoryOperations);
    stopHandler = new StopHandler(fileOperations, directoryOperations);
    subagentStopHandler = new SubagentStopHandler(fileOperations, directoryOperations);
    sessionSummaryHandler = new SessionSummaryHandler(fileOperations, directoryOperations);

    emitter.registerHandler(captureAllHandler);
    emitter.registerHandler(stopHandler);
    emitter.registerHandler(subagentStopHandler);
    emitter.registerHandler(sessionSummaryHandler);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('Full System Test', () => {
    it('should register all 4 handlers', () => {
      expect(emitter.getHandlerCount()).toBe(4);
      expect(emitter.hasHandler('capture-all')).toBe(true);
      expect(emitter.hasHandler('stop')).toBe(true);
      expect(emitter.hasHandler('subagent-stop')).toBe(true);
      expect(emitter.hasHandler('session-summary')).toBe(true);
    });

    it('should emit CAPTURE_ALL event to capture-all handler only', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: 'Capture all event',
        metadata: {},
      };

      await emitter.emit(event);

      // Should be in capture-all log
      const captureAllPath = captureAllHandler.getCurrentFilePath();
      expect(captureAllPath).not.toBeNull();

      // Should NOT be in other logs
      expect(stopHandler.getCurrentFilePath()).toBeNull();
      expect(subagentStopHandler.getCurrentFilePath('any')).toBeNull();
      expect(sessionSummaryHandler.getCurrentFilePath()).toBeNull();
    });

    it('should emit STOP event to stop and capture-all handlers', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.STOP,
        content: 'Agent stopped',
        metadata: { reason: 'completed' },
      };

      await emitter.emit(event);

      // Should be in both capture-all and stop logs
      expect(captureAllHandler.getCurrentFilePath()).not.toBeNull();
      expect(stopHandler.getCurrentFilePath()).not.toBeNull();
    });

    it('should emit SUBAGENT_STOP event to subagent and capture-all handlers', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.SUBAGENT_STOP,
        content: 'Subagent completed',
        metadata: { agentId: 'test-subagent' },
      };

      await emitter.emit(event);

      expect(captureAllHandler.getCurrentFilePath()).not.toBeNull();
      expect(subagentStopHandler.getCurrentFilePath('test-subagent')).not.toBeNull();
    });

    it('should emit SESSION_SUMMARY event to session and capture-all handlers', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.SESSION_SUMMARY,
        content: 'Session summary',
        metadata: { sessionId: 'session-1', durationMs: 60000 },
      };

      await emitter.emit(event);

      expect(captureAllHandler.getCurrentFilePath()).not.toBeNull();
      expect(sessionSummaryHandler.getCurrentFilePath()).not.toBeNull();
    });
  });

  describe('Directory Structure', () => {
    it('should create correct directory structure', async () => {
      // Emit one of each event type
      await emitter.emit({
        timestamp: new Date().toISOString(),
        type: EventType.STOP,
        content: 'Stop event',
        metadata: {},
      });

      await emitter.emit({
        timestamp: new Date().toISOString(),
        type: EventType.SUBAGENT_STOP,
        content: 'Subagent stop',
        metadata: { agentId: 'researcher' },
      });

      await emitter.emit({
        timestamp: new Date().toISOString(),
        type: EventType.SESSION_SUMMARY,
        content: 'Session done',
        metadata: { sessionId: 's1' },
      });

      // Verify directories were created
      expect(await directoryOperations.directoryExists('history/execution')).toBe(true);
      expect(await directoryOperations.directoryExists('history/sessions')).toBe(true);
      expect(await directoryOperations.directoryExists('agents/researcher')).toBe(true);
    });
  });

  describe('JSONL Format Verification', () => {
    it('should write valid JSONL across all handlers', async () => {
      // Emit multiple events
      for (let i = 0; i < 5; i++) {
        await emitter.emit({
          timestamp: new Date().toISOString(),
          type: EventType.STOP,
          content: `Event ${i}`,
          metadata: { index: i },
        });
      }

      const filePath = stopHandler.getCurrentFilePath()!;
      const content = await fileOperations.readFile(filePath);
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(5);

      // Each line should be valid JSON
      lines.forEach((line, index) => {
        const parsed = JSON.parse(line);
        expect(parsed.content).toBe(`Event ${index}`);
        expect(parsed.metadata.index).toBe(index);
      });
    });
  });

  describe('Metadata Preservation', () => {
    it('should preserve all metadata through the pipeline', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.SESSION_SUMMARY,
        content: 'Complex session',
        metadata: {
          sessionId: 'session-complex',
          durationMs: 123456,
          tasksCompleted: ['task1', 'task2', 'task3'],
          agentId: 'main-agent',
          projectId: 'project-x',
          tags: ['important', 'milestone'],
          customData: {
            nested: {
              deep: 'value',
            },
          },
        },
      };

      await emitter.emit(event);

      const filePath = sessionSummaryHandler.getCurrentFilePath()!;
      const content = await fileOperations.readFile(filePath);
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.sessionId).toBe('session-complex');
      expect(parsed.metadata.durationMs).toBe(123456);
      expect(parsed.metadata.tasksCompleted).toEqual(['task1', 'task2', 'task3']);
      expect(parsed.metadata.agentId).toBe('main-agent');
      expect(parsed.metadata.projectId).toBe('project-x');
      expect(parsed.metadata.tags).toEqual(['important', 'milestone']);
      expect(parsed.metadata.customData.nested.deep).toBe('value');
    });
  });

  describe('Error Handling', () => {
    it('should continue to other handlers when one fails', async () => {
      // Create a handler that always fails
      const failingHandler = {
        name: 'failing-handler',
        eventType: EventType.STOP,
        handle: jest.fn().mockRejectedValue(new Error('Intentional failure')),
      };

      emitter.registerHandler(failingHandler);

      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.STOP,
        content: 'Test event',
        metadata: {},
      };

      // Use emitSafe to not throw
      const errors = await emitter.emitSafe(event);

      // One handler should have failed
      expect(errors).toHaveLength(1);
      expect(errors[0].handlerName).toBe('failing-handler');

      // Other handlers should have succeeded
      expect(captureAllHandler.getCurrentFilePath()).not.toBeNull();
      expect(stopHandler.getCurrentFilePath()).not.toBeNull();
    });
  });

  describe('Multiple Subagents', () => {
    it('should handle multiple subagents with separate logs', async () => {
      const agents = ['researcher', 'coder', 'reviewer', 'tester'];

      for (const agentId of agents) {
        await emitter.emit({
          timestamp: new Date().toISOString(),
          type: EventType.SUBAGENT_STOP,
          content: `${agentId} completed`,
          metadata: { agentId },
        });
      }

      // Each agent should have its own file
      for (const agentId of agents) {
        const filePath = subagentStopHandler.getCurrentFilePath(agentId);
        expect(filePath).not.toBeNull();
        expect(filePath).toContain(`agents/${agentId}`);

        const content = await fileOperations.readFile(filePath!);
        const parsed = JSON.parse(content.trim());
        expect(parsed.metadata.agentId).toBe(agentId);
      }
    });
  });

  describe('Concurrent Events', () => {
    it('should handle concurrent event emissions', async () => {
      const events = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        type: EventType.CAPTURE_ALL,
        content: `Concurrent event ${i}`,
        metadata: { index: i },
      }));

      // Emit all events concurrently
      await Promise.all(events.map((event) => emitter.emit(event)));

      const filePath = captureAllHandler.getCurrentFilePath()!;
      const content = await fileOperations.readFile(filePath);
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(20);
    });
  });
});
