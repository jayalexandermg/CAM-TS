import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { HistoryStorage } from '../../src/history/HistoryStorage';
import { HistoryEntry, SessionTranscript, Learning, Decision } from '../../src/history/types';

describe('HistoryStorage', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-history-storage');
  let storage: HistoryStorage;

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
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('initialize', () => {
    it('should create all required directories on initialization', async () => {
      await storage.initialize();

      const dirs = ['Sessions', 'Learnings', 'Research', 'Decisions', 'RawOutputs'];
      for (const dir of dirs) {
        const dirPath = path.join(testBasePath, dir);
        const exists = await fs.promises.stat(dirPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await storage.initialize();
      await storage.initialize();

      const sessionsPath = path.join(testBasePath, 'Sessions');
      const exists = await fs.promises.stat(sessionsPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  // =========================================================================
  // Entry Operations Tests
  // =========================================================================

  describe('saveEntry and getEntry', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save and retrieve a history entry', async () => {
      const entry: HistoryEntry = {
        id: 'test-entry-1',
        type: 'output',
        timestamp: new Date(),
        sessionId: 'session-1',
        content: 'Test output content',
        metadata: { key: 'value' }
      };

      await storage.saveEntry(entry);
      const retrieved = await storage.getEntry('test-entry-1', 'output');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(entry.id);
      expect(retrieved?.content).toBe(entry.content);
      expect(retrieved?.metadata).toEqual(entry.metadata);
    });

    it('should return null for non-existent entry', async () => {
      const result = await storage.getEntry('non-existent', 'output');
      expect(result).toBeNull();
    });

    it('should save entry to correct directory based on type', async () => {
      const entry: HistoryEntry = {
        id: 'research-entry-1',
        type: 'research',
        timestamp: new Date(),
        sessionId: 'session-1',
        content: 'Research content'
      };

      await storage.saveEntry(entry);

      const filepath = path.join(testBasePath, 'Research', 'research-entry-1.json');
      const exists = await fs.promises.stat(filepath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  // =========================================================================
  // Session Transcript Tests
  // =========================================================================

  describe('saveSessionTranscript and getSessionTranscript', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save and retrieve a session transcript', async () => {
      const transcript: SessionTranscript = {
        sessionId: 'session-123',
        startTime: new Date(),
        turns: [
          { role: 'user', content: 'Hello', timestamp: new Date() },
          { role: 'assistant', content: 'Hi there!', timestamp: new Date() }
        ]
      };

      await storage.saveSessionTranscript(transcript);
      const retrieved = await storage.getSessionTranscript('session-123');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.sessionId).toBe('session-123');
      expect(retrieved?.turns).toHaveLength(2);
    });

    it('should save session transcript as both JSON and JSONL', async () => {
      const transcript: SessionTranscript = {
        sessionId: 'session-456',
        startTime: new Date(),
        turns: [
          { role: 'user', content: 'Test', timestamp: new Date() }
        ]
      };

      await storage.saveSessionTranscript(transcript);

      const jsonPath = path.join(testBasePath, 'Sessions', 'session-456.json');
      const jsonlPath = path.join(testBasePath, 'Sessions', 'session-456.jsonl');

      const jsonExists = await fs.promises.stat(jsonPath).then(() => true).catch(() => false);
      const jsonlExists = await fs.promises.stat(jsonlPath).then(() => true).catch(() => false);

      expect(jsonExists).toBe(true);
      expect(jsonlExists).toBe(true);
    });

    it('should return null for non-existent session transcript', async () => {
      const result = await storage.getSessionTranscript('non-existent');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // Learning Tests
  // =========================================================================

  describe('saveLearning', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save learning to Learnings directory', async () => {
      const learning: Learning = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'TypeScript',
        insight: 'Use strict mode for better type safety',
        confidence: 0.9,
        timestamp: new Date()
      };

      await storage.saveLearning(learning);

      const filepath = path.join(testBasePath, 'Learnings', 'learning-1.json');
      const exists = await fs.promises.stat(filepath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.promises.readFile(filepath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.topic).toBe('TypeScript');
      expect(parsed.insight).toBe('Use strict mode for better type safety');
    });
  });

  // =========================================================================
  // Decision Tests
  // =========================================================================

  describe('saveDecision', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save decision to Decisions directory', async () => {
      const decision: Decision = {
        id: 'decision-1',
        sessionId: 'session-1',
        question: 'Which database to use?',
        decision: 'PostgreSQL',
        reasoning: 'Better for relational data',
        timestamp: new Date(),
        alternatives: ['MongoDB', 'MySQL']
      };

      await storage.saveDecision(decision);

      const filepath = path.join(testBasePath, 'Decisions', 'decision-1.json');
      const exists = await fs.promises.stat(filepath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.promises.readFile(filepath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.decision).toBe('PostgreSQL');
      expect(parsed.alternatives).toEqual(['MongoDB', 'MySQL']);
    });
  });

  // =========================================================================
  // List Entries Tests
  // =========================================================================

  describe('listEntries', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should list all entries of a specific type', async () => {
      const entry1: HistoryEntry = {
        id: 'output-1',
        type: 'output',
        timestamp: new Date(),
        sessionId: 'session-1',
        content: 'Output 1'
      };

      const entry2: HistoryEntry = {
        id: 'output-2',
        type: 'output',
        timestamp: new Date(),
        sessionId: 'session-1',
        content: 'Output 2'
      };

      await storage.saveEntry(entry1);
      await storage.saveEntry(entry2);

      const ids = await storage.listEntries('output');
      expect(ids).toContain('output-1');
      expect(ids).toContain('output-2');
      expect(ids).toHaveLength(2);
    });

    it('should return empty array for type with no entries', async () => {
      const ids = await storage.listEntries('research');
      expect(ids).toEqual([]);
    });

    it('should only return JSON files (not JSONL)', async () => {
      const transcript: SessionTranscript = {
        sessionId: 'session-789',
        startTime: new Date(),
        turns: []
      };

      await storage.saveSessionTranscript(transcript);

      const ids = await storage.listEntries('session');
      expect(ids).toContain('session-789');
      expect(ids).toHaveLength(1);
    });
  });

  // =========================================================================
  // Search Learnings Tests
  // =========================================================================

  describe('searchLearnings', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should search learnings by topic (case-insensitive)', async () => {
      // Create learnings as entries with type 'learning'
      const entry1: HistoryEntry = {
        id: 'learning-search-1',
        type: 'learning',
        timestamp: new Date(),
        sessionId: 'session-1',
        content: 'TypeScript is great for large projects'
      };

      const entry2: HistoryEntry = {
        id: 'learning-search-2',
        type: 'learning',
        timestamp: new Date(),
        sessionId: 'session-1',
        content: 'Python is good for scripting'
      };

      await storage.saveEntry(entry1);
      await storage.saveEntry(entry2);

      const results = await storage.searchLearnings('typescript');
      expect(results).toHaveLength(1);
    });

    it('should return empty array when no learnings match', async () => {
      const results = await storage.searchLearnings('nonexistent-topic');
      expect(results).toEqual([]);
    });
  });
});
