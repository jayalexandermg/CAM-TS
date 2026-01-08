import { BaseHookHandler, HookEvent, EventType } from '../../src/hooks';
import { InvalidEventError } from '../../src/exceptions';

// Concrete implementation for testing
class TestHandler extends BaseHookHandler {
  readonly name = 'test-handler';
  readonly eventType = EventType.CAPTURE_ALL;

  public handleCalled = false;
  public lastEvent: HookEvent | null = null;

  async handle(event: HookEvent): Promise<void> {
    this.maybeValidateEvent(event);
    this.handleCalled = true;
    this.lastEvent = event;
  }

  // Expose protected methods for testing
  public testValidateEvent(event: HookEvent): void {
    this.validateEvent(event);
  }

  public testFormatEventForStorage(event: HookEvent): string {
    return this.formatEventForStorage(event);
  }

  public testGenerateTimestamp(): string {
    return this.generateTimestamp();
  }

  public testCreateEvent(
    type: EventType,
    content: string,
    metadata: Record<string, unknown> = {}
  ): HookEvent {
    return this.createEvent(type, content, metadata);
  }
}

describe('BaseHookHandler', () => {
  let handler: TestHandler;

  beforeEach(() => {
    handler = new TestHandler();
  });

  const createValidEvent = (): HookEvent => ({
    timestamp: new Date().toISOString(),
    type: EventType.CAPTURE_ALL,
    content: 'Test content',
    metadata: {},
  });

  describe('validateEvent', () => {
    it('should accept valid event', () => {
      const event = createValidEvent();
      expect(() => handler.testValidateEvent(event)).not.toThrow();
    });

    it('should throw for null event', () => {
      expect(() => handler.testValidateEvent(null as unknown as HookEvent)).toThrow(
        InvalidEventError
      );
    });

    it('should throw for undefined event', () => {
      expect(() => handler.testValidateEvent(undefined as unknown as HookEvent)).toThrow(
        InvalidEventError
      );
    });

    it('should throw for missing timestamp', () => {
      const event = { ...createValidEvent(), timestamp: undefined } as unknown as HookEvent;
      expect(() => handler.testValidateEvent(event)).toThrow(InvalidEventError);
      expect(() => handler.testValidateEvent(event)).toThrow('timestamp is required');
    });

    it('should throw for invalid timestamp type', () => {
      const event = { ...createValidEvent(), timestamp: 12345 } as unknown as HookEvent;
      expect(() => handler.testValidateEvent(event)).toThrow(InvalidEventError);
    });

    it('should throw for invalid timestamp format', () => {
      const event = { ...createValidEvent(), timestamp: 'not-a-date' };
      expect(() => handler.testValidateEvent(event)).toThrow(InvalidEventError);
      expect(() => handler.testValidateEvent(event)).toThrow('valid ISO 8601');
    });

    it('should throw for missing type', () => {
      const event = { ...createValidEvent(), type: undefined } as unknown as HookEvent;
      expect(() => handler.testValidateEvent(event)).toThrow(InvalidEventError);
    });

    it('should throw for invalid type', () => {
      const event = { ...createValidEvent(), type: 'invalid_type' } as unknown as HookEvent;
      expect(() => handler.testValidateEvent(event)).toThrow(InvalidEventError);
      expect(() => handler.testValidateEvent(event)).toThrow('valid EventType');
    });

    it('should throw for non-string content', () => {
      const event = { ...createValidEvent(), content: 123 } as unknown as HookEvent;
      expect(() => handler.testValidateEvent(event)).toThrow(InvalidEventError);
      expect(() => handler.testValidateEvent(event)).toThrow('content must be a string');
    });

    it('should allow empty string content', () => {
      const event = { ...createValidEvent(), content: '' };
      expect(() => handler.testValidateEvent(event)).not.toThrow();
    });

    it('should throw for missing metadata', () => {
      const event = { ...createValidEvent(), metadata: undefined } as unknown as HookEvent;
      expect(() => handler.testValidateEvent(event)).toThrow(InvalidEventError);
    });

    it('should throw for non-object metadata', () => {
      const event = { ...createValidEvent(), metadata: 'not an object' } as unknown as HookEvent;
      expect(() => handler.testValidateEvent(event)).toThrow(InvalidEventError);
    });

    it('should accept all valid EventType values', () => {
      for (const type of Object.values(EventType)) {
        const event = { ...createValidEvent(), type };
        expect(() => handler.testValidateEvent(event)).not.toThrow();
      }
    });
  });

  describe('formatEventForStorage', () => {
    it('should format event as single-line JSON', () => {
      const event = createValidEvent();
      const formatted = handler.testFormatEventForStorage(event);

      // Should be valid JSON
      expect(() => JSON.parse(formatted)).not.toThrow();

      // Should be single line
      expect(formatted.includes('\n')).toBe(false);

      // Should contain event data
      const parsed = JSON.parse(formatted);
      expect(parsed.timestamp).toBe(event.timestamp);
      expect(parsed.type).toBe(event.type);
      expect(parsed.content).toBe(event.content);
    });

    it('should preserve all metadata', () => {
      const event = {
        ...createValidEvent(),
        metadata: {
          agentId: 'test-agent',
          projectId: 'test-project',
          tags: ['tag1', 'tag2'],
          customField: { nested: 'value' },
        },
      };

      const formatted = handler.testFormatEventForStorage(event);
      const parsed = JSON.parse(formatted);

      expect(parsed.metadata.agentId).toBe('test-agent');
      expect(parsed.metadata.projectId).toBe('test-project');
      expect(parsed.metadata.tags).toEqual(['tag1', 'tag2']);
      expect(parsed.metadata.customField).toEqual({ nested: 'value' });
    });
  });

  describe('generateTimestamp', () => {
    it('should generate valid ISO 8601 timestamp', () => {
      const timestamp = handler.testGenerateTimestamp();

      // Should be valid date
      const date = new Date(timestamp);
      expect(isNaN(date.getTime())).toBe(false);

      // Should be ISO format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should generate current time', () => {
      const before = Date.now();
      const timestamp = handler.testGenerateTimestamp();
      const after = Date.now();

      const generated = new Date(timestamp).getTime();
      expect(generated).toBeGreaterThanOrEqual(before);
      expect(generated).toBeLessThanOrEqual(after);
    });
  });

  describe('createEvent', () => {
    it('should create valid event', () => {
      const event = handler.testCreateEvent(EventType.STOP, 'Test content', { key: 'value' });

      expect(event.type).toBe(EventType.STOP);
      expect(event.content).toBe('Test content');
      expect(event.metadata.key).toBe('value');
      expect(event.timestamp).toBeDefined();
    });

    it('should generate timestamp automatically', () => {
      const before = Date.now();
      const event = handler.testCreateEvent(EventType.CAPTURE_ALL, 'Content');
      const after = Date.now();

      const timestamp = new Date(event.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should allow empty metadata', () => {
      const event = handler.testCreateEvent(EventType.CAPTURE_ALL, 'Content');
      expect(event.metadata).toEqual({});
    });
  });

  describe('handle', () => {
    it('should call validation when validateEvents is true', async () => {
      const validatingHandler = new TestHandler({ validateEvents: true });
      const event = createValidEvent();

      await validatingHandler.handle(event);
      expect(validatingHandler.handleCalled).toBe(true);
    });

    it('should skip validation when validateEvents is false', async () => {
      const nonValidatingHandler = new TestHandler({ validateEvents: false });
      const invalidEvent = { invalid: true } as unknown as HookEvent;

      await nonValidatingHandler.handle(invalidEvent);
      expect(nonValidatingHandler.handleCalled).toBe(true);
    });

    it('should throw on invalid event when validation is enabled', async () => {
      const event = { ...createValidEvent(), timestamp: 'invalid' };
      await expect(handler.handle(event)).rejects.toThrow(InvalidEventError);
    });
  });
});
