/**
 * Infinite Aura - Relevance Scorer
 *
 * Scores context relevance based on the request parameters.
 */

import {
  ContextRequest,
  UserContext,
  ProjectContext,
  SessionContext,
  AgentContext,
  RelevanceScores,
  DEFAULT_RELEVANCE_SCORES,
} from './types';

/**
 * Configuration for relevance scoring
 */
export interface RelevanceScorerConfig {
  /** Weight for exact match (default: 1.0) */
  exactMatchWeight: number;
  /** Weight for recent activity (default: 0.8) */
  recentActivityWeight: number;
  /** Weight for older activity (default: 0.5) */
  olderActivityWeight: number;
  /** Weight for partial match (default: 0.5) */
  partialMatchWeight: number;
  /** Hours to consider as "recent" (default: 24) */
  recentHours: number;
  /** Hours to consider as "very recent" for sessions (default: 1) */
  veryRecentHours: number;
}

/**
 * Default relevance scorer configuration
 */
export const DEFAULT_RELEVANCE_SCORER_CONFIG: RelevanceScorerConfig = {
  exactMatchWeight: 1.0,
  recentActivityWeight: 0.8,
  olderActivityWeight: 0.5,
  partialMatchWeight: 0.5,
  recentHours: 24,
  veryRecentHours: 1,
};

/**
 * Scores context relevance based on request parameters
 */
export class RelevanceScorer {
  private readonly config: RelevanceScorerConfig;

  constructor(config: Partial<RelevanceScorerConfig> = {}) {
    this.config = {
      ...DEFAULT_RELEVANCE_SCORER_CONFIG,
      ...config,
    };
  }

  /**
   * Score all contexts at once
   */
  scoreAll(
    userContext: UserContext | undefined,
    projectContext: ProjectContext | undefined,
    sessionContext: SessionContext | undefined,
    agentContext: AgentContext | undefined,
    request: ContextRequest
  ): RelevanceScores {
    return {
      user: this.scoreUserContext(userContext, request),
      project: this.scoreProjectContext(projectContext, request),
      session: this.scoreSessionContext(sessionContext, request),
      agent: this.scoreAgentContext(agentContext, request),
    };
  }

  /**
   * Score user context relevance
   * User context is always foundational (1.0) if present
   */
  scoreUserContext(userContext: UserContext | undefined, _request: ContextRequest): number {
    if (!userContext) {
      return 0;
    }

    // User context is always 1.0 (foundational)
    return this.config.exactMatchWeight;
  }

  /**
   * Score project context relevance
   */
  scoreProjectContext(projectContext: ProjectContext | undefined, request: ContextRequest): number {
    if (!projectContext) {
      return 0;
    }

    // Perfect match if projectId matches
    if (request.projectId && projectContext.projectId === request.projectId) {
      return this.config.exactMatchWeight;
    }

    // Check for recent activity
    if (projectContext.history && projectContext.history.length > 0) {
      const mostRecent = this.getMostRecentTimestamp(
        projectContext.history.map((e) => e.timestamp)
      );
      if (this.isRecent(mostRecent, this.config.recentHours)) {
        return this.config.recentActivityWeight;
      }
      return this.config.olderActivityWeight;
    }

    return 0;
  }

  /**
   * Score session context relevance
   */
  scoreSessionContext(sessionContext: SessionContext | undefined, request: ContextRequest): number {
    if (!sessionContext) {
      return 0;
    }

    // Perfect match if sessionId matches
    if (request.sessionId && sessionContext.sessionId === request.sessionId) {
      return this.config.exactMatchWeight;
    }

    // Check for very recent session (last hour)
    if (sessionContext.startedAt) {
      if (this.isRecent(sessionContext.startedAt, this.config.veryRecentHours)) {
        return this.config.recentActivityWeight - 0.1; // 0.7 for very recent
      }
      if (this.isRecent(sessionContext.startedAt, this.config.recentHours)) {
        return this.config.olderActivityWeight - 0.1; // 0.4 for recent
      }
    }

    return 0;
  }

  /**
   * Score agent context relevance
   */
  scoreAgentContext(agentContext: AgentContext | undefined, request: ContextRequest): number {
    if (!agentContext) {
      return 0;
    }

    // Perfect match if agentId matches
    if (request.agentId && agentContext.agentId === request.agentId) {
      return this.config.exactMatchWeight;
    }

    // Check if task type matches agent capabilities
    if (request.taskType && agentContext.capabilities.length > 0) {
      const taskTypeStr = request.taskType.toLowerCase();
      const capabilitiesStr = agentContext.capabilities.map((c) => c.toLowerCase());

      // Full match
      if (capabilitiesStr.includes(taskTypeStr)) {
        return this.config.recentActivityWeight;
      }

      // Partial match (capability contains task type or vice versa)
      const hasPartialMatch = capabilitiesStr.some(
        (cap) => cap.includes(taskTypeStr) || taskTypeStr.includes(cap)
      );
      if (hasPartialMatch) {
        return this.config.partialMatchWeight;
      }
    }

    return 0;
  }

  /**
   * Score based on query relevance (keyword matching)
   */
  scoreQueryRelevance(content: string, query: string | undefined): number {
    if (!query || !content) {
      return 0;
    }

    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    let matches = 0;
    for (const word of queryWords) {
      if (word.length > 2 && contentLower.includes(word)) {
        matches++;
      }
    }

    if (queryWords.length === 0) {
      return 0;
    }

    return Math.min(matches / queryWords.length, 1.0);
  }

  /**
   * Check if a timestamp is within recent hours
   */
  private isRecent(timestamp: string, hours: number): boolean {
    try {
      const time = new Date(timestamp).getTime();
      const now = Date.now();
      const hoursMs = hours * 60 * 60 * 1000;
      return now - time < hoursMs;
    } catch {
      return false;
    }
  }

  /**
   * Get most recent timestamp from an array
   */
  private getMostRecentTimestamp(timestamps: string[]): string {
    if (timestamps.length === 0) {
      return new Date(0).toISOString();
    }

    return timestamps.reduce((most, current) => {
      try {
        return new Date(current) > new Date(most) ? current : most;
      } catch {
        return most;
      }
    });
  }

  /**
   * Get default relevance scores
   */
  getDefaultScores(): RelevanceScores {
    return { ...DEFAULT_RELEVANCE_SCORES };
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<RelevanceScorerConfig> {
    return { ...this.config };
  }
}
