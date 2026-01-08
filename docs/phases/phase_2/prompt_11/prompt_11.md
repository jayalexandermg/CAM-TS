PROMPT 11: Dynamic Context Loading (4-Layer Hydration)
⚠️ CRITICAL PROMPT - This is the big one! 🔴

This prompt implements the 4-layer hydration system that makes CAM context-aware!

File: docs/phases/phase_2/prompt_11/prompt_11.md
markdown
Copy
# PROMPT 11: Dynamic Context Loading (4-Layer Hydration)

**Phase:** 2 (Hook System + Dynamic Context + Content Routing)
**Prompt:** 11 of 24+ (Prompt 4 of 5 in Phase 2)
**Duration:** 3-5 hours
**Critical Level:** 🔴 HIGH

## Navigation
- **Previous:** [PROMPT 10](../prompt_10/prompt_10.md) (Interestingness Scoring)
- **Next:** [PROMPT 12](../prompt_12/prompt_12.md) (Hydration Strategy Registry)
- **Phase Overview:** [Phase 2 README](../README.md)

## Phase 2 Context

This is the fourth prompt of Phase 2 and the **most critical prompt in Phase 2**. We've built the hook system (PROMPT 08), content routing (PROMPT 09), and interestingness scoring (PROMPT 10). Now we're building the **4-layer dynamic context loading system** that will make CAM context-aware.

**Phase 2 Goal:** Build the nervous system that captures, routes, and contextualizes all events.

**Phase 2 Prompts:**
- PROMPT 08 ✅ - Hook System Foundation
- PROMPT 09 ✅ - Content-Based Routing
- PROMPT 10 ✅ - Interestingness Scoring
- **PROMPT 11** (this prompt) - Dynamic Context Loading 🔴 CRITICAL
- PROMPT 12 - Hydration Strategy Registry

## Prerequisites

**PROMPT 10 must be complete:**
- ✅ 819 tests passing
- ✅ Interestingness scoring implemented
- ✅ Learning indicators working
- ✅ Promotion to learned/ working

