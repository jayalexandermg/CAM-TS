PROMPT 17C: Stop + SubagentStop Hooks
Phase: 5 (History & Hooks)
Parallel: ✅ Can run with 17A, 17B

⚠️ PACKAGE MANAGER: PNPM ONLY
📋 OBJECTIVE
Implement Stop and SubagentStop hooks for session/agent completion.

📦 REQUIREMENTS

1. Stop Hook
   Create src/hooks/StopHook.ts:

typescript
Copy
import { Hook, HookContext, HookResult } from './types';
import { UOCS } from '../history/UOCS';

export interface StopContext extends HookContext {
reason: 'user_exit' | 'timeout' | 'error' | 'complete';
summary?: string;
finalOutput?: string;
}

export class StopHook implements Hook {
name = 'Stop';
private uocs: UOCS;

constructor(uocs?: UOCS) {
this.uocs = uocs || new UOCS();
}

async execute(context: StopContext): Promise<HookResult> {
const startTime = Date.now();

    try {
      // End session in UOCS
      await this.uocs.endSession(context.sessionId, context.summary);

      // Capture final output if provided
      if (context.finalOutput) {
        await this.uocs.captureOutput(
          context.sessionId,
          context.finalOutput,
          context.agentId,
          { reason: context.reason, final: true }
        );
      }

      return {
        success: true,
        duration: Date.now() - startTime,
        data: {
          sessionEnded: true,
          reason: context.reason
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

setUOCS(uocs: UOCS): void {
this.uocs = uocs;
}
} 2. SubagentStop Hook
Create src/hooks/SubagentStopHook.ts:

typescript
Copy
import { Hook, HookContext, HookResult } from './types';
import { UOCS } from '../history/UOCS';
import { AgentResult } from '../agents/types';

export interface SubagentStopContext extends HookContext {
parentAgentId: string;
result: AgentResult;
taskDescription?: string;
}

export class SubagentStopHook implements Hook {
name = 'SubagentStop';
private uocs: UOCS;

constructor(uocs?: UOCS) {
this.uocs = uocs || new UOCS();
}

async execute(context: SubagentStopContext): Promise<HookResult> {
const startTime = Date.now();

    try {
      // Capture subagent completion
      this.uocs.captureTurn(context.sessionId, {
        role: 'system',
        content: `Subagent ${context.agentId} completed: ${context.result.success ? 'success' : 'failed'}`,
        timestamp: new Date(),
        agentId: context.agentId
      });

      // Capture result as output
      await this.uocs.captureOutput(
        context.sessionId,
        JSON.stringify({
          subagentId: context.agentId,
          parentAgentId: context.parentAgentId,
          task: context.taskDescription,
          result: context.result
        }),
        context.agentId,
        {
          type: 'subagent_completion',
          success: context.result.success
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
          resultSuccess: context.result.success
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

private async extractSubagentLearnings(context: SubagentStopContext): Promise<void> {
const data = context.result.data;

    // If result contains explicit learnings, capture them
    if (data.learnings && Array.isArray(data.learnings)) {
      for (const learning of data.learnings) {
        await this.uocs.captureLearning(
          context.sessionId,
          learning.topic || 'subagent_insight',
          learning.insight || learning,
          learning.confidence || 0.7,
          `Subagent: ${context.agentId}`
        );
      }
    }

}

setUOCS(uocs: UOCS): void {
this.uocs = uocs;
}
} 3. Update Exports
Update src/hooks/index.ts:

typescript
Copy
export _ from './types';
export _ from './SessionStartHook';
export _ from './PreToolUseHook';
export _ from './PostToolUseHook';
export _ from './StopHook';
export _ from './SubagentStopHook';
export \* from './HookManager';
📁 FILES TO CREATE
src/hooks/StopHook.ts
src/hooks/SubagentStopHook.ts
Update src/hooks/index.ts
tests/hooks/StopHook.test.ts (10-12 tests)
tests/hooks/SubagentStopHook.test.ts (10-12 tests)
Total: 5 files, 20-24 tests

✅ SUCCESS CRITERIA
✅ StopHook ends sessions properly
✅ SubagentStopHook captures subagent completions
✅ Both integrate with UOCS
✅ 20-24 tests passing
END OF PROMPT 17C
