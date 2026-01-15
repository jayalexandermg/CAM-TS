import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger, LogEntry, logger } from '../../src/utils/Logger';

describe('Logger', () => {
  let testDir: string;
  let logPath: string;
  let consoleSpy: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Create a temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-logger-test-'));
    logPath = path.join(testDir, 'test.log');

    // Spy on console methods
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    // Restore console methods
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create Logger with default options', () => {
      const log = new Logger();
      expect(log.getLevel()).toBe('info');
      expect(log.isConsoleEnabled()).toBe(true);
      expect(log.isFileEnabled()).toBe(false);
    });

    it('should create Logger with custom level', () => {
      const log = new Logger({ level: 'debug' });
      expect(log.getLevel()).toBe('debug');
    });

    it('should create Logger with file output', () => {
      const log = new Logger({ file: logPath });
      expect(log.isFileEnabled()).toBe(true);
      expect(log.getFilePath()).toBe(logPath);
      log.close();
    });

    it('should create Logger with console disabled', () => {
      const log = new Logger({ console: false });
      expect(log.isConsoleEnabled()).toBe(false);
    });
  });

  // =========================================================================
  // Log Level Tests
  // =========================================================================

  describe('log levels', () => {
    it('should log debug messages when level is debug', () => {
      const log = new Logger({ level: 'debug' });
      log.debug('debug message');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should not log debug messages when level is info', () => {
      const log = new Logger({ level: 'info' });
      log.debug('debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info', () => {
      const log = new Logger({ level: 'info' });
      log.info('info message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log warn messages when level is warn', () => {
      const log = new Logger({ level: 'warn' });
      log.warn('warn message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error messages at any level', () => {
      const log = new Logger({ level: 'error' });
      log.error('error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should not log warn when level is error', () => {
      const log = new Logger({ level: 'error' });
      log.warn('warn message');
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Set Level Tests
  // =========================================================================

  describe('setLevel', () => {
    it('should change log level dynamically', () => {
      const log = new Logger({ level: 'info' });

      log.debug('debug 1');
      expect(consoleSpy.debug).not.toHaveBeenCalled();

      log.setLevel('debug');
      log.debug('debug 2');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // File Output Tests
  // =========================================================================

  describe('file output', () => {
    it('should write logs to file', () => {
      const log = new Logger({ file: logPath, console: false });

      log.info('test message');
      log.close();

      const content = fs.readFileSync(logPath, 'utf-8');
      expect(content).toContain('test message');
    });

    it('should write structured JSON to file', () => {
      const log = new Logger({ file: logPath, console: false });

      log.info('structured message', { key: 'value' });
      log.close();

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      const entry = JSON.parse(lines[0]) as LogEntry & { logger: string };

      expect(entry.level).toBe('info');
      expect(entry.message).toBe('structured message');
      expect(entry.context).toEqual({ key: 'value' });
      expect(entry.timestamp).toBeDefined();
    });

    it('should append to existing log file', () => {
      const log = new Logger({ file: logPath, console: false });

      log.info('message 1');
      log.info('message 2');
      log.close();

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);
    });

    it('should create directory for log file if not exists', () => {
      const deepPath = path.join(testDir, 'deep', 'nested', 'app.log');
      const log = new Logger({ file: deepPath, console: false });

      log.info('test');
      log.close();

      expect(fs.existsSync(deepPath)).toBe(true);
    });
  });

  // =========================================================================
  // Context Tests
  // =========================================================================

  describe('context', () => {
    it('should include context in console output', () => {
      const log = new Logger({ level: 'info' });
      log.info('message with context', { userId: '123', action: 'login' });

      expect(consoleSpy.info).toHaveBeenCalled();
      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain('userId');
      expect(output).toContain('123');
    });

    it('should handle empty context', () => {
      const log = new Logger({ level: 'info' });
      log.info('message without context');

      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Child Logger Tests
  // =========================================================================

  describe('child', () => {
    it('should create child logger with prefixed name', () => {
      const parent = new Logger({ name: 'parent' });
      const child = parent.child('child');

      child.info('child message');

      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain('parent:child');
    });

    it('should inherit log level from parent', () => {
      const parent = new Logger({ level: 'warn' });
      const child = parent.child('child');

      child.info('info message');
      expect(consoleSpy.info).not.toHaveBeenCalled();

      child.warn('warn message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Close Tests
  // =========================================================================

  describe('close', () => {
    it('should close file stream', () => {
      const log = new Logger({ file: logPath });
      expect(log.isFileEnabled()).toBe(true);

      log.close();
      expect(log.isFileEnabled()).toBe(false);
    });

    it('should handle multiple close calls', () => {
      const log = new Logger({ file: logPath });

      expect(() => {
        log.close();
        log.close();
      }).not.toThrow();
    });
  });

  // =========================================================================
  // Default Logger Tests
  // =========================================================================

  describe('default logger', () => {
    it('should export default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should have default level of info', () => {
      expect(logger.getLevel()).toBe('info');
    });
  });

  // =========================================================================
  // setFile Tests
  // =========================================================================

  describe('setFile', () => {
    it('should set file after construction', () => {
      const log = new Logger({ console: false });
      expect(log.isFileEnabled()).toBe(false);

      log.setFile(logPath);
      expect(log.isFileEnabled()).toBe(true);

      log.info('test');
      log.close();

      expect(fs.existsSync(logPath)).toBe(true);
    });

    it('should switch to new file', () => {
      const file1 = path.join(testDir, 'file1.log');
      const file2 = path.join(testDir, 'file2.log');

      const log = new Logger({ file: file1, console: false });
      log.info('message 1');

      log.setFile(file2);
      log.info('message 2');
      log.close();

      const content1 = fs.readFileSync(file1, 'utf-8');
      const content2 = fs.readFileSync(file2, 'utf-8');

      expect(content1).toContain('message 1');
      expect(content2).toContain('message 2');
    });
  });
});
