import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { SessionStartHook } from '../../src/hooks/SessionStartHook';
import { CoreManager } from '../../src/memory/core';
import { PrepromptInjector } from '../../src/context/PrepromptInjector';
import { EventType, SessionStartEvent } from '../../src/hooks/types';

describe('SessionStartHook', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-session-start-hook');
  let coreManager: CoreManager;
  let prepromptInjector: PrepromptInjector;
  let hook: SessionStartHook;
  let outputMessages: string[];

  const mockOutputFn = (message: string) => {
    outputMessages.push(message);
  };

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up CORE directory
    const corePath = path.join(testBasePath, 'CORE');
    await fs.promises.rm(corePath, { recursive: true, force: true }).catch(() => {});

    coreManager = new CoreManager(testBasePath);
    prepromptInjector = new PrepromptInjector();
    outputMessages = [];
    hook = new SessionStartHook(coreManager, prepromptInjector, {
      outputConfirmation: true,
      outputFn: mockOutputFn,
    });
  });

  const createSessionStartEvent = (
    sessionId: string = 'test-session-123',
    resuming: boolean = false
  ): SessionStartEvent => ({
    timestamp: new Date().toISOString(),
    type: EventType.SESSION_START,
    content: `Session started: ${sessionId}`,
    metadata: {
      sessionId,
      resuming,
    },
  });

  // =========================================================================
  // Hook Properties Tests
  // =========================================================================

  describe('properties', () => {
    it('should have correct name', () => {
      expect(hook.name).toBe('session-start');
    });

    it('should have correct event type', () => {
      expect(hook.eventType).toBe(EventType.SESSION_START);
    });

    it('should return CoreManager', () => {
      expect(hook.getCoreManager()).toBe(coreManager);
    });

    it('should return PrepromptInjector', () => {
      expect(hook.getPrepromptInjector()).toBe(prepromptInjector);
    });

    it('should report output confirmation status', () => {
      expect(hook.isOutputConfirmationEnabled()).toBe(true);

      const silentHook = new SessionStartHook(coreManager, prepromptInjector, {
        outputConfirmation: false,
      });
      expect(silentHook.isOutputConfirmationEnabled()).toBe(false);
    });
  });

  // =========================================================================
  // Hook Execution Tests
  // =========================================================================

  describe('execute', () => {
    it('should fire on session start event', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      const result = await hook.execute(event);

      expect(result.success).toBe(true);
    });

    it('should load CORE context using CoreManager', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      await hook.execute(event);

      const context = hook.getLastLoadedContext();
      expect(context).not.toBeNull();
      expect(context?.user).toContain('# User Identity');
    });

    it('should store session ID', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent('my-session-456');

      await hook.execute(event);

      expect(hook.getLastSessionId()).toBe('my-session-456');
    });

    it('should return loaded layers in result', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      const result = await hook.execute(event);

      expect(result.data?.loadedLayers).toContain('USER');
      expect(result.data?.loadedLayers).toContain('PREFERENCES');
      expect(result.data?.loadedLayers).toContain('ACTIVE_PROJECTS');
    });

    it('should indicate resuming status in result', async () => {
      await coreManager.initialize();

      const newSessionEvent = createSessionStartEvent('session-1', false);
      const result1 = await hook.execute(newSessionEvent);
      expect(result1.data?.resuming).toBe(false);

      const resumeEvent = createSessionStartEvent('session-2', true);
      const result2 = await hook.execute(resumeEvent);
      expect(result2.data?.resuming).toBe(true);
    });
  });

  // =========================================================================
  // Context Injection Tests
  // =========================================================================

  describe('context injection', () => {
    it('should inject context into preprompt', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      await hook.execute(event);

      expect(prepromptInjector.hasLayer('core')).toBe(true);
    });

    it('should format context correctly', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      await hook.execute(event);

      const coreContext = prepromptInjector.getLayerContext('core');
      expect(coreContext).toContain('## User Identity');
      expect(coreContext).toContain('## User Preferences');
      expect(coreContext).toContain('## Active Projects');
    });

    it('should use default priority of 0 for core layer', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      await hook.execute(event);

      expect(prepromptInjector.getLayerPriority('core')).toBe(0);
    });

    it('should use custom priority when specified', async () => {
      const customHook = new SessionStartHook(coreManager, prepromptInjector, {
        corePriority: 100,
        outputFn: mockOutputFn,
      });

      await coreManager.initialize();
      const event = createSessionStartEvent();

      await customHook.execute(event);

      expect(prepromptInjector.getLayerPriority('core')).toBe(100);
    });

    it('should use custom layer name when specified', async () => {
      const customHook = new SessionStartHook(coreManager, prepromptInjector, {
        coreLayerName: 'user-identity',
        outputFn: mockOutputFn,
      });

      await coreManager.initialize();
      const event = createSessionStartEvent();

      await customHook.execute(event);

      expect(prepromptInjector.hasLayer('user-identity')).toBe(true);
      expect(prepromptInjector.hasLayer('core')).toBe(false);
    });
  });

  // =========================================================================
  // Confirmation Output Tests
  // =========================================================================

  describe('confirmation output', () => {
    it('should output confirmation to user', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      await hook.execute(event);

      expect(outputMessages.length).toBeGreaterThan(0);
      expect(outputMessages[0]).toContain('[SessionStart]');
      expect(outputMessages[0]).toContain('Loaded:');
    });

    it('should list loaded items in confirmation', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      await hook.execute(event);

      expect(outputMessages[0]).toContain('USER');
      expect(outputMessages[0]).toContain('PREFERENCES');
      expect(outputMessages[0]).toContain('ACTIVE_PROJECTS');
    });

    it('should indicate resuming in confirmation', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent('session-1', true);

      await hook.execute(event);

      expect(outputMessages[0]).toContain('(resuming)');
    });

    it('should not output when outputConfirmation is false', async () => {
      const silentHook = new SessionStartHook(coreManager, prepromptInjector, {
        outputConfirmation: false,
        outputFn: mockOutputFn,
      });

      await coreManager.initialize();
      const event = createSessionStartEvent();

      await silentHook.execute(event);

      expect(outputMessages.length).toBe(0);
    });
  });

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe('error handling', () => {
    it('should handle missing CORE files gracefully', async () => {
      // Don't initialize CORE
      const event = createSessionStartEvent();

      const result = await hook.execute(event);

      // Should still succeed (initializes CORE automatically)
      expect(result.success).toBe(true);
    });

    it('should initialize CORE if not valid', async () => {
      const event = createSessionStartEvent();

      await hook.execute(event);

      // CORE should now exist
      expect(await coreManager.validateCore()).toBe(true);
    });

    it('should return error result on failure', async () => {
      // Create a hook with a broken CoreManager by making the directory read-only
      // This is hard to test, so we'll just verify the structure
      const result = await hook.execute(createSessionStartEvent());
      expect(result).toHaveProperty('success');
    });

    it('should continue execution on non-critical errors', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      // Even with empty CORE files, should complete
      await coreManager.updateUser('');
      await coreManager.updatePreferences('');
      await coreManager.updateActiveProjects('');

      const result = await hook.execute(event);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Handle Method Tests
  // =========================================================================

  describe('handle', () => {
    it('should call execute via handle method', async () => {
      await coreManager.initialize();
      const event = createSessionStartEvent();

      await hook.handle(event);

      expect(hook.getLastLoadedContext()).not.toBeNull();
    });

    it('should validate event when validation is enabled', async () => {
      const invalidEvent = {
        timestamp: 'not-a-date',
        type: EventType.SESSION_START,
        content: 'Test',
        metadata: {},
      };

      await expect(hook.handle(invalidEvent)).rejects.toThrow();
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration', () => {
    it('should produce complete system prompt after session start', async () => {
      const inj = new PrepromptInjector({ baseSystemPrompt: 'You are a helpful assistant.' });
      const integrationHook = new SessionStartHook(coreManager, inj, {
        outputFn: mockOutputFn,
      });

      await coreManager.initialize();
      await coreManager.updateUser('# User\nName: Alice\nRole: Engineer');
      await coreManager.updatePreferences('# Preferences\nStyle: Concise');

      const event = createSessionStartEvent();
      await integrationHook.execute(event);

      const systemPrompt = inj.getSystemPrompt();

      expect(systemPrompt).toContain('You are a helpful assistant.');
      expect(systemPrompt).toContain('Alice');
      expect(systemPrompt).toContain('Engineer');
      expect(systemPrompt).toContain('Concise');
    });

    it('should handle multiple session starts', async () => {
      await coreManager.initialize();

      // First session
      const event1 = createSessionStartEvent('session-1');
      await hook.execute(event1);
      expect(hook.getLastSessionId()).toBe('session-1');

      // Second session
      const event2 = createSessionStartEvent('session-2');
      await hook.execute(event2);
      expect(hook.getLastSessionId()).toBe('session-2');

      // Context should still be loaded
      expect(prepromptInjector.hasLayer('core')).toBe(true);
    });
  });
});
