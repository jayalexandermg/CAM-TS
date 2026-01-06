import {
  InfiniteAuraError,
  PathValidationError,
  FileOperationError,
  SecurityError,
  ConfigurationError,
  MemoryError,
  ContextError,
  ValidationError,
  ErrorCodes,
} from '../../src/exceptions';

describe('Core Exception Classes', () => {
  describe('PathValidationError', () => {
    it('should create with default code', () => {
      const error = new PathValidationError('Invalid path');

      expect(error.name).toBe('PathValidationError');
      expect(error.code).toBe(ErrorCodes.INVALID_PATH);
      expect(error.message).toBe('Invalid path');
    });

    it('should create with custom code', () => {
      const error = new PathValidationError(
        'Traversal detected',
        ErrorCodes.PATH_TRAVERSAL,
        { path: '../secret' }
      );

      expect(error.code).toBe(ErrorCodes.PATH_TRAVERSAL);
      expect(error.details.path).toBe('../secret');
    });

    it('should extend InfiniteAuraError', () => {
      const error = new PathValidationError('Test');

      expect(error).toBeInstanceOf(InfiniteAuraError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should serialize correctly', () => {
      const error = new PathValidationError('Path too long', ErrorCodes.PATH_TOO_LONG);
      const json = error.toJSON();

      expect(json.name).toBe('PathValidationError');
      expect(json.code).toBe('PATH_TOO_LONG');
    });
  });

  describe('FileOperationError', () => {
    it('should create with default code', () => {
      const error = new FileOperationError('Read failed');

      expect(error.name).toBe('FileOperationError');
      expect(error.code).toBe(ErrorCodes.FILE_READ_ERROR);
    });

    it('should handle write error code', () => {
      const error = new FileOperationError(
        'Write failed',
        ErrorCodes.FILE_WRITE_ERROR,
        { path: '/test/file.txt', errno: -2 }
      );

      expect(error.code).toBe(ErrorCodes.FILE_WRITE_ERROR);
      expect(error.details.errno).toBe(-2);
    });

    it('should handle file not found', () => {
      const error = new FileOperationError(
        'File not found',
        ErrorCodes.FILE_NOT_FOUND
      );

      expect(error.code).toBe(ErrorCodes.FILE_NOT_FOUND);
    });

    it('should extend InfiniteAuraError', () => {
      const error = new FileOperationError('Test');

      expect(error).toBeInstanceOf(InfiniteAuraError);
    });
  });

  describe('SecurityError', () => {
    it('should create with default code', () => {
      const error = new SecurityError('Security breach');

      expect(error.name).toBe('SecurityError');
      expect(error.code).toBe(ErrorCodes.SECURITY_VIOLATION);
    });

    it('should handle unauthorized access', () => {
      const error = new SecurityError(
        'Unauthorized',
        ErrorCodes.UNAUTHORIZED_ACCESS,
        { userId: 'test', resource: '/admin' }
      );

      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED_ACCESS);
      expect(error.details.resource).toBe('/admin');
    });

    it('should handle command injection', () => {
      const error = new SecurityError(
        'Command injection detected',
        ErrorCodes.COMMAND_INJECTION
      );

      expect(error.code).toBe(ErrorCodes.COMMAND_INJECTION);
    });

    it('should extend InfiniteAuraError', () => {
      const error = new SecurityError('Test');

      expect(error).toBeInstanceOf(InfiniteAuraError);
    });
  });

  describe('ConfigurationError', () => {
    it('should create with default code', () => {
      const error = new ConfigurationError('Invalid config');

      expect(error.name).toBe('ConfigurationError');
      expect(error.code).toBe(ErrorCodes.CONFIG_INVALID);
    });

    it('should handle missing config', () => {
      const error = new ConfigurationError(
        'Config file missing',
        ErrorCodes.CONFIG_MISSING,
        { configPath: '~/.config/app.yaml' }
      );

      expect(error.code).toBe(ErrorCodes.CONFIG_MISSING);
      expect(error.details.configPath).toBe('~/.config/app.yaml');
    });

    it('should handle parse errors', () => {
      const error = new ConfigurationError(
        'YAML parse error',
        ErrorCodes.CONFIG_PARSE_ERROR,
        { line: 42, column: 10 }
      );

      expect(error.code).toBe(ErrorCodes.CONFIG_PARSE_ERROR);
      expect(error.details.line).toBe(42);
    });

    it('should extend InfiniteAuraError', () => {
      const error = new ConfigurationError('Test');

      expect(error).toBeInstanceOf(InfiniteAuraError);
    });
  });

  describe('MemoryError', () => {
    it('should create with default code', () => {
      const error = new MemoryError('Memory init failed');

      expect(error.name).toBe('MemoryError');
      expect(error.code).toBe(ErrorCodes.MEMORY_INIT_ERROR);
    });

    it('should handle load errors', () => {
      const error = new MemoryError(
        'Failed to load memory',
        ErrorCodes.MEMORY_LOAD_ERROR
      );

      expect(error.code).toBe(ErrorCodes.MEMORY_LOAD_ERROR);
    });

    it('should handle save errors', () => {
      const error = new MemoryError(
        'Failed to save memory',
        ErrorCodes.MEMORY_SAVE_ERROR,
        { bytesWritten: 0, expected: 1024 }
      );

      expect(error.code).toBe(ErrorCodes.MEMORY_SAVE_ERROR);
      expect(error.details.expected).toBe(1024);
    });

    it('should handle corrupt memory', () => {
      const error = new MemoryError('Memory corrupted', ErrorCodes.MEMORY_CORRUPT);

      expect(error.code).toBe(ErrorCodes.MEMORY_CORRUPT);
    });

    it('should extend InfiniteAuraError', () => {
      const error = new MemoryError('Test');

      expect(error).toBeInstanceOf(InfiniteAuraError);
    });
  });

  describe('ContextError', () => {
    it('should create with default code', () => {
      const error = new ContextError('Context load failed');

      expect(error.name).toBe('ContextError');
      expect(error.code).toBe(ErrorCodes.CONTEXT_LOAD_ERROR);
    });

    it('should handle parse errors', () => {
      const error = new ContextError(
        'Failed to parse context',
        ErrorCodes.CONTEXT_PARSE_ERROR
      );

      expect(error.code).toBe(ErrorCodes.CONTEXT_PARSE_ERROR);
    });

    it('should handle not found', () => {
      const error = new ContextError(
        'Context not found',
        ErrorCodes.CONTEXT_NOT_FOUND,
        { contextId: 'ctx-123' }
      );

      expect(error.code).toBe(ErrorCodes.CONTEXT_NOT_FOUND);
      expect(error.details.contextId).toBe('ctx-123');
    });

    it('should extend InfiniteAuraError', () => {
      const error = new ContextError('Test');

      expect(error).toBeInstanceOf(InfiniteAuraError);
    });
  });

  describe('ValidationError', () => {
    it('should create with default code', () => {
      const error = new ValidationError('Validation failed');

      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
    });

    it('should handle schema mismatch', () => {
      const error = new ValidationError(
        'Schema mismatch',
        ErrorCodes.SCHEMA_MISMATCH,
        { expected: 'string', received: 'number' }
      );

      expect(error.code).toBe(ErrorCodes.SCHEMA_MISMATCH);
      expect(error.details.expected).toBe('string');
    });

    it('should handle required field missing', () => {
      const error = new ValidationError(
        'Required field missing',
        ErrorCodes.REQUIRED_FIELD_MISSING,
        { field: 'name', object: 'User' }
      );

      expect(error.code).toBe(ErrorCodes.REQUIRED_FIELD_MISSING);
      expect(error.details.field).toBe('name');
    });

    it('should extend InfiniteAuraError', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(InfiniteAuraError);
    });
  });

  describe('Error codes are correctly defined', () => {
    it('should have all path-related codes', () => {
      expect(ErrorCodes.PATH_TRAVERSAL).toBe('PATH_TRAVERSAL');
      expect(ErrorCodes.INVALID_PATH).toBe('INVALID_PATH');
      expect(ErrorCodes.PATH_TOO_LONG).toBe('PATH_TOO_LONG');
    });

    it('should have all file-related codes', () => {
      expect(ErrorCodes.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
      expect(ErrorCodes.FILE_READ_ERROR).toBe('FILE_READ_ERROR');
      expect(ErrorCodes.FILE_WRITE_ERROR).toBe('FILE_WRITE_ERROR');
      expect(ErrorCodes.FILE_APPEND_ERROR).toBe('FILE_APPEND_ERROR');
    });

    it('should have all security-related codes', () => {
      expect(ErrorCodes.SECURITY_VIOLATION).toBe('SECURITY_VIOLATION');
      expect(ErrorCodes.UNAUTHORIZED_ACCESS).toBe('UNAUTHORIZED_ACCESS');
      expect(ErrorCodes.COMMAND_INJECTION).toBe('COMMAND_INJECTION');
      expect(ErrorCodes.NULL_BYTE_INJECTION).toBe('NULL_BYTE_INJECTION');
    });
  });
});
