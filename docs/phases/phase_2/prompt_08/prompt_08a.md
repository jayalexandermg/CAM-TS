PROMPT 8A: SessionStart Hook
Phase: 2 (Infrastructure)
Status: 🆕 NEW - Critical addition
Time Estimate: 6-8 hours
Priority: CRITICAL (HIGHEST)
Dependencies: PROMPT 4A (CORE directory), PROMPT 8 (Hook system - already exists)

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.
All commands: pnpm install, pnpm test, pnpm run build, etc.

📋 CONTEXT
Current State
Project: Infinite Aura TypeScript (CAM) - Context-Aware Memory system
Location: ~/.infinite-aura-ts/
Phase 1 Status: Complete (1,097 tests, 92.58% coverage)
CORE Directory: Just created (USER.md, PREFERENCES.md, ACTIVE_PROJECTS.md)
Hook System: Exists from Phase 2 PROMPT 8 (HookManager, event capture)
What's Missing
PAI has a SessionStart hook that fires on every session initialization and:

Loads CORE context (user identity, preferences, active projects)
Injects context into system prompt BEFORE AI responds
Outputs confirmation to user
Happens proactively (not reactively)
CAM currently has:

❌ No SessionStart hook
❌ No proactive context loading
❌ Context never gets loaded automatically
❌ AI operates without user context
Why This Matters
This is the MOST CRITICAL prompt in Phase 2.

Without SessionStart hook:

AI doesn't know who the user is
AI doesn't have user preferences
AI doesn't know active projects
Context loading is reactive (after request) instead of proactive (before request)
With SessionStart hook:

✅ AI knows user identity on every session
✅ AI has user preferences loaded
✅ AI knows active projects
✅ Context loaded BEFORE AI makes decisions
🎯 OBJECTIVE
Implement SessionStart hook that fires on every session start, loads CORE context proactively, and injects into system prompt BEFORE AI responds.

After this prompt:

✅ SessionStartHook class implemented
✅ Hook fires automatically on session initialization
✅ CORE context loaded (USER.md, PREFERENCES.md, ACTIVE_PROJECTS.md)
✅ Context injected into system prompt
✅ Confirmation output to user
✅ Happens BEFORE any AI decision making
✅ 40-50 new tests added
✅ All existing tests still pass
📦 REQUIREMENTS

1. SessionStartHook Class
   Create src/hooks/SessionStartHook.ts:

Responsibilities:

Fire on session initialization
Load CORE context using CoreManager
Format context for preprompt injection
Inject context into system prompt
Output confirmation to user
Handle errors gracefully
Key Methods:

typescript
Copy
class SessionStartHook extends BaseHook {
private coreManager: CoreManager;
private prepromptInjector: PrepromptInjector;

constructor(coreManager: CoreManager, prepromptInjector: PrepromptInjector);

// Execute hook on session start
async execute(event: SessionStartEvent): Promise<HookResult>;

// Load CORE context
private async loadCoreContext(): Promise<CoreContext>;

// Format context for preprompt
private formatContextForPreprompt(context: CoreContext): string;

// Output confirmation to user
private outputConfirmation(context: CoreContext): void;
} 2. SessionStartEvent Type
Create src/hooks/types/SessionStartEvent.ts:

typescript
Copy
interface SessionStartEvent extends HookEvent {
type: 'session_start';
sessionId: string;
timestamp: Date;
metadata?: {
resuming?: boolean; // true if resuming existing session
previousSessionId?: string;
};
} 3. PrepromptInjector Class
Create src/context/PrepromptInjector.ts:

Responsibilities:

Manage system prompt
Inject context into system prompt
Maintain preprompt structure
Support multiple context layers (for Phase 2 PROMPT 11A)
Key Methods:

typescript
Copy
class PrepromptInjector {
private systemPrompt: string;
private injectedContext: Map<string, string>; // layer -> context

constructor(baseSystemPrompt?: string);

// Inject context into specific layer
injectContext(layer: string, context: string): void;

// Get complete system prompt with all injected context
getSystemPrompt(): string;

// Clear specific layer
clearLayer(layer: string): void;

// Clear all injected context
clearAll(): void;

// Get injected context for specific layer
getLayerContext(layer: string): string | undefined;
}
Preprompt Structure:

[Base System Prompt]

--- CONTEXT (Loaded on Session Start) ---

## User Identity

[Contents of USER.md]

## User Preferences

[Contents of PREFERENCES.md]

## Active Projects

[Contents of ACTIVE_PROJECTS.md]

--- END CONTEXT ---

[Rest of system prompt] 4. Update HookManager
Update src/hooks/HookManager.ts:

Add:

Register SessionStartHook
Method to trigger session start: triggerSessionStart(sessionId: string)
Store session state
Example:

typescript
Copy
class HookManager {
private sessionStartHook?: SessionStartHook;

// Register SessionStart hook
registerSessionStartHook(hook: SessionStartHook): void {
this.sessionStartHook = hook;
}

// Trigger session start
async triggerSessionStart(sessionId: string, resuming: boolean = false): Promise<void> {
if (!this.sessionStartHook) return;

    const event: SessionStartEvent = {
      type: 'session_start',
      sessionId,
      timestamp: new Date(),
      metadata: { resuming }
    };

    await this.sessionStartHook.execute(event);

}
} 5. Session Manager (Simple)
Create src/session/SessionManager.ts:

Responsibilities:

Manage session lifecycle
Trigger SessionStart hook
Track active session
Key Methods:

