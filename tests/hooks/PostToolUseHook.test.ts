import {
  PostToolUseHook,
  DEFAULT_INSIGHT_PATTERNS,
  createPostToolUseEvent,
} from '../../src/hooks/PostToolUseHook';
import { EventType, HookAction, PostToolUseEvent } from '../../src/hooks/types';
import { UOCS } from '../../src/history/UOCS';
import { HistoryStorage } from '../../src/history/HistoryStorage';

// Mock UOCS to avoid filesystem operations
jest.mock('../../src/history/UOCS');
jest.mock('../../src/history/HistoryStorage');

describe('PostToolUseHook', () => {
  let hook: PostToolUseHook;
  let mockUocs: jest.Mocked<UOCS>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock UOCS
    mockUocs = new UOCS() as jest.Mocked<UOCS>;
    mockUocs.captureOutput = jest.fn().mockResolvedValue({
      id: 'output_123',
      type: 'output',
      timestamp: new Date(),
      sessionId: 'test-session',
      content: 'test content',
    });
    mockUocs.captureTurn = jest.fn();
    mockUocs.captureLearning = jest.fn().mockResolvedValue({
      id: 'learning_123',
      sessionId: 'test-session',
      topic: 'test-tool',
      insight: 'test insight',
      confidence: 0.7,
      timestamp: new Date(),
    });

    hook = new PostToolUseHook();
  });

  // =========================================================================
  // Hook Properties Tests
  // =========================================================================

  describe('properties', () => {
    it('should have correct name', () => {
      expect(hook.name).toBe('post-tool-use');
    });

    it('should have correct event type', () => {
      expect(hook.eventType).toBe(EventType.POST_TOOL_USE);
    });

    it('should include default insight patterns', () => {
      const patterns = hook.getInsightPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toEqual(expect.arrayContaining(DEFAULT_INSIGHT_PATTERNS));
    });

    it('should have default confidence of 0.7', () => {
      expect(hook.getDefaultConfidence()).toBe(0.7);
    });

    it('should have logging enabled by default', () => {
      expect(hook.isLoggingEnabled()).toBe(true);
    });

    it('should have learning extraction enabled by default', () => {
      expect(hook.isLearningExtractionEnabled()).toBe(true);
    });

    it('should have no UOCS by default', () => {
      expect(hook.getUOCS()).toBeNull();
    });
  });

  // =========================================================================
  // Configuration Tests
  // =========================================================================

  describe('configuration', () => {
    it('should extend default patterns with custom ones', () => {
      const customPattern = /my-insight-pattern/i;
      const customHook = new PostToolUseHook({
        config: { insightPatterns: [customPattern] },
      });

      const patterns = customHook.getInsightPatterns();
      expect(patterns).toContain(customPattern);
      expect(patterns.length).toBe(DEFAULT_INSIGHT_PATTERNS.length + 1);
    });

    it('should replace default patterns when specified', () => {
      const customPattern = /my-only-pattern/i;
      const customHook = new PostToolUseHook({
        config: {
          insightPatterns: [customPattern],
          replaceDefaultPatterns: true,
        },
      });

      const patterns = customHook.getInsightPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0]).toBe(customPattern);
    });

    it('should use custom default confidence', () => {
      const customHook = new PostToolUseHook({
        config: { defaultConfidence: 0.9 },
      });

      expect(customHook.getDefaultConfidence()).toBe(0.9);
    });

    it('should disable logging when configured', () => {
      const customHook = new PostToolUseHook({
        config: { enableLogging: false },
      });

      expect(customHook.isLoggingEnabled()).toBe(false);
    });

    it('should disable learning extraction when configured', () => {
      const customHook = new PostToolUseHook({
        config: { enableLearningExtraction: false },
      });

      expect(customHook.isLearningExtractionEnabled()).toBe(false);
    });
  });

  // =========================================================================
  // UOCS Management Tests
  // =========================================================================

  describe('UOCS management', () => {
    it('should set UOCS instance', () => {
      hook.setUOCS(mockUocs);
      expect(hook.getUOCS()).toBe(mockUocs);
    });

    it('should accept UOCS in constructor', () => {
      const hookWithUocs = new PostToolUseHook({ uocs: mockUocs });
      expect(hookWithUocs.getUOCS()).toBe(mockUocs);
    });
  });

  // =========================================================================
  // Execute Tests
  // =========================================================================

  describe('execute', () => {
    it('should return ALLOW for successful tool execution', async () => {
      const event = createPostToolUseEvent(
        'ReadFile',
        { path: '/test.txt' },
        'file contents',
        true,
        50
      );
      const result = await hook.execute(event);

      expect(result.action).toBe(HookAction.ALLOW);
      expect(result.metadata?.captured).toBe(true);
      expect(result.metadata?.toolName).toBe('ReadFile');
      expect(result.metadata?.success).toBe(true);
    });

    it('should return ALLOW for failed tool execution', async () => {
      const event = createPostToolUseEvent(
        'WriteFile',
        { path: '/test.txt' },
        null,
        false,
        25,
        undefined,
        new Error('Permission denied')
      );
      const result = await hook.execute(event);

      expect(result.action).toBe(HookAction.ALLOW);
      expect(result.metadata?.success).toBe(false);
    });

    it('should capture to UOCS when UOCS is set', async () => {
      hook.setUOCS(mockUocs);

      const event = createPostToolUseEvent(
        'TestTool',
        { arg: 'value' },
        { result: 'data' },
        true,
        100,
        { sessionId: 'session-123', agentId: 'agent-456' }
      );
      await hook.execute(event);

      expect(mockUocs.captureOutput).toHaveBeenCalledTimes(1);
      expect(mockUocs.captureTurn).toHaveBeenCalledTimes(1);
    });

    it('should not capture to UOCS when UOCS is not set', async () => {
      const event = createPostToolUseEvent(
        'TestTool',
        {},
        {},
        true,
        50
      );
      await hook.execute(event);

      expect(mockUocs.captureOutput).not.toHaveBeenCalled();
      expect(mockUocs.captureTurn).not.toHaveBeenCalled();
    });

    it('should include duration in result metadata', async () => {
      const event = createPostToolUseEvent(
        'SlowTool',
        {},
        {},
        true,
        5000
      );
      const result = await hook.execute(event);

      expect(result.metadata?.duration).toBe(5000);
    });
  });

  // =========================================================================
  // Learning Extraction Tests
  // =========================================================================

  describe('learning extraction', () => {
    beforeEach(() => {
      hook.setUOCS(mockUocs);
    });

    it('should extract learnings from output containing insight patterns', async () => {
      const event = createPostToolUseEvent(
        'AnalyzeTool',
        {},
        'I discovered the bug was in the parser module',
        true,
        100,
        { sessionId: 'session-123' }
      );
      const result = await hook.execute(event);

      expect(mockUocs.captureLearning).toHaveBeenCalledWith(
        'session-123',
        'AnalyzeTool',
        'the bug was in the parser module',
        0.7,
        'Tool: AnalyzeTool'
      );
      expect(result.metadata?.learningsExtracted).toBeGreaterThan(0);
    });

    it('should extract learnings with "learned that" pattern', async () => {
      const event = createPostToolUseEvent(
        'TestTool',
        {},
        'We learned that caching improves performance by 50%',
        true,
        100,
        { sessionId: 'test-session' }
      );
      await hook.execute(event);

      expect(mockUocs.captureLearning).toHaveBeenCalled();
    });

    it('should extract learnings with "found that" pattern', async () => {
      const event = createPostToolUseEvent(
        'TestTool',
        {},
        'The analysis found that memory usage was high',
        true,
        100,
        { sessionId: 'test-session' }
      );
      await hook.execute(event);

      expect(mockUocs.captureLearning).toHaveBeenCalled();
    });

    it('should not extract learnings from failed tool executions', async () => {
      const event = createPostToolUseEvent(
        'TestTool',
        {},
        'discovered something important',
        false,
        100,
        { sessionId: 'test-session' }
      );
      await hook.execute(event);

      expect(mockUocs.captureLearning).not.toHaveBeenCalled();
    });

    it('should not extract learnings when disabled', async () => {
      const hookNoLearning = new PostToolUseHook({
        uocs: mockUocs,
        config: { enableLearningExtraction: false },
      });

      const event = createPostToolUseEvent(
        'TestTool',
        {},
        'discovered the root cause',
        true,
        100,
        { sessionId: 'test-session' }
      );
      await hookNoLearning.execute(event);

      expect(mockUocs.captureLearning).not.toHaveBeenCalled();
    });

    it('should handle JSON output for learning extraction', async () => {
      const event = createPostToolUseEvent(
        'TestTool',
        {},
        { message: 'I learned that tests are important' },
        true,
        100,
        { sessionId: 'test-session' }
      );
      await hook.execute(event);

      expect(mockUocs.captureLearning).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Logging Tests
  // =========================================================================

  describe('logging', () => {
    it('should log tool output', async () => {
      const event = createPostToolUseEvent('TestTool', {}, 'result', true, 50);
      await hook.execute(event);

      const log = hook.getOutputLog();
      expect(log.length).toBe(1);
      expect(log[0].event.metadata.toolName).toBe('TestTool');
    });

    it('should log failed executions', async () => {
      const event = createPostToolUseEvent('FailTool', {}, null, false, 100);
      await hook.execute(event);

      const log = hook.getOutputLog();
      expect(log.length).toBe(1);
      expect(log[0].event.metadata.success).toBe(false);
    });

    it('should not log when logging is disabled', async () => {
      const customHook = new PostToolUseHook({
        config: { enableLogging: false },
      });

      const event = createPostToolUseEvent('TestTool', {}, 'result', true, 50);
      await customHook.execute(event);

      const log = customHook.getOutputLog();
      expect(log.length).toBe(0);
    });

    it('should call custom log handler', async () => {
      const loggedEvents: PostToolUseEvent[] = [];
      const customHook = new PostToolUseHook({
        config: {
          logHandler: (event) => {
            loggedEvents.push(event);
          },
        },
      });

      const event = createPostToolUseEvent('TestTool', {}, 'result', true, 50);
      await customHook.execute(event);

      expect(loggedEvents.length).toBe(1);
      expect(loggedEvents[0].metadata.toolName).toBe('TestTool');
    });

    it('should clear output log', async () => {
      const event = createPostToolUseEvent('TestTool', {}, 'result', true, 50);
      await hook.execute(event);
      expect(hook.getOutputLog().length).toBe(1);

      hook.clearOutputLog();
      expect(hook.getOutputLog().length).toBe(0);
    });
  });

  // =========================================================================
  // Dynamic Configuration Tests
  // =========================================================================

  describe('dynamic configuration', () => {
    it('should add insight patterns dynamically', async () => {
      hook.setUOCS(mockUocs);
      hook.addInsightPattern(/custom-insight: (.+)/i);

      const event = createPostToolUseEvent(
        'TestTool',
        {},
        'custom-insight: this is a custom learning',
        true,
        50,
        { sessionId: 'test-session' }
      );
      await hook.execute(event);

      expect(mockUocs.captureLearning).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Handle Method Tests
  // =========================================================================

  describe('handle', () => {
    it('should call execute via handle method', async () => {
      const event = createPostToolUseEvent('TestTool', {}, 'result', true, 50);
      await hook.handle(event);

      const log = hook.getOutputLog();
      expect(log.length).toBe(1);
    });

    it('should validate event when validation is enabled', async () => {
      const invalidEvent = {
        timestamp: 'not-a-date',
        type: EventType.POST_TOOL_USE,
        content: 'Test',
        metadata: {
          toolName: 'Test',
          toolInput: {},
          toolOutput: {},
          duration: 50,
          success: true,
        },
      } as PostToolUseEvent;

      await expect(hook.handle(invalidEvent)).rejects.toThrow();
    });
  });

  // =========================================================================
  // createPostToolUseEvent Helper Tests
  // =========================================================================

  describe('createPostToolUseEvent', () => {
    it('should create event with correct type', () => {
      const event = createPostToolUseEvent('TestTool', {}, {}, true, 100);
      expect(event.type).toBe(EventType.POST_TOOL_USE);
    });

    it('should include tool name and output', () => {
      const event = createPostToolUseEvent(
        'MyTool',
        { input: 'data' },
        { output: 'result' },
        true,
        50
      );
      expect(event.metadata.toolName).toBe('MyTool');
      expect(event.metadata.toolInput).toEqual({ input: 'data' });
      expect(event.metadata.toolOutput).toEqual({ output: 'result' });
    });

    it('should include duration and success', () => {
      const event = createPostToolUseEvent('TestTool', {}, {}, true, 250);
      expect(event.metadata.duration).toBe(250);
      expect(event.metadata.success).toBe(true);
    });

    it('should include context when provided', () => {
      const context = {
        skillName: 'TestSkill',
        sessionId: 'session-123',
        userId: 'user-456',
        agentId: 'agent-789',
        workingDirectory: '/path/to/dir',
      };
      const event = createPostToolUseEvent('TestTool', {}, {}, true, 50, context);

      expect(event.metadata.context).toEqual(context);
    });

    it('should include error when provided', () => {
      const error = new Error('Test error');
      const event = createPostToolUseEvent(
        'TestTool',
        {},
        null,
        false,
        50,
        undefined,
        error
      );

      expect(event.metadata.error).toBe(error);
    });

    it('should have valid timestamp', () => {
      const event = createPostToolUseEvent('TestTool', {}, {}, true, 50);
      const date = new Date(event.timestamp);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should include content with tool name and status', () => {
      const successEvent = createPostToolUseEvent('SuccessTool', {}, {}, true, 50);
      expect(successEvent.content).toContain('SuccessTool');
      expect(successEvent.content).toContain('completed');

      const failEvent = createPostToolUseEvent('FailTool', {}, {}, false, 50);
      expect(failEvent.content).toContain('FailTool');
      expect(failEvent.content).toContain('failed');
    });
  });
});
