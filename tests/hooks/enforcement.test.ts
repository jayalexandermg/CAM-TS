/**
 * Infinite Aura - Hook Enforcement Tests
 *
 * Tests for the hook enforcement system that allows hooks to ALLOW, BLOCK, or MODIFY operations.
 */

import {
  HookAction,
  HookResult,
  HookEvent,
  EventType,
  HookEventEmitter,
  BaseHookHandler,
  EnforcingHookHandler,
} from '../../src/hooks';
import { HookBlockedError, ErrorCodes } from '../../src/exceptions';

// ============================================================================
// Test Helpers - Enforcing Handlers
// ============================================================================

/**
 * Handler that always allows operations
 */
class AllowHandler extends BaseHookHandler implements EnforcingHookHandler {
  readonly name = 'allow-handler';
  readonly eventType = EventType.STOP;

  async handle(event: HookEvent): Promise<void> {
    await this.execute(event);
  }

  async execute(_event: HookEvent): Promise<HookResult> {
    return this.allow({ allowed: true });
  }
}

/**
 * Handler that always blocks operations
 */
class BlockHandler extends BaseHookHandler implements EnforcingHookHandler {
  readonly name = 'block-handler';
  readonly eventType = EventType.STOP;

  private blockReason: string;

  constructor(reason: string = 'Operation not permitted') {
    super();
    this.blockReason = reason;
  }

  async handle(event: HookEvent): Promise<void> {
    await this.execute(event);
  }

  async execute(_event: HookEvent): Promise<HookResult> {
    return this.block(this.blockReason, { blocked: true });
  }
}

/**
 * Handler that modifies data
 */
class ModifyHandler extends BaseHookHandler implements EnforcingHookHandler {
  readonly name = 'modify-handler';
  readonly eventType = EventType.STOP;

  private modifyData: Record<string, unknown>;

  constructor(data: Record<string, unknown> = { modified: true }) {
    super();
    this.modifyData = data;
  }

  async handle(event: HookEvent): Promise<void> {
    await this.execute(event);
  }

  async execute(_event: HookEvent): Promise<HookResult> {
    return this.modify(this.modifyData, 'Data was modified');
  }
}

/**
 * Handler that returns result based on event content
 */
class ConditionalHandler extends BaseHookHandler implements EnforcingHookHandler {
  readonly name = 'conditional-handler';
  readonly eventType = EventType.STOP;

  async handle(event: HookEvent): Promise<void> {
    await this.execute(event);
  }

  async execute(event: HookEvent): Promise<HookResult> {
    if (event.content.includes('block')) {
      return this.block('Content contains blocked keyword');
    }
    if (event.content.includes('modify')) {
      return this.modify({ original: event.content, modified: true });
    }
    return this.allow();
  }
}

/**
 * Legacy handler (no execute method)
 */
class LegacyHandler extends BaseHookHandler {
  readonly name = 'legacy-handler';
  readonly eventType = EventType.STOP;
  public handled = false;

  async handle(_event: HookEvent): Promise<void> {
    this.handled = true;
  }
}

// ============================================================================
// Test Data
// ============================================================================

const createTestEvent = (content: string = 'test event'): HookEvent => ({
  timestamp: new Date().toISOString(),
  type: EventType.STOP,
  content,
  metadata: { agentId: 'test-agent' },
});

// ============================================================================
// HookAction Enum Tests
// ============================================================================

describe('HookAction enum', () => {
  it('should have ALLOW action', () => {
    expect(HookAction.ALLOW).toBe('allow');
  });

  it('should have BLOCK action', () => {
    expect(HookAction.BLOCK).toBe('block');
  });

  it('should have MODIFY action', () => {
    expect(HookAction.MODIFY).toBe('modify');
  });

  it('should have exactly three actions', () => {
    const actions = Object.values(HookAction);
    expect(actions).toHaveLength(3);
    expect(actions).toContain('allow');
    expect(actions).toContain('block');
    expect(actions).toContain('modify');
  });
});

// ============================================================================
// BaseHookHandler Helper Methods Tests
// ============================================================================