typescript
Copy
class SessionManager {
private hookManager: HookManager;
private currentSessionId?: string;

constructor(hookManager: HookManager);

// Start new session
async startSession(): Promise<string>;

// Resume existing session
async resumeSession(sessionId: string): Promise<void>;

// End session
async endSession(): Promise<void>;

// Get current session ID
getCurrentSessionId(): string | undefined;
}
📁 FILES TO CREATE/MODIFY
CREATE (New Files):
src/hooks/SessionStartHook.ts
SessionStartHook class
CORE context loading
Preprompt injection
Confirmation output
src/hooks/types/SessionStartEvent.ts
SessionStartEvent interface
Event metadata types
src/context/PrepromptInjector.ts
PrepromptInjector class
Context layer management
System prompt composition
src/context/index.ts
Export PrepromptInjector
src/session/SessionManager.ts
SessionManager class
Session lifecycle management
src/session/index.ts
Export SessionManager
tests/hooks/SessionStartHook.test.ts
Test hook execution
Test CORE context loading
Test preprompt injection
Test confirmation output
Test error handling
tests/context/PrepromptInjector.test.ts
Test context injection
Test layer management
Test system prompt composition
Test clearing operations
tests/session/SessionManager.test.ts
Test session start
Test session resume
Test session end
Test hook triggering
MODIFY (Existing Files):
src/hooks/HookManager.ts
Add registerSessionStartHook()
Add triggerSessionStart()
Add session state tracking
src/hooks/index.ts
Export SessionStartHook
Export SessionStartEvent
src/index.ts
Export PrepromptInjector
Export SessionManager
tests/hooks/HookManager.test.ts
Add tests for SessionStart registration
Add tests for session triggering
✅ TEST CRITERIA
SessionStartHook Tests (15-20 tests):
Hook Execution:
✅ Hook fires on session start event
✅ Loads CORE context using CoreManager
✅ Formats context correctly
✅ Injects context into preprompt
✅ Outputs confirmation to user
CORE Context Loading:
✅ Loads USER.md content
✅ Loads PREFERENCES.md content
✅ Loads ACTIVE_PROJECTS.md content
✅ Handles missing CORE files gracefully
✅ Handles empty CORE files
Error Handling:
✅ Handles CoreManager errors
✅ Handles PrepromptInjector errors
✅ Continues execution on non-critical errors
✅ Logs errors appropriately
PrepromptInjector Tests (15-20 tests):
Context Injection:
✅ Injects context into specific layer
✅ Maintains multiple layers
✅ Composes system prompt correctly
✅ Preserves base system prompt
Layer Management:
✅ Can clear specific layer
✅ Can clear all layers
✅ Can retrieve layer context
✅ Handles non-existent layers
System Prompt Composition:
✅ Formats context with markers
✅ Orders layers correctly
✅ Handles empty context
✅ Handles multiple context layers
SessionManager Tests (10-15 tests):
Session Lifecycle:
✅ Can start new session
✅ Can resume existing session
✅ Can end session
✅ Tracks current session ID
Hook Integration:
✅ Triggers SessionStart hook on start
✅ Triggers SessionStart hook on resume
✅ Passes correct event data
✅ Handles hook errors
🎯 SUCCESS CRITERIA
Functional:
✅ SessionStartHook class implemented
✅ Hook fires on session initialization
✅ CORE context loaded automatically
✅ Context injected into system prompt
✅ Confirmation output to user
✅ PrepromptInjector working
✅ SessionManager working
Testing:
✅ All existing tests pass (1,097 tests)
✅ 40-50 new tests added
✅ Total: ~1,137-1,147 tests
✅ Coverage maintained: 90%+
Quality:
✅ TypeScript types defined
✅ Error handling implemented
✅ Code follows existing patterns
✅ Documentation added (JSDoc comments)
🔗 INTEGRATION POINTS
Uses (Existing):
CoreManager (PROMPT 4A): Loads CORE context
HookManager (PROMPT 8): Registers and executes hook
MemoryManager: Accesses CoreManager
Used By (Future):
Orchestrator (PROMPT 16): Triggers session start
CLI (PROMPT 13): Triggers session start on cam start
Two-Layer Hydration (PROMPT 11A): Uses PrepromptInjector
📚 PAI REFERENCE
SessionStart Hook:
PAI Location: Packs/pai-hook-system/src/initialize-session.ts
PAI Behavior: Fires on every session start, loads CORE skill automatically
PAI Output: "Loaded: CORE, [other skills]"
Preprompt Injection:
PAI Location: Context loaded into shell environment, passed to AI
PAI Structure: CORE context always included in system prompt
PAI Timing: Happens BEFORE AI sees user request
🚀 EXECUTION NOTES
Implementation Order:
Create PrepromptInjector class and tests
Create SessionStartEvent type
Create SessionStartHook class and tests
Create SessionManager class and tests
Update HookManager to register SessionStart
Run all tests (existing + new)
Manual testing: verify context loads on session start
Key Considerations:
Proactive Loading: Context must load BEFORE AI responds
Error Handling: Must handle missing/empty CORE files gracefully
Confirmation Output: User should see what was loaded
Performance: Context loading should be fast (<100ms)
Type Safety: Use TypeScript types throughout
Testing Strategy:
Unit tests for each class
Integration tests for hook → preprompt flow
Integration tests for session → hook flow
Verify all existing tests still pass
📊 EXPECTED OUTCOME
Before PROMPT 8A:

1,097 tests, 92.58% coverage
No SessionStart hook
No proactive context loading
AI operates without user context
After PROMPT 8A:

~1,137-1,147 tests, 90%+ coverage
SessionStart hook fires on every session
CORE context loaded proactively
Context in system prompt before AI responds
User sees confirmation: "Loaded: USER, PREFERENCES, ACTIVE_PROJECTS"
