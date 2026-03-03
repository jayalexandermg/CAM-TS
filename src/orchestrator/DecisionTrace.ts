/**
 * DecisionTrace
 *
 * Captures every routing/delegation decision made during request processing
 * for audit trail and debugging purposes.
 */

import { randomUUID } from 'crypto';

export interface DecisionPoint {
  timestamp: Date;
  type: 'skill_selection' | 'agent_selection' | 'routing' | 'fallback' | 'guardrail_check';
  inputSummary: string;
  candidates: Array<{ name: string; score: number; reason: string }>;
  selected: string;
  selectionReason: string;
  guardrailResult?: 'pass' | 'warn' | 'block';
  metadata: Record<string, unknown>;
}

export interface DecisionTraceResult {
  traceId: string;
  sessionId: string;
  decisions: DecisionPoint[];
  startTime: Date;
  endTime: Date;
  totalDecisions: number;
}

export class DecisionTrace {
  private readonly traceId: string;
  private readonly sessionId: string;
  private readonly startTime: Date;
  private readonly decisions: DecisionPoint[] = [];

  constructor(sessionId: string) {
    this.traceId = randomUUID();
    this.sessionId = sessionId;
    this.startTime = new Date();
  }

  recordDecision(point: Omit<DecisionPoint, 'timestamp'>): void {
    this.decisions.push({
      ...point,
      timestamp: new Date(),
    });
  }

  finalize(): DecisionTraceResult {
    return {
      traceId: this.traceId,
      sessionId: this.sessionId,
      decisions: [...this.decisions],
      startTime: this.startTime,
      endTime: new Date(),
      totalDecisions: this.decisions.length,
    };
  }

  getDecisions(): DecisionPoint[] {
    return [...this.decisions];
  }

  toJSON(): DecisionTraceResult {
    return this.finalize();
  }
}
