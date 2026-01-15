import { ValidationResult, SecurityConfig } from './types';

export class InputValidator {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  validate(input: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check length
    if (input.length > this.config.maxInputLength) {
      errors.push(`Input exceeds maximum length of ${this.config.maxInputLength} characters`);
    }

    // Check for blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(input)) {
        errors.push(`Input contains blocked pattern: ${pattern.source}`);
      }
    }

    // Check for potential injection attacks
    if (this.containsSQLInjection(input)) {
      errors.push('Input contains potential SQL injection');
    }

    if (this.containsScriptInjection(input)) {
      errors.push('Input contains potential script injection');
    }

    // Check for excessive special characters
    if (this.hasExcessiveSpecialChars(input)) {
      warnings.push('Input contains many special characters');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  sanitize(input: string): string {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Truncate if too long
    if (sanitized.length > this.config.maxInputLength) {
      sanitized = sanitized.substring(0, this.config.maxInputLength);
    }

    return sanitized;
  }

  private containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(--|;|\/\*|\*\/)/,
      /(\bOR\b.*=.*)/i,
      /(\bAND\b.*=.*)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private containsScriptInjection(input: string): boolean {
    const scriptPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i
    ];

    return scriptPatterns.some(pattern => pattern.test(input));
  }

  private hasExcessiveSpecialChars(input: string): boolean {
    const specialChars = input.match(/[^a-zA-Z0-9\s]/g);
    if (!specialChars) return false;

    const ratio = specialChars.length / input.length;
    return ratio > 0.3; // More than 30% special characters
  }
}
