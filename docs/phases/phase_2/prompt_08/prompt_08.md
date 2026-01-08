🚀 PROMPT 08: Hook System Foundation
Ready to start Phase 2! Here's PROMPT 08:

File: docs/phases/phase_2/prompt_08/prompt_08.md
markdown
Copy

# PROMPT 08: Hook System Foundation

**Phase:** 2 (Hook System + Dynamic Context + Content Routing)
**Prompt:** 08 of 24+ (Prompt 1 of 5 in Phase 2)
**Duration:** 2-3 hours
**Critical Level:** 🔴 HIGH

## Navigation

- **Previous:** [PROMPT 07](../../phase_1/prompt_07/prompt_07.md) (Documentation + Git)
- **Next:** [PROMPT 09](../prompt_09/prompt_09.md) (Content-Based Routing)
- **Phase Overview:** [Phase 2 README](../README.md)

## Phase 2 Context

This is the first prompt of Phase 2. Phase 2 builds the hook system, content routing, and dynamic context loading on top of the Phase 1 memory scaffold.

**Phase 2 Goal:** Build the nervous system that captures, routes, and contextualizes all events.

**Phase 2 Prompts:**

- **PROMPT 08** (this prompt) - Hook System Foundation
- PROMPT 09 - Content-Based Routing
- PROMPT 10 - Interestingness Scoring
- PROMPT 11 - Dynamic Context Loading
- PROMPT 12 - Hydration Strategy Registry

## Prerequisites

**Phase 1 must be complete:**

- ✅ 472 tests passing
- ✅ 90.05% coverage
- ✅ Memory scaffold implemented (FileOperations, DirectoryOperations, MemoryScaffold)
- ✅ Exception hierarchy (14 classes)
- ✅ Guardrails (7 policies)
- ✅ Security hardening (audit, locking, symlink protection)
- ✅ Documentation complete
- ✅ Git initialized

**Verify Phase 1:**

