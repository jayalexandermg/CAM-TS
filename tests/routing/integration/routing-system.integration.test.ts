import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  HookEventEmitter,
  RoutingHandler,
  createCaptureAllRoutingHandler,
  HookEvent,
  EventType,
} from '../../../src/hooks';
import { ContentRouter, ContentClassifier, TaskType } from '../../../src/routing';
import { FileOperations } from '../../../src/memory/file-operations';
import { DirectoryOperations } from '../../../src/memory/directory-operations';
import { PathValidator } from '../../../src/memory/path-validator';

describe('Routing System Integration', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let classifier: ContentClassifier;
  let router: ContentRouter;
  let emitter: HookEventEmitter;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'routing-integration-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    classifier = new ContentClassifier();
    router = new ContentRouter(classifier, fileOperations, directoryOperations);
    emitter = new HookEventEmitter();
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const createEvent = (
    content: string,
    type: EventType = EventType.CAPTURE_ALL,
    metadata: Record<string, unknown> = {}
  ): HookEvent => ({
    timestamp: new Date().toISOString(),
    type,
    content,
    metadata,
  });

  describe('End-to-End Routing', () => {
    it('should route event with full metadata to multiple destinations', async () => {
      const handler = createCaptureAllRoutingHandler(router);
      emitter.registerHandler(handler);

      const event = createEvent('Implementing authentication system', EventType.CAPTURE_ALL, {
        projectId: 'auth-service',
        agentId: 'coder-agent',
        tags: ['security', 'feature'],
      });

      await emitter.emit(event);

      // Verify destinations
      const result = handler.getLastRoutingResult();
      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);

      // Should have routed to: history, project, agent, task
      expect(result!.destinations.length).toBeGreaterThanOrEqual(4);

      // Verify directories created
      expect(await directoryOperations.directoryExists('history/execution')).toBe(true);
      expect(await directoryOperations.directoryExists('projects/auth-service')).toBe(true);
      expect(await directoryOperations.directoryExists('agents/coder-agent')).toBe(true);
      expect(await directoryOperations.directoryExists('tasks/coding')).toBe(true);
    });

    it('should classify event correctly', async () => {
      const handler = createCaptureAllRoutingHandler(router);
      emitter.registerHandler(handler);

      const event = createEvent('Need to research and investigate the API behavior', EventType.CAPTURE_ALL, {
        projectId: 'api-docs',
      });

      await emitter.emit(event);

      const result = handler.getLastRoutingResult();
      expect(result!.classification.projectId).toBe('api-docs');
      expect(result!.classification.taskType).toBe(TaskType.RESEARCH);
    });

    it('should write valid JSONL to all destinations', async () => {
      const handler = createCaptureAllRoutingHandler(router);
      emitter.registerHandler(handler);

      const event = createEvent('Test event', EventType.CAPTURE_ALL, {
        projectId: 'test-project',
      });

      await emitter.emit(event);

      const result = handler.getLastRoutingResult();

      for (const dest of result!.destinations) {
        const filePath = `${dest.directory}/${dest.filename}`;
        const content = await fileOperations.readFile(filePath);
        const lines = content.trim().split('\n');

        for (const line of lines) {
          expect(() => JSON.parse(line)).not.toThrow();
          const parsed = JSON.parse(line);
          expect(parsed.content).toBe('Test event');
        }
      }
    });

    it('should preserve event metadata through routing', async () => {
      const handler = createCaptureAllRoutingHandler(router);
      emitter.registerHandler(handler);

      const originalMetadata = {
        projectId: 'my-project',
        agentId: 'my-agent',
        customField: 'custom-value',
        nested: { deep: 'data' },
      };

      const event = createEvent('Event with metadata', EventType.CAPTURE_ALL, originalMetadata);

      await emitter.emit(event);

      const result = handler.getLastRoutingResult();
      const historyDest = result!.destinations.find((d) => d.directory.includes('history'));
      const filePath = `${historyDest!.directory}/${historyDest!.filename}`;
      const content = await fileOperations.readFile(filePath);
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.projectId).toBe('my-project');
      expect(parsed.metadata.agentId).toBe('my-agent');
      expect(parsed.metadata.customField).toBe('custom-value');
      expect(parsed.metadata.nested.deep).toBe('data');
    });
  });

  describe('Directory Structure', () => {
    it('should create UFC directory structure', async () => {
      const handler = createCaptureAllRoutingHandler(router);

      // Events for different projects/agents/tasks with explicit task type keywords
      const events = [
        createEvent('Implementing and building new feature', EventType.CAPTURE_ALL, { projectId: 'project-a' }),
        createEvent('Need to research and investigate this issue', EventType.CAPTURE_ALL, { projectId: 'project-b' }),
        createEvent('Agent X task', EventType.CAPTURE_ALL, { agentId: 'agent-x' }),
        createEvent('Testing and running the test suite', EventType.CAPTURE_ALL, { projectId: 'test' }),
      ];

      for (const event of events) {
        await handler.handle(event);
      }

      // Verify directory structure
      expect(await directoryOperations.directoryExists('history/execution')).toBe(true);
      expect(await directoryOperations.directoryExists('projects/project-a')).toBe(true);
      expect(await directoryOperations.directoryExists('projects/project-b')).toBe(true);
      expect(await directoryOperations.directoryExists('agents/agent-x')).toBe(true);
      expect(await directoryOperations.directoryExists('tasks/coding')).toBe(true);
      expect(await directoryOperations.directoryExists('tasks/research')).toBe(true);
      expect(await directoryOperations.directoryExists('tasks/testing')).toBe(true);
    });
  });

  describe('Multiple Event Types', () => {
    it('should handle different event types', async () => {
      const captureAllHandler = new RoutingHandler(router, {
        handlerName: 'capture-all',
        eventType: EventType.CAPTURE_ALL,
      });
      const stopHandler = new RoutingHandler(router, {
        handlerName: 'stop',
        eventType: EventType.STOP,
      });

      emitter.registerHandler(captureAllHandler);
      emitter.registerHandler(stopHandler);

      // Emit CAPTURE_ALL event
      await emitter.emit(
        createEvent('Capture all event', EventType.CAPTURE_ALL, { projectId: 'p1' })
      );

      // Emit STOP event (goes to both capture-all and stop handlers)
      await emitter.emit(createEvent('Stop event', EventType.STOP, { projectId: 'p2' }));

      // Both handlers should have results
      expect(captureAllHandler.getLastRoutingResult()).not.toBeNull();
      expect(stopHandler.getLastRoutingResult()).not.toBeNull();
    });
  });

  describe('Content-Based Classification', () => {
    it('should infer project from content', async () => {
      const handler = createCaptureAllRoutingHandler(router);

      const event = createEvent('Working on project: inferred-project today');

      await handler.handle(event);

      const result = handler.getLastRoutingResult();
      expect(result!.classification.projectId).toBe('inferred-project');
    });

    it('should infer task type from content keywords', async () => {
      const testCases = [
        { content: 'Debugging the authentication issue', expected: TaskType.DEBUGGING },
        { content: 'Testing the new API endpoints', expected: TaskType.TESTING },
        { content: 'Planning the system architecture', expected: TaskType.PLANNING },
        { content: 'Documenting the API methods', expected: TaskType.DOCUMENTATION },
      ];

      for (const testCase of testCases) {
        const handler = createCaptureAllRoutingHandler(router);
        const event = createEvent(testCase.content, EventType.CAPTURE_ALL, { projectId: 'test' });

        await handler.handle(event);

        const result = handler.getLastRoutingResult();
        expect(result!.classification.taskType).toBe(testCase.expected);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle event with no metadata', async () => {
      const handler = createCaptureAllRoutingHandler(router);

      const event = createEvent('Simple event with no metadata');

      await handler.handle(event);

      const result = handler.getLastRoutingResult();
      expect(result!.success).toBe(true);
      // Should at least route to history
      expect(result!.destinations.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle event with empty content', async () => {
      const handler = createCaptureAllRoutingHandler(router);

      const event = createEvent('', EventType.CAPTURE_ALL, { projectId: 'test' });

      await handler.handle(event);

      const result = handler.getLastRoutingResult();
      expect(result!.success).toBe(true);
    });

    it('should handle concurrent event routing', async () => {
      const handler = createCaptureAllRoutingHandler(router);

      const events = Array.from({ length: 10 }, (_, i) =>
        createEvent(`Concurrent event ${i}`, EventType.CAPTURE_ALL, { projectId: 'concurrent-test' })
      );

      await Promise.all(events.map((e) => handler.handle(e)));

      // All events should be written
      const historyFiles = await directoryOperations.listFiles('history/execution');
      expect(historyFiles.length).toBeGreaterThan(0);

      const content = await fileOperations.readFile(`history/execution/${historyFiles[0]}`);
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(10);
    });
  });

  describe('Routing Configuration', () => {
    it('should respect routing config when routing', async () => {
      const restrictedRouter = new ContentRouter(classifier, fileOperations, directoryOperations, {
        config: {
          enableProjectRouting: true,
          enableAgentRouting: false,
          enableTaskTypeRouting: false,
        },
      });

      const handler = new RoutingHandler(restrictedRouter);

      const event = createEvent('Test', EventType.CAPTURE_ALL, {
        projectId: 'my-project',
        agentId: 'my-agent',
      });

      await handler.handle(event);

      const result = handler.getLastRoutingResult();

      // Should have project but not agent or task
      expect(result!.destinations.some((d) => d.directory.includes('projects'))).toBe(true);
      expect(result!.destinations.some((d) => d.directory.includes('agents'))).toBe(false);
      expect(result!.destinations.some((d) => d.directory.includes('tasks'))).toBe(false);
    });
  });

  describe('Classification Confidence', () => {
    it('should have higher confidence with complete metadata', async () => {
      const handler = createCaptureAllRoutingHandler(router);

      const completeEvent = createEvent('Implementing feature', EventType.CAPTURE_ALL, {
        projectId: 'complete-project',
        agentId: 'complete-agent',
        tags: ['feature', 'implementation'],
      });

      const incompleteEvent = createEvent('Something', EventType.CAPTURE_ALL, {});

      await handler.handle(completeEvent);
      const completeResult = handler.getLastRoutingResult();

      await handler.handle(incompleteEvent);
      const incompleteResult = handler.getLastRoutingResult();

      expect(completeResult!.classification.confidence).toBeGreaterThan(
        incompleteResult!.classification.confidence
      );
    });
  });
});
