import {
  InfiniteAuraError,
  ErrorCodes,
  SerializedError,
} from '../../src/exceptions';

describe('InfiniteAuraError', () => {
  describe('constructor', () => {
    it('should create an error with message only', () => {
      const error = new InfiniteAuraError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ErrorCodes.UNKNOWN);
      expect(error.details).toEqual({});
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('InfiniteAuraError');
    });

    it('should create an error with message and code', () => {
      const error = new InfiniteAuraError('Path error', ErrorCodes.INVALID_PATH);

      expect(error.message).toBe('Path error');
      expect(error.code).toBe(ErrorCodes.INVALID_PATH);
      expect(error.details).toEqual({});
    });

    it('should create an error with message, code, and details', () => {
      const details = { path: '/some/path', attempted: true };
      const error = new InfiniteAuraError(
        'Detailed error',
        ErrorCodes.FILE_NOT_FOUND,
        details
      );

      expect(error.message).toBe('Detailed error');
      expect(error.code).toBe(ErrorCodes.FILE_NOT_FOUND);
      expect(error.details).toEqual(details);
    });

    it('should capture stack trace', () => {
      const error = new InfiniteAuraError('Stack test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('InfiniteAuraError');
    });

    it('should have a valid timestamp', () => {
      const before = new Date();
      const error = new InfiniteAuraError('Timestamp test');
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON-compatible object', () => {
      const error = new InfiniteAuraError(
        'JSON test',
        ErrorCodes.SECURITY_VIOLATION,
        { key: 'value' }
      );
      const json = error.toJSON();

      expect(json.name).toBe('InfiniteAuraError');
      expect(json.message).toBe('JSON test');
      expect(json.code).toBe(ErrorCodes.SECURITY_VIOLATION);
      expect(json.details).toEqual({ key: 'value' });
      expect(typeof json.timestamp).toBe('string');
      expect(json.stack).toBeDefined();
    });

    it('should produce valid ISO timestamp', () => {
      const error = new InfiniteAuraError('ISO test');
      const json = error.toJSON();

      expect(() => new Date(json.timestamp)).not.toThrow();
      expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp);
    });

    it('should be JSON.stringify compatible', () => {
      const error = new InfiniteAuraError('Stringify test', ErrorCodes.UNKNOWN, {
        nested: { data: [1, 2, 3] },
      });
      const jsonString = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(jsonString) as SerializedError;

      expect(parsed.name).toBe('InfiniteAuraError');
      expect(parsed.message).toBe('Stringify test');
      expect(parsed.details).toEqual({ nested: { data: [1, 2, 3] } });
    });

    it('should preserve complex details object', () => {
      const details = {
        array: [1, 'two', { three: 3 }],
        nested: { deep: { value: true } },
        nullable: null,
        number: 42,
        string: 'test',
      };
      const error = new InfiniteAuraError('Complex test', ErrorCodes.UNKNOWN, details);
      const json = error.toJSON();

      expect(json.details).toEqual(details);
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      const error = new InfiniteAuraError('String test', ErrorCodes.PATH_TRAVERSAL);
      const str = error.toString();

      expect(str).toBe('InfiniteAuraError [PATH_TRAVERSAL]: String test');
    });

    it('should include error code in brackets', () => {
      const error = new InfiniteAuraError('Code test', ErrorCodes.FILE_READ_ERROR);

      expect(error.toString()).toContain('[FILE_READ_ERROR]');
    });
  });

  describe('inheritance', () => {
    it('should be instance of Error', () => {
      const error = new InfiniteAuraError('Inheritance test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InfiniteAuraError);
    });

    it('should be catchable as Error', () => {
      try {
        throw new InfiniteAuraError('Catch test');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as InfiniteAuraError).code).toBe(ErrorCodes.UNKNOWN);
      }
    });
  });
});
