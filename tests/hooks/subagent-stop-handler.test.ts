import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SubagentStopHandler, HookEvent, EventType } from '../../src/hooks';
import { FileOperations } from '../../src/memory/file-operations';
import { DirectoryOperations } from '../../src/memory/directory-operations';
import { PathValidator } from '../../src/memory/path-validator';
import { InvalidEventError } from '../../src/exceptions';

describe('SubagentStopHandler', () => {
  let tempDir: string;
  let pathValidator: PathValidator;
  let fileOperations: FileOperations;
  let directoryOperations: DirectoryOperations;
  let handler: SubagentStopHandler;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subagent-stop-test-'));
    pathValidator = new PathValidator(tempDir);
    fileOperations = new FileOperations(pathValidator);
    directoryOperations = new DirectoryOperations(pathValidator);
    handler = new SubagentStopHandler(fileOperations, directoryOperations);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const createSubagentEvent = (agentId: string): HookEvent => ({
    timestamp: new Date().toISOString(),
    type: EventType.SUBAGENT_STOP,
    content: `Agent ${agentId} completed`,
    metadata: {
      agentId,
      taskCompleted: true,
    },
  });

  describe('constructor', () => {
    it('should have correct name', () => {
      expect(handler.name).toBe('subagent-stop');
    });

    it('should have correct event type', () => {
      expect(handler.eventType).toBe(EventType.SUBAGENT_STOP);
    });

    it('should use default base directory', () => {
      expect(handler.getBaseDirectory()).toBe('agents');
    });

    it('should allow custom base directory', () => {
      const customHandler = new SubagentStopHandler(fileOperations, directoryOperations, {
        baseDirectory: 'custom/agents',
      });
      expect(customHandler.getBaseDirectory()).toBe('custom/agents');
    });
  });

  describe('handle', () => {
    it('should create agent directory', async () => {
      await handler.handle(createSubagentEvent('researcher'));
      const dirExists = await directoryOperations.directoryExists('agents/researcher');
      expect(dirExists).toBe(true);
    });

    it('should write event to agent-specific file', async () => {
      await handler.handle(createSubagentEvent('coder'));

      const filePath = handler.getCurrentFilePath('coder');
      expect(filePath).not.toBeNull();
      expect(filePath).toContain('agents/coder');

      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());
      expect(parsed.metadata.agentId).toBe('coder');
    });

    it('should sanitize agent ID for directory name', async () => {
      await handler.handle(createSubagentEvent('Research Agent v2.0'));

      const filePath = handler.getCurrentFilePath('Research Agent v2.0');
      expect(filePath).toContain('agents/research-agent-v2-0');
    });

    it('should handle multiple agents separately', async () => {
      await handler.handle(createSubagentEvent('agent-1'));
      await handler.handle(createSubagentEvent('agent-2'));
      await handler.handle(createSubagentEvent('agent-1'));

      // agent-1 should have 2 events
      const agent1Path = handler.getCurrentFilePath('agent-1');
      const agent1Content = await fileOperations.readFile(agent1Path!);
      expect(agent1Content.trim().split('\n')).toHaveLength(2);

      // agent-2 should have 1 event
      const agent2Path = handler.getCurrentFilePath('agent-2');
      const agent2Content = await fileOperations.readFile(agent2Path!);
      expect(agent2Content.trim().split('\n')).toHaveLength(1);
    });

    it('should enrich event with subagent metadata', async () => {
      await handler.handle(createSubagentEvent('worker'));

      const filePath = handler.getCurrentFilePath('worker');
      const content = await fileOperations.readFile(filePath!);
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.stoppedAt).toBeDefined();
      expect(parsed.metadata.handledBy).toBe('subagent-stop');
    });

    it('should throw when agentId is missing and validation is enabled', async () => {
      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.SUBAGENT_STOP,
        content: 'No agent',
        metadata: {},
      };

      await expect(handler.handle(event)).rejects.toThrow(InvalidEventError);
    });

    it('should use default agentId when validation is disabled', async () => {
      const noValidationHandler = new SubagentStopHandler(fileOperations, directoryOperations, {
        validateEvents: false,
        defaultAgentId: 'fallback-agent',
      });

      const event: HookEvent = {
        timestamp: new Date().toISOString(),
        type: EventType.SUBAGENT_STOP,
        content: 'No agent',
        metadata: {},
      };

      await noValidationHandler.handle(event);
      const filePath = noValidationHandler.getCurrentFilePath('fallback-agent');
      expect(filePath).not.toBeNull();
    });
  });

  describe('getCurrentFilePath', () => {
    it('should return null for unknown agent', () => {
      expect(handler.getCurrentFilePath('unknown')).toBeNull();
    });

    it('should return correct path for known agent', async () => {
      await handler.handle(createSubagentEvent('planner'));
      const filePath = handler.getCurrentFilePath('planner');

      expect(filePath).toContain('agents/planner');
      expect(filePath).toContain('.jsonl');
    });
  });

  describe('resetFilename', () => {
    it('should reset filename for specific agent to null', async () => {
      await handler.handle(createSubagentEvent('agent-1'));
      expect(handler.getCurrentFilePath('agent-1')).not.toBeNull();

      handler.resetFilename('agent-1');
      expect(handler.getCurrentFilePath('agent-1')).toBeNull();
    });

    it('should create new file after reset when time changes', async () => {
      await handler.handle(createSubagentEvent('agent-1'));
      const firstPath = handler.getCurrentFilePath('agent-1');

      handler.resetFilename('agent-1');

      // Wait to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await handler.handle(createSubagentEvent('agent-1'));
      const secondPath = handler.getCurrentFilePath('agent-1');

      expect(secondPath).not.toBe(firstPath);
    });
  });

  describe('resetAllFilenames', () => {
    it('should reset all filenames', async () => {
      await handler.handle(createSubagentEvent('agent-1'));
      await handler.handle(createSubagentEvent('agent-2'));

      handler.resetAllFilenames();

      expect(handler.getCurrentFilePath('agent-1')).toBeNull();
      expect(handler.getCurrentFilePath('agent-2')).toBeNull();
    });
  });

  describe('getKnownAgentIds', () => {
    it('should return empty array initially', () => {
      expect(handler.getKnownAgentIds()).toHaveLength(0);
    });

    it('should return known agent IDs', async () => {
      await handler.handle(createSubagentEvent('agent-a'));
      await handler.handle(createSubagentEvent('agent-b'));

      const known = handler.getKnownAgentIds();
      expect(known).toContain('agent-a');
      expect(known).toContain('agent-b');
    });
  });
});
