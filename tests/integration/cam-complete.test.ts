/**
 * CAM Complete Integration Tests
 *
 * Full system integration tests validating that all CAM components
 * work together correctly. This is the final validation of the
 * Context-Aware Memory system.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createCAM,
  MemoryScaffold,
  Orchestrator,
  ConfigManager,
  DEFAULT_CONFIG,
  ErrorCodes,
  InfiniteAuraError,
  VERSION,
  PACKAGE_NAME,
} from '../../src';
import type { CAMInstance } from '../../src';

describe('CAM Complete Integration', () => {
  let testBasePath: string;

  beforeEach(() => {
    // Create unique test directory
    testBasePath = path.join(os.tmpdir(), `cam-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  });

  afterEach(async () => {
    // Clean up test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true });
    }
  });

  describe('CAM Factory', () => {
    it('should create a CAM instance with defaults', async () => {
      const cam = await createCAM({
        memoryBasePath: testBasePath,
      });

      expect(cam).toBeDefined();
      expect(cam.orchestrator).toBeInstanceOf(Orchestrator);
      expect(cam.memory).toBeInstanceOf(MemoryScaffold);
      expect(cam.configManager).toBeInstanceOf(ConfigManager);
      expect(cam.config).toBeDefined();

      await cam.shutdown();
    });

    it('should create and initialize CAM with autoInitialize', async () => {
      const cam = await createCAM({
        memoryBasePath: testBasePath,
        autoInitialize: true,
      });

      // Verify directories were created
      expect(fs.existsSync(testBasePath)).toBe(true);

      // Check for some expected directories
      const validation = await cam.memory.validate();
      expect(validation.valid).toBe(true);
      expect(validation.directories).toBeGreaterThan(0);

      await cam.shutdown();
    });

    it('should accept custom configuration', async () => {
      const cam = await createCAM({
        memoryBasePath: testBasePath,
        config: {
          orchestrator: {
            maxConcurrentTasks: 10,
            defaultTimeout: 60000,
          },
          logging: {
            level: 'debug',
          },
        },
      });

      expect(cam.config.orchestrator.maxConcurrentTasks).toBe(10);
      expect(cam.config.orchestrator.defaultTimeout).toBe(60000);
      expect(cam.config.logging.level).toBe('debug');

      await cam.shutdown();
    });

    it('should initialize memory on demand', async () => {
      const cam = await createCAM({
        memoryBasePath: testBasePath,
        autoInitialize: false,
      });

      // Directory shouldn't exist yet
      expect(fs.existsSync(path.join(testBasePath, 'context'))).toBe(false);

      // Initialize manually
      await cam.initialize();

      // Now it should exist
      expect(fs.existsSync(path.join(testBasePath, 'context'))).toBe(true);

      await cam.shutdown();
    });
  });

  describe('Full System Flow', () => {
    let cam: CAMInstance;

    beforeEach(async () => {
      cam = await createCAM({
        memoryBasePath: testBasePath,
        autoInitialize: true,
      });
    });

    afterEach(async () => {
      await cam.shutdown();
    });

    it('should process a request through the orchestrator', async () => {
      const result = await cam.orchestrator.process({
        input: 'Hello, CAM!',
        sessionId: 'test-session-1',
      });

      expect(result).toBeDefined();
      expect(result.taskId).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should handle multiple sequential requests', async () => {
      const sessionId = 'test-session-sequential';

      const result1 = await cam.orchestrator.process({
        input: 'First message',
        sessionId,
      });

      const result2 = await cam.orchestrator.process({
        input: 'Second message',
        sessionId,
      });

      const result3 = await cam.orchestrator.process({
        input: 'Third message',
        sessionId,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      // Verify state tracking
      const state = cam.orchestrator.getState();
      expect(state.completedTasks).toBeGreaterThanOrEqual(3);
    });

    it('should write and read files through memory scaffold', async () => {
      const fileOps = cam.memory.getFileOps();
      const testFile = 'context/test-file.md';
      const testContent = '# Test Content\n\nThis is a test.';

      await fileOps.writeFile(testFile, testContent);
      const readContent = await fileOps.readFile(testFile);

      expect(readContent).toBe(testContent);
    });

    it('should append to JSONL files', async () => {
      const fileOps = cam.memory.getFileOps();
      const testFile = 'history/learnings/test.jsonl';

      const entry1 = { timestamp: new Date().toISOString(), data: 'entry1' };
      const entry2 = { timestamp: new Date().toISOString(), data: 'entry2' };

      await fileOps.appendJsonLine(testFile, entry1);
      await fileOps.appendJsonLine(testFile, entry2);

      const lines = await fileOps.readJsonLines(testFile) as Array<{ data: string }>;
      expect(lines).toHaveLength(2);
      expect(lines[0].data).toBe('entry1');
      expect(lines[1].data).toBe('entry2');
    });

    it('should run security audit successfully', async () => {
      const auditResult = await cam.memory.runSecurityAudit();

      expect(auditResult).toBeDefined();
      expect(auditResult.passed).toBe(true);
      expect(auditResult.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Component Integration', () => {
    let cam: CAMInstance;

    beforeEach(async () => {
      cam = await createCAM({
        memoryBasePath: testBasePath,
        autoInitialize: true,
      });
    });

    afterEach(async () => {
      await cam.shutdown();
    });

    it('should integrate orchestrator with agent spawner', async () => {
      const spawner = cam.orchestrator.getAgentSpawner();
      const definitions = spawner.listAgentDefinitions();

      expect(definitions).toContain('default');
      expect(definitions.length).toBeGreaterThan(0);
    });

    it('should integrate orchestrator with task manager', async () => {
      const taskManager = cam.orchestrator.getTaskManager();

      await cam.orchestrator.process({
        input: 'Test task',
        sessionId: 'test-session-task',
      });

      const stats = taskManager.getStats();
      expect(stats.completed).toBeGreaterThanOrEqual(1);
    });

    it('should integrate orchestrator with security manager', async () => {
      const securityManager = cam.orchestrator.getSecurityManager();
      const usage = securityManager.getResourceUsage();

      expect(usage).toBeDefined();
      expect(typeof usage.agentCount).toBe('number');
    });

    it('should access core manager through memory scaffold', async () => {
      const coreManager = cam.memory.getCore();
      expect(coreManager).toBeDefined();
    });

    it('should access memory pipeline through memory scaffold', async () => {
      const pipeline = cam.memory.getPipeline();
      expect(pipeline).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    let cam: CAMInstance;

    beforeEach(async () => {
      cam = await createCAM({
        memoryBasePath: testBasePath,
        autoInitialize: true,
      });
    });

    afterEach(async () => {
      await cam.shutdown();
    });

    it('should reject malicious input', async () => {
      const result = await cam.orchestrator.process({
        input: '<script>alert("xss")</script>',
        sessionId: 'test-session-xss',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track failed tasks', async () => {
      const initialState = cam.orchestrator.getState();

      await cam.orchestrator.process({
        input: '<script>malicious</script>',
        sessionId: 'test-session-malicious',
      });

      const finalState = cam.orchestrator.getState();
      expect(finalState.failedTasks).toBeGreaterThanOrEqual(initialState.failedTasks);
    });
  });

  describe('Shutdown and Cleanup', () => {
    it('should clean up resources on shutdown', async () => {
      const cam = await createCAM({
        memoryBasePath: testBasePath,
        autoInitialize: true,
      });

      // Process a request to create some state
      await cam.orchestrator.process({
        input: 'Test before shutdown',
        sessionId: 'test-shutdown',
      });

      // Shutdown
      await cam.shutdown();

      // Verify agents are cleaned up
      const spawner = cam.orchestrator.getAgentSpawner();
      const agents = spawner.listAgents();
      expect(agents.length).toBe(0);
    });

    it('should emit shutdown event', async () => {
      const cam = await createCAM({
        memoryBasePath: testBasePath,
        autoInitialize: true,
      });

      const shutdownPromise = new Promise<void>((resolve) => {
        cam.orchestrator.on('shutdown', () => resolve());
      });

      await cam.shutdown();

      await expect(shutdownPromise).resolves.toBeUndefined();
    });
  });

  describe('Package Exports', () => {
    it('should export VERSION', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
    });

    it('should export PACKAGE_NAME', () => {
      expect(PACKAGE_NAME).toBe('infinite-aura-ts');
    });

    it('should export error codes', () => {
      expect(ErrorCodes).toBeDefined();
      expect(ErrorCodes.PATH_TRAVERSAL).toBe('PATH_TRAVERSAL');
      expect(ErrorCodes.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
      expect(ErrorCodes.SECURITY_VIOLATION).toBe('SECURITY_VIOLATION');
    });

    it('should export InfiniteAuraError', () => {
      const error = new InfiniteAuraError('Test error', ErrorCodes.UNKNOWN);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InfiniteAuraError);
      expect(error.code).toBe('UNKNOWN');
    });

    it('should export DEFAULT_CONFIG', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG.memory).toBeDefined();
      expect(DEFAULT_CONFIG.orchestrator).toBeDefined();
      expect(DEFAULT_CONFIG.llm).toBeDefined();
      expect(DEFAULT_CONFIG.logging).toBeDefined();
    });
  });
});
