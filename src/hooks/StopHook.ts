/**
 * Infinite Aura - Stop Hook
 *
 * Hook that fires when a session ends, ending the session in UOCS
 * and capturing any final output.
 */

import { UOCS } from '../history/UOCS';

/**
 * Base context for all hooks
 */
export interface HookContext {
  sessionId: string;
  agentId?: string;
}

/**
 * Result from executing a hook
 */
export interface StopHookResult {
  success: boolean;
  duration: number;
  data?: Record<string, unknown>;
  error?: Error;
}

/**
 * Context for stop events
 */
export interface StopContext extends HookContext {
  reason: 'user_exit' | 'timeout' | 'error' | 'complete';
  summary?: string;
  finalOutput?: string;
}

/**
 * Hook interface that StopHook implements
 */
export interface Hook {
  name: string;
  execute(context: HookContext): Promise<StopHookResult>;
}

/**
 * Hook that handles session stop events
 *
 * This hook:
 * - Ends the session in UOCS
 * - Captures final output if provided
 * - Records the stop reason
 */
export class StopHook implements Hook {
  readonly name = 'Stop';
  private uocs: UOCS;

  constructor(uocs?: UOCS) {
    this.uocs = uocs || new UOCS();
  }

  /**
   * Execute the stop hook
   * @param context - The stop context with session info and reason
   * @returns Hook execution result
   */
  async execute(context: StopContext): Promise<StopHookResult> {
    const startTime = Date.now();

    try {
      // End session in UOCS
      await this.uocs.endSession(context.sessionId, context.summary);

      // Capture final output if provided
      if (context.finalOutput) {
        await this.uocs.captureOutput(context.sessionId, context.finalOutput, context.agentId, {
          reason: context.reason,
          final: true,
        });
      }

      return {
        success: true,
        duration: Date.now() - startTime,
        data: {
          sessionEnded: true,
          reason: context.reason,
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
