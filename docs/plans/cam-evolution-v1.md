# CAM Evolution Plan v1 — Foundation + Intelligence Layer

## Principles
- **CEO Model**: CAM delegates, never executes. Orchestration intelligence only.
- **Metal Core**: Constitution, guardrails, validation = deterministic. No drift.
- **Water Wrapper**: Agent spawning, routing, context = adaptive and fluid.
- **Depth-on-Demand**: Memory uses progressive disclosure (L0→L1→L2→L3).
- **Validation Hierarchy**: Agent self-validates → Validation agent E2E → CAM approves.

## Workstreams & File Ownership (STRICT — no overlap)

### WS1: Guardrails & Safety (builder-guardrails)
| File | Action | Description |
|------|--------|-------------|
| `src/guardrails/GuardrailEngine.ts` | NEW | Implements GuardrailEngine interface from types.ts. Evaluates 7 defined policies as middleware. |
| `src/guardrails/Constitution.ts` | NEW | Hard rule system that overrides all agent decisions. Metal core. |
| `src/guardrails/ValidationPipeline.ts` | NEW | 3-layer validation: agent self-check → E2E validation → CAM approval. |
| `src/guardrails/index.ts` | UPDATE | Export new classes |
**Deps:** None — start immediately

### WS2: Hierarchical Memory — Depth-on-Demand (builder-memory)
| File | Action | Description |
|------|--------|-------------|
| `src/memory/hierarchical/types.ts` | NEW | L0/L1/L2/L3 layer types, HierarchicalEntry, query interfaces |
| `src/memory/hierarchical/HierarchicalStore.ts` | NEW | SQLite-backed store with per-layer columns. Write path generates L0-L2 summaries. |
| `src/memory/hierarchical/DepthOnDemandRetriever.ts` | NEW | Progressive retrieval: L0 scan → L1 filter → L2 confirm → L3 load |
| `src/memory/hierarchical/SummaryGenerator.ts` | NEW | Generates L0 tags, L1 one-liner, L2 overview from L3 full content |
| `src/memory/hierarchical/index.ts` | NEW | Barrel exports |
| `src/memory/crystallization/CrystallizationEngine.ts` | NEW | Distills recurring patterns from learning tier into dense crystal entries |
| `src/memory/crystallization/index.ts` | NEW | Barrel exports |
| `src/memory/index.ts` | UPDATE | Add exports for hierarchical + crystallization |
**Deps:** None — start immediately

### WS3: Real Skill Execution (builder-skills)
| File | Action | Description |
|------|--------|-------------|
| `src/skills/ToolRegistry.ts` | NEW | Central registry for tool handlers. Skills register tools, executor looks them up. |
| `src/skills/SkillExecutor.ts` | MODIFY | Replace simulateToolExecution() with ToolRegistry lookup. Replace executeSkillWorkflow() with real workflow execution via tool chain. |
| `src/skills/GapDetector.ts` | NEW | Tracks IntentMatcher misses, low-confidence routes, user corrections. Outputs gap report. |
| `src/skills/index.ts` | UPDATE | Export new classes |
**Deps:** WS1 (needs GuardrailEngine to gate tool execution)

### WS4: Orchestrator Evolution (builder-orchestrator)
| File | Action | Description |
|------|--------|-------------|
| `src/orchestrator/Orchestrator.ts` | MODIFY | Wire PrepromptHydrator into buildSystemPrompt(). Add guardrail evaluation in process() pipeline. Add DecisionTrace wrapping. |
| `src/orchestrator/DecisionTrace.ts` | NEW | Captures every routing decision with candidates, scores, selection, reason. Persists to UOCS. |
| `src/orchestrator/index.ts` | UPDATE | Export DecisionTrace |
**Deps:** WS1 + WS2 (needs guardrails interface + memory interfaces to wire)

### WS5: Intelligence Layer (builder-intelligence)
| File | Action | Description |
|------|--------|-------------|
| `src/scheduler/SchedulerService.ts` | NEW | Scheduled + event-driven agent triggers. Writes tasks to .claude/scheduled/. |
| `src/scheduler/types.ts` | NEW | ScheduledTask, TriggerEvent, CronExpression types |
| `src/scheduler/index.ts` | NEW | Barrel exports |
| `src/learning/SignalCapture.ts` | NEW | Structured telemetry: timing, retries, error types, satisfaction signals. Feeds learning pipeline. |
| `src/learning/index.ts` | UPDATE | Export SignalCapture |
| `src/rlm/threads/ReasoningThreadManager.ts` | NEW | Persistent reasoning chains that survive session boundaries. Resume, branch, reference. |
| `src/rlm/threads/types.ts` | NEW | ReasoningThread, ThreadStep, ThreadStatus types |
| `src/rlm/threads/index.ts` | NEW | Barrel exports |
| `src/rlm/index.ts` | UPDATE | Export threads module |
**Deps:** None — start immediately (standalone modules)

### WS6: Agent Evolution (builder-agents-evo)
| File | Action | Description |
|------|--------|-------------|
| `src/agents/evolution/TraitEvolution.ts` | NEW | Tracks trait+outcome correlations. Adjusts inference weights over time. |
| `src/agents/evolution/types.ts` | NEW | TraitPerformance, EvolutionRecord, FeedbackEntry types |
| `src/agents/evolution/index.ts` | NEW | Barrel exports |
| `src/agents/index.ts` | UPDATE | Export evolution module |
**Deps:** None — start immediately (standalone module)

### WS7: Validation (validator)
Read-only audit of ALL workstreams after completion.
**Deps:** ALL of WS1-WS6

## Dependency Graph
```
WS1 (guardrails) ──┬──→ WS3 (skills) ──→ WS7 (validator)
                    ├──→ WS4 (orchestrator) ──→ WS7
WS2 (memory) ──────┘
WS5 (intelligence) ────→ WS7
WS6 (agents-evo) ──────→ WS7
```

## Execution Order
Phase 1 (parallel): WS1, WS2, WS5, WS6
Phase 2 (after WS1): WS3
Phase 3 (after WS1+WS2): WS4
Phase 4 (after all): WS7
