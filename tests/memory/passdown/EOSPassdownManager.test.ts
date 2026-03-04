import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { EOSPassdownManager } from '../../../src/memory/passdown/EOSPassdownManager';

describe('EOSPassdownManager', () => {
  let tmpDir: string;
  let manager: EOSPassdownManager;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `cam-passdown-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    manager = new EOSPassdownManager(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('should create eos-passdowns and session-briefs directories', async () => {
      await manager.initialize();

      const eosDir = await fs.stat(manager.getEOSDir());
      const briefsDir = await fs.stat(manager.getBriefsDir());
      expect(eosDir.isDirectory()).toBe(true);
      expect(briefsDir.isDirectory()).toBe(true);
    });

    it('should be idempotent', async () => {
      await manager.initialize();
      await manager.initialize();

      const eosDir = await fs.stat(manager.getEOSDir());
      expect(eosDir.isDirectory()).toBe(true);
    });
  });

  describe('writeEOS / getLatestEOS', () => {
    it('should write and read back an EOS passdown', async () => {
      await manager.initialize();

      const content = '# EOS Passdown\n\nTest content';
      const filePath = await manager.writeEOS('2026-03-03-171833', content);

      expect(filePath).toContain('2026-03-03-171833.md');

      const latest = await manager.getLatestEOS();
      expect(latest).toBe(content);
    });

    it('should return the most recent passdown by filename sort', async () => {
      await manager.initialize();

      await manager.writeEOS('2026-03-01-100000', 'Old passdown');
      await manager.writeEOS('2026-03-03-100000', 'New passdown');
      await manager.writeEOS('2026-03-02-100000', 'Middle passdown');

      const latest = await manager.getLatestEOS();
      expect(latest).toBe('New passdown');
    });

    it('should return null when no passdowns exist', async () => {
      await manager.initialize();

      const latest = await manager.getLatestEOS();
      expect(latest).toBeNull();
    });

    it('should return null when directory does not exist', async () => {
      const latest = await manager.getLatestEOS();
      expect(latest).toBeNull();
    });
  });

  describe('writeSOS', () => {
    it('should write a session brief', async () => {
      await manager.initialize();

      await manager.writeSOS('2026-03-03-171833', 'Brief content');

      const content = await fs.readFile(
        path.join(manager.getBriefsDir(), '2026-03-03-171833.md'),
        'utf-8'
      );
      expect(content).toBe('Brief content');
    });
  });

  describe('directory paths', () => {
    it('should expose correct directory paths', () => {
      expect(manager.getEOSDir()).toBe(path.join(tmpDir, 'eos-passdowns'));
      expect(manager.getBriefsDir()).toBe(path.join(tmpDir, 'session-briefs'));
    });
  });
});
