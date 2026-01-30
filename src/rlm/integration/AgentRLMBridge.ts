/**
 * Agent-RLM Bridge
 *
 * Connects agents to the RLM system for enhanced reasoning capabilities.
 * Enables agents to leverage recursive reasoning for complex tasks.
 */

import { EventEmitter } from 'events';
import {
  AgentRLMBridgeConfig,
  AgentReasoningResult,
  RLMSolveRequest,
  RLMAnalyzeResult,
  DEFAULT_AGENT_RLM_BRIDGE_CONFIG,
} from './types';
import { RLMOrchestrator } from './RLMOrchestrator';
import { Agent } from '../../agents/Agent';
import { ContextItem } from '../context/types';

/**
 * Generates unique identifiers
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Agent reasoning session
 */
interface AgentSession {
  agentId: string;
  sessionId: string;
  contextItems: string[];
  reasoningHistory: AgentReasoningResult[];
  startTime: number;
}

/**
 * AgentRLMBridge - Connects agents to RLM for enhanced reasoning
 */
export class AgentRLMBridge extends EventEmitter {
  private config: AgentRLMBridgeConfig;
  private orchestrator: RLMOrchestrator;
  private agentSessions: Map<string, AgentSession>;
  private sharedContext: Map<string, ContextItem>;

  constructor(
    orchestrator: RLMOrchestrator,
    config?: Partial<AgentRLMBridgeConfig>
  ) {
    super();
    this.config = { ...DEFAULT_AGENT_RLM_BRIDGE_CONFIG, ...config };
    this.orchestrator = orchestrator;
    this.agentSessions = new Map();
    this.sharedContext = new Map();
  }

  /**
   * Register an agent for RLM-enhanced reasoning
   */
  registerAgent(agent: Agent, sessionId?: string): string {
    const agentId = agent.getId();
    const actualSessionId = sessionId || generateId('session');

    const session: AgentSession = {
      agentId,
      sessionId: actualSessionId,
      contextItems: [],
      reasoningHistory: [],
      startTime: Date.now(),
    };

    this.agentSessions.set(agentId, session);
    this.emit('agentRegistered', { agentId, sessionId: actualSessionId });

    return actualSessionId;
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    const session = this.agentSessions.get(agentId);
    if (!session) return false;

    this.agentSessions.delete(agentId);
    this.emit('agentUnregistered', { agentId });
    return true;
  }

  /**
   * Reason about a task using RLM
   */
  async reason(
    agent: Agent,
    task: string,
    options?: {
      context?: string;
      constraints?: string[];
      forceRLM?: boolean;
    }
  ): Promise<AgentReasoningResult> {
    const agentId = agent.getId();
    const session = this.agentSessions.get(agentId);

    if (!session) {
      throw new Error(`Agent ${agentId} not registered for RLM reasoning`);
    }

    const startTime = Date.now();

    // Check if we should use RLM based on complexity
    if (!options?.forceRLM && this.config.autoUseRLM) {
      const analysis = await this.analyzeTask(task);
      if (analysis.canSolveDirectly && analysis.confidence > this.config.complexityThreshold) {
        // Simple task, use direct agent reasoning
        return this.directReason(agent, task, startTime);
      }
    }

    // Build context from agent definition and shared context
    const agentContext = this.buildAgentContext(agent);
    const combinedContext = options?.context
      ? `${agentContext}\n\n${options.context}`
      : agentContext;

    // Create solve request
    const request: RLMSolveRequest = {
      query: task,
      context: combinedContext,
      constraints: options?.constraints,
      sessionId: session.sessionId,
      agentId,
    };

    // Execute via orchestrator
    const rlmResult = await this.orchestrator.solve(request);

    // Build result
    const result: AgentReasoningResult = {
      agentId,
      task,
      rlmResult,
      contextUsed: this.getContextItems(session),
      duration: Date.now() - startTime,
    };

    // Store in history
    session.reasoningHistory.push(result);

    // Cache result if enabled
    if (this.config.cacheAgentResults && rlmResult.success) {
      this.cacheResult(agentId, task, result);
    }

    this.emit('reasoningComplete', { agentId, task, success: rlmResult.success });

    return result;
  }

