PROMPT 8B: PreToolUse Hook
Phase: 2 (Infrastructure)
Status: 🆕 NEW - Security validation hook
Time Estimate: 4-6 hours
Priority: IMPORTANT
Dependencies: PROMPT 8 REVISION (Hook enforcement)

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.
All commands: pnpm install, pnpm test, pnpm run build, etc.

📋 CONTEXT
Current State
Project: Infinite Aura TypeScript (CAM)
Location: ~/.infinite-aura-ts/
Tests: 1,453 tests, 93.64% coverage
Hook System: Has enforcement (ALLOW/BLOCK/MODIFY)
SessionStart Hook: Working
What's Missing
PAI has a PreToolUse hook that:

Fires BEFORE any tool/command execution
Validates tool safety
Blocks dangerous operations
Logs tool usage
Enforces security policies
CAM currently has:

❌ No PreToolUse hook
❌ No tool validation
❌ No security enforcement
❌ Tools can execute without checks
Why This Matters
Without PreToolUse hook:

Dangerous commands can execute
No security validation
No audit trail
No policy enforcement
With PreToolUse hook:

✅ Validates tool safety before execution
✅ Blocks dangerous operations
✅ Logs all tool usage
✅ Enforces security policies
🎯 OBJECTIVE
Implement PreToolUse hook that fires before tool execution, validates safety, and can block dangerous operations.

After this prompt:

✅ PreToolUse hook implemented
✅ Tool safety validation
✅ Dangerous command detection
✅ Security policy enforcement
✅ Tool usage logging
✅ 30-40 new tests added
✅ All existing tests still pass
📦 REQUIREMENTS

1. PreToolUseHook Class
   Create src/hooks/PreToolUseHook.ts:

Responsibilities:

Fire before tool execution
Validate tool safety
Detect dangerous commands
Block unsafe operations
Log tool usage
Key Methods:

typescript
Copy
class PreToolUseHook extends BaseHook {
private dangerousPatterns: RegExp[];
private allowedTools: Set<string>;
private blockedTools: Set<string>;

constructor(config?: PreToolUseConfig);

// Execute hook before tool use
async execute(event: PreToolUseEvent): Promise<HookResult>;

// Validate tool safety
private validateTool(toolName: string, args: any[]): ValidationResult;

// Check for dangerous patterns
private checkDangerousPatterns(command: string): boolean;

// Log tool usage
private logToolUsage(event: PreToolUseEvent, result: HookResult): void;
}

interface PreToolUseConfig {
dangerousPatterns?: RegExp[];
allowedTools?: string[];
blockedTools?: string[];
strictMode?: boolean; // Block by default if unknown
} 2. PreToolUseEvent Type
Create src/hooks/types/PreToolUseEvent.ts:

typescript
Copy
interface PreToolUseEvent extends HookEvent {
type: 'pre_tool_use';
toolName: string;
args: any[];
context?: {
skillName?: string;
sessionId?: string;
userId?: string;
};
} 3. Tool Safety Validation
Dangerous patterns to detect:

