PROMPT 17B: PostToolUse Hook
Phase: 5 (History & Hooks)
Parallel: ✅ Can run with 17A, 17C

⚠️ PACKAGE MANAGER: PNPM ONLY
📋 OBJECTIVE
Implement PostToolUse hook for capturing tool outputs.

📦 REQUIREMENTS
1. PostToolUse Hook
Create src/hooks/PostToolUseHook.ts:

typescript
Copy
import { Hook, HookContext, HookResult } from './types';
import { UOCS } from '../history/UOCS';

export interface PostToolUseContext extends HookContext {
  toolName: string;
  toolInput: any;
  toolOutput: any;
  duration: number;
  success: boolean;
  error?: Error;
}

export class PostToolUseHook implements Hook {
  name = 'PostToolUse';
  private uocs: UOCS;

  constructor(uocs?: UOCS) {
    this.uocs = uocs || new UOCS();
  }

  async execute(context: PostToolUseContext): Promise<HookResult> {
    const startTime = Date.now();

    try {
      // Capture tool output to history
      await this.uocs.captureOutput(
        context.sessionId,
        JSON.stringify({
          tool: context.toolName,
          input: context.toolInput,
          output: context.toolOutput,
          success: context.success
        }),
        context.agentId,
        {
          toolName: context.toolName,
          duration: context.duration,
          success: context.success
        }
      );

      // Capture turn in transcript
      this.uocs.captureTurn(context.sessionId, {
        role: 'system',
        content: `Tool ${context.toolName} executed`,
        timestamp: new Date(),
        agentId: context.agentId,
        toolsUsed: [context.toolName]
      });

      // Check for learnings in output
      if (context.success && context.toolOutput) {
        await this.extractLearnings(context);
      }

      return {
        success: true,
        duration: Date.now() - startTime,
        data: {
          captured: true,
          toolName: context.toolName
        }
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  private async extractLearnings(context: PostToolUseContext): Promise<void> {
    // Simple heuristic: if output contains certain patterns, capture as learning
    const output = typeof context.toolOutput === 'string'
      ? context.toolOutput
      : JSON.stringify(context.toolOutput);

    // Look for insight patterns
    const insightPatterns = [
      /learned that (.+)/i,
      /discovered (.+)/i,
      /found that (.+)/i,
      /important: (.+)/i
    ];

    for (const pattern of insightPatterns) {
      const match = output.match(pattern);
      if (match) {
        await this.uocs.captureLearning(
          context.sessionId,
          context.toolName,
          match[1],
          0.7,
          `Tool: ${context.toolName}`
        );
      }
    }
  }

  setUOCS(uocs: UOCS): void {
    this.uocs = uocs;
  }
}
2. Register Hook
Update src/hooks/index.ts to export PostToolUseHook.

Update hook registration in the system.

📁 FILES TO CREATE
src/hooks/PostToolUseHook.ts
Update src/hooks/index.ts
tests/hooks/PostToolUseHook.test.ts (15-20 tests)
Total: 3 files, 15-20 tests

✅ SUCCESS CRITERIA
✅ PostToolUseHook captures tool outputs
✅ Outputs saved to UOCS
✅ Learnings extracted from outputs
✅ 15-20 tests passing
END OF PROMPT 17B

