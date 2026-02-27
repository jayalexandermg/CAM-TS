/**
 * Infinite Aura - Subagent Stop Hook
 *
 * Hook that fires when a subagent completes, capturing the completion
 * in UOCS and extracting any learnings.
 */

import { UOCS } from '../history/UOCS';
import { AgentResult } from '../agents/types';
import { HookContext, StopHookResult, Hook } from './StopHook';

/**
 * Context for subagent stop events
 */
export interface SubagentStopContext extends HookContext {
  parentAgentId: string;
  result: AgentResult;
  taskDescription?: string;
}

/**
 * Learning structure extracted from subagent results
 */
export interface SubagentLearning {
  topic?: string;
  insight: string;
  confidence?: number;
}

/**
 * Hook that handles subagent completion events
 *
 * This hook:
 * - Captures subagent completion as a system turn
 * - Records the result as output
 * - Extracts and stores learnings from successful results
 */
export class SubagentStopHook implements Hook {
  readonly name = 'SubagentStop';
  private uocs: UOCS;

  constructor(uocs?: UOCS) {
    this.uocs = uocs || new UOCS();
  }

  /**
   * Execute the subagent stop hook
   * @param context - The subagent stop context with result info
   * @returns Hook execution result
   */
  async execute(context: SubagentStopContext): Promise<StopHookResult> {
    const startTime = Date.now();

    try {
      // Capture subagent completion as a system turn
      this.uocs.captureTurn(context.sessionId, {
        role: 'system',
        content: `Subagent ${context.agentId} completed: ${context.result.success ? 'success' : 'failed'}`,
        timestamp: new Date(),
        agentId: context.agentId,
      });

      // Capture result as output
      await this.uocs.captureOutput(
        context.sessionId,
        JSON.stringify({
          subagentId: context.agentId,
          parentAgentId: context.parentAgentId,
          task: context.taskDescription,
          result: context.result,
        }),
        context.agentId,
        {
          type: 'subagent_completion',
          success: context.result.success,
        }
      );

      // If successful, check for learnings
      if (context.result.success && context.result.data) {
        await this.extractSubagentLearnings(context);
      }

      return {
        success: true,
        duration: Date.now() - startTime,
        data: {
          subagentId: context.agentId,
          parentAgentId: context.parentAgentId,
          resultSuccess: context.result.success,
        },
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error as Error,
      };
    }
  }

  /**
   * Extract learnings from subagent result data
   * @param context - The subagent stop context
   */
  private async extractSubagentLearnings(context: SubagentStopContext): Promise<void> {
    const data = context.result.data as Record<string, unknown> | undefined;

    if (!data) {
      return;
    }

    // If result contains explicit learnings, capture them
    if (data.learnings && Array.isArray(data.learnings)) {
      for (const learning of data.learnings) {
        const learningData = learning as SubagentLearning | string;

        if (typeof learningData === 'string') {
          await this.uocs.captureLearning(
            context.sessionId,
            'subagent_insight',
            learningData,
            0.7,
            `Subagent: ${context.agentId}`
          );
        } else {
          await this.uocs.captureLearning(
            context.sessionId,
            learningData.topic || 'subagent_insight',
            learningData.insight || String(learningData),
            learningData.confidence || 0.7,
            `Subagent: ${context.agentId}`
          );
        }
      }
    }
  }

  /**
   * Set or replace the UOCS instance
   * @param uocs - The UOCS instance to use
   */
  setUOCS(uocs: UOCS): void {
    this.uocs = uocs;
  }

  /**
   * Get the current UOCS instance
   * @returns The UOCS instance
   */
  getUOCS(): UOCS {
    return this.uocs;
  }
}
