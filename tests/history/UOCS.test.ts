import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { UOCS } from '../../src/history/UOCS';
import { HistoryStorage } from '../../src/history/HistoryStorage';
import { TranscriptTurn } from '../../src/history/types';

describe('UOCS', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-uocs');
  let storage: HistoryStorage;
  let uocs: UOCS;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.promises.rm(testBasePath, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(testBasePath, { recursive: true });
    storage = new HistoryStorage(testBasePath);
    uocs = new UOCS(storage);
    await uocs.initialize();
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('initialize', () => {
    it('should initialize the underlying storage', async () => {
      const newStorage = new HistoryStorage(testBasePath);
      const newUocs = new UOCS(newStorage);
      await newUocs.initialize();

      const sessionsPath = path.join(testBasePath, 'Sessions');
      const exists = await fs.promises.stat(sessionsPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create UOCS with default storage if none provided', () => {
      const defaultUocs = new UOCS();
      expect(defaultUocs).toBeDefined();
    });
  });

  // =========================================================================
  // Session Management Tests
  // =========================================================================

  describe('session management', () => {
    it('should start a session and track it as active', () => {
      uocs.startSession('session-1');

      const activeIds = uocs.getActiveSessionIds();
      expect(activeIds).toContain('session-1');
    });

    it('should emit sessionStarted event when starting a session', (done) => {
      uocs.on('sessionStarted', (data) => {
        expect(data.sessionId).toBe('session-2');
        done();
      });

      uocs.startSession('session-2');
    });

    it('should capture turns in a session', () => {
      uocs.startSession('session-3');

      const turn: TranscriptTurn = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      uocs.captureTurn('session-3', turn);

      // Retrieve and verify
      uocs.getSessionTranscript('session-3').then((transcript) => {
        expect(transcript?.turns).toHaveLength(1);
        expect(transcript?.turns[0].content).toBe('Hello');
      });
    });

    it('should emit turnCaptured event when capturing a turn', (done) => {
      uocs.startSession('session-4');

      uocs.on('turnCaptured', (data) => {
        expect(data.sessionId).toBe('session-4');
        expect(data.turn.content).toBe('Test turn');
        done();
      });

      const turn: TranscriptTurn = {
        role: 'assistant',
        content: 'Test turn',
        timestamp: new Date()
      };

      uocs.captureTurn('session-4', turn);
    });

    it('should auto-start session if capturing turn for non-existent session', () => {
      const turn: TranscriptTurn = {
        role: 'user',
        content: 'Auto-start test',
        timestamp: new Date()
      };

      uocs.captureTurn('auto-session', turn);

      const activeIds = uocs.getActiveSessionIds();
      expect(activeIds).toContain('auto-session');
    });

    it('should end session and save transcript', async () => {
      uocs.startSession('session-5');

      const turn: TranscriptTurn = {
        role: 'user',
        content: 'Final message',
        timestamp: new Date()
      };

      uocs.captureTurn('session-5', turn);
      await uocs.endSession('session-5', 'Session completed successfully');

      const activeIds = uocs.getActiveSessionIds();
      expect(activeIds).not.toContain('session-5');

      // Verify saved transcript
      const transcript = await storage.getSessionTranscript('session-5');
      expect(transcript).not.toBeNull();
      expect(transcript?.summary).toBe('Session completed successfully');
      expect(transcript?.endTime).toBeDefined();
    });

    it('should emit sessionEnded event when ending session', (done) => {
      uocs.startSession('session-6');

      uocs.on('sessionEnded', (data) => {
        expect(data.sessionId).toBe('session-6');
        expect(data.transcript).toBeDefined();
        done();
      });

      uocs.endSession('session-6');
    });

    it('should handle ending non-existent session gracefully', async () => {
      await expect(uocs.endSession('non-existent')).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // Learning Capture Tests
  // =========================================================================

  describe('learning capture', () => {
    it('should capture and save a learning', async () => {
      const learning = await uocs.captureLearning(
        'session-1',
        'TypeScript',
        'Strict mode improves code quality',
        0.95,
        'documentation'
      );

      expect(learning.id).toMatch(/^learning_\d+_/);
      expect(learning.topic).toBe('TypeScript');
      expect(learning.insight).toBe('Strict mode improves code quality');
      expect(learning.confidence).toBe(0.95);
      expect(learning.source).toBe('documentation');
    });

    it('should emit learningCaptured event', (done) => {
      uocs.on('learningCaptured', (learning) => {
        expect(learning.topic).toBe('Testing');
        done();
      });

      uocs.captureLearning('session-1', 'Testing', 'Tests are important', 0.9);
    });

    it('should use default confidence value if not provided', async () => {
      const learning = await uocs.captureLearning(
        'session-1',
        'Default confidence',
        'Test insight'
      );

      expect(learning.confidence).toBe(0.8);
    });
  });

  // =========================================================================
  // Decision Capture Tests
  // =========================================================================

  describe('decision capture', () => {
    it('should capture and save a decision', async () => {
      const decision = await uocs.captureDecision(
        'session-1',
        'Which framework?',
        'React',
        'Best community support',
        ['Vue', 'Angular']
      );

      expect(decision.id).toMatch(/^decision_\d+_/);
      expect(decision.question).toBe('Which framework?');
      expect(decision.decision).toBe('React');
      expect(decision.reasoning).toBe('Best community support');
      expect(decision.alternatives).toEqual(['Vue', 'Angular']);
    });

    it('should emit decisionCaptured event', (done) => {
      uocs.on('decisionCaptured', (decision) => {
        expect(decision.question).toBe('Test question');
        done();
      });

      uocs.captureDecision('session-1', 'Test question', 'Answer', 'Reason');
    });
  });

  // =========================================================================
  // Output Capture Tests
  // =========================================================================

  describe('output capture', () => {
    it('should capture and save raw output', async () => {
      const output = await uocs.captureOutput(
        'session-1',
        'Raw output content',
        'agent-1',
        { type: 'code', language: 'typescript' }
      );

      expect(output.id).toMatch(/^output_\d+_/);
      expect(output.type).toBe('output');
      expect(output.content).toBe('Raw output content');
      expect(output.agentId).toBe('agent-1');
      expect(output.metadata).toEqual({ type: 'code', language: 'typescript' });
    });

    it('should emit outputCaptured event', (done) => {
      uocs.on('outputCaptured', (entry) => {
        expect(entry.content).toBe('Test output');
        done();
      });

      uocs.captureOutput('session-1', 'Test output');
    });
  });

  // =========================================================================
  // Retrieval Tests
  // =========================================================================

  describe('retrieval', () => {
    it('should retrieve active session transcript from memory', async () => {
      uocs.startSession('active-session');

      const turn: TranscriptTurn = {
        role: 'user',
        content: 'In-memory turn',
        timestamp: new Date()
      };

      uocs.captureTurn('active-session', turn);

      const transcript = await uocs.getSessionTranscript('active-session');
      expect(transcript).not.toBeNull();
      expect(transcript?.turns[0].content).toBe('In-memory turn');
    });

    it('should retrieve ended session transcript from storage', async () => {
      uocs.startSession('ended-session');

      const turn: TranscriptTurn = {
        role: 'user',
        content: 'Stored turn',
        timestamp: new Date()
      };

      uocs.captureTurn('ended-session', turn);
      await uocs.endSession('ended-session');

      const transcript = await uocs.getSessionTranscript('ended-session');
      expect(transcript).not.toBeNull();
      expect(transcript?.turns[0].content).toBe('Stored turn');
    });

    it('should return null for non-existent session', async () => {
      const transcript = await uocs.getSessionTranscript('non-existent');
      expect(transcript).toBeNull();
    });

    it('should search learnings by topic', async () => {
      // Create a learning entry through storage
      const entry = {
        id: 'search-learning-1',
        type: 'learning' as const,
        timestamp: new Date(),
        sessionId: 'session-1',
        content: 'JavaScript async/await patterns'
      };

      await storage.saveEntry(entry);

      const results = await uocs.searchLearnings('javascript');
      expect(results).toHaveLength(1);
    });
  });

  // =========================================================================
  // ID Generation Tests
  // =========================================================================

  describe('id generation', () => {
    it('should generate unique IDs for learnings', async () => {
      const learning1 = await uocs.captureLearning('s1', 't1', 'i1');
      const learning2 = await uocs.captureLearning('s1', 't2', 'i2');

      expect(learning1.id).not.toBe(learning2.id);
    });

    it('should generate unique IDs for decisions', async () => {
      const decision1 = await uocs.captureDecision('s1', 'q1', 'd1', 'r1');
      const decision2 = await uocs.captureDecision('s1', 'q2', 'd2', 'r2');

      expect(decision1.id).not.toBe(decision2.id);
    });

    it('should generate unique IDs for outputs', async () => {
      const output1 = await uocs.captureOutput('s1', 'c1');
      const output2 = await uocs.captureOutput('s1', 'c2');

      expect(output1.id).not.toBe(output2.id);
    });
  });
});
