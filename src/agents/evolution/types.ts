export interface TraitPerformance {
  traitCombo: string[];
  taskCategory: string;
  successRate: number;
  avgTokenUsage: number;
  avgExecutionTime: number;
  sampleSize: number;
}

export interface EvolutionRecord {
  trait: string;
  performanceHistory: TraitPerformance[];
  currentWeight: number;
  adjustments: WeightAdjustment[];
}

export interface WeightAdjustment {
  timestamp: Date;
  oldWeight: number;
  newWeight: number;
  reason: string;
}

export interface FeedbackEntry {
  id: string;
  taskDescription: string;
  taskCategory: string;
  assignedTraits: string[];
  outcome: 'success' | 'failure' | 'partial';
  userCorrections: string[];
  tokenUsage: number;
  executionTime: number;
  timestamp: Date;
}

export interface AgentOutput {
  agentId: string;
  taskId: string;
  status: 'success' | 'failure' | 'partial' | 'blocked';
  result: {
    summary: string;
    details: unknown;
    artifacts: string[];
    confidence: number;
  };
  errors: AgentError[];
  signals: OutputSignal[];
  metadata: Record<string, unknown>;
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface OutputSignal {
  type: string;
  value: number | string;
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: 'info' | 'request' | 'clarification' | 'resolution' | 'warning';
  content: string;
  timestamp: Date;
  replyTo?: string;
}

export interface WorkflowPattern {
  name: string;
  steps: string[];
  frequency: number;
  lastSeen: Date;
}

export interface UserCapabilityProfile {
  strengths: string[];
  weaknesses: string[];
  workflows: WorkflowPattern[];
  communicationStyle: string;
  decisionPatterns: string[];
  codePreferences: Record<string, string>;
  lastUpdated: Date;
}

/**
 * Serializable versions of types for JSON persistence.
 * Dates are stored as ISO strings.
 */
export interface SerializedEvolutionRecord {
  trait: string;
  performanceHistory: TraitPerformance[];
  currentWeight: number;
  adjustments: SerializedWeightAdjustment[];
}

export interface SerializedWeightAdjustment {
  timestamp: string;
  oldWeight: number;
  newWeight: number;
  reason: string;
}

export interface SerializedFeedbackEntry {
  id: string;
  taskDescription: string;
  taskCategory: string;
  assignedTraits: string[];
  outcome: 'success' | 'failure' | 'partial';
  userCorrections: string[];
  tokenUsage: number;
  executionTime: number;
  timestamp: string;
}

export interface TraitEvolutionData {
  records: SerializedEvolutionRecord[];
  feedback: SerializedFeedbackEntry[];
}

export interface SerializedWorkflowPattern {
  name: string;
  steps: string[];
  frequency: number;
  lastSeen: string;
}

export interface SerializedUserCapabilityProfile {
  strengths: string[];
  weaknesses: string[];
  workflows: SerializedWorkflowPattern[];
  communicationStyle: string;
  decisionPatterns: string[];
  codePreferences: Record<string, string>;
  lastUpdated: string;
}

export interface UserProfileData {
  profile: SerializedUserCapabilityProfile;
  workflowSteps: Array<{ step: string; context: string; timestamp: string }>;
  strengthEvidence: Array<{ area: string; evidence: string; timestamp: string }>;
  weaknessEvidence: Array<{ area: string; evidence: string; timestamp: string }>;
  decisionLog: Array<{ decision: string; context: string; timestamp: string }>;
}
