export type AgentStatus = 'idle' | 'active' | 'waiting' | 'completed' | 'failed';

export interface AgentDefinition {
  name: string;
  description: string;
  expertise: string[];
  personality: string[];
  communicationStyle: string;
  approach: string;
  availableSkills: string[];
  constraints?: string[];
}

export interface AgentConfig {
  id?: string;
  definition: AgentDefinition;
  sessionId: string;
  parentAgentId?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface AgentState {
  id: string;
  status: AgentStatus;
  definition: AgentDefinition;
  sessionId: string;
  parentAgentId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  currentTask?: string;
  result?: AgentResult;
  error?: Error;
  retryCount: number;
  maxRetries: number;
}

export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  metadata?: {
    duration: number;
    retries: number;
    skillsUsed: string[];
  };
}