typescript
Copy
const DEFAULT_DANGEROUS_PATTERNS = [
/rm\s+-rf\s+\//, // rm -rf /
/:\(\)\{\s*:\|:&\s*\};:/, // Fork bomb
/>\s*\/dev\/sda/, // Write to disk
/dd\s+if=/, // dd command
/mkfs/, // Format filesystem
/curl.*\|\s*bash/, // Pipe to bash
/wget.*\|\s*sh/, // Pipe to shell
/eval\(/, // eval() in code
/exec\(/, // exec() in code
];
Validation logic:

typescript
Copy
private validateTool(toolName: string, args: any[]): ValidationResult {
// Check if tool is explicitly blocked
if (this.blockedTools.has(toolName)) {
return {
safe: false,
reason: `Tool '${toolName}' is blocked by policy`
};
}

// Check if tool is explicitly allowed
if (this.allowedTools.size > 0 && !this.allowedTools.has(toolName)) {
if (this.config.strictMode) {
return {
safe: false,
reason: `Tool '${toolName}' is not in allowed list`
};
}
}

// Check for dangerous patterns in arguments
const argsString = JSON.stringify(args);
for (const pattern of this.dangerousPatterns) {
if (pattern.test(argsString)) {
return {
safe: false,
reason: `Dangerous pattern detected: ${pattern.source}`
};
}
}

return { safe: true };
} 4. Hook Execution
typescript
Copy
async execute(event: PreToolUseEvent): Promise<HookResult> {
// Validate tool
const validation = this.validateTool(event.toolName, event.args);

if (!validation.safe) {
// Block unsafe tool
const result = this.block(validation.reason, {
toolName: event.toolName,
args: event.args
});

    this.logToolUsage(event, result);
    return result;

}

// Allow safe tool
const result = this.allow({
toolName: event.toolName,
validated: true
});

this.logToolUsage(event, result);
return result;
} 5. Tool Usage Logging
Create src/hooks/ToolUsageLogger.ts:

typescript
Copy
class ToolUsageLogger {
private logFile: string;

constructor(logFile?: string);

// Log tool usage
async log(event: PreToolUseEvent, result: HookResult): Promise<void>;

// Get usage history
async getHistory(filters?: LogFilters): Promise<ToolUsageEntry[]>;

// Clear logs
async clearLogs(): Promise<void>;
}

interface ToolUsageEntry {
timestamp: Date;
toolName: string;
args: any[];
action: HookAction;
reason?: string;
context?: any;
} 6. Update HookManager
Update src/hooks/HookManager.ts:

Add:

Register PreToolUse hook
Method to trigger pre-tool-use: triggerPreToolUse(toolName, args)
📁 FILES TO CREATE/MODIFY
CREATE (New Files):
src/hooks/PreToolUseHook.ts
PreToolUseHook class
Tool validation logic
Dangerous pattern detection
src/hooks/types/PreToolUseEvent.ts
PreToolUseEvent interface
src/hooks/ToolUsageLogger.ts
ToolUsageLogger class
Usage history tracking
tests/hooks/PreToolUseHook.test.ts
Test hook execution
Test tool validation
Test dangerous pattern detection
Test blocking unsafe tools
Test logging
tests/hooks/ToolUsageLogger.test.ts
Test logging
Test history retrieval
Test filtering
MODIFY (Existing Files):
src/hooks/HookManager.ts
Add registerPreToolUseHook()
Add triggerPreToolUse()
src/hooks/index.ts
Export PreToolUseHook
Export PreToolUseEvent
Export ToolUsageLogger
tests/hooks/HookManager.test.ts
Add tests for PreToolUse registration
Add tests for pre-tool-use triggering
✅ TEST CRITERIA
PreToolUseHook Tests (20-25 tests):
Tool Validation:
✅ Allows safe tools
✅ Blocks dangerous tools
✅ Detects dangerous patterns
✅ Respects allowed list
✅ Respects blocked list
Enforcement:
✅ Returns ALLOW for safe tools
✅ Returns BLOCK for unsafe tools
✅ Includes reason in BLOCK result
✅ Throws HookBlockedError when blocked
Configuration:
✅ Custom dangerous patterns work
✅ Custom allowed tools work
✅ Custom blocked tools work
✅ Strict mode works
Logging:
✅ Logs all tool usage
✅ Logs blocked attempts
✅ Includes context in logs
ToolUsageLogger Tests (10-15 tests):
Logging:
✅ Logs tool usage
✅ Includes timestamp
✅ Includes tool name and args
✅ Includes action and reason
History:
✅ Can retrieve history
✅ Can filter by tool name
✅ Can filter by action
✅ Can clear logs
🎯 SUCCESS CRITERIA
Functional:
✅ PreToolUseHook working
✅ Tool validation working
✅ Dangerous pattern detection working
✅ Security enforcement working
✅ Tool usage logging working
Testing:
✅ All existing tests pass (1,453 tests)
✅ 30-40 new tests added
✅ Total: ~1,483-1,493 tests
✅ Coverage maintained: 90%+
Quality:
✅ TypeScript types defined
✅ Error handling implemented
✅ Code follows existing patterns
✅ Documentation added
🔗 INTEGRATION POINTS
Uses (Existing):
Hook enforcement (PROMPT 8 REVISION): Uses BLOCK action
HookManager: Registers and executes hook
Used By (Future):
Orchestrator (PROMPT 16): Triggers before tool execution
Tool system: Validates all tool calls
📚 PAI REFERENCE
PreToolUse Hook:
PAI Pattern: Validates tool safety before execution
PAI Behavior: Blocks dangerous commands, logs all usage
PAI Security: Enforces security policies at execution time
END OF PROMPT 8B
