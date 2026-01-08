import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  RoutingHandler,
  createCaptureAllRoutingHandler,
  createStopRoutingHandler,
  createSubagentStopRoutingHandler,
  createSessionSummaryRoutingHandler,
  HookEvent,
  EventType,
} from '../../src/hooks';
import { ContentRouter, ContentClassifier } from '../../src/routing';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';

describe('RoutingHandler', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let classifier: ContentClassifier;
  let router: ContentRouter;
  let handler: RoutingHandler;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'routing-handler-test-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    classifier = new ContentClassifier();
    router = new ContentRouter(classifier, fileOperations, directoryOperations);
    handler = new RoutingHandler(router);
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

  describe('constructor', () => {
    it('should have default name', () => {
      expect(handler.name).toBe('routing-handler');
    });

    it('should have default event type CAPTURE_ALL', () => {
      expect(handler.eventType).toBe(EventType.CAPTURE_ALL);
    });

    it('should accept custom name', () => {
      const customHandler = new RoutingHandler(router, { handlerName: 'custom-name' });
      expect(customHandler.name).toBe('custom-name');
    });

    it('should accept custom event type', () => {
      const stopHandler = new RoutingHandler(router, { eventType: EventType.STOP });
      expect(stopHandler.eventType).toBe(EventType.STOP);
    });
  });

  describe('handle', () => {
    it('should route event using ContentRouter', async () => {
      const event = createEvent('Test event', EventType.CAPTURE_ALL, {
        projectId: 'test-project',
      });

      await handler.handle(event);

      // Verify files were created
      const historyExists = await directoryOperations.directoryExists('history/execution');
      expect(historyExists).toBe(true);
    });

    it('should store last routing result', async () => {
      const event = createEvent('Test event');
      await handler.handle(event);

      const result = handler.getLastRoutingResult();
      expect(result).not.toBeNull();
      expect(result?.event).toBe(event);
      expect(result?.destinations.length).toBeGreaterThan(0);
    });

    it('should validate events when validation enabled', async () => {
      const invalidEvent = { invalid: true } as unknown as HookEvent;
      const validatingHandler = new RoutingHandler(router, { validateEvents: true });

      await expect(validatingHandler.handle(invalidEvent)).rejects.toThrow();
    });

    it('should route to multiple destinations', async () => {
      const event = createEvent('Implementing feature', EventType.CAPTURE_ALL, {
        projectId: 'my-project',
        agentId: 'coder',
      });

      await handler.handle(event);

      const result = handler.getLastRoutingResult();
      expect(result?.destinations.length).toBeGreaterThanOrEqual(3); // history + project + agent
    });
  });

  describe('getLastRoutingResult', () => {
    it('should return null before any events', () => {
      expect(handler.getLastRoutingResult()).toBeNull();
    });

    it('should return classification in result', async () => {
      const event = createEvent('Research task', EventType.CAPTURE_ALL, {
        projectId: 'research-project',
      });

      await handler.handle(event);

      const result = handler.getLastRoutingResult();
      expect(result?.classification.projectId).toBe('research-project');
    });
  });

  describe('getRouter', () => {
    it('should return the router instance', () => {
      expect(handler.getRouter()).toBe(router);
    });
  });

  describe('resetFilenameCache', () => {
    it('should reset router filename cache', async () => {
      const event = createEvent('Test');
      await handler.handle(event);

      handler.resetFilenameCache();

      expect(router.getCachedFilenameCount()).toBe(0);
    });
  });
});

describe('Routing Handler Factory Functions', () => {
  let tempDir: string;
  let router: ContentRouter;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'factory-test-'));
    const pathValidator = new PathValidator(tempDir);
    const fileOperations = new FileOperations(pathValidator);
    const directoryOperations = new DirectoryOperations(pathValidator);
    const classifier = new ContentClassifier();
    router = new ContentRouter(classifier, fileOperations, directoryOperations);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('createCaptureAllRoutingHandler', () => {
    it('should create handler with CAPTURE_ALL event type', () => {
      const handler = createCaptureAllRoutingHandler(router);
      expect(handler.eventType).toBe(EventType.CAPTURE_ALL);
      expect(handler.name).toBe('capture-all-routing');
    });

    it('should accept custom name', () => {
      const handler = createCaptureAllRoutingHandler(router, { handlerName: 'custom' });
      expect(handler.name).toBe('custom');
    });
  });

  describe('createStopRoutingHandler', () => {
    it('should create handler with STOP event type', () => {
      const handler = createStopRoutingHandler(router);
      expect(handler.eventType).toBe(EventType.STOP);
      expect(handler.name).toBe('stop-routing');
    });
  });

  describe('createSubagentStopRoutingHandler', () => {
    it('should create handler with SUBAGENT_STOP event type', () => {
      const handler = createSubagentStopRoutingHandler(router);
      expect(handler.eventType).toBe(EventType.SUBAGENT_STOP);
      expect(handler.name).toBe('subagent-stop-routing');
    });
  });

  describe('createSessionSummaryRoutingHandler', () => {
    it('should create handler with SESSION_SUMMARY event type', () => {
      const handler = createSessionSummaryRoutingHandler(router);
      expect(handler.eventType).toBe(EventType.SESSION_SUMMARY);
      expect(handler.name).toBe('session-summary-routing');
    });
  });
});
