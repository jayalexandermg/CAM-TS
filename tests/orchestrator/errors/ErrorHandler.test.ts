import { ErrorHandler, ErrorContext, RecoveryEvent } from '../../../src/orchestrator/errors';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  const createContext = (overrides?: Partial<ErrorContext>): ErrorContext => ({
    timestamp: new Date(),
    sessionId: 'test-session',
    ...overrides,
  });

  beforeEach(() => {
    handler = new ErrorHandler();
  });

  afterEach(() => {
    handler.removeAllListeners();
  });

  describe('constructor', () => {
    it('should create handler with empty error log', () => {
      expect(handler.getErrorLog()).toHaveLength(0);
      expect(handler.getErrorCount()).toBe(0);
    });

    it('should accept custom retry config', () => {
      const customHandler = new ErrorHandler({ maxRetries: 5 });
      const retryConfig = customHandler.getRetryManager().getConfig();
      expect(retryConfig.maxRetries).toBe(5);
    });
  });

  describe('handle', () => {
    it('should return result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await handler.handle(fn, createContext());

      expect(result).toBe('success');
      expect(handler.getErrorLog()).toHaveLength(0);
    });

    it('should emit errorOccurred event on failure', async () => {
      const errorListener = jest.fn();
      handler.on('errorOccurred', errorListener);

      const error = new Error('Validation failed: bad input');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(handler.handle(fn, createContext())).rejects.toThrow(error);

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener.mock.calls[0][0].error).toBe(error);
    });

    it('should log error on failure', async () => {
      const error = new Error('Validation error: test');
      const fn = jest.fn().mockRejectedValue(error);

      try {
        await handler.handle(fn, createContext());
      } catch {
        // Expected
      }

      expect(handler.getErrorLog()).toHaveLength(1);
      expect(handler.getErrorLog()[0].error).toBe(error);
    });

    it('should retry retryable errors and succeed', async () => {
      const error = new Error('Network connection failed');
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(error);
        }
        return Promise.resolve('recovered');
      });

      const result = await handler.handle(fn, createContext());
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalled();
    });

    it('should emit recovered event on successful retry', async () => {
      const recoveredListener = jest.fn();
      handler.on('recovered', recoveredListener);

      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve('recovered');
      });

      await handler.handle(fn, createContext());

      expect(recoveredListener).toHaveBeenCalledTimes(1);
      const event = recoveredListener.mock.calls[0][0] as RecoveryEvent;
      expect(event.attempts).toBeGreaterThanOrEqual(1);
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Validation failed: invalid input');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(handler.handle(fn, createContext())).rejects.toThrow('Validation failed');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after all retries exhausted', async () => {
      const customHandler = new ErrorHandler({ maxRetries: 2 });
      const error = new Error('Network connection failed');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(customHandler.handle(fn, createContext())).rejects.toThrow(error);

      // Initial call + 2 retries = 3 total calls
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('classify', () => {
    it('should classify errors using ErrorClassifier', () => {
      const error = new Error('Network connection failed');
      const result = handler.classify(error, createContext());

      expect(result.category).toBe('network');
      expect(result.severity).toBe('low');
      expect(result.retryable).toBe(true);
    });
  });

  describe('getErrorsByCategory', () => {
    it('should filter errors by category', async () => {
      const networkError = new Error('Network failed');
      const validationError = new Error('Validation failed');

      try {
        await handler.handle(jest.fn().mockRejectedValue(networkError), createContext());
      } catch {
        // Expected
      }

      try {
        await handler.handle(jest.fn().mockRejectedValue(validationError), createContext());
      } catch {
        // Expected
      }

      expect(handler.getErrorsByCategory('network')).toHaveLength(1);
      expect(handler.getErrorsByCategory('validation')).toHaveLength(1);
      expect(handler.getErrorsByCategory('timeout')).toHaveLength(0);
    });
  });

  describe('getErrorsBySeverity', () => {
    it('should filter errors by severity', async () => {
      const lowError = new Error('Network failed');
      const highError = new Error('Validation failed');

      try {
        await handler.handle(jest.fn().mockRejectedValue(lowError), createContext());
      } catch {
        // Expected
      }

      try {
        await handler.handle(jest.fn().mockRejectedValue(highError), createContext());
      } catch {
        // Expected
      }

      expect(handler.getErrorsBySeverity('low')).toHaveLength(1);
      expect(handler.getErrorsBySeverity('high')).toHaveLength(1);
    });
  });

  describe('getErrorsBySession', () => {
    it('should filter errors by session ID', async () => {
      const error = new Error('Validation error: test');

      try {
        await handler.handle(
          jest.fn().mockRejectedValue(error),
          createContext({ sessionId: 'session-1' }),
        );
      } catch {
        // Expected
      }

      try {
        await handler.handle(
          jest.fn().mockRejectedValue(error),
          createContext({ sessionId: 'session-2' }),
        );
      } catch {
        // Expected
      }

      expect(handler.getErrorsBySession('session-1')).toHaveLength(1);
      expect(handler.getErrorsBySession('session-2')).toHaveLength(1);
      expect(handler.getErrorsBySession('session-3')).toHaveLength(0);
    });
  });

  describe('clearErrorLog', () => {
    it('should clear all errors', async () => {
      const error = new Error('Validation error: test');

      try {
        await handler.handle(jest.fn().mockRejectedValue(error), createContext());
      } catch {
        // Expected
      }

      expect(handler.getErrorLog()).toHaveLength(1);

      handler.clearErrorLog();
      expect(handler.getErrorLog()).toHaveLength(0);
      expect(handler.getErrorCount()).toBe(0);
    });
  });

  describe('error log size limit', () => {
    it('should limit error log to 1000 entries', async () => {
      const error = new Error('Validation error: test');
      const fn = jest.fn().mockRejectedValue(error);

      // Add 1005 errors
      for (let i = 0; i < 1005; i++) {
        try {
          await handler.handle(fn, createContext());
        } catch {
          // Expected
        }
      }

      expect(handler.getErrorLog()).toHaveLength(1000);
    });
  });

  describe('getRetryManager', () => {
    it('should return the retry manager', () => {
      const retryManager = handler.getRetryManager();
      expect(retryManager).toBeDefined();
      expect(retryManager.getConfig()).toBeDefined();
    });
  });
});
