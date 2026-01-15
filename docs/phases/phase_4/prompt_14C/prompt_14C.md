PROMPT 14C: Security & Validation
Phase: 4 (Orchestrator)
Status: 🆕 NEW - Security enforcement
Time Estimate: 6-8 hours
Priority: CRITICAL
Dependencies: Phase 3 complete
Parallel: ✅ Can run with 14A, 14B

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.

📋 OBJECTIVE
Implement security validation, input sanitization, and resource limits.

After this prompt:

✅ SecurityManager class
✅ InputValidator class
✅ OutputSanitizer class
✅ ResourceLimiter class
✅ 25-35 new tests
📦 REQUIREMENTS
1. Security Types
Create src/orchestrator/security/types.ts:

typescript
Copy
export interface SecurityConfig {
  maxInputLength: number;
  maxOutputLength: number;
  maxAgentsPerSession: number;
  maxConcurrentAgents: number;
  maxTaskDuration: number;
  allowedFileExtensions: string[];
  blockedPatterns: RegExp[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ResourceUsage {
  agentCount: number;
  activeAgents: number;
  sessionCount: number;
  memoryUsage?: number;
}
2. Input Validator
Create src/orchestrator/security/InputValidator.ts:

typescript
Copy
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
3. Output Sanitizer
Create src/orchestrator/security/OutputSanitizer.ts:

typescript
Copy
import { SecurityConfig } from './types';

export class OutputSanitizer {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  sanitize(output: any): any {
    if (typeof output === 'string') {
      return this.sanitizeString(output);
    }

    if (Array.isArray(output)) {
      return output.map(item => this.sanitize(item));
    }

    if (typeof output === 'object' && output !== null) {
      return this.sanitizeObject(output);
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

  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

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
      'private_key'
    ];

    return sensitiveKeys.some(sensitive =>
      key.toLowerCase().includes(sensitive)
    );
  }
}
4. Resource Limiter
Create src/orchestrator/security/ResourceLimiter.ts:

typescript
Copy
import { SecurityConfig, ResourceUsage } from './types';

export class ResourceLimiter {
  private config: SecurityConfig;
  private usage: ResourceUsage;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.usage = {
      agentCount: 0,
      activeAgents: 0,
      sessionCount: 0
    };
  }

  canCreateAgent(sessionId: string): boolean {
    // Check total agent limit
    if (this.usage.agentCount >= this.config.maxAgentsPerSession) {
      return false;
    }

    // Check concurrent agent limit
    if (this.usage.activeAgents >= this.config.maxConcurrentAgents) {
      return false;
    }

    return true;
  }

  incrementAgentCount(): void {
    this.usage.agentCount++;
    this.usage.activeAgents++;
  }

  decrementActiveAgents(): void {
    if (this.usage.activeAgents > 0) {
      this.usage.activeAgents--;
    }
  }

  incrementSessionCount(): void {
    this.usage.sessionCount++;
  }

  decrementSessionCount(): void {
    if (this.usage.sessionCount > 0) {
      this.usage.sessionCount--;
    }
  }

  getUsage(): ResourceUsage {
    return { ...this.usage };
  }

  reset(): void {
    this.usage = {
      agentCount: 0,
      activeAgents: 0,
      sessionCount: 0
    };
  }

  isWithinLimits(): boolean {
    return (
      this.usage.agentCount <= this.config.maxAgentsPerSession &&
      this.usage.activeAgents <= this.config.maxConcurrentAgents
    );
  }
}
5. Security Manager
Create src/orchestrator/security/SecurityManager.ts:

typescript
Copy
import { InputValidator } from './InputValidator';
import { OutputSanitizer } from './OutputSanitizer';
import { ResourceLimiter } from './ResourceLimiter';
import { SecurityConfig, ValidationResult } from './types';

export class SecurityManager {
  private inputValidator: InputValidator;
  private outputSanitizer: OutputSanitizer;
  private resourceLimiter: ResourceLimiter;
  private config: SecurityConfig;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      maxInputLength: config?.maxInputLength || 10000,
      maxOutputLength: config?.maxOutputLength || 50000,
      maxAgentsPerSession: config?.maxAgentsPerSession || 10,
      maxConcurrentAgents: config?.maxConcurrentAgents || 5,
      maxTaskDuration: config?.maxTaskDuration || 300000, // 5 minutes
      allowedFileExtensions: config?.allowedFileExtensions || ['.txt', '.md', '.json'],
      blockedPatterns: config?.blockedPatterns || []
    };

    this.inputValidator = new InputValidator(this.config);
    this.outputSanitizer = new OutputSanitizer(this.config);
    this.resourceLimiter = new ResourceLimiter(this.config);
  }

  validateInput(input: string): ValidationResult {
    return this.inputValidator.validate(input);
  }

  sanitizeInput(input: string): string {
    return this.inputValidator.sanitize(input);
  }

  sanitizeOutput(output: any): any {
    return this.outputSanitizer.sanitize(output);
  }

  canCreateAgent(sessionId: string): boolean {
    return this.resourceLimiter.canCreateAgent(sessionId);
  }

  trackAgentCreated(): void {
    this.resourceLimiter.incrementAgentCount();
  }

  trackAgentCompleted(): void {
    this.resourceLimiter.decrementActiveAgents();
  }

  getResourceUsage() {
    return this.resourceLimiter.getUsage();
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}
6. Index Exports
Create src/orchestrator/security/index.ts:

typescript
Copy
export * from './types';
export * from './InputValidator';
export * from './OutputSanitizer';
export * from './ResourceLimiter';
export * from './SecurityManager';
📁 FILES TO CREATE
src/orchestrator/security/types.ts
src/orchestrator/security/InputValidator.ts
src/orchestrator/security/OutputSanitizer.ts
src/orchestrator/security/ResourceLimiter.ts
src/orchestrator/security/SecurityManager.ts
src/orchestrator/security/index.ts
tests/orchestrator/security/InputValidator.test.ts (8-12 tests)
tests/orchestrator/security/OutputSanitizer.test.ts (8-12 tests)
tests/orchestrator/security/ResourceLimiter.test.ts (5-7 tests)
tests/orchestrator/security/SecurityManager.test.ts (4-6 tests)
Total: 10 files, 25-35 tests

✅ SUCCESS CRITERIA
✅ Input validation working
✅ Input sanitization working
✅ Output sanitization working
✅ Resource limiting working
✅ Security manager coordinating all
✅ 25-35 tests passing
✅ No TypeScript errors
END OF PROMPT 14C
