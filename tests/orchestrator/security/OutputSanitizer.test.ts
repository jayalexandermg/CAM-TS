import { OutputSanitizer } from '../../../src/orchestrator/security/OutputSanitizer';
import { SecurityConfig } from '../../../src/orchestrator/security/types';

describe('OutputSanitizer', () => {
  const createConfig = (overrides?: Partial<SecurityConfig>): SecurityConfig => ({
    maxInputLength: 1000,
    maxOutputLength: 100,
    maxAgentsPerSession: 10,
    maxConcurrentAgents: 5,
    maxTaskDuration: 300000,
    allowedFileExtensions: ['.txt', '.md', '.json'],
    blockedPatterns: [],
    ...overrides,
  });

  let sanitizer: OutputSanitizer;

  beforeEach(() => {
    sanitizer = new OutputSanitizer(createConfig());
  });

  describe('sanitize strings', () => {
    it('should return normal strings unchanged', () => {
      const result = sanitizer.sanitize('Hello, world!');
      expect(result).toBe('Hello, world!');
    });

    it('should redact potential API keys (32+ alphanumeric chars)', () => {
      const apiKey = 'abcdefghijklmnopqrstuvwxyz12345678';
      const result = sanitizer.sanitize(`API key: ${apiKey}`);
      expect(result).toBe('API key: [REDACTED]');
    });

    it('should redact password values', () => {
      const result = sanitizer.sanitize('password: mysecretpassword');
      expect(result).toBe('password: [REDACTED]');
    });

    it('should redact password values case-insensitively', () => {
      const result = sanitizer.sanitize('PASSWORD: MySecret123');
      expect(result).toBe('password: [REDACTED]');
    });

    it('should redact token values', () => {
      const result = sanitizer.sanitize('token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(result).toBe('token: [REDACTED]');
    });

    it('should truncate strings exceeding max length', () => {
      // Use a string with spaces to avoid triggering API key detection
      const longString = ('hello world ').repeat(20);
      const result = sanitizer.sanitize(longString);
      expect((result as string).endsWith('... [truncated]')).toBe(true);
      expect((result as string).length).toBe(100 + '... [truncated]'.length);
    });

    it('should handle empty string', () => {
      const result = sanitizer.sanitize('');
      expect(result).toBe('');
    });
  });

  describe('sanitize arrays', () => {
    it('should sanitize each element in array', () => {
      const result = sanitizer.sanitize(['password: secret', 'normal text']);
      expect(result).toEqual(['password: [REDACTED]', 'normal text']);
    });

    it('should handle nested arrays', () => {
      const result = sanitizer.sanitize([['password: secret'], 'other']);
      expect(result).toEqual([['password: [REDACTED]'], 'other']);
    });

    it('should handle empty arrays', () => {
      const result = sanitizer.sanitize([]);
      expect(result).toEqual([]);
    });
  });

  describe('sanitize objects', () => {
    it('should redact password keys', () => {
      const result = sanitizer.sanitize({ password: 'secret123' });
      expect(result).toEqual({ password: '[REDACTED]' });
    });

    it('should redact token keys', () => {
      const result = sanitizer.sanitize({ token: 'abc123' });
      expect(result).toEqual({ token: '[REDACTED]' });
    });

    it('should redact secret keys', () => {
      const result = sanitizer.sanitize({ secret: 'myvalue' });
      expect(result).toEqual({ secret: '[REDACTED]' });
    });

    it('should redact apikey keys', () => {
      const result = sanitizer.sanitize({ apikey: 'key123' });
      expect(result).toEqual({ apikey: '[REDACTED]' });
    });

    it('should redact api_key keys', () => {
      const result = sanitizer.sanitize({ api_key: 'key123' });
      expect(result).toEqual({ api_key: '[REDACTED]' });
    });

    it('should redact accesstoken keys', () => {
      const result = sanitizer.sanitize({ accesstoken: 'token123' });
      expect(result).toEqual({ accesstoken: '[REDACTED]' });
    });

    it('should redact access_token keys', () => {
      const result = sanitizer.sanitize({ access_token: 'token123' });
      expect(result).toEqual({ access_token: '[REDACTED]' });
    });

    it('should redact privatekey keys', () => {
      const result = sanitizer.sanitize({ privatekey: 'key123' });
      expect(result).toEqual({ privatekey: '[REDACTED]' });
    });

    it('should redact private_key keys', () => {
      const result = sanitizer.sanitize({ private_key: 'key123' });
      expect(result).toEqual({ private_key: '[REDACTED]' });
    });

    it('should redact keys containing sensitive substrings', () => {
      const result = sanitizer.sanitize({ userPassword: 'secret' });
      expect(result).toEqual({ userPassword: '[REDACTED]' });
    });

    it('should sanitize nested objects', () => {
      const result = sanitizer.sanitize({
        user: { name: 'John', password: 'secret' },
      });
      expect(result).toEqual({
        user: { name: 'John', password: '[REDACTED]' },
      });
    });

    it('should handle null values', () => {
      const result = sanitizer.sanitize(null);
      expect(result).toBeNull();
    });

    it('should handle undefined values', () => {
      const result = sanitizer.sanitize(undefined);
      expect(result).toBeUndefined();
    });

    it('should pass through numbers unchanged', () => {
      const result = sanitizer.sanitize(123);
      expect(result).toBe(123);
    });

    it('should pass through booleans unchanged', () => {
      const result = sanitizer.sanitize(true);
      expect(result).toBe(true);
    });
  });

  describe('complex structures', () => {
    it('should handle mixed arrays and objects', () => {
      const input = {
        users: [
          { name: 'Alice', password: 'pass1' },
          { name: 'Bob', token: 'tok2' },
        ],
        config: {
          api_key: 'key123',
          settings: { debug: true },
        },
      };
      const result = sanitizer.sanitize(input);
      expect(result).toEqual({
        users: [
          { name: 'Alice', password: '[REDACTED]' },
          { name: 'Bob', token: '[REDACTED]' },
        ],
        config: {
          api_key: '[REDACTED]',
          settings: { debug: true },
        },
      });
    });
  });
});
