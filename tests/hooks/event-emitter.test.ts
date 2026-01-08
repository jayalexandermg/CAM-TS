import { HookEventEmitter, HookEvent, EventType, HookHandler } from '../../src/hooks';
import { AggregateHandlerError } from '../../src/exceptions';

describe('HookEventEmitter', () => {
  let emitter: HookEventEmitter;

  beforeEach(() => {
    emitter = new HookEventEmitter();
  });

  const createMockHandler = (
    name: string,
    eventType: EventType,
    handleFn?: (event: HookEvent) => Promise<void>
  ): HookHandler => ({
    name,
    eventType,
    handle: handleFn ?? jest.fn().mockResolvedValue(undefined),
  });

  const createTestEvent = (type: EventType = EventType.CAPTURE_ALL): HookEvent => ({
    timestamp: new Date().toISOString(),
    type,
    content: 'Test event content',
    metadata: { testKey: 'testValue' },
  });

  describe('constructor', () => {
    it('should create emitter with default options', () => {
      const options = emitter.getOptions();
      expect(options.throwOnErrors).toBe(true);
      expect(options.maxHandlersPerType).toBe(100);
    });

    it('should create emitter with custom options', () => {
      const customEmitter = new HookEventEmitter({
        throwOnErrors: false,
        maxHandlersPerType: 10,
      });
      const options = customEmitter.getOptions();
      expect(options.throwOnErrors).toBe(false);
      expect(options.maxHandlersPerType).toBe(10);
    });
  });

  describe('registerHandler', () => {
    it('should register a handler', () => {
      const handler = createMockHandler('test-handler', EventType.CAPTURE_ALL);
      emitter.registerHandler(handler);
      expect(emitter.hasHandler('test-handler')).toBe(true);
      expect(emitter.getHandlerCount()).toBe(1);
    });

    it('should throw when registering duplicate handler name', () => {
      const handler1 = createMockHandler('test-handler', EventType.CAPTURE_ALL);
      const handler2 = createMockHandler('test-handler', EventType.STOP);
      emitter.registerHandler(handler1);
      expect(() => emitter.registerHandler(handler2)).toThrow(
        "Handler 'test-handler' is already registered"
      );
    });

    it('should register multiple handlers', () => {
      const handler1 = createMockHandler('handler-1', EventType.CAPTURE_ALL);
      const handler2 = createMockHandler('handler-2', EventType.STOP);
      const handler3 = createMockHandler('handler-3', EventType.SESSION_SUMMARY);

      emitter.registerHandler(handler1);
      emitter.registerHandler(handler2);
      emitter.registerHandler(handler3);

      expect(emitter.getHandlerCount()).toBe(3);
    });

    it('should throw when max handlers per type is exceeded', () => {
      const customEmitter = new HookEventEmitter({ maxHandlersPerType: 2 });

      customEmitter.registerHandler(createMockHandler('handler-1', EventType.CAPTURE_ALL));
      customEmitter.registerHandler(createMockHandler('handler-2', EventType.CAPTURE_ALL));

      expect(() =>
        customEmitter.registerHandler(createMockHandler('handler-3', EventType.CAPTURE_ALL))
      ).toThrow("Maximum handlers (2) reached for event type 'capture_all'");
    });
  });

  describe('unregisterHandler', () => {
    it('should unregister an existing handler', () => {
      const handler = createMockHandler('test-handler', EventType.CAPTURE_ALL);
      emitter.registerHandler(handler);
      expect(emitter.hasHandler('test-handler')).toBe(true);

      const result = emitter.unregisterHandler('test-handler');
      expect(result).toBe(true);
      expect(emitter.hasHandler('test-handler')).toBe(false);
    });

    it('should return false when unregistering non-existent handler', () => {
      const result = emitter.unregisterHandler('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('emit', () => {
    it('should emit event to matching handler', async () => {
      const handleFn = jest.fn().mockResolvedValue(undefined);
      const handler = createMockHandler('test-handler', EventType.STOP, handleFn);
      emitter.registerHandler(handler);

      const event = createTestEvent(EventType.STOP);
      await emitter.emit(event);

      expect(handleFn).toHaveBeenCalledWith(event);
    });

    it('should emit event to CAPTURE_ALL handlers regardless of event type', async () => {
      const captureAllFn = jest.fn().mockResolvedValue(undefined);
      const stopFn = jest.fn().mockResolvedValue(undefined);

      emitter.registerHandler(
        createMockHandler('capture-all', EventType.CAPTURE_ALL, captureAllFn)
      );
      emitter.registerHandler(createMockHandler('stop', EventType.STOP, stopFn));

      // Emit a STOP event
      const event = createTestEvent(EventType.STOP);
      await emitter.emit(event);

      // Both handlers should receive it
      expect(captureAllFn).toHaveBeenCalledWith(event);
      expect(stopFn).toHaveBeenCalledWith(event);
    });

    it('should not emit to non-matching handlers', async () => {
      const sessionFn = jest.fn().mockResolvedValue(undefined);
      emitter.registerHandler(
        createMockHandler('session', EventType.SESSION_SUMMARY, sessionFn)
      );

      const event = createTestEvent(EventType.STOP);
      await emitter.emit(event);

      expect(sessionFn).not.toHaveBeenCalled();
    });

    it('should emit to multiple matching handlers', async () => {
      const fn1 = jest.fn().mockResolvedValue(undefined);
      const fn2 = jest.fn().mockResolvedValue(undefined);
      const fn3 = jest.fn().mockResolvedValue(undefined);

      emitter.registerHandler(createMockHandler('handler-1', EventType.STOP, fn1));
      emitter.registerHandler(createMockHandler('handler-2', EventType.STOP, fn2));
      emitter.registerHandler(createMockHandler('handler-3', EventType.STOP, fn3));

      const event = createTestEvent(EventType.STOP);
      await emitter.emit(event);

      expect(fn1).toHaveBeenCalledWith(event);
      expect(fn2).toHaveBeenCalledWith(event);
      expect(fn3).toHaveBeenCalledWith(event);
    });

    it('should throw AggregateHandlerError when handler fails', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Handler failed'));
      emitter.registerHandler(createMockHandler('failing', EventType.STOP, failingFn));

      const event = createTestEvent(EventType.STOP);
      await expect(emitter.emit(event)).rejects.toThrow(AggregateHandlerError);
    });

    it('should continue to other handlers when one fails', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Handler failed'));
      const successFn = jest.fn().mockResolvedValue(undefined);

      emitter.registerHandler(createMockHandler('failing', EventType.STOP, failingFn));
      emitter.registerHandler(createMockHandler('success', EventType.STOP, successFn));

      const event = createTestEvent(EventType.STOP);

      try {
        await emitter.emit(event);
      } catch {
        // Expected
      }

      // Both handlers should have been called
      expect(failingFn).toHaveBeenCalledWith(event);
      expect(successFn).toHaveBeenCalledWith(event);
    });

    it('should collect all errors in AggregateHandlerError', async () => {
      const failing1 = jest.fn().mockRejectedValue(new Error('Error 1'));
      const failing2 = jest.fn().mockRejectedValue(new Error('Error 2'));

      emitter.registerHandler(createMockHandler('failing-1', EventType.STOP, failing1));
      emitter.registerHandler(createMockHandler('failing-2', EventType.STOP, failing2));

      const event = createTestEvent(EventType.STOP);

      try {
        await emitter.emit(event);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateHandlerError);
        const aggError = error as AggregateHandlerError;
        expect(aggError.errors).toHaveLength(2);
      }
    });

    it('should not throw when throwOnErrors is false', async () => {
      const noThrowEmitter = new HookEventEmitter({ throwOnErrors: false });
      const failingFn = jest.fn().mockRejectedValue(new Error('Handler failed'));
      noThrowEmitter.registerHandler(createMockHandler('failing', EventType.STOP, failingFn));

      const event = createTestEvent(EventType.STOP);
      await expect(noThrowEmitter.emit(event)).resolves.not.toThrow();
    });
  });

  describe('emitSafe', () => {
    it('should return empty array when no errors', async () => {
      const successFn = jest.fn().mockResolvedValue(undefined);
      emitter.registerHandler(createMockHandler('success', EventType.STOP, successFn));

      const event = createTestEvent(EventType.STOP);
      const errors = await emitter.emitSafe(event);

      expect(errors).toHaveLength(0);
    });

    it('should return errors without throwing', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Handler failed'));
      emitter.registerHandler(createMockHandler('failing', EventType.STOP, failingFn));

      const event = createTestEvent(EventType.STOP);
      const errors = await emitter.emitSafe(event);

      expect(errors).toHaveLength(1);
      expect(errors[0].handlerName).toBe('failing');
      expect(errors[0].error.message).toBe('Handler failed');
    });
  });

  describe('getHandlers', () => {
    it('should return all registered handlers', () => {
      const handler1 = createMockHandler('handler-1', EventType.CAPTURE_ALL);
      const handler2 = createMockHandler('handler-2', EventType.STOP);

      emitter.registerHandler(handler1);
      emitter.registerHandler(handler2);

      const handlers = emitter.getHandlers();
      expect(handlers).toHaveLength(2);
      expect(handlers).toContainEqual(handler1);
      expect(handlers).toContainEqual(handler2);
    });

    it('should return empty array when no handlers', () => {
      expect(emitter.getHandlers()).toHaveLength(0);
    });
  });

  describe('getHandler', () => {
    it('should return handler by name', () => {
      const handler = createMockHandler('test-handler', EventType.CAPTURE_ALL);
      emitter.registerHandler(handler);

      expect(emitter.getHandler('test-handler')).toBe(handler);
    });

    it('should return undefined for non-existent handler', () => {
      expect(emitter.getHandler('non-existent')).toBeUndefined();
    });
  });

  describe('getHandlersByType', () => {
    it('should return handlers for specific type', () => {
      const stop1 = createMockHandler('stop-1', EventType.STOP);
      const stop2 = createMockHandler('stop-2', EventType.STOP);
      const session = createMockHandler('session', EventType.SESSION_SUMMARY);

      emitter.registerHandler(stop1);
      emitter.registerHandler(stop2);
      emitter.registerHandler(session);

      const stopHandlers = emitter.getHandlersByType(EventType.STOP);
      expect(stopHandlers).toHaveLength(2);
      expect(stopHandlers).toContainEqual(stop1);
      expect(stopHandlers).toContainEqual(stop2);
    });

    it('should return empty array for type with no handlers', () => {
      emitter.registerHandler(createMockHandler('stop', EventType.STOP));
      expect(emitter.getHandlersByType(EventType.SESSION_SUMMARY)).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all handlers', () => {
      emitter.registerHandler(createMockHandler('handler-1', EventType.CAPTURE_ALL));
      emitter.registerHandler(createMockHandler('handler-2', EventType.STOP));
      expect(emitter.getHandlerCount()).toBe(2);

      emitter.clear();
      expect(emitter.getHandlerCount()).toBe(0);
    });
  });

  describe('hasHandler', () => {
    it('should return true for existing handler', () => {
      emitter.registerHandler(createMockHandler('test-handler', EventType.CAPTURE_ALL));
      expect(emitter.hasHandler('test-handler')).toBe(true);
    });

    it('should return false for non-existent handler', () => {
      expect(emitter.hasHandler('non-existent')).toBe(false);
    });
  });
});
