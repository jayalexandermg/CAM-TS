import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ToolUsageLogger } from '../../src/hooks/ToolUsageLogger';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';
import { createPreToolUseEvent } from '../../src/hooks/PreToolUseHook';
import { HookAction, HookResult } from '../../src/hooks/types';

describe('ToolUsageLogger', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-tool-usage-logger');
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let logger: ToolUsageLogger;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up log directory
    const logPath = path.join(testBasePath, 'history', 'tool-usage');
    await fs.promises.rm(logPath, { recursive: true, force: true }).catch(() => {});

    pathValidator = new PathValidator(testBasePath);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    logger = new ToolUsageLogger(fileOperations, directoryOperations);
  });

  afterEach(async () => {
    await logger.clearLogs();
  });

  // Helper to create a mock HookResult
  const createResult = (action: HookAction, reason?: string): HookResult => ({
    action,
    reason,
    metadata: { validated: true },
  });

  // =========================================================================
  // Basic Logging Tests
  // =========================================================================

  describe('log', () => {
    it('should log a tool usage event', async () => {
      const event = createPreToolUseEvent('TestTool', ['arg1']);
      const result = createResult(HookAction.ALLOW);

      await logger.log(event, result);

      expect(logger.getMemoryCacheSize()).toBe(1);
    });

    it('should store entry in memory cache', async () => {
      const event = createPreToolUseEvent('ReadFile', ['/path/to/file']);
      const result = createResult(HookAction.ALLOW);

      await logger.log(event, result);

      const history = await logger.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].toolName).toBe('ReadFile');
    });

    it('should write entry to file', async () => {
      const event = createPreToolUseEvent('WriteFile', ['/path', 'content']);
      const result = createResult(HookAction.ALLOW);

      await logger.log(event, result);

      const filePath = logger.getCurrentFilePath();
      expect(filePath).not.toBeNull();
    });

    it('should log blocked operations with reason', async () => {
      const event = createPreToolUseEvent('Bash', ['rm -rf /']);
      const result = createResult(HookAction.BLOCK, 'Dangerous command detected');

      await logger.log(event, result);

      const history = await logger.getHistory();
      expect(history[0].action).toBe(HookAction.BLOCK);
      expect(history[0].reason).toBe('Dangerous command detected');
    });

    it('should include context in entry', async () => {
      const context = {
        skillName: 'TestSkill',
        sessionId: 'session-123',
        userId: 'user-456',
        workingDirectory: '/home/user',
      };
      const event = createPreToolUseEvent('TestTool', ['arg'], context);
      const result = createResult(HookAction.ALLOW);

      await logger.log(event, result);

      const history = await logger.getHistory();
      expect(history[0].context).toEqual(context);
    });
  });

  // =========================================================================
  // History Retrieval Tests
  // =========================================================================

  describe('getHistory', () => {
    beforeEach(async () => {
      // Log multiple events
      await logger.log(createPreToolUseEvent('Tool1', ['a']), createResult(HookAction.ALLOW));
      await logger.log(createPreToolUseEvent('Tool2', ['b']), createResult(HookAction.BLOCK, 'Blocked'));
      await logger.log(createPreToolUseEvent('Tool1', ['c']), createResult(HookAction.ALLOW));
    });

    it('should return all entries without filters', async () => {
      const history = await logger.getHistory();
      expect(history.length).toBe(3);
    });

    it('should filter by tool name', async () => {
      const history = await logger.getHistory({ toolName: 'Tool1' });
      expect(history.length).toBe(2);
      expect(history.every((e) => e.toolName === 'Tool1')).toBe(true);
    });

    it('should filter by action', async () => {
      const history = await logger.getHistory({ action: HookAction.BLOCK });
      expect(history.length).toBe(1);
      expect(history[0].toolName).toBe('Tool2');
    });

    it('should apply limit', async () => {
      const history = await logger.getHistory({ limit: 2 });
      expect(history.length).toBe(2);
    });

    it('should sort by timestamp descending', async () => {
      const history = await logger.getHistory();
      for (let i = 0; i < history.length - 1; i++) {
        const time1 = new Date(history[i].timestamp).getTime();
        const time2 = new Date(history[i + 1].timestamp).getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });
  });

  // =========================================================================
  // Filter Tests
  // =========================================================================

  describe('filters', () => {
    it('should filter by session ID', async () => {
      const context1 = { sessionId: 'session-1' };
      const context2 = { sessionId: 'session-2' };

      await logger.log(createPreToolUseEvent('Tool1', [], context1), createResult(HookAction.ALLOW));
      await logger.log(createPreToolUseEvent('Tool2', [], context2), createResult(HookAction.ALLOW));

      const history = await logger.getHistory({ sessionId: 'session-1' });
      expect(history.length).toBe(1);
      expect(history[0].toolName).toBe('Tool1');
    });

    it('should filter by time range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60000); // 1 minute ago
      const future = new Date(now.getTime() + 60000); // 1 minute in future

      await logger.log(createPreToolUseEvent('TestTool', []), createResult(HookAction.ALLOW));

      // Should include entries after past
      let history = await logger.getHistory({ since: past });
      expect(history.length).toBe(1);

      // Should exclude entries before past
      history = await logger.getHistory({ since: future });
      expect(history.length).toBe(0);
    });

    it('should combine multiple filters', async () => {
      await logger.log(createPreToolUseEvent('Tool1', []), createResult(HookAction.ALLOW));
      await logger.log(createPreToolUseEvent('Tool1', []), createResult(HookAction.BLOCK, 'Error'));
      await logger.log(createPreToolUseEvent('Tool2', []), createResult(HookAction.ALLOW));

      const history = await logger.getHistory({
        toolName: 'Tool1',
        action: HookAction.ALLOW,
      });

      expect(history.length).toBe(1);
    });
  });

  // =========================================================================
  // Memory Cache Tests
  // =========================================================================

  describe('memory cache', () => {
    it('should report cache size', async () => {
      expect(logger.getMemoryCacheSize()).toBe(0);

      await logger.log(createPreToolUseEvent('Tool1', []), createResult(HookAction.ALLOW));
      expect(logger.getMemoryCacheSize()).toBe(1);

      await logger.log(createPreToolUseEvent('Tool2', []), createResult(HookAction.ALLOW));
      expect(logger.getMemoryCacheSize()).toBe(2);
    });

    it('should clear memory cache', async () => {
      await logger.log(createPreToolUseEvent('Tool1', []), createResult(HookAction.ALLOW));
      expect(logger.getMemoryCacheSize()).toBe(1);

      logger.clearMemoryCache();
      expect(logger.getMemoryCacheSize()).toBe(0);
    });

    it('should respect max memory entries limit', async () => {
      const smallLogger = new ToolUsageLogger(fileOperations, directoryOperations, {
        maxMemoryEntries: 3,
      });

      // Log more than the limit
      for (let i = 0; i < 5; i++) {
        await smallLogger.log(
          createPreToolUseEvent(`Tool${i}`, []),
          createResult(HookAction.ALLOW)
        );
      }

      expect(smallLogger.getMemoryCacheSize()).toBe(3);
    });
  });

  // =========================================================================
  // File Operations Tests
  // =========================================================================

  describe('file operations', () => {
    it('should return current file path', async () => {
      // Before logging, no file
      expect(logger.getCurrentFilePath()).toBeNull();

      await logger.log(createPreToolUseEvent('Tool', []), createResult(HookAction.ALLOW));

      // After logging, file exists
      const filePath = logger.getCurrentFilePath();
      expect(filePath).not.toBeNull();
      expect(filePath).toContain('TOOL-USAGE');
      expect(filePath).toContain('.jsonl');
    });

    it('should return base directory', () => {
      expect(logger.getBaseDirectory()).toBe('history/tool-usage');
    });

    it('should use custom base directory', () => {
      const customLogger = new ToolUsageLogger(fileOperations, directoryOperations, {
        baseDirectory: 'custom/logs',
      });
      expect(customLogger.getBaseDirectory()).toBe('custom/logs');
    });

    it('should clear all logs including files', async () => {
      await logger.log(createPreToolUseEvent('Tool', []), createResult(HookAction.ALLOW));
      expect(logger.getMemoryCacheSize()).toBe(1);

      await logger.clearLogs();

      expect(logger.getMemoryCacheSize()).toBe(0);
      expect(logger.getCurrentFilePath()).toBeNull();
    });
  });

  // =========================================================================
  // History from Files Tests
  // =========================================================================

  describe('getHistoryFromFiles', () => {
    it('should return empty array when no files exist', async () => {
      const history = await logger.getHistoryFromFiles();
      expect(history).toEqual([]);
    });

    it('should read entries from files', async () => {
      // Log some entries to create files
      await logger.log(createPreToolUseEvent('Tool1', []), createResult(HookAction.ALLOW));
      await logger.log(createPreToolUseEvent('Tool2', []), createResult(HookAction.BLOCK, 'Error'));

      // Clear memory cache but keep files
      logger.clearMemoryCache();

      // Read from files
      const history = await logger.getHistoryFromFiles();
      expect(history.length).toBe(2);
    });

    it('should apply filters to file history', async () => {
      await logger.log(createPreToolUseEvent('Tool1', []), createResult(HookAction.ALLOW));
      await logger.log(createPreToolUseEvent('Tool2', []), createResult(HookAction.BLOCK, 'Error'));

      logger.clearMemoryCache();

      const history = await logger.getHistoryFromFiles({ action: HookAction.BLOCK });
      expect(history.length).toBe(1);
      expect(history[0].toolName).toBe('Tool2');
    });
  });
});
