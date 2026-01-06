import { FileNamingConvention } from '../../src/memory/file-naming';
import { ValidationError } from '../../src/exceptions';

describe('FileNamingConvention', () => {
  let naming: FileNamingConvention;

  beforeEach(() => {
    naming = new FileNamingConvention();
  });

  describe('generateFilename', () => {
    it('should generate filename with all components', () => {
      const filename = naming.generateFilename('LEARNING', 'Fixed Hook Timing', 'md');
      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}_\d{6}_LEARNING_fixed-hook-timing\.md$/);
    });

    it('should convert type to uppercase', () => {
      const filename = naming.generateFilename('learning', 'test', 'md');
      expect(filename).toContain('_LEARNING_');
    });

    it('should convert description to kebab-case', () => {
      const filename = naming.generateFilename('TYPE', 'Some Description Here', 'txt');
      expect(filename).toContain('_some-description-here.');
    });

    it('should handle extension with dot', () => {
      const filename = naming.generateFilename('TYPE', 'desc', '.md');
      expect(filename).toMatch(/\.md$/);
    });

    it('should throw on empty type', () => {
      expect(() => naming.generateFilename('', 'desc', 'md')).toThrow(ValidationError);
    });

    it('should throw on empty description', () => {
      expect(() => naming.generateFilename('TYPE', '', 'md')).toThrow(ValidationError);
    });

    it('should throw on empty extension', () => {
      expect(() => naming.generateFilename('TYPE', 'desc', '')).toThrow(ValidationError);
    });
  });

  describe('parseFilename', () => {
    it('should parse valid filename', () => {
      const parsed = naming.parseFilename('2026-01-02_143022_LEARNING_fixed-hook-timing.md');
      expect(parsed.date).toBe('2026-01-02');
      expect(parsed.time).toBe('143022');
      expect(parsed.type).toBe('LEARNING');
      expect(parsed.description).toBe('fixed-hook-timing');
      expect(parsed.extension).toBe('md');
    });

    it('should throw on invalid format', () => {
      expect(() => naming.parseFilename('invalid-filename.txt')).toThrow(ValidationError);
    });

    it('should throw on empty filename', () => {
      expect(() => naming.parseFilename('')).toThrow(ValidationError);
    });
  });

  describe('generateTimestamp', () => {
    it('should return ISO 8601 format', () => {
      const timestamp = naming.generateTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}_\d{6}$/);
    });
  });

  describe('toKebabCase', () => {
    it('should convert spaces to hyphens', () => {
      expect(naming.toKebabCase('Hello World')).toBe('hello-world');
    });

    it('should convert to lowercase', () => {
      expect(naming.toKebabCase('UPPERCASE')).toBe('uppercase');
    });

    it('should remove special characters', () => {
      expect(naming.toKebabCase('Hello! World?')).toBe('hello-world');
    });

    it('should handle empty string', () => {
      expect(naming.toKebabCase('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(naming.toKebabCase('Version 2 Update')).toBe('version-2-update');
    });
  });

  describe('isValidFilename', () => {
    it('should return true for valid filenames', () => {
      expect(naming.isValidFilename('2026-01-02_143022_TYPE_desc.md')).toBe(true);
    });

    it('should return false for invalid filenames', () => {
      expect(naming.isValidFilename('invalid.txt')).toBe(false);
    });
  });

  describe('extractDate', () => {
    it('should extract Date from valid filename', () => {
      const date = naming.extractDate('2026-01-02_143022_TYPE_desc.md');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getUTCFullYear()).toBe(2026);
    });

    it('should return null for invalid filename', () => {
      expect(naming.extractDate('invalid.txt')).toBeNull();
    });
  });
});
