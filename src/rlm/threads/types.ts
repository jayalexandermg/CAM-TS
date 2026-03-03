/**
 * Reasoning Thread Types
 *
 * Types for persistent reasoning chains that survive session boundaries.
 */

export interface ReasoningThread {
  id: string;
  topic: string;
  status: 'active' | 'paused' | 'resolved';
  steps: ThreadStep[];
  openQuestions: string[];
  branches: string[]; // IDs of branched threads
  parentThread?: string; // if this is a branch
  created: Date;
  updated: Date;
  sessionIds: string[]; // sessions that contributed
}

export interface ThreadStep {
  id: string;
  conclusion: string;
  evidence: string[];
  confidence: number; // 0-1
  sessionId: string;
  timestamp: Date;
}