  /**
   * Analyze task complexity
   */
  async analyzeTask(task: string): Promise<RLMAnalyzeResult> {
    return this.orchestrator.analyze({ query: task });
  }

  /**
   * Add context for an agent
   */
  addAgentContext(
    agentId: string,
    content: string,
    type: 'knowledge' | 'constraint' | 'history' = 'knowledge'
  ): string | null {
    const session = this.agentSessions.get(agentId);
    if (!session) return null;

    const itemId = this.orchestrator.addContext(content, type, `agent:${agentId}`);
    session.contextItems.push(itemId);

    return itemId;
  }

  /**
   * Add shared context accessible to all agents
   */
  addSharedContext(
    content: string,
    type: 'knowledge' | 'constraint' | 'history' = 'knowledge'
  ): string {
    const itemId = this.orchestrator.addContext(content, type, 'shared');

    const item: ContextItem = {
      id: itemId,
      content,
      type,
      priority: 'medium',
      timestamp: new Date(),
      relevanceScore: 0.5,
      tokenCount: Math.ceil(content.length / 4),
      isCompressed: false,
      source: 'shared',
    };

    this.sharedContext.set(itemId, item);
    return itemId;
  }

  /**
   * Get agent's reasoning history
   */
  getReasoningHistory(agentId: string): AgentReasoningResult[] {
    const session = this.agentSessions.get(agentId);
    return session ? [...session.reasoningHistory] : [];
  }

  /**
   * Clear agent's reasoning history
   */
  clearReasoningHistory(agentId: string): boolean {
    const session = this.agentSessions.get(agentId);
    if (!session) return false;

    session.reasoningHistory = [];
    return true;
  }

  /**
   * Get registered agent IDs
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.agentSessions.keys());
  }

  /**
   * Check if agent is registered
   */
  isRegistered(agentId: string): boolean {
    return this.agentSessions.has(agentId);
  }

  /**
   * Get agent session info
   */
  getAgentSession(agentId: string): Omit<AgentSession, 'reasoningHistory'> | undefined {
    const session = this.agentSessions.get(agentId);
    if (!session) return undefined;

    return {
      agentId: session.agentId,
      sessionId: session.sessionId,
      contextItems: [...session.contextItems],
      startTime: session.startTime,
    };
  }

