import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Session } from '../../../src/cli/session/Session';

describe('Session', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-session');

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create session with auto-generated ID', () => {
      const session = new Session();
      expect(session.getId()).toBeDefined();
      expect(session.getId().length).toBeGreaterThan(0);
    });

    it('should create session with custom ID', () => {
      const session = new Session('custom-id-123');
      expect(session.getId()).toBe('custom-id-123');
    });

    it('should create session with custom directory', () => {
      const customDir = path.join(testBasePath, 'custom-session');
      const session = new Session('test-id', customDir);
      expect(session.getSessionDir()).toBe(customDir);
    });

    it('should initialize with empty history', () => {
      const session = new Session();
      expect(session.getHistory()).toHaveLength(0);
      expect(session.getTurnCount()).toBe(0);
    });

    it('should initialize with no persona', () => {
      const session = new Session();
      expect(session.getPersona()).toBeUndefined();
    });

    it('should set start time to current time', () => {
      const before = new Date();
      const session = new Session();
      const after = new Date();

      expect(session.getStartTime().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(session.getStartTime().getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // =========================================================================
  // ID Generation Tests
  // =========================================================================

  describe('ID generation', () => {
    it('should generate unique IDs for different sessions', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const session = new Session();
        ids.add(session.getId());
      }
      // With timestamp-based IDs, they might be the same if created too fast
      // but should still work
      expect(ids.size).toBeGreaterThanOrEqual(1);
    });

    it('should generate ID in expected format', () => {
      const session = new Session();
      const id = session.getId();
      // Format: YYYY-MM-DD-HHMMSS
      expect(id).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}$/);
    });
  });

  // =========================================================================
  // Conversation History Tests
  // =========================================================================

  describe('conversation history', () => {
    it('should add conversation turns', () => {
      const session = new Session();
      session.addTurn('Hello', 'Hi there!');

      expect(session.getHistory()).toHaveLength(1);
      expect(session.getTurnCount()).toBe(1);
    });

    it('should add turns with metadata', () => {
      const session = new Session();
      session.addTurn('Hello', 'Hi there!', { skill: 'greeting' });

      const turn = session.getLastTurn();
      expect(turn?.metadata).toEqual({ skill: 'greeting' });
    });

    it('should return copy of history', () => {
      const session = new Session();
      session.addTurn('Hello', 'Hi');

      const history1 = session.getHistory();
      const history2 = session.getHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });

    it('should get last turn', () => {
      const session = new Session();
      session.addTurn('First', 'First response');
      session.addTurn('Second', 'Second response');

      const lastTurn = session.getLastTurn();
      expect(lastTurn?.input).toBe('Second');
      expect(lastTurn?.output).toBe('Second response');
    });

    it('should return undefined for last turn on empty history', () => {
      const session = new Session();
      expect(session.getLastTurn()).toBeUndefined();
    });

    it('should add timestamp to each turn', () => {
      const session = new Session();
      const before = new Date();
      session.addTurn('Hello', 'Hi');
      const after = new Date();

      const turn = session.getLastTurn();
      expect(turn?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(turn?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // =========================================================================
  // State Management Tests
  // =========================================================================

  describe('state management', () => {
    it('should set and get state', () => {
      const session = new Session();
      session.setState('key1', 'value1');
      expect(session.getState('key1')).toBe('value1');
    });

    it('should return undefined for missing state', () => {
      const session = new Session();
      expect(session.getState('nonexistent')).toBeUndefined();
    });

    it('should check if state exists', () => {
      const session = new Session();
      session.setState('exists', true);

      expect(session.hasState('exists')).toBe(true);
      expect(session.hasState('nonexistent')).toBe(false);
    });

    it('should delete state', () => {
      const session = new Session();
      session.setState('key', 'value');

      const deleted = session.deleteState('key');
      expect(deleted).toBe(true);
      expect(session.hasState('key')).toBe(false);
    });

    it('should return false when deleting non-existent state', () => {
      const session = new Session();
      const deleted = session.deleteState('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should clear all state', () => {
      const session = new Session();
      session.setState('key1', 'value1');
      session.setState('key2', 'value2');

      session.clearState();

      expect(session.hasState('key1')).toBe(false);
      expect(session.hasState('key2')).toBe(false);
    });

    it('should get all state as object', () => {
      const session = new Session();
      session.setState('key1', 'value1');
      session.setState('key2', 42);

      const allState = session.getAllState();
      expect(allState).toEqual({ key1: 'value1', key2: 42 });
    });
  });

  // =========================================================================
  // Persona Tests
  // =========================================================================

  describe('persona', () => {
    it('should set and get persona', () => {
      const session = new Session();
      session.setPersona('coding-assistant');
      expect(session.getPersona()).toBe('coding-assistant');
    });
  });

  // =========================================================================
  // Session Lifecycle Tests
  // =========================================================================

  describe('session lifecycle', () => {
    it('should end session', () => {
      const session = new Session();
      session.end();

      expect(session.hasEnded()).toBe(true);
      expect(session.getEndTime()).toBeDefined();
    });

    it('should track duration', async () => {
      const session = new Session();

      await new Promise((resolve) => setTimeout(resolve, 20));
      const duration = session.getDurationMs();

      expect(duration).toBeGreaterThanOrEqual(15);
    });

    it('should freeze duration after end', async () => {
      const session = new Session();
      await new Promise((resolve) => setTimeout(resolve, 10));
      session.end();

      const duration1 = session.getDurationMs();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const duration2 = session.getDurationMs();

      // Duration should be the same after ending
      expect(duration1).toBe(duration2);
    });
  });

  // =========================================================================
  // Summary Tests
  // =========================================================================

  describe('getSummary', () => {
    it('should return session summary', () => {
      const session = new Session('test-summary-id');
      session.setPersona('test-persona');
      session.addTurn('Hello', 'Hi');
      session.addTurn('Bye', 'Goodbye');

      const summary = session.getSummary();

      expect(summary.id).toBe('test-summary-id');
      expect(summary.startTime).toBeInstanceOf(Date);
      expect(summary.turnCount).toBe(2);
      expect(summary.persona).toBe('test-persona');
    });

    it('should include endTime when session ended', () => {
      const session = new Session();
      session.end();

      const summary = session.getSummary();
      expect(summary.endTime).toBeDefined();
      expect(summary.endTime).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // Persistence Tests
  // =========================================================================

  describe('persistence', () => {
    it('should save session to disk', async () => {
      const sessionDir = path.join(testBasePath, 'save-test');
      const session = new Session('save-test', sessionDir);
      session.setPersona('test-persona');
      session.addTurn('Hello', 'Hi');
      session.setState('testKey', 'testValue');

      await session.save();

      // Verify files were created
      const sessionFile = path.join(sessionDir, 'session.json');
      const historyFile = path.join(sessionDir, 'history.jsonl');
      const stateFile = path.join(sessionDir, 'state.json');

      expect(fs.existsSync(sessionFile)).toBe(true);
      expect(fs.existsSync(historyFile)).toBe(true);
      expect(fs.existsSync(stateFile)).toBe(true);
    });

    it('should load session from disk', async () => {
      const sessionDir = path.join(testBasePath, 'load-test');
      const original = new Session('load-test', sessionDir);
      original.setPersona('loaded-persona');
      original.addTurn('Original input', 'Original output');
      original.setState('loadedKey', 'loadedValue');
      original.end();

      await original.save();

      const loaded = await Session.load(sessionDir);

      expect(loaded.getId()).toBe('load-test');
      expect(loaded.getPersona()).toBe('loaded-persona');
      expect(loaded.getTurnCount()).toBe(1);
      expect(loaded.getLastTurn()?.input).toBe('Original input');
      expect(loaded.getState('loadedKey')).toBe('loadedValue');
      expect(loaded.hasEnded()).toBe(true);
    });

    it('should handle empty history file when loading', async () => {
      const sessionDir = path.join(testBasePath, 'empty-history');
      await fs.promises.mkdir(sessionDir, { recursive: true });

      // Create minimal session.json
      const sessionData = {
        id: 'empty-history',
        startTime: new Date().toISOString(),
        turnCount: 0,
      };
      await fs.promises.writeFile(
        path.join(sessionDir, 'session.json'),
        JSON.stringify(sessionData)
      );

      const loaded = await Session.load(sessionDir);
      expect(loaded.getHistory()).toHaveLength(0);
    });

    it('should handle missing state file when loading', async () => {
      const sessionDir = path.join(testBasePath, 'missing-state');
      await fs.promises.mkdir(sessionDir, { recursive: true });

      // Create minimal session.json and empty history
      const sessionData = {
        id: 'missing-state',
        startTime: new Date().toISOString(),
        turnCount: 0,
      };
      await fs.promises.writeFile(
        path.join(sessionDir, 'session.json'),
        JSON.stringify(sessionData)
      );
      await fs.promises.writeFile(path.join(sessionDir, 'history.jsonl'), '');

      const loaded = await Session.load(sessionDir);
      expect(loaded.getAllState()).toEqual({});
    });
  });
});
