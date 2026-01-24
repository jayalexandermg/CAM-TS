# Project_Brief.md
## Infinite Aura Memory System — Constraint Matrix v0.2

---

### GOAL (LOCKED)

Build a unified filesystem-based memory system for Infinite Aura's multi-agent orchestrator. All agents read/write to ONE memory store. No context loss. No repeating yourself. No embeddings. No vendor lock-in.

This memory system is Layer 3 of the 5-Layer Operating System (Data & Operations). It is not optional infrastructure—it is the OS itself.

---

### THE 13 KAI PRINCIPLES

All implementation decisions trace back to these. Agents reference by number.

| # | Principle | Applies To | Status |
|---|-----------|------------|--------|
| 1 | Clear Thinking + Prompting is King | All prompts, all docs | ALWAYS |
| 2 | Scaffolding > Model | System design over model intelligence | ALWAYS |
| 3 | As Deterministic as Possible | Prefer code over prompts | ALWAYS |
| 4 | Code Before Prompts | If it can be code, make it code | ALWAYS |
| 5 | Spec / Test / Evals First | Define success before building | ALWAYS |
| 6 | UNIX Philosophy | Small tools, one job each, composable | ALWAYS |
| 7 | ENG / SRE Principles | Production practices, reliability | ALWAYS |
| 8 | CLI as Interface | All operations via CLI commands | ALWAYS |
| 9 | Goal → Code → CLI → Prompts → Agents | Execution flow (see below) | ALWAYS |
| 10 | Meta / Self Update System | System upgrades itself | PHASE 2 |
| 11 | Custom Skill Management | Routing → Workflows → Tools | PHASE 2 |
| 12 | Custom History System | Sessions, learnings, decisions | THIS BUILD |
| 13 | Custom Agent Personalities / Voices | Agent identity and voice | PHASE 2 |

**Principle #9 Execution Flow:**
```
GOAL (what you want) 
  → CODE (deterministic implementation)
    → CLI (command-line interface to the code)
      → PROMPTS (natural language to invoke CLI)
        → AGENTS (orchestrate multiple CLI calls)
```

---

### ARCHITECTURE CONSTRAINT: UFC (Unified Filesystem-based Context)

**Core Concept:** The filesystem IS the context system. Not a database. Not embeddings. Files.

**Why UFC:**
- One hop from thought (text is thought primitive)
- Searchable with grep/find (no special tooling)
- Git-trackable (version history free)
- Deterministic (same path = same file = same result)
- No haystack problem (nested structure = precise loading)

**Root:** `~/.infinite-aura/memory/`

```
~/.infinite-aura/memory/
├── user_context.md           # Who is Jjay, goals, preferences (Layer 1)
├── current_projects.md       # Active project registry
├── orchestrator_state.md     # Orchestrator status and assignments
│
├── context/                  # UFC nested context (max 3 levels deep)
│   ├── system.md             # Describes UFC itself (loaded first)
│   ├── tools/                # Tool descriptions (MCPs, commands, etc.)
│   │   └── tools.md
│   ├── projects/             # Per-project context
│   │   └── {project_name}/
│   │       └── context.md
│   └── agents/               # Per-agent context
│       └── {agent_name}/
│           └── context.md
│
├── projects/                 # Per-project memory (detailed)
│   └── {project_name}/
│       ├── context.md        # Goal, constraints, status
│       ├── decisions.md      # Why we chose each approach
│       ├── learnings.md      # What we learned
│       ├── team.md           # Agents assigned
│       └── artifacts/        # Outputs/code/designs
│
├── agents/                   # Per-agent memory
│   └── {agent_name}/
│       ├── personality.md    # Identity, voice, archetype
│       ├── skills.md         # What this agent can do
│       ├── learnings.md      # What this agent has learned
│       ├── state.md          # Current state and assignments
│       └── history.md        # Past work
│
├── sessions/                 # Session records (append-only)
│   └── {YYYY-MM-DD-HH-MM-SS}/
│       ├── context.md        # What was the goal?
│       ├── work_log.md       # What happened?
│       ├── decisions.md      # What was decided?
│       ├── results.md        # What was produced?
│       └── learnings.md      # What did we learn?
│
├── history/                  # Consolidated history (Principle #12)
│   ├── sessions/             # Session summaries
│   ├── learnings/            # Extracted learnings
│   ├── decisions/            # Decision records
│   └── research/             # Research notes
│
├── skills/                   # Skill definitions (Principle #11)
│   └── {skill_name}/
│       ├── skill.md          # Routing + "use when" triggers
│       ├── workflows/        # Step-by-step procedures
│       │   └── {workflow}.md
│       └── tools/            # Deterministic code (CLI)
│           └── {tool}.ts
│
├── index/                    # Search indexes (generated)
├── backups/                  # Automated backups
└── meta/                     # System metadata
    ├── version.md
    ├── templates/            # Schema templates
    └── guardrails/           # These constraint docs
```