  /**
   * Solve a problem collaboratively between multiple agents
   */
  async collaborativeSolve(
    agents: Agent[],
    problem: string,
    strategy: 'sequential' | 'parallel' | 'consensus' = 'sequential'
  ): Promise<AgentReasoningResult[]> {
    const results: AgentReasoningResult[] = [];

    if (strategy === 'parallel') {
      // All agents reason in parallel
      const promises = agents.map((agent) =>
        this.reason(agent, problem, { forceRLM: true })
      );
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else if (strategy === 'sequential') {
      // Each agent builds on the previous
      let context = '';
      for (const agent of agents) {
        const result = await this.reason(agent, problem, {
          context,
          forceRLM: true,
        });
        results.push(result);

        // Add result to context for next agent
        if (result.rlmResult.success && result.rlmResult.solution) {
          context += `\n\nPrevious insight: ${result.rlmResult.solution.answer}`;
        }
      }
    } else {
      // Consensus: all agents reason, then synthesize
      const promises = agents.map((agent) =>
        this.reason(agent, problem, { forceRLM: true })
      );
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);

      // Synthesize consensus (if multiple successful results)
      const successfulResults = parallelResults.filter(
        (r) => r.rlmResult.success && r.rlmResult.solution
      );

      if (successfulResults.length > 1) {
        // Add synthesis as shared context
        const synthesis = successfulResults
          .map((r, i) => `Solution ${i + 1}: ${r.rlmResult.solution?.answer}`)
          .join('\n');

        this.addSharedContext(
          `Consensus from ${successfulResults.length} agents:\n${synthesis}`,
          'knowledge'
        );
      }
    }

    return results;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<AgentRLMBridgeConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AgentRLMBridgeConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // === Private Methods ===

  /**
   * Direct reasoning without RLM (for simple tasks)
   */
  private async directReason(
    agent: Agent,
    task: string,
    startTime: number
  ): Promise<AgentReasoningResult> {
    const agentId = agent.getId();
    const session = this.agentSessions.get(agentId);

    // Use simple solve
    const simpleSolution = await this.orchestrator.getEngine().solveSimple(task);

    const result: AgentReasoningResult = {
      agentId,
      task,
      rlmResult: {
        success: true,
        solution: simpleSolution,
        reasoningResult: {
          success: true,
          solution: simpleSolution,
          trace: {
            id: generateId('trace'),
            rootProblem: {
              id: generateId('problem'),
              description: task,
              depth: 0,
            },
            steps: [],
            status: 'completed',
            maxDepthReached: 0,
            totalDuration: Date.now() - startTime,
            startTime: new Date(startTime),
            endTime: new Date(),
          },
          metrics: {
            totalTime: Date.now() - startTime,
            analysisTime: 0,
            decompositionTime: 0,
            solvingTime: Date.now() - startTime,
            synthesisTime: 0,
            problemsProcessed: 1,
            directSolves: 1,
            recursiveSolves: 0,
            maxDepth: 0,
            cacheHits: 0,
            cacheMisses: 1,
          },
        },
        formattedAnswer: simpleSolution.answer,
        metrics: {
          totalTime: Date.now() - startTime,
          reasoning: {
            totalTime: Date.now() - startTime,
            analysisTime: 0,
            decompositionTime: 0,
            solvingTime: Date.now() - startTime,
            synthesisTime: 0,
            problemsProcessed: 1,
            directSolves: 1,
            recursiveSolves: 0,
            maxDepth: 0,
            cacheHits: 0,
            cacheMisses: 1,
          },
          contextTokens: 0,
          memoryOperations: 0,
          sandboxOperations: 0,
          cacheHits: 0,
        },
      },
      contextUsed: session ? this.getContextItems(session) : [],
      duration: Date.now() - startTime,
    };

    if (session) {
      session.reasoningHistory.push(result);
    }

    this.emit('reasoningComplete', { agentId, task, success: true });

    return result;
  }

  /**
   * Build context from agent definition
   */
  private buildAgentContext(agent: Agent): string {
    const definition = agent.getDefinition();

    return `
Agent: ${definition.name}
Description: ${definition.description}
Expertise: ${definition.expertise.join(', ')}
Approach: ${definition.approach}
Communication Style: ${definition.communicationStyle}
    `.trim();
  }

  /**
   * Get context items for session
   */
  private getContextItems(session: AgentSession): ContextItem[] {
    const contextManager = this.orchestrator.getContextManager();
    const items: ContextItem[] = [];

    for (const itemId of session.contextItems) {
      const item = contextManager.get(itemId);
      if (item) {
        items.push(item);
      }
    }

    // Add shared context
    for (const item of this.sharedContext.values()) {
      items.push(item);
    }

    return items;
  }

  /**
   * Cache result for agent
   */
  private cacheResult(
    agentId: string,
    task: string,
    result: AgentReasoningResult
  ): void {
    // Add to shared context if sharing is enabled
    if (this.config.shareContext && result.rlmResult.success && result.rlmResult.solution) {
      this.addSharedContext(
        `Cached solution for "${task.slice(0, 50)}...": ${result.rlmResult.solution.answer}`,
        'knowledge'
      );
    }
  }
}
