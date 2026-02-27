import { HistoryStorage } from './HistoryStorage';
import { HistoryEntry, SessionTranscript, TranscriptTurn, Learning, Decision } from './types';
import { EventEmitter } from 'events';

export class UOCS extends EventEmitter {
  private storage: HistoryStorage;
  private activeTranscripts: Map<string, SessionTranscript>;

  constructor(storage?: HistoryStorage) {
    super();
    this.storage = storage || new HistoryStorage();
    this.activeTranscripts = new Map();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  // Session Transcript Capture
  startSession(sessionId: string): void {
    const transcript: SessionTranscript = {
      sessionId,
      startTime: new Date(),
      turns: [],
    };

    this.activeTranscripts.set(sessionId, transcript);
    this.emit('sessionStarted', { sessionId });
  }

  captureTurn(sessionId: string, turn: TranscriptTurn): void {
    const transcript = this.activeTranscripts.get(sessionId);
    if (!transcript) {
      // Auto-start session if not exists
      this.startSession(sessionId);
      this.captureTurn(sessionId, turn);
      return;
    }

    transcript.turns.push(turn);
    this.emit('turnCaptured', { sessionId, turn });
  }

  async endSession(sessionId: string, summary?: string): Promise<void> {
    const transcript = this.activeTranscripts.get(sessionId);
    if (!transcript) {
      return;
    }

    transcript.endTime = new Date();
    transcript.summary = summary;

    await this.storage.saveSessionTranscript(transcript);
    this.activeTranscripts.delete(sessionId);

    this.emit('sessionEnded', { sessionId, transcript });
  }

  // Learning Capture
  async captureLearning(
    sessionId: string,
    topic: string,
    insight: string,
    confidence: number = 0.8,
    source?: string
  ): Promise<Learning> {
    const learning: Learning = {
      id: this.generateId('learning'),
      sessionId,
      topic,
      insight,
      confidence,
      timestamp: new Date(),
      source,
    };

    await this.storage.saveLearning(learning);
    this.emit('learningCaptured', learning);

    return learning;
  }

  // Decision Capture
  async captureDecision(
    sessionId: string,
    question: string,
    decision: string,
    reasoning: string,
    alternatives?: string[]
  ): Promise<Decision> {
    const decisionEntry: Decision = {
      id: this.generateId('decision'),
      sessionId,
      question,
      decision,
      reasoning,
      timestamp: new Date(),
      alternatives,
    };

    await this.storage.saveDecision(decisionEntry);
    this.emit('decisionCaptured', decisionEntry);

    return decisionEntry;
  }

  // Raw Output Capture
  async captureOutput(
    sessionId: string,
    content: string,
    agentId?: string,
    metadata?: Record<string, unknown>
  ): Promise<HistoryEntry> {
    const entry: HistoryEntry = {
      id: this.generateId('output'),
      type: 'output',
      timestamp: new Date(),
      sessionId,
      agentId,
      content,
      metadata,
    };

    await this.storage.saveEntry(entry);
    this.emit('outputCaptured', entry);

    return entry;
  }

  // Retrieval
  async getSessionTranscript(sessionId: string): Promise<SessionTranscript | null> {
    // Check active first
    const active = this.activeTranscripts.get(sessionId);
    if (active) {
      return active;
    }

    return this.storage.getSessionTranscript(sessionId);
  }

  async searchLearnings(topic: string): Promise<Learning[]> {
    return this.storage.searchLearnings(topic);
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.activeTranscripts.keys());
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }
}
