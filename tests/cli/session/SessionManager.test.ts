import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { SessionManager } from '../../../src/cli/session/SessionManager';
import { Session } from '../../../src/cli/session/Session';

describe('SessionManager', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-cli-session-manager');
  let manager: SessionManager;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up sessions directory before each test
    await fs.promises.rm(testBasePath, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(testBasePath, { recursive: true });
    manager = new SessionManager(testBasePath);
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create manager with custom sessions directory', () => {
      const customDir = path.join(testBasePath, 'custom');
      const customManager = new SessionManager(customDir);
      expect(customManager.getSessionsDir()).toBe(customDir);
    });

    it('should use default sessions directory when not specified', () => {
      const defaultManager = new SessionManager();
      expect(defaultManager.getSessionsDir()).toContain('.infinite-aura-ts');
      expect(defaultManager.getSessionsDir()).toContain('sessions');
    });
  });

  // =========================================================================
  // Session Creation Tests
  // =========================================================================

  describe('createSession', () => {
    it('should create a new session', () => {
      const session = manager.createSession();
      expect(session).toBeInstanceOf(Session);
      expect(session.getId()).toBeDefined();
    });

    it('should create session with specific ID', () => {
      const session = manager.createSessionWithId('specific-id');
      expect(session.getId()).toBe('specific-id');
    });

    it('should set correct session directory for session with ID', () => {
      const session = manager.createSessionWithId('dir-test-id');
      expect(session.getSessionDir()).toBe(path.join(testBasePath, 'dir-test-id'));
    });
  });

  // =========================================================================
  // Session Listing Tests
  // =========================================================================

  describe('listSessions', () => {
    it('should return empty array when no sessions exist', async () => {
      const sessions = await manager.listSessions();
      expect(sessions).toEqual([]);
    });

    it('should list saved sessions', async () => {
      // Create and save sessions
      const session1 = manager.createSessionWithId('session-1');
      const session2 = manager.createSessionWithId('session-2');
      await session1.save();
      await session2.save();

      const sessions = await manager.listSessions();
      expect(sessions).toHaveLength(2);
    });

    it('should sort sessions by start time (newest first)', async () => {
      // Create sessions with slight time gap
      const session1 = manager.createSessionWithId('older-session');
      await session1.save();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const session2 = manager.createSessionWithId('newer-session');
      await session2.save();

      const sessions = await manager.listSessions();
      expect(sessions[0].id).toBe('newer-session');
      expect(sessions[1].id).toBe('older-session');
    });

    it('should skip invalid session directories', async () => {
      // Create valid session
      const session = manager.createSessionWithId('valid-session');
      await session.save();

      // Create invalid directory (no session.json)
      const invalidDir = path.join(testBasePath, 'invalid-session');
      await fs.promises.mkdir(invalidDir, { recursive: true });

      const sessions = await manager.listSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('valid-session');
    });
  });

  // =========================================================================
  // Session Loading Tests
  // =========================================================================

  describe('loadSession', () => {
    it('should load existing session', async () => {
      const original = manager.createSessionWithId('load-me');
      original.setPersona('test-persona');
      original.addTurn('Hello', 'Hi');
      await original.save();

      const loaded = await manager.loadSession('load-me');

      expect(loaded.getId()).toBe('load-me');
      expect(loaded.getPersona()).toBe('test-persona');
      expect(loaded.getTurnCount()).toBe(1);
    });

    it('should throw when loading non-existent session', async () => {
      await expect(manager.loadSession('non-existent')).rejects.toThrow();
    });
  });

  // =========================================================================
  // Session Existence Tests
  // =========================================================================

  describe('sessionExists', () => {
    it('should return true for existing session', async () => {
      const session = manager.createSessionWithId('exists-test');
      await session.save();

      expect(await manager.sessionExists('exists-test')).toBe(true);
    });

    it('should return false for non-existing session', async () => {
      expect(await manager.sessionExists('non-existent')).toBe(false);
    });
  });

  // =========================================================================
  // Session Deletion Tests
  // =========================================================================

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const session = manager.createSessionWithId('delete-me');
      await session.save();

      await manager.deleteSession('delete-me');

      expect(await manager.sessionExists('delete-me')).toBe(false);
    });

    it('should not throw when deleting non-existent session', async () => {
      await expect(manager.deleteSession('non-existent')).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // Latest Session Tests
  // =========================================================================

  describe('getLatestSession', () => {
    it('should return null when no sessions exist', async () => {
      const latest = await manager.getLatestSession();
      expect(latest).toBeNull();
    });

    it('should return the most recent session', async () => {
      const session1 = manager.createSessionWithId('older');
      await session1.save();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const session2 = manager.createSessionWithId('newer');
      await session2.save();

      const latest = await manager.getLatestSession();
      expect(latest?.getId()).toBe('newer');
    });
  });

  // =========================================================================
  // Session Count Tests
  // =========================================================================

  describe('getSessionCount', () => {
    it('should return 0 when no sessions exist', async () => {
      const count = await manager.getSessionCount();
      expect(count).toBe(0);
    });

    it('should return correct session count', async () => {
      const session1 = manager.createSessionWithId('count-1');
      const session2 = manager.createSessionWithId('count-2');
      const session3 = manager.createSessionWithId('count-3');
      await session1.save();
      await session2.save();
      await session3.save();

      const count = await manager.getSessionCount();
      expect(count).toBe(3);
    });
  });

  // =========================================================================
  // Delete All Sessions Tests
  // =========================================================================

  describe('deleteAllSessions', () => {
    it('should delete all sessions', async () => {
      const session1 = manager.createSessionWithId('delete-all-1');
      const session2 = manager.createSessionWithId('delete-all-2');
      await session1.save();
      await session2.save();

      await manager.deleteAllSessions();

      const count = await manager.getSessionCount();
      expect(count).toBe(0);
    });

    it('should not throw when no sessions exist', async () => {
      await expect(manager.deleteAllSessions()).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // Find Sessions Tests
  // =========================================================================

  describe('findSessionsByPersona', () => {
    it('should find sessions by persona', async () => {
      const session1 = manager.createSessionWithId('persona-1');
      session1.setPersona('coding');
      await session1.save();

      const session2 = manager.createSessionWithId('persona-2');
      session2.setPersona('writing');
      await session2.save();

      const session3 = manager.createSessionWithId('persona-3');
      session3.setPersona('coding');
      await session3.save();

      const codingSessions = await manager.findSessionsByPersona('coding');
      expect(codingSessions).toHaveLength(2);
    });

    it('should return empty array when no matching persona', async () => {
      const session = manager.createSessionWithId('no-match');
      session.setPersona('other');
      await session.save();

      const sessions = await manager.findSessionsByPersona('nonexistent');
      expect(sessions).toHaveLength(0);
    });
  });

  describe('findSessionsByDateRange', () => {
    it('should find sessions within date range', async () => {
      const now = new Date();
      const session = manager.createSessionWithId('date-range-test');
      await session.save();

      const startDate = new Date(now.getTime() - 1000);
      const endDate = new Date(now.getTime() + 1000);

      const sessions = await manager.findSessionsByDateRange(startDate, endDate);
      expect(sessions).toHaveLength(1);
    });

    it('should exclude sessions outside date range', async () => {
      const session = manager.createSessionWithId('outside-range');
      await session.save();

      const futureStart = new Date(Date.now() + 10000);
      const futureEnd = new Date(Date.now() + 20000);

      const sessions = await manager.findSessionsByDateRange(futureStart, futureEnd);
      expect(sessions).toHaveLength(0);
    });
  });
});
