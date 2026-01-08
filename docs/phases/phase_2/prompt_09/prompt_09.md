PROMPT 09: Content-Based Routing
Ready for the next step! Here's PROMPT 09:

File: docs/phases/phase_2/prompt_09/prompt_09.md
markdown
Copy

# PROMPT 09: Content-Based Routing

**Phase:** 2 (Hook System + Dynamic Context + Content Routing)
**Prompt:** 09 of 24+ (Prompt 2 of 5 in Phase 2)
**Duration:** 2-3 hours
**Critical Level:** 🟡 MEDIUM

## Navigation

- **Previous:** [PROMPT 08](../prompt_08/prompt_08.md) (Hook System Foundation)
- **Next:** [PROMPT 10](../prompt_10/prompt_10.md) (Interestingness Scoring)
- **Phase Overview:** [Phase 2 README](../README.md)

## Phase 2 Context

This is the second prompt of Phase 2. We've built the hook system (PROMPT 08), now we're adding intelligent content-based routing to route events to the correct UFC directories based on their content, not just their type.

**Phase 2 Goal:** Build the nervous system that captures, routes, and contextualizes all events.

**Phase 2 Prompts:**

- PROMPT 08 ✅ - Hook System Foundation
- **PROMPT 09** (this prompt) - Content-Based Routing
- PROMPT 10 - Interestingness Scoring
- PROMPT 11 - Dynamic Context Loading
- PROMPT 12 - Hydration Strategy Registry

## Prerequisites

**PROMPT 08 must be complete:**

- ✅ 593 tests passing
- ✅ 91.66% coverage
- ✅ Hook system implemented (EventEmitter, 4 handlers)
- ✅ Events being captured to history/execution/

**Verify PROMPT 08:**

