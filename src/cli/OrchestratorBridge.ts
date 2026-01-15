/**
 * Orchestrator Bridge
 *
 * Connects the CLI to the Orchestrator, providing a clean interface
 * for processing user input through the orchestration pipeline.
 */

import { Orchestrator } from '../orchestrator/Orchestrator';
import { TaskRequest } from '../orchestrator/types';
import { Session } from './session/Session';

/**
 * Bridge between CLI and Orchestrator
 *
 * Handles the conversion between CLI session concepts and
 * Orchestrator task processing.
 */
export class OrchestratorBridge {
  private orchestrator: Orchestrator;

  /**
   * Create a new OrchestratorBridge
   * @param orchestrator - Optional orchestrator instance (creates new one if not provided)
   */
  constructor(orchestrator?: Orchestrator) {
    this.orchestrator = orchestrator || new Orchestrator();
  }

  /**
   * Process user input through the orchestrator
   *
   * Converts CLI input into a TaskRequest, processes it through
   * the orchestrator, and updates the session with the results.
   *
   * @param input - User input string
   * @param session - Current session
   * @returns Response string (output or error message)
   */
  async processInput(input: string, session: Session): Promise<string> {
    const request: TaskRequest = {
      input,
      sessionId: session.getId(),
      context: {
        persona: session.getPersona(),
        turnCount: session.getTurnCount(),
      },
    };

    const result = await this.orchestrator.process(request);

    if (result.success && result.output) {
      // Add successful turn to session history
      session.addTurn(input, result.output, {
        taskId: result.taskId,
        agentId: result.metadata?.agentId,
      });
      return result.output;
    } else {
      // Handle error case
      const errorMessage = result.error?.message || 'Unknown error';
      const errorOutput = `Error: ${errorMessage}`;

      // Still add to history for tracking
      session.addTurn(input, errorOutput, {
        taskId: result.taskId,
        error: true,
      });

      return errorOutput;
    }
  }

  /**
   * Get the underlying orchestrator instance
   * @returns Orchestrator instance
   */
  getOrchestrator(): Orchestrator {
    return this.orchestrator;
  }

  /**
   * Shutdown the orchestrator and clean up resources
   */
  async shutdown(): Promise<void> {
    await this.orchestrator.shutdown();
  }
}