**CRITICAL: Max 3 levels of nesting.** Deeper nesting causes context loading issues.

---

### 4-LAYER CONTEXT ENFORCEMENT

Problem: AI says it read context but didn't, or gets overwhelmed (haystack).

Solution: 4-layer enforcement system (all 4 required):

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| 1 | Load `context/system.md` first | Describes UFC structure itself |
| 2 | User prompt submit hook | Re-reads context on EVERY prompt |
| 3 | Aggressive instructions in config | Sirens, emphasis, at the top |
| 4 | Symlinks in every project | Points back to central context |

**Result:** 95%+ compliance with staying on task, not forgetting tools.

---

### 4-LAYER AGENT ONBOARDING

When orchestrator spawns an agent, it loads ALL FOUR LAYERS before the agent starts:

| Layer | Source | Contains |
|-------|--------|----------|
| 1. User Context | `user_context.md` | Who is user, goals, preferences, constraints |
| 2. Project Context | `projects/{project}/context.md` | Project goal, success criteria, status, decisions |
| 3. Session Context | `sessions/{current}/context.md` | What happened, accomplishments, next steps |
| 4. Agent State | `agents/{agent}/*.md` | Skills, learnings, personality, current assignment |

**Orchestrator passes to agent:**
```
{
  project_path: string,
  agent_name: string,
  task_description: string,
  context_blob: string  // All 4 layers merged
}
```

**Result:** Agent enters with FULL context. No blank slates. No "who am I?" questions.

---

### SKILL ARCHITECTURE (3-Layer)

Each skill has 3 layers (Principle #11):

| Layer | Purpose | Implementation |
|-------|---------|----------------|
| 1. ROUTING | Intent recognition | `skill.md` with "use when" triggers |
| 2. WORKFLOWS | Step-by-step procedures | `workflows/*.md` |
| 3. TOOLS | Deterministic execution | `tools/*.ts` (CLI, not prompts) |

**Key:** Tools are CODE, not prompts. (Principle #3, #4)

**Skill Directory Structure:**
```
skills/{skill_name}/
├── skill.md          # Front matter with "use when" triggers
├── workflows/
│   ├── workflow1.md  # Step-by-step for specific task
│   └── workflow2.md
└── tools/
    ├── tool1.ts      # Deterministic CLI tool
    └── tool2.ts
```

---

### HARD CONSTRAINTS (NON-NEGOTIABLE)

| ID | Constraint | Principle | Rationale |
|----|------------|-----------|-----------|
| C1 | Text-only storage (MD/YAML/JSON) | #3 | Searchable, no vendor lock-in, git-trackable |
| C2 | No embeddings/vectors | #3 | Deterministic search. Same query = same results. |
| C3 | Append-only history | #12 | Sessions never deleted. Full audit trail. |
| C4 | Unified memory (all agents share) | #2 | No knowledge duplication. Coordinate through memory. |
| C5 | CLI-first access | #8 | All memory ops via `aura memory {command}` |
| C6 | 4-layer context load on agent spawn | #2 | No blank slates. Full context always. |
| C7 | Max 3 levels nesting | #2 | Deeper nesting breaks context loading |
| C8 | Code before prompts | #3, #4 | If it can be deterministic, make it deterministic |
| C9 | Solve once, reuse forever | #6 | UNIX philosophy. Don't rebuild. |

---

### SUCCESS CRITERIA

- [ ] Orchestrator spawns agent with full 4-layer context in <100ms
- [ ] Any agent can read context via `aura memory read {path}`
- [ ] Any agent can append learnings via `aura memory append {path} "{content}"`
- [ ] Search returns deterministic results via `aura memory search "{query}"`
- [ ] Session records auto-created on start, auto-archived on end
- [ ] All memory is git-trackable (no binary, no embeddings)
- [ ] Zero external dependencies (no databases, no vector stores)
- [ ] 4-layer enforcement achieves 95%+ context compliance
- [ ] Skills route correctly via "use when" triggers

---

### EXPLICIT OUT OF SCOPE (v0)

- Voice pipeline integration (Phase 2)
- Agent personality customization beyond base template (Phase 2)
- Meta/self-update system (Phase 2)
- Full skill builder (Phase 2)
- Multi-user memory separation (Phase 3)
- Cloud sync/backup (Phase 3)
- Semantic/vector search (NEVER—violates C2)

---

### HOW THESE DOCS ARE USED

| Document | Purpose | Referenced By |
|----------|---------|---------------|
| `Project_Brief.md` | Constraint enforcement | All agents before any action |
| `Memory_Checklist.md` | Build sequencing | Engineer, Architect during implementation |
| `Decisions_Log.md` | Reasoning reference | All agents when extending or questioning |

**Rule:** If an agent proposes something that violates a constraint, the proposal is rejected. No exceptions.

---

*Last Updated: Session init*
*Version: 0.2*
*Status: LOCKED (constraints finalized)*
