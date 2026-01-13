PROMPT 8: Hook System Revision (Add Enforcement)
Phase: 2 (Infrastructure)
Status: ⚠️ REVISION - Add enforcement capabilities
Time Estimate: 2-3 hours
Priority: IMPORTANT
Dependencies: PROMPT 8 (Hook system - already exists)

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.
All commands: pnpm install, pnpm test, pnpm run build, etc.

📋 CONTEXT
Current State
Project: Infinite Aura TypeScript (CAM)
Location: ~/.infinite-aura-ts/
Tests: 1,246 tests, 92.5% coverage
Hook System: Exists from Phase 2 PROMPT 8 (event capture)
SessionStart Hook: Just built (PROMPT 8A)
What's Missing
Current hook system is event capture only:

Hooks observe what happened
Hooks log events
Hooks don't control execution flow
PAI hook system is policy enforcement:

Hooks control what happens
Hooks can ALLOW, BLOCK, or MODIFY operations
Hooks are in the execution path (not just observers)
Example: PreToolUse hook blocks dangerous commands
Why This Matters
Without enforcement:

Hooks are passive observers
No security validation
No policy enforcement
Can't prevent dangerous operations
With enforcement:

✅ Hooks actively control execution
✅ Can block dangerous operations
✅ Can modify requests before execution
✅ Security validation in execution path
🎯 OBJECTIVE
Add enforcement capabilities to existing hook system so hooks can ALLOW, BLOCK, or MODIFY operations.

After this prompt:

✅ HookResult supports ALLOW/BLOCK/MODIFY actions
✅ HookManager enforces hook results
✅ Hooks can prevent operations
✅ Hooks can modify data before execution
✅ 15-20 new tests added
✅ All existing tests still pass
📦 REQUIREMENTS

1. HookResult Enhancement
   Update src/hooks/types/HookResult.ts:

Add enforcement actions:

typescript
Copy
enum HookAction {
ALLOW = 'allow', // Allow operation to proceed
BLOCK = 'block', // Block operation (throw error)
MODIFY = 'modify' // Modify data before proceeding
}

interface HookResult {
action: HookAction;
data?: any; // Modified data (if action = MODIFY)
reason?: string; // Reason for BLOCK or MODIFY
metadata?: Record<string, any>;
} 2. Update BaseHook
Update src/hooks/BaseHook.ts:

Add helper methods:

typescript
Copy
abstract class BaseHook {
// ... existing code ...

// Helper to allow operation
protected allow(metadata?: Record<string, any>): HookResult {
return {
action: HookAction.ALLOW,
metadata
};
}

// Helper to block operation
protected block(reason: string, metadata?: Record<string, any>): HookResult {
return {
action: HookAction.BLOCK,
reason,
metadata
};
}

// Helper to modify data
protected modify(data: any, reason?: string, metadata?: Record<string, any>): HookResult {
return {
action: HookAction.MODIFY,
data,
reason,
metadata
};
}
} 3. Update HookManager
Update src/hooks/HookManager.ts:

Add enforcement logic:

typescript
Copy
class HookManager {
// ... existing code ...

// Execute hook and enforce result
async executeHook<T extends HookEvent>(
hookType: string,
event: T
): Promise<HookResult> {
const hook = this.hooks.get(hookType);
if (!hook) {
return { action: HookAction.ALLOW };
}

    const result = await hook.execute(event);

    // Enforce hook result
    if (result.action === HookAction.BLOCK) {
      throw new HookBlockedError(
        result.reason || 'Operation blocked by hook',
        hookType,
        event
      );
    }

    return result;

}

// Execute hook with data modification
async executeHookWithData<T extends HookEvent, D>(
hookType: string,
event: T,
data: D
): Promise<D> {
const result = await this.executeHook(hookType, event);

    if (result.action === HookAction.MODIFY && result.data) {
      return result.data as D;
    }

    return data;

}
} 4. HookBlockedError Exception
Create src/hooks/errors/HookBlockedError.ts:

typescript
Copy
export class HookBlockedError extends Error {
constructor(
message: string,
public hookType: string,
public event: HookEvent
) {
super(message);
this.name = 'HookBlockedError';
}
} 5. Update SessionStartHook
Update src/hooks/SessionStartHook.ts:

Use new enforcement pattern:

typescript
Copy
async execute(event: SessionStartEvent): Promise<HookResult> {
try {
// Load CORE context
const context = await this.loadCoreContext();

    // Inject into preprompt
    this.prepromptInjector.injectContext('core', context);

    // Output confirmation
    this.outputConfirmation(context);

    // Allow operation to proceed
    return this.allow({ contextLoaded: true });

} catch (error) {
// Log error but don't block session start
console.error('SessionStart hook error:', error);
return this.allow({ contextLoaded: false, error: error.message });
}
}
📁 FILES TO CREATE/MODIFY
CREATE (New Files):
src/hooks/errors/HookBlockedError.ts
HookBlockedError exception class
src/hooks/errors/index.ts
Export HookBlockedError
tests/hooks/enforcement.test.ts
Test ALLOW action
Test BLOCK action
Test MODIFY action
Test HookBlockedError
MODIFY (Existing Files):
src/hooks/types/HookResult.ts
Add HookAction enum
Update HookResult interface
src/hooks/BaseHook.ts
Add allow() helper
Add block() helper
Add modify() helper
src/hooks/HookManager.ts
Add executeHook() with enforcement
Add executeHookWithData()
Handle HookBlockedError
src/hooks/SessionStartHook.ts
Update to use new enforcement pattern
Return allow() result
src/hooks/index.ts
Export HookAction
Export HookBlockedError
tests/hooks/HookManager.test.ts
Add enforcement tests
Test BLOCK throws error
Test MODIFY changes data
tests/hooks/SessionStartHook.test.ts
Update to expect HookResult with action
✅ TEST CRITERIA
Enforcement Tests (15-20 tests):
ALLOW Action:
✅ Hook returns ALLOW
✅ Operation proceeds
✅ No error thrown
BLOCK Action:
✅ Hook returns BLOCK
✅ HookBlockedError thrown
✅ Operation prevented
✅ Error includes reason
MODIFY Action:
✅ Hook returns MODIFY with data
✅ Data modified before operation
✅ Modified data returned
✅ Operation proceeds with modified data
Helper Methods:
✅ allow() returns correct result
✅ block() returns correct result
✅ modify() returns correct result
Integration:
✅ HookManager enforces results
✅ SessionStartHook uses new pattern
✅ All existing hooks still work
🎯 SUCCESS CRITERIA
Functional:
✅ HookAction enum defined
✅ HookResult supports enforcement
✅ BaseHook has helper methods
✅ HookManager enforces results
✅ HookBlockedError works
✅ SessionStartHook updated
Testing:
✅ All existing tests pass (1,246 tests)
✅ 15-20 new tests added
✅ Total: ~1,261-1,266 tests
✅ Coverage maintained: 90%+
Quality:
✅ TypeScript types updated
✅ Error handling implemented
✅ Code follows existing patterns
✅ Documentation added
🔗 INTEGRATION POINTS
Uses (Existing):
Hook system (PROMPT 8): Extends existing hooks
Used By (Future):
PreToolUse Hook (PROMPT 8B): Will use BLOCK action
All future hooks: Will use enforcement pattern
📚 PAI REFERENCE
Hook Enforcement:
PAI Pattern: Hooks are in execution path, can prevent operations
PAI Example: PreToolUse hook blocks dangerous commands
PAI Behavior: Hooks control flow, not just observe
END OF PROMPT 8
