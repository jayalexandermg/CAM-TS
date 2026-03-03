/**
 * ReasoningThreadManager - Persistent Reasoning Chains
 *
 * Manages reasoning threads that survive session boundaries.
 * Threads are serialized to JSON files in the threads directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ReasoningThread, ThreadStep } from './types';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Serialize a ReasoningThread for JSON storage (Dates -> ISO strings)
 */
function serializeThread(thread: ReasoningThread): Record<string, unknown> {
  return {
    ...thread,
    created: thread.created.toISOString(),
    updated: thread.updated.toISOString(),
    steps: thread.steps.map((step) => ({
      ...step,
      timestamp: step.timestamp.toISOString(),
    })),
  };
}

/**
 * Deserialize a JSON object back to ReasoningThread
 */
function deserializeThread(data: Record<string, unknown>): ReasoningThread {
  const steps = (data.steps as Record<string, unknown>[]).map(
    (s): ThreadStep => ({
      id: s.id as string,
      conclusion: s.conclusion as string,
      evidence: s.evidence as string[],
      confidence: s.confidence as number,
      sessionId: s.sessionId as string,
      timestamp: new Date(s.timestamp as string),
    })
  );

  return {
    id: data.id as string,
    topic: data.topic as string,
    status: data.status as ReasoningThread['status'],
    steps,
    openQuestions: data.openQuestions as string[],
    branches: (data.branches as string[]) ?? [],
    parentThread: data.parentThread as string | undefined,
    created: new Date(data.created as string),
    updated: new Date(data.updated as string),
    sessionIds: (data.sessionIds as string[]) ?? [],
  };
}

export class ReasoningThreadManager {
  private readonly threadsDirectory: string;
  private threads: Map<string, ReasoningThread> = new Map();

  constructor(threadsDirectory: string) {
    this.threadsDirectory = threadsDirectory;
    this.loadThreads();
  }

  /**
   * Create a new reasoning thread.
   */
  createThread(topic: string, sessionId?: string): string {
    const now = new Date();
    const id = generateId('thread');
    const thread: ReasoningThread = {
      id,
      topic,
      status: 'active',
      steps: [],
      openQuestions: [],
      branches: [],
      created: now,
      updated: now,
      sessionIds: sessionId ? [sessionId] : [],
    };
    this.threads.set(id, thread);
    this.saveThread(thread);
    return id;
  }

  /**
   * Resume a paused or previously loaded thread. Sets status to 'active'.
   */
  resumeThread(id: string): ReasoningThread | undefined {
    const thread = this.threads.get(id);
    if (!thread) return undefined;

    thread.status = 'active';
    thread.updated = new Date();
    this.saveThread(thread);
    return thread;
  }

  /**
   * Add a reasoning step to a thread.
   */
  addStep(
    threadId: string,
    step: Omit<ThreadStep, 'id' | 'timestamp'>
  ): ThreadStep | undefined {
    const thread = this.threads.get(threadId);
    if (!thread) return undefined;

    const fullStep: ThreadStep = {
      ...step,
      id: generateId('step'),
      timestamp: new Date(),
    };

    thread.steps.push(fullStep);
    thread.updated = new Date();

    // Track contributing session
    if (step.sessionId && !thread.sessionIds.includes(step.sessionId)) {
      thread.sessionIds.push(step.sessionId);
    }

    this.saveThread(thread);
    return fullStep;
  }

  /**
   * Branch a thread into a new thread with a different topic.
   */
  branchThread(threadId: string, newTopic: string, sessionId?: string): string | undefined {
    const parent = this.threads.get(threadId);
    if (!parent) return undefined;

    const branchId = this.createThread(newTopic, sessionId);
    const branch = this.threads.get(branchId);
    if (!branch) return undefined;

    branch.parentThread = threadId;
    parent.branches.push(branchId);
    parent.updated = new Date();

    this.saveThread(parent);
    this.saveThread(branch);
    return branchId;
  }

  /**
   * Resolve a thread with a final conclusion.
   */
  resolveThread(
    threadId: string,
    finalConclusion: string,
    sessionId?: string
  ): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    // Add the final conclusion as a step
    this.addStep(threadId, {
      conclusion: finalConclusion,
      evidence: [],
      confidence: 1.0,
      sessionId: sessionId ?? 'system',
    });

    thread.status = 'resolved';
    thread.updated = new Date();
    this.saveThread(thread);
    return true;
  }

  /**
   * Pause a thread for later resumption.
   */
  pauseThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    thread.status = 'paused';
    thread.updated = new Date();
    this.saveThread(thread);
    return true;
  }

  /**
   * List threads with status 'active' or 'paused'.
   */
  listActiveThreads(): ReasoningThread[] {
    return Array.from(this.threads.values()).filter(
      (t) => t.status === 'active' || t.status === 'paused'
    );
  }

  /**
   * Get a thread by ID.
   */
  getThread(id: string): ReasoningThread | undefined {
    return this.threads.get(id);
  }

  /**
   * List all threads regardless of status.
   */
  listAllThreads(): ReasoningThread[] {
    return Array.from(this.threads.values());
  }

  // --- Private ---

  private loadThreads(): void {
    try {
      if (!fs.existsSync(this.threadsDirectory)) {
        fs.mkdirSync(this.threadsDirectory, { recursive: true });
        return;
      }
      const files = fs.readdirSync(this.threadsDirectory);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const filePath = path.join(this.threadsDirectory, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw) as Record<string, unknown>;
          const thread = deserializeThread(data);
          this.threads.set(thread.id, thread);
        } catch {
          // Skip corrupted thread files
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }

  private saveThread(thread: ReasoningThread): void {
    try {
      if (!fs.existsSync(this.threadsDirectory)) {
        fs.mkdirSync(this.threadsDirectory, { recursive: true });
      }
      const filePath = path.join(this.threadsDirectory, `${thread.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(serializeThread(thread), null, 2));
    } catch {
      // Silently fail on write errors
    }
  }
}