**Verify PROMPT 10:**
```bash
cd C:\dev\infinite-aura-ts\
pnpm check:all  # Should pass
pnpm test       # Should show 819 tests passing
Context
What we're building:
A dynamic context loading system that intelligently loads relevant context from the UFC memory structure in 4 layers: User → Project → Session → Agent. This is the foundation that makes CAM context-aware.

The 4 Layers:

┌─────────────────────────────────────────────────────────────┐
│ Layer 1: USER CONTEXT                                       │
│ - User preferences, goals, constraints                      │
│ - From: user/ directory                                     │
│ - Always loaded (foundational)                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: PROJECT CONTEXT                                    │
│ - Current project details, history, patterns               │
│ - From: projects/{projectId}/ directory                    │
│ - Loaded if projectId present                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: SESSION CONTEXT                                    │
│ - Current session history, summaries                        │
│ - From: history/sessions/ directory                         │
│ - Loaded if sessionId present                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: AGENT CONTEXT                                      │
│ - Current agent's history, capabilities                     │
│ - From: agents/{agentId}/ directory                        │
│ - Loaded if agentId present                                │
└─────────────────────────────────────────────────────────────┘
Current State (PROMPT 10):

Events are captured, routed, and scored
No context loading mechanism
CAM would be "blind" to past events
Problem:
CAM needs to know:

Who is the user? (preferences, goals)
What project are we working on? (history, patterns)
What happened in this session? (recent events)
What has this agent done before? (agent history)
Solution:
Dynamic context loader that:

Identifies which layers are relevant
Loads context from each layer
Scores context for relevance
Caches context for performance
Returns consolidated context
Example:

typescript
Copy
// Request context for a coding task
const request: ContextRequest = {
  projectId: "infinite-aura",
  sessionId: "session-001",
  agentId: "coder-agent",
  taskType: TaskType.CODING,
  query: "Implement hook system"
};

// Returns:
const context: LoadedContext = {
  userContext: { preferences: {...}, goals: {...} },
  projectContext: { history: [...], patterns: [...] },
  sessionContext: { recentEvents: [...], summary: "..." },
  agentContext: { capabilities: [...], history: [...] },
  relevanceScores: { user: 1.0, project: 0.9, session: 0.8, agent: 0.85 },
  totalTokens: 2500
};
Task
Create dynamic context loading system with 4-layer hydration.

Part 1: Context Types and Interfaces
Create src/context/types.ts:

Define Context Request:

typescript
Copy
export interface ContextRequest {
  projectId?: string;        // Which project (if any)
  sessionId?: string;        // Which session (if any)
  agentId?: string;          // Which agent (if any)
  taskType?: TaskType;       // What kind of task
  query?: string;            // Optional query for relevance
  maxTokens?: number;        // Max tokens to load (default: 4000)
  layers?: ContextLayer[];   // Which layers to load (default: all)
}

export enum ContextLayer {
  USER = 'user',
  PROJECT = 'project',
  SESSION = 'session',
  AGENT = 'agent',
}
Define Context Data:

typescript
Copy
export interface UserContext {
  preferences: Record<string, any>;
  goals: string[];
  constraints: string[];
  workingStyle: string;
  metadata: Record<string, any>;
}

export interface ProjectContext {
  projectId: string;
  description: string;
  history: Event[];          // Recent project events
  patterns: string[];        // Learned patterns
  files: string[];           // Key files
  metadata: Record<string, any>;
}

export interface SessionContext {
  sessionId: string;
  startedAt: string;
  recentEvents: Event[];     // Recent session events
  summary: string;           // Session summary
  metadata: Record<string, any>;
}

export interface AgentContext {
  agentId: string;
  capabilities: string[];
  history: Event[];          // Recent agent events
  performance: Record<string, number>;
  metadata: Record<string, any>;
}
Define Loaded Context:

typescript
Copy
export interface LoadedContext {
  userContext?: UserContext;
  projectContext?: ProjectContext;
  sessionContext?: SessionContext;
  agentContext?: AgentContext;
  relevanceScores: RelevanceScores;
  totalTokens: number;
  loadedAt: string;
}

export interface RelevanceScores {
  user: number;              // 0-1 relevance score
  project: number;
  session: number;
  agent: number;
}
Define Context Config:

typescript
Copy
export interface ContextConfig {
  maxTokensPerLayer: number;       // Max tokens per layer (default: 1000)
  maxTotalTokens: number;          // Max total tokens (default: 4000)
  enableCaching: boolean;          // Cache loaded context? (default: true)
  cacheExpiryMs: number;           // Cache expiry (default: 5 minutes)
  defaultLayers: ContextLayer[];   // Default layers to load
  relevanceThreshold: number;      // Min relevance to include (default: 0.3)
}
Part 2: Context Loader (Base)
Create src/context/context-loader.ts:

Purpose: Base class for loading context from UFC directories.

Requirements:

Load files from UFC directories
Parse JSONL files
Extract relevant events
Calculate token counts (approximate)
Handle missing directories gracefully
Key Methods:

typescript
Copy
export abstract class ContextLoader {
  constructor(
    protected fileOps: FileOperations,
    protected dirOps: DirectoryOperations,
    protected config: ContextConfig
  );

  protected async loadFiles(directory: string): Promise<string[]>;
  protected async parseJSONL(filePath: string): Promise<Event[]>;
  protected calculateTokens(text: string): number;
  protected async directoryExists(directory: string): Promise<boolean>;
}
Token Calculation:

typescript
Copy
// Approximate token count (1 token ≈ 4 characters)
protected calculateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
Part 3: User Context Loader
Create src/context/user-context-loader.ts:

Purpose: Load user context from user/ directory.

Requirements:

Load user preferences from user/preferences.json
Load user goals from user/goals.json
Load user constraints from user/constraints.json
Load working style from user/working-style.json
Handle missing files (return defaults)
Key Methods:

typescript
Copy
export class UserContextLoader extends ContextLoader {
  async load(request: ContextRequest): Promise<UserContext | undefined>;

  private async loadPreferences(): Promise<Record<string, any>>;
  private async loadGoals(): Promise<string[]>;
  private async loadConstraints(): Promise<string[]>;
  private async loadWorkingStyle(): Promise<string>;
}
File Locations:

~/.infinite-aura-ts/memory/user/
  ├── preferences.json
  ├── goals.json
  ├── constraints.json
  └── working-style.json
Example UserContext:

json
Copy
{
  "preferences": {
    "language": "TypeScript",
    "testFramework": "Vitest",
    "codeStyle": "functional"
  },
  "goals": [
    "Build CAM orchestrator",
    "Achieve 90%+ test coverage"
  ],
  "constraints": [
    "Use only TypeScript",
    "No external databases"
  ],
  "workingStyle": "Test-driven development with comprehensive documentation",
  "metadata": {}
}
Part 4: Project Context Loader
Create src/context/project-context-loader.ts:

Purpose: Load project context from projects/{projectId}/ directory.

Requirements:

Load project description from projects/{projectId}/description.json
Load recent project events from projects/{projectId}/*.jsonl
Load learned patterns from projects/{projectId}/patterns.json
Load key files list from projects/{projectId}/files.json
Limit events by maxTokens
Key Methods:

typescript
Copy
export class ProjectContextLoader extends ContextLoader {
  async load(request: ContextRequest): Promise<ProjectContext | undefined>;

  private async loadDescription(projectId: string): Promise<string>;
  private async loadRecentEvents(
    projectId: string,
    maxTokens: number
  ): Promise<Event[]>;
  private async loadPatterns(projectId: string): Promise<string[]>;
  private async loadKeyFiles(projectId: string): Promise<string[]>;
}
File Locations:

~/.infinite-aura-ts/memory/projects/{projectId}/
  ├── description.json
  ├── patterns.json
  ├── files.json
  └── *.jsonl (event files)
Part 5: Session Context Loader
Create src/context/session-context-loader.ts:

Purpose: Load session context from history/sessions/ directory.

Requirements:

Load recent session events from history/sessions/*.jsonl
Filter by sessionId
Load session summary (if exists)
Limit events by maxTokens
Key Methods:

typescript
Copy
export class SessionContextLoader extends ContextLoader {
  async load(request: ContextRequest): Promise<SessionContext | undefined>;

  private async loadRecentEvents(
    sessionId: string,
    maxTokens: number
  ): Promise<Event[]>;
  private async loadSummary(sessionId: string): Promise<string>;
}
File Locations:

~/.infinite-aura-ts/memory/history/sessions/
  └── *.jsonl (session event files)
Part 6: Agent Context Loader
Create src/context/agent-context-loader.ts:

Purpose: Load agent context from agents/{agentId}/ directory.

Requirements:

Load agent capabilities from agents/{agentId}/capabilities.json
Load recent agent events from agents/{agentId}/*.jsonl
Load agent performance from agents/{agentId}/performance.json
Limit events by maxTokens
Key Methods:

typescript
Copy
export class AgentContextLoader extends ContextLoader {
  async load(request: ContextRequest): Promise<AgentContext | undefined>;

  private async loadCapabilities(agentId: string): Promise<string[]>;
  private async loadRecentEvents(
    agentId: string,
    maxTokens: number
  ): Promise<Event[]>;
  private async loadPerformance(
    agentId: string
  ): Promise<Record<string, number>>;
}
File Locations:

~/.infinite-aura-ts/memory/agents/{agentId}/
  ├── capabilities.json
  ├── performance.json
  └── *.jsonl (agent event files)
Part 7: Relevance Scorer
Create src/context/relevance-scorer.ts:

Purpose: Score context relevance based on request.

Requirements:

Score user context (always 1.0 - foundational)
Score project context (based on projectId match, recent activity)
Score session context (based on sessionId match, recency)
Score agent context (based on agentId match, task type)
Key Methods:

typescript
Copy
export class RelevanceScorer {
  scoreUserContext(
    userContext: UserContext,
    request: ContextRequest
  ): number;

  scoreProjectContext(
    projectContext: ProjectContext,
    request: ContextRequest
  ): number;

  scoreSessionContext(
    sessionContext: SessionContext,
    request: ContextRequest
  ): number;

  scoreAgentContext(
    agentContext: AgentContext,
    request: ContextRequest
  ): number;
}
Scoring Logic:

User Context:

Always 1.0 (foundational)
Project Context:

1.0 if projectId matches
0.8 if recent activity (last 24 hours)
0.5 if older activity
0.0 if no match
Session Context:

1.0 if sessionId matches
0.7 if recent session (last hour)
0.4 if older session
0.0 if no match
Agent Context:

1.0 if agentId matches
0.8 if task type matches agent capabilities
0.5 if partial match
0.0 if no match
Part 8: Context Cache
Create src/context/context-cache.ts:

Purpose: Cache loaded context for performance.

Requirements:

Cache by request signature (hash of ContextRequest)
Expire cache after configurable time
Clear cache on demand
Thread-safe (if needed)
Key Methods:

typescript
Copy
export class ContextCache {
  constructor(private config: ContextConfig);

  get(request: ContextRequest): LoadedContext | undefined;
  set(request: ContextRequest, context: LoadedContext): void;
  clear(): void;

  private generateKey(request: ContextRequest): string;
  private isExpired(cachedAt: string): boolean;
}
Cache Key:

typescript
Copy
// Hash of: projectId + sessionId + agentId + taskType + query
private generateKey(request: ContextRequest): string {
  const key = `${request.projectId}-${request.sessionId}-${request.agentId}-${request.taskType}-${request.query}`;
  return createHash('sha256').update(key).digest('hex');
}
Part 9: Dynamic Context Loader (Main)
Create src/context/dynamic-context-loader.ts:

Purpose: Main orchestrator that loads all 4 layers and consolidates context.

Requirements:

Use layer-specific loaders
Load layers in order (User → Project → Session → Agent)
Score relevance for each layer
Filter by relevance threshold
Respect token limits
Use cache if enabled
Return consolidated context
Key Methods:

typescript
Copy
export class DynamicContextLoader {
  constructor(
    private userLoader: UserContextLoader,
    private projectLoader: ProjectContextLoader,
    private sessionLoader: SessionContextLoader,
    private agentLoader: AgentContextLoader,
    private relevanceScorer: RelevanceScorer,
    private cache: ContextCache,
    private config: ContextConfig
  );

  async load(request: ContextRequest): Promise<LoadedContext>;

  private async loadLayer(
    layer: ContextLayer,
    request: ContextRequest
  ): Promise<any>;

  private filterByRelevance(
    context: LoadedContext,
    scores: RelevanceScores
  ): LoadedContext;

  private enforceTokenLimits(context: LoadedContext): LoadedContext;
}
Loading Flow:

typescript
Copy
async load(request: ContextRequest): Promise<LoadedContext> {
  // 1. Check cache
  if (this.config.enableCaching) {
    const cached = this.cache.get(request);
    if (cached) return cached;
  }

  // 2. Load layers
  const userContext = await this.userLoader.load(request);
  const projectContext = await this.projectLoader.load(request);
  const sessionContext = await this.sessionLoader.load(request);
  const agentContext = await this.agentLoader.load(request);

  // 3. Score relevance
  const scores: RelevanceScores = {
    user: this.relevanceScorer.scoreUserContext(userContext, request),
    project: this.relevanceScorer.scoreProjectContext(projectContext, request),
    session: this.relevanceScorer.scoreSessionContext(sessionContext, request),
    agent: this.relevanceScorer.scoreAgentContext(agentContext, request),
  };

  // 4. Build context
  let context: LoadedContext = {
    userContext,
    projectContext,
    sessionContext,
    agentContext,
    relevanceScores: scores,
    totalTokens: 0,
    loadedAt: new Date().toISOString(),
  };

  // 5. Filter by relevance
  context = this.filterByRelevance(context, scores);

  // 6. Enforce token limits
  context = this.enforceTokenLimits(context);

  // 7. Cache
  if (this.config.enableCaching) {
    this.cache.set(request, context);
  }

  return context;
}
Part 10: Context Index
Create src/context/index.ts:

Export all context components:

typescript
Copy
export * from './types';
export * from './context-loader';
export * from './user-context-loader';
export * from './project-context-loader';
export * from './session-context-loader';
export * from './agent-context-loader';
export * from './relevance-scorer';
export * from './context-cache';
export * from './dynamic-context-loader';
Part 11: Tests
Create comprehensive tests for context system:

Test Files:

tests/context/user-context-loader.test.ts (20+ tests)
tests/context/project-context-loader.test.ts (25+ tests)
tests/context/session-context-loader.test.ts (20+ tests)
tests/context/agent-context-loader.test.ts (20+ tests)
tests/context/relevance-scorer.test.ts (25+ tests)
tests/context/context-cache.test.ts (15+ tests)
tests/context/dynamic-context-loader.test.ts (30+ tests)
tests/context/integration/context-system.integration.test.ts (25+ tests)
Test Coverage:

Layer loading (all 4 layers)
File parsing (JSONL, JSON)
Token counting
Relevance scoring
Cache hit/miss
Token limit enforcement
Missing files/directories
Edge cases (empty context, no matches, etc.)
Target: 180+ new tests, maintain >85% coverage

Part 12: Integration Test
Create tests/context/integration/context-system.integration.test.ts:

Test end-to-end context loading:

Create test UFC structure with sample data
Create ContextRequest with all layers
Load context
Verify all layers loaded
Verify relevance scores
Verify token limits respected
Test cache hit/miss
Test with missing data
Test with different layer combinations
Test relevance filtering
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

✅ src/context/types.ts created (all context types and interfaces)
✅ src/context/context-loader.ts created (base loader)
✅ src/context/user-context-loader.ts created (user layer)
✅ src/context/project-context-loader.ts created (project layer)
✅ src/context/session-context-loader.ts created (session layer)
✅ src/context/agent-context-loader.ts created (agent layer)
✅ src/context/relevance-scorer.ts created (relevance scoring)
✅ src/context/context-cache.ts created (caching)
✅ src/context/dynamic-context-loader.ts created (main orchestrator)
✅ src/context/index.ts created (exports all components)
Tests:

✅ 180+ new tests created
✅ All tests passing (target: 1000+ total tests)
✅ Coverage maintained >85% (target: >87%)
Integration:

✅ All 4 layers loadable
✅ Relevance scoring working
✅ Token limits enforced
✅ Caching working
✅ Missing data handled gracefully
Quality Gates:

✅ TypeScript compilation passes
✅ ESLint passes
✅ Prettier formatting passes
✅ All tests passing
✅ Coverage >85%
Documentation:

✅ Update docs/api/README.md with context API
✅ Update docs/architecture/README.md with 4-layer hydration architecture
✅ Add JSDoc comments to all public APIs
Verification
Show me:

List of all files created with sizes
Test results (number of tests, coverage %)
Output of pnpm check:all
Example of LoadedContext (show all 4 layers)
Example of relevance scoring (show scores for each layer)
Cache hit/miss example
Any errors encountered and how they were resolved
Output Format
Provide:

Summary of files created
Test metrics (before/after)
Coverage metrics (before/after)
Context loading verification (show example LoadedContext)
Relevance scoring example
Cache performance example
Any issues encountered
Confirmation of success criteria
Notes
Critical Aspects:

🔴 4-layer architecture (User → Project → Session → Agent)
🔴 Token limit enforcement (prevent context overflow)
🔴 Relevance scoring accuracy (important for quality)
🔴 Cache performance (critical for speed)
🔴 Missing data handling (graceful degradation)
Integration Points:

Uses Event from PROMPT 08
Uses TaskType from PROMPT 09
Uses FileOperations from Phase 1
Uses DirectoryOperations from Phase 1
Will be used by Orchestrator in Phase 4
Future Enhancements (not in this prompt):

Hydration strategies (PROMPT 12)
AI-driven context selection (Phase 4+)
Semantic search (Phase 6)
Context compression (Phase 6)
Performance Considerations:

Cache aggressively (5-minute default)
Load layers lazily (only if needed)
Limit tokens per layer (1000 default)
Limit total tokens (4000 default)
Use streaming for large files (future)

---