```bash
cd C:\dev\infinite-aura-ts\
pnpm check:all  # Should pass
pnpm test       # Should show 472 tests passing
Context
What we're building:
A hook system that captures events from CAM (the orchestrator) and sub-agents, routes them to the correct UFC directories, and prepares them for context loading.

Inspired by Daniel's PAI:

PAI has Bun hooks: capture-all-events.ts, stop-hook.ts, subagent-stop-hook.ts, session-summary-hook.ts
We're adapting these to TypeScript with an event emitter architecture
Key Concepts:

Event Emitter: Pub/sub pattern for event capture
Hook Handlers: Specialized handlers for different event types
JSONL Format: Events stored as JSON Lines (one JSON object per line)
Integration with Memory Scaffold: Hooks use FileOperations to write events
Task
Create the hook system foundation with event emitter and 4 core hook handlers.

Part 1: Event Types and Interfaces
Create src/hooks/types.ts:

Define Event Types:

typescript
Copy
export enum EventType {
  CAPTURE_ALL = 'capture_all',
  STOP = 'stop',
  SUBAGENT_STOP = 'subagent_stop',
  SESSION_SUMMARY = 'session_summary',
}
Define Event Interface:

typescript
Copy
export interface Event {
  timestamp: string;        // ISO 8601 format
  type: EventType;
  content: string;
  metadata: EventMetadata;
}

export interface EventMetadata {
  agentId?: string;         // Which agent generated this event
  projectId?: string;       // Which project this relates to
  sessionId?: string;       // Which session this is part of
  tags?: string[];          // Tags for classification
  interestingness?: number; // 0-1 score (added in PROMPT 10)
  [key: string]: any;       // Allow additional metadata
}
Define Hook Handler Interface:

typescript
Copy
export interface HookHandler {
  readonly name: string;
  readonly eventType: EventType;
  handle(event: Event): Promise<void>;
}
Part 2: Event Emitter
Create src/hooks/event-emitter.ts:

Requirements:

TypeScript EventEmitter class (not Node.js EventEmitter)
Support for registering hook handlers
Support for emitting events to all registered handlers
Error handling (don't let one handler failure break others)
Async handler support
Type-safe event emission
Key Methods:

registerHandler(handler: HookHandler): void - Register a hook handler
unregisterHandler(handlerName: string): void - Unregister a hook handler
emit(event: Event): Promise<void> - Emit event to all handlers
getHandlers(): HookHandler[] - Get all registered handlers
Error Handling:

If a handler throws, log the error but continue with other handlers
Use try/catch around each handler
Collect all errors and throw aggregate error at the end (optional)
Part 3: Base Hook Handler
Create src/hooks/hook-handler.ts:

Abstract Base Class:

typescript
Copy
export abstract class BaseHookHandler implements HookHandler {
  abstract readonly name: string;
  abstract readonly eventType: EventType;

  abstract handle(event: Event): Promise<void>;

  protected validateEvent(event: Event): void {
    // Validate event structure
    // Throw InvalidEventError if invalid
  }

  protected formatEventForStorage(event: Event): string {
    // Format event as JSONL (single line JSON)
    return JSON.stringify(event);
  }
}
Part 4: Capture-All Hook Handler
Create src/hooks/capture-all-handler.ts:

Purpose: Captures ALL events and writes them to history/execution/ directory.

Requirements:

Extends BaseHookHandler
Handles EventType.CAPTURE_ALL
Writes events to: ~/.infinite-aura-ts/memory/history/execution/YYYY-MM-DD_HHmmss_capture-all.jsonl
Uses FileOperations.appendFile() from Phase 1
Uses FileNamingConvention from Phase 1 for filename
Creates file if it doesn't exist
Appends to existing file if it does exist
One event per line (JSONL format)
Integration with Phase 1:

typescript
Copy
import { FileOperations } from '../memory/file-operations';
import { FileNamingConvention } from '../memory/file-naming-convention';
Part 5: Stop Hook Handler
Create src/hooks/stop-handler.ts:

Purpose: Captures stop events (when CAM or an agent stops) and writes to history/execution/.

Requirements:

Extends BaseHookHandler
Handles EventType.STOP
Writes events to: ~/.infinite-aura-ts/memory/history/execution/YYYY-MM-DD_HHmmss_stop.jsonl
Similar to capture-all but only for stop events
Includes metadata about why the stop occurred (if available)
Part 6: Subagent-Stop Hook Handler
Create src/hooks/subagent-stop-handler.ts:

Purpose: Captures when sub-agents complete their tasks and writes to agents/ directory.

Requirements:

Extends BaseHookHandler
Handles EventType.SUBAGENT_STOP
Writes events to: ~/.infinite-aura-ts/memory/agents/AGENT_NAME/YYYY-MM-DD_HHmmss_subagent-stop.jsonl
Uses agentId from metadata to determine directory
Creates agent directory if it doesn't exist
Part 7: Session-Summary Hook Handler
Create src/hooks/session-summary-handler.ts:

Purpose: Captures session summaries (end-of-session reflections) and writes to history/sessions/.

Requirements:

Extends BaseHookHandler
Handles EventType.SESSION_SUMMARY
Writes events to: ~/.infinite-aura-ts/memory/history/sessions/YYYY-MM-DD_HHmmss_session-summary.jsonl
Includes metadata about session duration, tasks completed, etc.
Part 8: Hook System Index
Create src/hooks/index.ts:

Export all hook system components:

typescript
Copy
export * from './types';
export * from './event-emitter';
export * from './hook-handler';
export * from './capture-all-handler';
export * from './stop-handler';
export * from './subagent-stop-handler';
export * from './session-summary-handler';
Part 9: Tests
Create comprehensive tests for the hook system:

Test Files:

tests/hooks/event-emitter.test.ts (20+ tests)
tests/hooks/capture-all-handler.test.ts (10+ tests)
tests/hooks/stop-handler.test.ts (8+ tests)
tests/hooks/subagent-stop-handler.test.ts (10+ tests)
tests/hooks/session-summary-handler.test.ts (8+ tests)
Test Coverage:

Event emitter registration/unregistration
Event emission to multiple handlers
Error handling (handler failures)
Event validation
JSONL formatting
File writing (integration with Phase 1)
Directory creation
Metadata handling
Edge cases (empty events, missing metadata, etc.)
Target: 60+ new tests, maintain >85% coverage

Part 10: Integration Test
Create tests/hooks/integration/hook-system.integration.test.ts:

Test end-to-end hook system:

Create EventEmitter
Register all 4 handlers
Emit events of each type
Verify files created in correct directories
Verify JSONL format
Verify metadata preserved
Verify error handling
Execution
After creating all files:

Install any new dependencies:
bash
Copy
# If needed (probably not for this prompt)
pnpm install
Run TypeScript compilation:
bash
Copy
pnpm build
Run linting:
bash
Copy
pnpm lint
Run tests:
bash
Copy
pnpm test
Check coverage:
bash
Copy
pnpm test:coverage
Run all quality gates:
bash
Copy
pnpm check:all
Success Criteria
Code:

✅ src/hooks/types.ts created (Event, EventType, EventMetadata, HookHandler interfaces)
✅ src/hooks/event-emitter.ts created (EventEmitter class)
✅ src/hooks/hook-handler.ts created (BaseHookHandler abstract class)
✅ src/hooks/capture-all-handler.ts created (CaptureAllHandler class)
✅ src/hooks/stop-handler.ts created (StopHandler class)
✅ src/hooks/subagent-stop-handler.ts created (SubagentStopHandler class)
✅ src/hooks/session-summary-handler.ts created (SessionSummaryHandler class)
✅ src/hooks/index.ts created (exports all components)
Tests:

✅ 60+ new tests created
✅ All tests passing (target: 530+ total tests)
✅ Coverage maintained >85% (target: >88%)
Integration:

✅ Hooks integrate with Phase 1 memory scaffold (FileOperations, DirectoryOperations)
✅ Events written to correct UFC directories
✅ JSONL format correct
✅ Metadata preserved
Quality Gates:

✅ TypeScript compilation passes
✅ ESLint passes
✅ Prettier formatting passes
✅ All tests passing
✅ Coverage >85%
Documentation:

✅ Update docs/api/README.md with hook system API
✅ Update docs/architecture/README.md with hook system architecture
✅ Add JSDoc comments to all public APIs
Verification
Show me:

List of all files created with sizes
Test results (number of tests, coverage %)
Output of pnpm check:all
Example of an event written to disk (show JSONL format)
Directory structure of src/hooks/
Any errors encountered and how they were resolved
Output Format
Provide:

Summary of files created
Test metrics (before/after)
Coverage metrics (before/after)
Integration verification (show example event file)
Any issues encountered
Confirmation of success criteria

Notes
Critical Aspects (for Claude Code review):

🔴 Event emitter design (pub/sub pattern)
🔴 Hook handler lifecycle
🔴 Error handling in hooks
🔴 Performance considerations (async hooks)
Integration Points:

Uses FileOperations from Phase 1
Uses DirectoryOperations from Phase 1
Uses FileNamingConvention from Phase 1
Uses PathValidator from Phase 1
Uses SecurityAuditLogger from Phase 1
Future Enhancements (not in this prompt):

Content-based routing (PROMPT 09)
Interestingness scoring (PROMPT 10)
Dynamic context loading (PROMPT 11)
Hydration strategies (PROMPT 12)
```
