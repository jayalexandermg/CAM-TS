import { SecurityConfig } from './types';

export class OutputSanitizer {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  sanitize(output: unknown): unknown {
    if (typeof output === 'string') {
      return this.sanitizeString(output);
    }

    if (Array.isArray(output)) {
      return output.map((item) => this.sanitize(item));
    }

    if (typeof output === 'object' && output !== null) {
      return this.sanitizeObject(output as Record<string, unknown>);
    }

    return output;
  }

  private sanitizeString(str: string): string {
    // Remove sensitive patterns
    let sanitized = str;

    // Remove potential API keys
    sanitized = sanitized.replace(/\b[A-Za-z0-9]{32,}\b/g, '[REDACTED]');

    // Remove potential passwords
    sanitized = sanitized.replace(/password[:\s]*[^\s]+/gi, 'password: [REDACTED]');

    // Remove potential tokens
    sanitized = sanitized.replace(/token[:\s]*[^\s]+/gi, 'token: [REDACTED]');

    // Truncate if too long
    if (sanitized.length > this.config.maxOutputLength) {
      sanitized = sanitized.substring(0, this.config.maxOutputLength) + '... [truncated]';
    }

    return sanitized;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Redact sensitive keys
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitize(value);
      }
    }

    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apikey',
      'api_key',
      'accesstoken',
      'access_token',
      'privatekey',
      'private_key',
    ];

    return sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive));
  }
}
