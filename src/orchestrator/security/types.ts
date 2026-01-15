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
