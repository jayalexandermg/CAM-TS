export type HistoryEntryType = 'session' | 'learning' | 'research' | 'decision' | 'output';

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  timestamp: Date;
  sessionId: string;
  agentId?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface SessionTranscript {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  turns: TranscriptTurn[];
  summary?: string;
}

export interface TranscriptTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  toolsUsed?: string[];
}

export interface Learning {
  id: string;
  sessionId: string;
  topic: string;
  insight: string;
  confidence: number;
  timestamp: Date;
  source?: string;
}

export interface Decision {
  id: string;
  sessionId: string;
  question: string;
  decision: string;
  reasoning: string;
  timestamp: Date;
  alternatives?: string[];
}