describe('BaseHookHandler enforcement helpers', () => {
  describe('allow()', () => {
    it('should return ALLOW action', async () => {
      const handler = new AllowHandler();
      const result = await handler.execute(createTestEvent());

      expect(result.action).toBe(HookAction.ALLOW);
    });

    it('should set success to true', async () => {
      const handler = new AllowHandler();
      const result = await handler.execute(createTestEvent());

      expect(result.success).toBe(true);
    });

    it('should include metadata when provided', async () => {
      const handler = new AllowHandler();
      const result = await handler.execute(createTestEvent());

      expect(result.metadata).toEqual({ allowed: true });
    });
  });

  describe('block()', () => {
    it('should return BLOCK action', async () => {
      const handler = new BlockHandler('Test block reason');
      const result = await handler.execute(createTestEvent());

      expect(result.action).toBe(HookAction.BLOCK);
    });

    it('should set success to false', async () => {
      const handler = new BlockHandler();
      const result = await handler.execute(createTestEvent());

      expect(result.success).toBe(false);
    });

    it('should include reason', async () => {
      const handler = new BlockHandler('Custom block reason');
      const result = await handler.execute(createTestEvent());

      expect(result.reason).toBe('Custom block reason');
    });

    it('should include metadata when provided', async () => {
      const handler = new BlockHandler();
      const result = await handler.execute(createTestEvent());

      expect(result.metadata).toEqual({ blocked: true });
    });
  });

  describe('modify()', () => {
    it('should return MODIFY action', async () => {
      const handler = new ModifyHandler({ key: 'value' });
      const result = await handler.execute(createTestEvent());

      expect(result.action).toBe(HookAction.MODIFY);
    });

    it('should set success to true', async () => {
      const handler = new ModifyHandler();
      const result = await handler.execute(createTestEvent());

      expect(result.success).toBe(true);
    });

    it('should include modified data', async () => {
      const handler = new ModifyHandler({ newKey: 'newValue' });
      const result = await handler.execute(createTestEvent());

      expect(result.data).toEqual({ newKey: 'newValue' });
    });

    it('should include reason when provided', async () => {
      const handler = new ModifyHandler();
      const result = await handler.execute(createTestEvent());

      expect(result.reason).toBe('Data was modified');
    });
  });
});

// ============================================================================
// HookBlockedError Tests
// ============================================================================

describe('HookBlockedError', () => {
  const createEventRecord = (content: string = 'test event'): Record<string, unknown> =>
    createTestEvent(content) as unknown as Record<string, unknown>;

  it('should be an Error instance', () => {
    const event = createEventRecord();
    const error = new HookBlockedError('Operation blocked', 'test-hook', event);

    expect(error).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const event = createEventRecord();
    const error = new HookBlockedError('Operation blocked', 'test-hook', event);

    expect(error.name).toBe('HookBlockedError');
  });

  it('should have correct error code', () => {
    const event = createEventRecord();
    const error = new HookBlockedError('Operation blocked', 'test-hook', event);

    expect(error.code).toBe(ErrorCodes.HOOK_BLOCKED);
  });

  it('should store hook type', () => {
    const event = createEventRecord();
    const error = new HookBlockedError('Operation blocked', 'my-hook', event);

    expect(error.hookType).toBe('my-hook');
  });

  it('should store event', () => {
    const event = createEventRecord('blocked content');
    const error = new HookBlockedError('Operation blocked', 'test-hook', event);

    expect(error.event).toEqual(event);
  });

  it('should serialize to JSON correctly', () => {
    const event = createEventRecord();
    const error = new HookBlockedError('Operation blocked', 'test-hook', event);
    const json = error.toJSON();

    expect(json.name).toBe('HookBlockedError');
    expect(json.message).toBe('Operation blocked');
    expect(json.hookType).toBe('test-hook');
    expect(json.eventType).toBe(EventType.STOP);
  });
});

// ============================================================================
// HookEventEmitter Enforcement Tests
// ============================================================================