```bash
cd C:\dev\infinite-aura-ts\
pnpm check:all  # Should pass
pnpm test       # Should show 593 tests passing
Context
What we're building:
A content router that intelligently routes events to the correct UFC directories based on their content, metadata, and context - not just their event type.

Current State (PROMPT 08):

All events go to history/execution/ (capture-all)
Stop events go to history/execution/ (stop)
Subagent events go to agents/{agentId}/ (subagent-stop)
Session summaries go to history/sessions/ (session-summary)
Problem:
This is type-based routing (based on EventType), not content-based. We need smarter routing that considers:

What project is this event related to?
What task type is this?
What agent generated this?
What tags are present?
What's the content about?
Solution:
Content-based router that classifies events and routes them to multiple destinations.

Example:

typescript
Copy
// Event about coding in project "infinite-aura"
Event {
  type: CAPTURE_ALL,
  content: "Implemented hook system for infinite-aura project",
  metadata: {
    projectId: "infinite-aura",
    agentId: "coder-agent",
    tags: ["coding", "typescript"]
  }
}

// Should be routed to:
// 1. history/execution/ (all events)
// 2. projects/infinite-aura/ (project-specific)
// 3. agents/coder-agent/ (agent-specific)
Task
Create content-based routing system that routes events to multiple UFC directories.

Part 1: Routing Types and Interfaces
Create src/routing/types.ts:

Define Classification:

typescript
Copy
export interface Classification {
  projectId?: string;      // Which project (if any)
  agentId?: string;        // Which agent (if any)
  taskType?: TaskType;     // What kind of task
  tags: string[];          // Classification tags
  confidence: number;      // 0-1 confidence score
}

export enum TaskType {
  RESEARCH = 'research',
  CODING = 'coding',
  ANALYSIS = 'analysis',
  WRITING = 'writing',
  PLANNING = 'planning',
  DEBUGGING = 'debugging',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  OTHER = 'other',
}
Define Routing Destination:

typescript
Copy
export interface RoutingDestination {
  directory: string;       // UFC directory path
  filename: string;        // Filename pattern
  reason: string;          // Why routed here
}

export interface RoutingResult {
  event: Event;
  destinations: RoutingDestination[];
  classification: Classification;
}
Define Routing Config:

typescript
Copy
export interface RoutingConfig {
  enableProjectRouting: boolean;      // Route to projects/?
  enableAgentRouting: boolean;        // Route to agents/?
  enableTaskTypeRouting: boolean;     // Route to task-specific dirs?
  enableTagRouting: boolean;          // Route based on tags?
  minConfidence: number;              // Min confidence for routing (0-1)
}
Part 2: Content Classifier
Create src/routing/content-classifier.ts:

Purpose: Classify events based on content and metadata.

Requirements:

Analyze event content (text analysis)
Extract project ID from metadata or content
Extract agent ID from metadata
Infer task type from content and tags
Extract/generate tags
Calculate confidence score
Key Methods:

typescript
Copy
export class ContentClassifier {
  classify(event: Event): Classification;

  private extractProjectId(event: Event): string | undefined;
  private extractAgentId(event: Event): string | undefined;
  private inferTaskType(event: Event): TaskType;
  private extractTags(event: Event): string[];
  private calculateConfidence(event: Event, classification: Classification): number;
}
Classification Logic:

Project ID:

Check metadata.projectId first
If not present, look for project mentions in content
Pattern: "project: X", "in X project", "for X"
Agent ID:

Check metadata.agentId first
If not present, look for agent mentions in content
Pattern: "agent: X", "by X agent"
Task Type:

Look for keywords in content and tags:
"research", "investigate" → RESEARCH
"code", "implement", "build" → CODING
"analyze", "review" → ANALYSIS
"write", "document" → WRITING
"plan", "design" → PLANNING
"debug", "fix" → DEBUGGING
"test", "verify" → TESTING
"document", "readme" → DOCUMENTATION
Tags:

Use metadata.tags if present
Extract keywords from content
Add task type as tag
Add project ID as tag (if present)
Confidence:

High confidence (0.8-1.0): metadata present, clear keywords
Medium confidence (0.5-0.8): some metadata, some keywords
Low confidence (0.0-0.5): minimal metadata, unclear content
Part 3: Content Router
Create src/routing/content-router.ts:

Purpose: Route events to multiple UFC directories based on classification.

Requirements:

Use ContentClassifier to classify events
Determine routing destinations based on classification
Write events to multiple destinations
Use FileOperations from Phase 1
Use DirectoryOperations from Phase 1
Use FileNamingConvention from Phase 1
Key Methods:

typescript
Copy
export class ContentRouter {
  constructor(
    private classifier: ContentClassifier,
    private fileOps: FileOperations,
    private dirOps: DirectoryOperations,
    private config: RoutingConfig
  );

  async route(event: Event): Promise<RoutingResult>;

  private determineDestinations(
    event: Event,
    classification: Classification
  ): RoutingDestination[];

  private async writeToDestination(
    event: Event,
    destination: RoutingDestination
  ): Promise<void>;
}
Routing Logic:

Always route to:

history/execution/ (all events)
Conditionally route to:
2. projects/{projectId}/ (if projectId present and config.enableProjectRouting)
3. agents/{agentId}/ (if agentId present and config.enableAgentRouting)
4. tasks/{taskType}/ (if taskType inferred and config.enableTaskTypeRouting)

Filename Pattern:

Use FileNamingConvention from Phase 1
Format: YYYY-MM-DD_HHmmss_TYPE_description.jsonl
Description based on classification
Example:

typescript
Copy
// Event classified as:
// projectId: "infinite-aura"
// agentId: "coder-agent"
// taskType: CODING
// tags: ["typescript", "hooks"]

// Routes to:
// 1. history/execution/2026-01-08_100000_CAPTURE-ALL_events.jsonl
// 2. projects/infinite-aura/2026-01-08_100000_CODING_hooks.jsonl
// 3. agents/coder-agent/2026-01-08_100000_CODING_hooks.jsonl
// 4. tasks/coding/2026-01-08_100000_HOOKS_implementation.jsonl
Part 4: Integration with Hook System
Update hook handlers to use ContentRouter:

Modify src/hooks/capture-all-handler.ts:

typescript
Copy
export class CaptureAllHandler extends BaseHookHandler {
  constructor(
    private fileOps: FileOperations,
    private router: ContentRouter  // Add router
  ) {
    super();
  }

  async handle(event: Event): Promise<void> {
    // Validate event
    this.validateEvent(event);

    // Route event (writes to multiple destinations)
    await this.router.route(event);
  }
}
Similar updates for:

StopHandler
SubagentStopHandler
SessionSummaryHandler
Note: Handlers should use router instead of directly writing files.

Part 5: Routing Index
Create src/routing/index.ts:

Export all routing components:

typescript
Copy
export * from './types';
export * from './content-classifier';
export * from './content-router';
Part 6: Tests
Create comprehensive tests for routing system:

Test Files:

tests/routing/content-classifier.test.ts (30+ tests)
tests/routing/content-router.test.ts (25+ tests)
tests/routing/integration/routing-system.integration.test.ts (15+ tests)
Test Coverage:

Classification logic (project ID, agent ID, task type, tags)
Confidence calculation
Routing destination determination
Multi-destination writing
Integration with hook handlers
Edge cases (missing metadata, unclear content, etc.)
Target: 70+ new tests, maintain >85% coverage

Part 7: Integration Test
Create tests/routing/integration/routing-system.integration.test.ts:

Test end-to-end routing:

Create event with project/agent/task metadata
Classify event
Route event
Verify files created in multiple directories
Verify JSONL format in each file
Verify metadata preserved
Test with different event types
Test with missing metadata
Test with unclear content
Execution
After creating all files:

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

✅ src/routing/types.ts created (Classification, TaskType, RoutingDestination, RoutingResult, RoutingConfig)
✅ src/routing/content-classifier.ts created (ContentClassifier class)
✅ src/routing/content-router.ts created (ContentRouter class)
✅ src/routing/index.ts created (exports all components)
✅ Hook handlers updated to use ContentRouter
Tests:

✅ 70+ new tests created
✅ All tests passing (target: 660+ total tests)
✅ Coverage maintained >85% (target: >89%)
Integration:

✅ Events routed to multiple destinations
✅ Classification working correctly
✅ Files created in correct directories
✅ JSONL format preserved
Quality Gates:

✅ TypeScript compilation passes
✅ ESLint passes
✅ Prettier formatting passes
✅ All tests passing
✅ Coverage >85%
Documentation:

✅ Update docs/api/README.md with routing API
✅ Update docs/architecture/README.md with routing architecture
✅ Add JSDoc comments to all public APIs
Verification
Show me:

List of all files created with sizes
Test results (number of tests, coverage %)
Output of pnpm check:all
Example of an event routed to multiple destinations (show file paths)
Classification example (show Classification object)
Any errors encountered and how they were resolved
Output Format
Provide:

Summary of files created
Test metrics (before/after)
Coverage metrics (before/after)
Routing verification (show example with multiple destinations)
Classification example
Any issues encountered
Confirmation of success criteria
Notes
Critical Aspects:

🟡 Classification logic (accuracy is important)
🟡 Multi-destination routing (don't lose events)
🟡 Edge case handling (missing metadata, unclear content)
Integration Points:

Uses Event, EventType from PROMPT 08
Uses FileOperations from Phase 1
Uses DirectoryOperations from Phase 1
Uses FileNamingConvention from Phase 1
Updates hook handlers from PROMPT 08
Future Enhancements (not in this prompt):

Interestingness scoring (PROMPT 10)
Dynamic context loading (PROMPT 11)
Hydration strategies (PROMPT 12)
AI-driven classification (Phase 4+)
```
