import { InputValidator } from '../../../src/orchestrator/security/InputValidator';
import { SecurityConfig } from '../../../src/orchestrator/security/types';

describe('InputValidator', () => {
  const createConfig = (overrides?: Partial<SecurityConfig>): SecurityConfig => ({
    maxInputLength: 1000,
    maxOutputLength: 5000,
    maxAgentsPerSession: 10,
    maxConcurrentAgents: 5,
    maxTaskDuration: 300000,
    allowedFileExtensions: ['.txt', '.md', '.json'],
    blockedPatterns: [],
    ...overrides,
  });

  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator(createConfig());
  });

  describe('validate', () => {
    it('should return valid for normal input', () => {
      const result = validator.validate('Hello, this is a normal message.');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return error for input exceeding max length', () => {
      const longInput = 'a'.repeat(1001);
      const result = validator.validate(longInput);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input exceeds maximum length of 1000 characters');
    });

    it('should detect blocked patterns', () => {
      const validatorWithPatterns = new InputValidator(
        createConfig({ blockedPatterns: [/forbidden/i] })
      );
      const result = validatorWithPatterns.validate('This contains a forbidden word.');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('blocked pattern'))).toBe(true);
    });

    it('should detect SQL injection with SELECT', () => {
      const result = validator.validate('SELECT * FROM users');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential SQL injection');
    });

    it('should detect SQL injection with DROP', () => {
      const result = validator.validate('DROP TABLE users;');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential SQL injection');
    });

    it('should detect SQL injection with OR pattern', () => {
      const result = validator.validate("' OR 1=1");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential SQL injection');
    });

    it('should detect script injection with script tags', () => {
      const result = validator.validate('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential script injection');
    });

    it('should detect script injection with javascript: protocol', () => {
      const result = validator.validate('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential script injection');
    });

    it('should detect script injection with event handlers', () => {
      const result = validator.validate('<img onerror=alert(1)>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential script injection');
    });

    it('should detect iframe injection', () => {
      const result = validator.validate('<iframe src="malicious.com">');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input contains potential script injection');
    });

    it('should warn about excessive special characters', () => {
      const result = validator.validate('!@#$%^&*()');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Input contains many special characters');
    });

    it('should not warn for normal text with some special characters', () => {
      const result = validator.validate('Hello, world! How are you?');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('sanitize', () => {
    it('should remove null bytes', () => {
      const input = 'Hello\0World';
      const result = validator.sanitize(input);
      expect(result).toBe('HelloWorld');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = validator.sanitize(input);
      expect(result).toBe('Hello World');
    });

    it('should normalize multiple spaces', () => {
      const input = 'Hello    World';
      const result = validator.sanitize(input);
      expect(result).toBe('Hello World');
    });

    it('should normalize tabs and newlines', () => {
      const input = 'Hello\t\nWorld';
      const result = validator.sanitize(input);
      expect(result).toBe('Hello World');
    });

    it('should truncate input exceeding max length', () => {
      const input = 'a'.repeat(1500);
      const result = validator.sanitize(input);
      expect(result.length).toBe(1000);
    });

    it('should handle empty string', () => {
      const result = validator.sanitize('');
      expect(result).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const result = validator.sanitize('   \t\n   ');
      expect(result).toBe('');
    });
  });
});
