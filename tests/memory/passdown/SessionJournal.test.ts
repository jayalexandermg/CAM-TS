import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SessionJournal } from '../../../src/memory/passdown/SessionJournal';

describe('SessionJournal', () => {
  let tmpDir: string;
  let journal: SessionJournal;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `cam-journal-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    journal = new SessionJournal(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('start', () => {
    it('should create journal file and log session_start entry', async () => {
      await journal.start('test-session-1');

      const entries = await journal.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].t).toBe('session_start');
      expect(entries[0].what).toContain('test-session-1');
      expect(journal.getSessionId()).toBe('test-session-1');
    });

    it('should wipe previous journal on start', async () => {
      await journal.start('session-1');
      await journal.log('turn', 'some turn');
      expect(await journal.getEntries()).toHaveLength(2);

      await journal.start('session-2');
      const entries = await journal.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].what).toContain('session-2');
    });
  });

  describe('log', () => {
    it('should append entries with correct type and timestamp', async () => {
      await journal.start('test');
      await journal.log('decision', 'Use PostgreSQL');

      const entries = await journal.getEntries();
      expect(entries).toHaveLength(2);

      const decision = entries[1];
      expect(decision.t).toBe('decision');
      expect(decision.what).toBe('Use PostgreSQL');
      expect(decision.ts).toBeTruthy();
    });

    it('should include optional metadata', async () => {
      await journal.start('test');
      await journal.log('action', 'Created file', { files: ['foo.ts'] });

      const entries = await journal.getEntries();
      const action = entries[1];
      expect(action.meta).toEqual({ files: ['foo.ts'] });
    });

    it('should not include meta key when no metadata provided', async () => {
      await journal.start('test');
      await journal.log('note', 'Just a note');

      const entries = await journal.getEntries();
      expect(entries[1]).not.toHaveProperty('meta');
    });
  });

  describe('getEntries', () => {
    it('should return empty array when file does not exist', async () => {
      const entries = await journal.getEntries();
      expect(entries).toEqual([]);
    });

    it('should return all entries in order', async () => {
      await journal.start('test');
      await journal.log('turn', 'First');
      await journal.log('decision', 'Second');
      await journal.log('blocker', 'Third');

      const entries = await journal.getEntries();
      expect(entries).toHaveLength(4);
      expect(entries.map((e) => e.t)).toEqual([
        'session_start',
        'turn',
        'decision',
        'blocker',
      ]);
    });
  });

  describe('getFormattedSummary', () => {
    it('should return placeholder when no entries', async () => {
      const summary = await journal.getFormattedSummary();
      expect(summary).toBe('(No journal entries)');
    });

    it('should group entries by type into markdown sections', async () => {
      await journal.start('test');
      await journal.log('decision', 'Use JSONL format');
      await journal.log('action', 'Created SessionJournal.ts');
      await journal.log('turn', 'Discussed architecture');
      await journal.log('blocker', 'API key missing');

      const summary = await journal.getFormattedSummary();

      expect(summary).toContain('## Decisions');
      expect(summary).toContain('- Use JSONL format');
      expect(summary).toContain('## Actions');
      expect(summary).toContain('- Created SessionJournal.ts');
      expect(summary).toContain('## Blockers');
      expect(summary).toContain('- API key missing');
      expect(summary).toContain('## Conversation Topics');
      expect(summary).toContain('- Discussed architecture');
    });

    it('should exclude session_start and session_end from sections', async () => {
      await journal.start('test');
      await journal.log('session_end', 'Ending');

      const summary = await journal.getFormattedSummary();
      expect(summary).toBe('(No substantive entries)');
    });
  });

  describe('wipe', () => {
    it('should delete the journal file', async () => {
      await journal.start('test');
      await journal.log('turn', 'Something');

      await journal.wipe();

      const entries = await journal.getEntries();
      expect(entries).toEqual([]);
      expect(journal.getSessionId()).toBeNull();
    });

    it('should not throw when file does not exist', async () => {
      await expect(journal.wipe()).resolves.toBeUndefined();
    });
  });

  describe('getFilePath', () => {
    it('should return the journal file path', () => {
      expect(journal.getFilePath()).toBe(
        path.join(tmpDir, 'session-journal.jsonl')
      );
    });
  });
});
