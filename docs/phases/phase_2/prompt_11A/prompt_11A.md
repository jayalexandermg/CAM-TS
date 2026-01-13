PROMPT 11A: Two-Layer Preprompt Hydration
Phase: 2 (Infrastructure)
Status: 🆕 NEW - Replaces PROMPT 11
Time Estimate: 8-10 hours
Priority: CRITICAL
Dependencies: PROMPT 8A (SessionStart hook), PROMPT 4A (CORE directory)

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.
All commands: pnpm install, pnpm test, pnpm run build, etc.

📋 CONTEXT
Current State
Project: Infinite Aura TypeScript (CAM)
Location: ~/.infinite-aura-ts/
Tests: 1,246 tests, 92.5% coverage
SessionStart Hook: Just built (loads CORE context)
PrepromptInjector: Just built (single-layer injection)
What's Missing
Current preprompt hydration is single-layer:

Only loads CORE context (Layer 1)
No agent-specific context (Layer 2)
All context loaded at session start
No dynamic context based on request
PAI preprompt hydration is two-layer:

Layer 1 (Global): User identity, preferences, active projects (CORE)
Layer 2 (Agent-Specific): Skill context, agent personality, task-specific context
Layer 1 loaded at session start
Layer 2 loaded dynamically based on skill activation
Why This Matters
Without two-layer hydration:

All context loaded upfront (inefficient)
No skill-specific context
No agent-specific context
Context not tailored to request
With two-layer hydration:

✅ Global context always available (Layer 1)
✅ Skill context loaded on demand (Layer 2)
✅ Efficient (only load what's needed)
✅ Context tailored to request
🎯 OBJECTIVE
Implement two-layer preprompt hydration system where Layer 1 (Global/CORE) loads at session start and Layer 2 (Agent-Specific/Skill) loads dynamically based on skill activation.

After this prompt:

✅ PrepromptHydrator class manages two layers
✅ Layer 1 (Global) loaded at session start
✅ Layer 2 (Agent-Specific) loaded on demand
✅ Context relevance scoring
✅ Token management (prevent context overflow)
✅ Context caching
✅ 50-60 new tests added
✅ All existing tests still pass
📦 REQUIREMENTS

1. PrepromptHydrator Class
   Create src/context/PrepromptHydrator.ts:

Responsibilities:

Manage two-layer hydration
Load Layer 1 (Global) at session start
Load Layer 2 (Agent-Specific) on demand
Score context relevance
Manage token budget
Cache loaded context
Key Methods:

typescript
Copy
class PrepromptHydrator {
private prepromptInjector: PrepromptInjector;
private coreManager: CoreManager;
private layer1Cache?: string;
private layer2Cache: Map<string, string>;

constructor(
prepromptInjector: PrepromptInjector,
coreManager: CoreManager
);

// Load Layer 1 (Global/CORE) - called at session start
async loadLayer1(): Promise<void>;

// Load Layer 2 (Agent-Specific) - called on skill activation
async loadLayer2(skillName: string, context: AgentContext): Promise<void>;

// Clear Layer 2 (between requests)
clearLayer2(): void;

// Get complete hydrated context
getHydratedContext(): string;

// Score context relevance
private scoreRelevance(context: string, query: string): number;

// Manage token budget
private enforceTokenLimit(context: string, maxTokens: number): string;
}

interface AgentContext {
skillName: string;
agentPersonality?: string;
taskContext?: string;
relevantMemory?: string[];
} 2. Context Layers
Layer 1 (Global) - Loaded at Session Start:

--- LAYER 1: GLOBAL CONTEXT ---

## User Identity

[Contents of CORE/USER.md]

## User Preferences

[Contents of CORE/PREFERENCES.md]

## Active Projects

[Contents of CORE/ACTIVE_PROJECTS.md]

--- END LAYER 1 ---
Layer 2 (Agent-Specific) - Loaded on Skill Activation:

--- LAYER 2: AGENT CONTEXT ---

## Active Skill

[Skill name and description]

## Skill Context

[Skill-specific context from SKILL.md]

## Agent Personality

[Agent personality if specified]

## Task Context

[Task-specific context]

## Relevant Memory

[Relevant memory from 3-tier pipeline]

--- END LAYER 2 --- 3. Context Relevance Scoring
Create src/context/RelevanceScorer.ts:

Responsibilities:

Score context relevance to query
Rank context by relevance
Filter low-relevance context
Key Methods:

typescript
Copy
class RelevanceScorer {
// Score single context item
scoreContext(context: string, query: string): number;

// Rank multiple context items
rankContexts(contexts: string[], query: string): ScoredContext[];

// Filter by minimum score
filterByScore(contexts: ScoredContext[], minScore: number): string[];
}

interface ScoredContext {
context: string;
score: number;
}
Scoring algorithm (simple):

Keyword matching (TF-IDF style)
Recency (newer = higher score)
Explicit relevance markers 4. Token Management
Create src/context/TokenManager.ts:

Responsibilities:

Estimate token count
Enforce token limits
Truncate context if needed
Key Methods:

typescript
Copy
class TokenManager {
// Estimate token count (rough: 1 token ≈ 4 characters)
estimateTokens(text: string): number;

// Enforce token limit
enforceLimit(text: string, maxTokens: number): string;

// Truncate to fit budget
truncateToFit(contexts: string[], maxTokens: number): string[];
} 5. Update SessionStartHook
Update src/hooks/SessionStartHook.ts:

Use PrepromptHydrator for Layer 1:

typescript
Copy
class SessionStartHook extends BaseHook {
private prepromptHydrator: PrepromptHydrator;

async execute(event: SessionStartEvent): Promise<HookResult> {
try {
// Load Layer 1 (Global) using hydrator
await this.prepromptHydrator.loadLayer1();

      // Output confirmation
      this.outputConfirmation();

      return this.allow({ layer1Loaded: true });
    } catch (error) {
      console.error('SessionStart hook error:', error);
      return this.allow({ layer1Loaded: false, error: error.message });
    }

}
}
📁 FILES TO CREATE/MODIFY
CREATE (New Files):
src/context/PrepromptHydrator.ts
PrepromptHydrator class
Two-layer hydration logic
AgentContext interface
src/context/RelevanceScorer.ts
RelevanceScorer class
Context scoring logic
ScoredContext interface
src/context/TokenManager.ts
TokenManager class
Token estimation
Token limit enforcement
tests/context/PrepromptHydrator.test.ts
Test Layer 1 loading
Test Layer 2 loading
Test layer clearing
Test caching
tests/context/RelevanceScorer.test.ts
Test context scoring
Test context ranking
Test filtering
tests/context/TokenManager.test.ts
Test token estimation
Test limit enforcement
Test truncation
MODIFY (Existing Files):
src/context/index.ts
Export PrepromptHydrator
Export RelevanceScorer
Export TokenManager
src/hooks/SessionStartHook.ts
Use PrepromptHydrator for Layer 1
Update to use hydrator
tests/hooks/SessionStartHook.test.ts
Update tests for hydrator integration
✅ TEST CRITERIA
PrepromptHydrator Tests (25-30 tests):
Layer 1 Loading:
✅ Loads CORE context
✅ Injects into Layer 1
✅ Caches Layer 1
✅ Reuses cached Layer 1
Layer 2 Loading:
✅ Loads skill context
✅ Loads agent personality
✅ Loads task context
✅ Injects into Layer 2
✅ Caches Layer 2 per skill
Layer Management:
✅ Can clear Layer 2
✅ Layer 1 persists across requests
✅ Layer 2 cleared between requests
✅ Can reload layers
Integration:
✅ Works with PrepromptInjector
✅ Works with CoreManager
✅ Handles missing context gracefully
RelevanceScorer Tests (10-15 tests):
Scoring:
✅ Scores context relevance
✅ Higher score for relevant context
✅ Lower score for irrelevant context
Ranking:
✅ Ranks contexts by score
✅ Returns sorted list
Filtering:
✅ Filters by minimum score
✅ Returns only relevant contexts
TokenManager Tests (10-15 tests):
Estimation:
✅ Estimates token count
✅ Roughly accurate (±20%)
Enforcement:
✅ Enforces token limit
✅ Truncates if over limit
✅ Preserves important context
Truncation:
✅ Truncates multiple contexts
✅ Keeps highest priority contexts
🎯 SUCCESS CRITERIA
Functional:
✅ PrepromptHydrator working
✅ Layer 1 loads at session start
✅ Layer 2 loads on demand
✅ RelevanceScorer working
✅ TokenManager working
✅ Context caching working
Testing:
✅ All existing tests pass (1,246 tests)
✅ 50-60 new tests added
✅ Total: ~1,296-1,306 tests
✅ Coverage maintained: 90%+
Quality:
✅ TypeScript types defined
✅ Error handling implemented
✅ Code follows existing patterns
✅ Documentation added
🔗 INTEGRATION POINTS
Uses (Existing):
PrepromptInjector (PROMPT 8A): Injects context into layers
CoreManager (PROMPT 4A): Loads CORE context
SessionStartHook (PROMPT 8A): Triggers Layer 1 loading
Used By (Future):
Skill Activation (PROMPT 12C): Triggers Layer 2 loading
Orchestrator (PROMPT 16): Manages context lifecycle
📚 PAI REFERENCE
Two-Layer Hydration:
PAI Layer 1: Global context (user identity, preferences)
PAI Layer 2: Skill-specific context (skill definition, workflows)
PAI Timing: Layer 1 at session start, Layer 2 on skill activation
PAI Efficiency: Only load what's needed for current request
END OF PROMPT 11A
