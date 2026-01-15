import { InputValidator } from './InputValidator';
import { OutputSanitizer } from './OutputSanitizer';
import { ResourceLimiter } from './ResourceLimiter';
import { SecurityConfig, ValidationResult, ResourceUsage } from './types';

export class SecurityManager {
  private inputValidator: InputValidator;
  private outputSanitizer: OutputSanitizer;
  private resourceLimiter: ResourceLimiter;
  private config: SecurityConfig;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      maxInputLength: config?.maxInputLength ?? 10000,
      maxOutputLength: config?.maxOutputLength ?? 50000,
      maxAgentsPerSession: config?.maxAgentsPerSession ?? 10,
      maxConcurrentAgents: config?.maxConcurrentAgents ?? 5,
      maxTaskDuration: config?.maxTaskDuration ?? 300000, // 5 minutes
      allowedFileExtensions: config?.allowedFileExtensions ?? ['.txt', '.md', '.json'],
      blockedPatterns: config?.blockedPatterns ?? []
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

  sanitizeOutput(output: unknown): unknown {
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

  getResourceUsage(): ResourceUsage {
    return this.resourceLimiter.getUsage();
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}
