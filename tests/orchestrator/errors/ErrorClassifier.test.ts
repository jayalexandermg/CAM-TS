import { ErrorClassifier, ErrorContext } from '../../../src/orchestrator/errors';

describe('ErrorClassifier', () => {
  let classifier: ErrorClassifier;

  const createContext = (): ErrorContext => ({
    timestamp: new Date(),
    sessionId: 'test-session',
  });

  beforeEach(() => {
    classifier = new ErrorClassifier();
  });

  describe('classify', () => {
    it('should classify network errors', () => {
      const error = new Error('Network connection failed');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('network');
      expect(result.severity).toBe('low');
      expect(result.retryable).toBe(true);
    });

    it('should classify ECONNREFUSED as network error', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:3000');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('network');
      expect(result.severity).toBe('low');
      expect(result.retryable).toBe(true);
    });

    it('should classify ENOTFOUND as network error', () => {
      const error = new Error('getaddrinfo ENOTFOUND example.com');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('network');
      expect(result.severity).toBe('low');
      expect(result.retryable).toBe(true);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timeout after 30000ms');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('timeout');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(true);
    });

    it('should classify deadline exceeded as timeout', () => {
      const error = new Error('DEADLINE_EXCEEDED: Deadline exceeded');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('timeout');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(true);
    });

    it('should classify validation errors', () => {
      const error = new Error('Validation failed: email is invalid');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('validation');
      expect(result.severity).toBe('high');
      expect(result.retryable).toBe(false);
    });

    it('should classify missing required field as validation', () => {
      const error = new Error('Required field missing: username');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('validation');
      expect(result.severity).toBe('high');
      expect(result.retryable).toBe(false);
    });

    it('should classify resource errors', () => {
      const error = new Error('Out of memory');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('resource');
      expect(result.severity).toBe('critical');
      expect(result.retryable).toBe(false);
    });

    it('should classify quota exceeded as resource error', () => {
      const error = new Error('Quota exceeded for API calls');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('resource');
      expect(result.severity).toBe('critical');
      expect(result.retryable).toBe(false);
    });

    it('should classify logic errors', () => {
      const error = new Error('Assertion failed: expected array');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('logic');
      expect(result.severity).toBe('critical');
      expect(result.retryable).toBe(false);
    });

    it('should classify invariant violation as logic error', () => {
      const error = new Error('Invariant violated: state cannot be null');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('logic');
      expect(result.severity).toBe('critical');
      expect(result.retryable).toBe(false);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Something went wrong');
      const result = classifier.classify(error, createContext());

      expect(result.category).toBe('unknown');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(true);
    });

    it('should preserve error context', () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        timestamp: new Date(),
        sessionId: 'session-123',
        agentId: 'agent-456',
        taskId: 'task-789',
        skillId: 'skill-abc',
        metadata: { key: 'value' },
      };

      const result = classifier.classify(error, context);

      expect(result.context).toBe(context);
      expect(result.context.sessionId).toBe('session-123');
      expect(result.context.agentId).toBe('agent-456');
      expect(result.context.taskId).toBe('task-789');
      expect(result.context.skillId).toBe('skill-abc');
      expect(result.context.metadata).toEqual({ key: 'value' });
    });

    it('should preserve original error', () => {
      const error = new Error('Original error message');
      const result = classifier.classify(error, createContext());

      expect(result.error).toBe(error);
      expect(result.error.message).toBe('Original error message');
    });
  });
});