describe('HookEventEmitter enforcement', () => {
  let emitter: HookEventEmitter;

  beforeEach(() => {
    emitter = new HookEventEmitter({ throwOnErrors: true });
  });

  describe('executeHook()', () => {
    it('should return ALLOW when no handler registered', async () => {
      const result = await emitter.executeHook('nonexistent', createTestEvent());

      expect(result.action).toBe(HookAction.ALLOW);
      expect(result.success).toBe(true);
    });

    it('should return ALLOW result from allow handler', async () => {
      const handler = new AllowHandler();
      emitter.registerHandler(handler);

      const result = await emitter.executeHook('allow-handler', createTestEvent());

      expect(result.action).toBe(HookAction.ALLOW);
    });

    it('should throw HookBlockedError on BLOCK result', async () => {
      const handler = new BlockHandler('Access denied');
      emitter.registerHandler(handler);

      await expect(emitter.executeHook('block-handler', createTestEvent())).rejects.toThrow(
        HookBlockedError
      );
    });

    it('should include reason in HookBlockedError', async () => {
      const handler = new BlockHandler('Custom reason');
      emitter.registerHandler(handler);

      try {
        await emitter.executeHook('block-handler', createTestEvent());
        fail('Expected HookBlockedError');
      } catch (error) {
        expect(error).toBeInstanceOf(HookBlockedError);
        expect((error as HookBlockedError).message).toBe('Custom reason');
      }
    });

    it('should return MODIFY result with data', async () => {
      const handler = new ModifyHandler({ enhanced: true });
      emitter.registerHandler(handler);

      const result = await emitter.executeHook('modify-handler', createTestEvent());

      expect(result.action).toBe(HookAction.MODIFY);
      expect(result.data).toEqual({ enhanced: true });
    });

    it('should handle legacy handlers as ALLOW', async () => {
      const handler = new LegacyHandler();
      emitter.registerHandler(handler);

      const result = await emitter.executeHook('legacy-handler', createTestEvent());

      expect(result.action).toBe(HookAction.ALLOW);
      expect(handler.handled).toBe(true);
    });
  });

  describe('executeHookWithData()', () => {
    it('should return original data on ALLOW', async () => {
      const handler = new AllowHandler();
      emitter.registerHandler(handler);

      const originalData = { value: 42 };
      const result = await emitter.executeHookWithData(
        'allow-handler',
        createTestEvent(),
        originalData
      );

      expect(result).toBe(originalData);
    });

    it('should return modified data on MODIFY', async () => {
      const handler = new ModifyHandler({ value: 100, extra: true });
      emitter.registerHandler(handler);

      const originalData = { value: 42 };
      const result = await emitter.executeHookWithData(
        'modify-handler',
        createTestEvent(),
        originalData
      );

      expect(result).toEqual({ value: 100, extra: true });
      expect(result).not.toBe(originalData);
    });

    it('should throw HookBlockedError on BLOCK', async () => {
      const handler = new BlockHandler();
      emitter.registerHandler(handler);

      await expect(
        emitter.executeHookWithData('block-handler', createTestEvent(), { value: 42 })
      ).rejects.toThrow(HookBlockedError);
    });

    it('should return original data when no handler registered', async () => {
      const originalData = { value: 42 };
      const result = await emitter.executeHookWithData(
        'nonexistent',
        createTestEvent(),
        originalData
      );

      expect(result).toBe(originalData);
    });
  });

  describe('executeHooksWithEnforcement()', () => {
    it('should execute all matching handlers', async () => {
      const handler1 = new AllowHandler();
      const handler2 = new LegacyHandler();
      emitter.registerHandler(handler1);
      emitter.registerHandler(handler2);

      const results = await emitter.executeHooksWithEnforcement(createTestEvent());

      expect(results).toHaveLength(2);
      expect(results[0].action).toBe(HookAction.ALLOW);
      expect(results[1].action).toBe(HookAction.ALLOW);
    });

    it('should stop and throw on BLOCK', async () => {
      const allowHandler = new AllowHandler();
      const blockHandler = new BlockHandler('Blocked');
      emitter.registerHandler(allowHandler);
      emitter.registerHandler(blockHandler);

      await expect(emitter.executeHooksWithEnforcement(createTestEvent())).rejects.toThrow(
        HookBlockedError
      );
    });

    it('should return empty array when no handlers', async () => {
      const results = await emitter.executeHooksWithEnforcement(createTestEvent());

      expect(results).toHaveLength(0);
    });

    it('should accumulate MODIFY results', async () => {
      const modifier1 = new ModifyHandler({ step1: true });
      const modifier2 = new ModifyHandler({ step2: true });
      (modifier2 as any).name = 'modify-handler-2';
      emitter.registerHandler(modifier1);
      emitter.registerHandler(modifier2);

      const results = await emitter.executeHooksWithEnforcement(createTestEvent());

      expect(results).toHaveLength(2);
      expect(results[0].action).toBe(HookAction.MODIFY);
      expect(results[1].action).toBe(HookAction.MODIFY);
    });
  });

  describe('conditional enforcement', () => {
    it('should allow based on content', async () => {
      const handler = new ConditionalHandler();
      emitter.registerHandler(handler);

      const result = await emitter.executeHook(
        'conditional-handler',
        createTestEvent('normal content')
      );

      expect(result.action).toBe(HookAction.ALLOW);
    });

    it('should block based on content', async () => {
      const handler = new ConditionalHandler();
      emitter.registerHandler(handler);

      await expect(
        emitter.executeHook('conditional-handler', createTestEvent('block this'))
      ).rejects.toThrow(HookBlockedError);
    });

    it('should modify based on content', async () => {
      const handler = new ConditionalHandler();
      emitter.registerHandler(handler);

      const result = await emitter.executeHook(
        'conditional-handler',
        createTestEvent('modify this')
      );

      expect(result.action).toBe(HookAction.MODIFY);
      expect(result.data).toEqual({ original: 'modify this', modified: true });
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('enforcement integration', () => {
  it('should allow enforcement flow to work end-to-end', async () => {
    const emitter = new HookEventEmitter();

    // Register a security hook that blocks dangerous operations
    class SecurityHook extends BaseHookHandler implements EnforcingHookHandler {
      readonly name = 'security-hook';
      readonly eventType = EventType.STOP;

      async handle(event: HookEvent): Promise<void> {
        await this.execute(event);
      }

      async execute(event: HookEvent): Promise<HookResult> {
        if (event.content.includes('rm -rf')) {
          return this.block('Dangerous command detected');
        }
        return this.allow({ validated: true });
      }
    }

    emitter.registerHandler(new SecurityHook());

    // Safe operation should proceed
    const safeEvent = createTestEvent('list files');
    const safeResult = await emitter.executeHook('security-hook', safeEvent);
    expect(safeResult.action).toBe(HookAction.ALLOW);

    // Dangerous operation should be blocked
    const dangerousEvent = createTestEvent('rm -rf /');
    await expect(emitter.executeHook('security-hook', dangerousEvent)).rejects.toThrow(
      HookBlockedError
    );
  });

  it('should support data transformation through hooks', async () => {
    const emitter = new HookEventEmitter();

    // Register a sanitization hook that modifies data
    class SanitizeHook extends BaseHookHandler implements EnforcingHookHandler {
      readonly name = 'sanitize-hook';
      readonly eventType = EventType.STOP;

      async handle(event: HookEvent): Promise<void> {
        await this.execute(event);
      }

      async execute(event: HookEvent): Promise<HookResult> {
        // Sanitize content from event by removing script tags
        const sanitized = event.content.replace(/<script>.*<\/script>/gi, '');
        return this.modify({ content: sanitized }, 'Content sanitized');
      }
    }

    emitter.registerHandler(new SanitizeHook());

    // Pass dirty content in the event
    const dirtyEvent = createTestEvent('Hello <script>evil()</script> World');
    const originalData = { content: 'original' };
    const cleanData = await emitter.executeHookWithData('sanitize-hook', dirtyEvent, originalData);

    // The hook should return modified data from the event sanitization
    expect(cleanData.content).toBe('Hello  World');
  });
});
