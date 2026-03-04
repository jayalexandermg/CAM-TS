/**
 * Orchestrator Bridge
 *
 * Connects the CLI to the Orchestrator, providing a clean interface
 * for processing user input through the orchestration pipeline.
 */

import { Orchestrator } from '../orchestrator/Orchestrator';
import { TaskRequest } from '../orchestrator/types';
import { Session } from './session/Session';
import { StreamCallback } from '../orchestrator/llm/types';
import { SessionMeta, EOSCheckinResponses } from '../memory/passdown/types';

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
   * Process input in ideation mode
   *
   * Direct conversation with the LLM using persona context,
   * without full task orchestration or agent spawning.
   * This is for natural brainstorming/ideation conversations.
   *
   * @param input - User input string
   * @param session - Current session
   * @returns Response string
   */
  async processIdeation(input: string, session: Session): Promise<string> {
    const llmClient = this.orchestrator.getLLMClient();

    // Build a conversational system prompt
    const persona = session.getPersona();
    const history = session.getHistory();

    const systemPrompt = this.buildIdeationPrompt(persona);

    // Convert recent history to LLM messages
    const recentHistory = history.slice(-10).flatMap((turn) => [
      { role: 'user' as const, content: turn.input },
      { role: 'assistant' as const, content: turn.output },
    ]);

    try {
      const response = await llmClient.chat(systemPrompt, input, recentHistory);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `[Ideation Error] ${errorMessage}`;
    }
  }

  /**
   * Process ideation input with streaming output
   *
   * Streams LLM response chunks through the callback as they arrive,
   * giving the user real-time feedback during conversation.
   *
   * @param input - User input string
   * @param session - Current session
   * @param onChunk - Callback for each streamed chunk
   * @returns Full response string
   */
  async processIdeationStreaming(
    input: string,
    session: Session,
    onChunk: (text: string) => void
  ): Promise<string> {
    const llmClient = this.orchestrator.getLLMClient();
    const persona = session.getPersona();
    const history = session.getHistory();
    const systemPrompt = this.buildIdeationPrompt(persona);

    const recentHistory = history.slice(-10).flatMap((turn) => [
      { role: 'user' as const, content: turn.input },
      { role: 'assistant' as const, content: turn.output },
    ]);

    const streamCallback: StreamCallback = (chunk) => {
      if (chunk.type === 'text' && chunk.content) {
        onChunk(chunk.content);
      }
    };

    try {
      const response = await llmClient.chatStream(
        systemPrompt,
        input,
        recentHistory,
        streamCallback
      );
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `[Ideation Error] ${errorMessage}`;
    }
  }

  /**
   * Generate a casual LLM greeting for session start
   */
  async generateGreeting(userName: string): Promise<string> {
    const llmClient = this.orchestrator.getLLMClient();
    const systemPrompt = `You are CAM, an AI co-founder for ${userName}. Generate a brief, casual, varied greeting to open a new session. Keep it to 1-2 sentences. Be warm but direct — no filler, no emojis.`;
    try {
      return await llmClient.chat(
        systemPrompt,
        `Generate a session opening greeting for ${userName}.`
      );
    } catch {
      return `Hey ${userName}, ready when you are.`;
    }
  }

  /**
   * Generate a Northstar-first SOS session brief from the latest EOS passdown
   */
  async generateSOSBrief(eosPassdown: string, userName: string): Promise<string> {
    const llmClient = this.orchestrator.getLLMClient();
    const systemPrompt = `You are CAM, an AI co-founder generating a session brief for ${userName}.

Rules:
1. Always lead with the Northstar (primary) project from the EOS passdown.
2. List P1-P3 tasks — at least 2 must be from the Northstar project.
3. Side quests only appear if they were actually worked on in the previous session, in a separate "Side quests" section.
4. Propose 3 starting options — at least 2 must be Northstar tasks.
5. End with: "What do you want to work on, or brain dump first?"

Format: 2-3 sentence recap, then P1-P3 tasks, then side quests (if any), then 3 starting options.`;
    try {
      return await llmClient.chat(
        systemPrompt,
        `Generate a session brief from this EOS passdown:\n\n${eosPassdown}`
      );
    } catch {
      return 'Previous session context available but brief generation failed. Type "history" to review manually.';
    }
  }

  /**
   * Generate a structured EOS passdown from the session journal
   */
  async generateEOSPassdown(
    journalSummary: string,
    sessionMeta: SessionMeta,
    userName: string,
    checkin: EOSCheckinResponses
  ): Promise<string> {
    const llmClient = this.orchestrator.getLLMClient();
    const date = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are CAM generating an End-of-Session passdown for ${userName}.

Write a structured markdown EOS passdown with these sections:
# EOS Passdown — ${date}
## Session Metadata (duration, turns)
## What We Worked On
## Decisions Made (each with status: active | tentative | revisit)
## Open Items (P1-P3 with project and next action)
## Priority for Next Session (top 3)
## Notes

Use the session journal and checkin responses as your source. Be concise and specific.`;

    const userMessage = `Session journal:\n${journalSummary}\n\nSession: ${sessionMeta.duration}, ${sessionMeta.turnCount} turns\n\nCheckin responses:\nOpen threads: ${checkin.questions || 'None'}\nEnergy: ${checkin.energy || 'Not provided'}\nBrain dump: ${checkin.brainDump || 'None'}`;

    try {
      return await llmClient.chat(systemPrompt, userMessage);
    } catch {
      return `# EOS Passdown — ${date}\n\n(Generation failed — see session journal for raw data)`;
    }
  }

  /**
   * Build system prompt for ideation mode
   */
  private buildIdeationPrompt(persona?: string): string {
    const basePrompt = `You are CAM, an AI cofounder and personal assistant. You're in ideation mode - having a natural conversation to brainstorm, strategize, and work through ideas together.

Be conversational, collaborative, and thoughtful. Ask clarifying questions when needed. Help explore ideas from multiple angles.

When the user is ready to execute on an idea, they can switch to execution mode with /do or /execute.`;

    if (persona) {
      return `${basePrompt}

Current persona context: ${persona}`;
    }

    return basePrompt;
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
