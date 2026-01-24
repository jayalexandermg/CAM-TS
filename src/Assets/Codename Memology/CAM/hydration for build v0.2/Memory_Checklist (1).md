# Memory_Checklist.md
## Infinite Aura Memory System — Build Phases

---

## PHASE 1: Directory Scaffold
**Depends on:** Nothing (start here)
**Principles:** #6 (UNIX), #2 (Scaffolding)

**Deliverables:**
- [ ] Create `~/.infinite-aura/memory/` root directory
- [ ] Create full directory structure per Project_Brief.md
- [ ] Create `context/system.md` describing UFC structure (loaded first always)
- [ ] Create placeholder `.gitkeep` files in empty directories
- [ ] Create `meta/version.md` with system version info
- [ ] Initialize git repo in `~/.infinite-aura/memory/`

**Success Criteria:**
```bash
$ ls ~/.infinite-aura/memory/
# Returns: user_context.md current_projects.md orchestrator_state.md context/ projects/ agents/ sessions/ history/ skills/ index/ backups/ meta/

$ ls ~/.infinite-aura/memory/context/
# Returns: system.md tools/ projects/ agents/

$ git -C ~/.infinite-aura/memory/ status
# Returns: clean working tree
```

---

## PHASE 2: Schema Definition
**Depends on:** Phase 1 complete
**Principles:** #5 (Spec First), #1 (Clear Thinking)

**Deliverables:**
- [ ] `meta/templates/user_context.template.md` — User layer schema
- [ ] `meta/templates/project_context.template.md` — Project layer schema
- [ ] `meta/templates/agent_personality.template.md` — Agent layer schema
- [ ] `meta/templates/session_record.template.md` — Session layer schema
- [ ] `meta/templates/skill.template.md` — Skill routing schema with "use when"
- [ ] `meta/templates/workflow.template.md` — Workflow schema
- [ ] `meta/templates/decision.template.md` — Decision record schema
- [ ] `meta/templates/learning.template.md` — Learning record schema

**Schema Requirements:**
Each schema defines:
- Required fields
- Optional fields
- Data types
- Example content
- "use when" triggers (for skills)

**Success Criteria:**
- Agent can copy template and populate without asking questions
- No ambiguity in field definitions
- Templates validate against themselves

---

## PHASE 3: Core CLI Commands
**Depends on:** Phase 2 complete
**Principles:** #8 (CLI as Interface), #3 (Deterministic)

**Deliverables:**
- [ ] `aura memory read {path}` — Returns file contents
- [ ] `aura memory write {path} {content}` — Overwrites file (with backup)
- [ ] `aura memory append {path} "{content}"` — Appends timestamped entry
- [ ] `aura memory search "{query}" [--path {scope}]` — grep-based search
- [ ] `aura memory list {path}` — Lists directory contents
- [ ] `aura memory init-session` — Creates new session directory with templates
- [ ] `aura memory close-session` — Archives session, extracts learnings, git commits

**Success Criteria:**
```bash
$ aura memory read user_context
# Returns: contents of ~/.infinite-aura/memory/user_context.md

$ aura memory append agents/engineer/learnings "Learned: async patterns improve throughput"
# Appends: [2024-01-15T10:30:00Z] Learned: async patterns improve throughput

$ aura memory search "optimization" --path history/learnings
# Returns: all lines matching "optimization" in learnings directory

$ aura memory init-session
# Creates: sessions/2024-01-15-10-30-00/ with all template files
```

---

## PHASE 4: 4-Layer Context Enforcement
**Depends on:** Phase 3 complete
**Principles:** #2 (Scaffolding), #1 (Clear Thinking)

**Deliverables:**
- [ ] `context/system.md` — Describes UFC structure (Layer 1 enforcement)
- [ ] User prompt submit hook that re-reads context (Layer 2 enforcement)
- [ ] Aggressive instructions in main config file (Layer 3 enforcement)
- [ ] Symlink creation utility for project directories (Layer 4 enforcement)
- [ ] Context hydration confirmation output on boot

**Hook Implementation:**
```bash
# On every prompt submit, force re-read of:
# 1. context/system.md
# 2. context/tools/tools.md
# 3. Current project context (if in project)
```

**Success Criteria:**
```bash
$ aura boot
# Output shows:
# ✓ Loaded context/system.md
# ✓ Loaded context/tools/tools.md
# ✓ Active projects: [list]
# ✓ Available agents: [list]
# Ready.

# Context compliance rate: 95%+ (agent stays on task, doesn't forget tools)
```

---

## PHASE 5: 4-Layer Agent Onboarding
**Depends on:** Phase 4 complete
**Principles:** #2 (Scaffolding), #9 (Goal→Code→CLI→Prompts→Agents)

**Deliverables:**
- [ ] `aura agent spawn {agent_name} --project {project_name} --task "{task}"`
- [ ] Context loader assembles 4 layers:
  1. Load `user_context.md` (Layer 1: User)
  2. Load `projects/{project}/context.md` (Layer 2: Project)
  3. Load `sessions/{current}/context.md` (Layer 3: Session)
  4. Load `agents/{agent}/personality.md` + `skills.md` + `learnings.md` (Layer 4: Agent)
- [ ] Output: Single context blob ready for agent system prompt
- [ ] Agent system prompt injection with full context
- [ ] Timing: Context assembly <100ms

**Success Criteria:**
```bash
$ aura agent spawn engineer --project infinite-aura-memory --task "implement search command"
# Output:
# Loading context layers...
#   ✓ User context (Layer 1)
#   ✓ Project context (Layer 2)
#   ✓ Session context (Layer 3)
#   ✓ Agent state (Layer 4)
# Context loaded in 47ms
# Agent engineer spawned with full context.
```

---

## PHASE 6: Agent Write-Back
**Depends on:** Phase 5 complete
**Principles:** #12 (Custom History), #3 (Deterministic)

**Deliverables:**
- [ ] On task completion, agent writes:
  - Session record → `sessions/{timestamp}/`
  - Learnings → `agents/{agent}/learnings.md`
  - Learnings → `history/learnings/` (consolidated)
  - Project status → `projects/{project}/context.md`
  - Decisions → `projects/{project}/decisions.md` (if decisions made)
  - Decisions → `history/decisions/` (consolidated)
- [ ] Automatic backup before any write operation
- [ ] Git commit after session close with summary message
- [ ] Learning extraction: Agent summarizes what was learned

**Success Criteria:**
- After agent completes task, all write locations updated
- `git log` shows commit with session summary
- Previous state recoverable from `backups/`
- Learnings searchable via `aura memory search`

---

## PHASE 7: Skill Scaffold (Routing Only)
**Depends on:** Phase 6 complete
**Principles:** #11 (Custom Skill Management), #6 (UNIX)

**Deliverables:**
- [ ] `skills/` directory structure per Project_Brief.md
- [ ] `aura skill create {name}` — Creates skill directory with templates
- [ ] `aura skill list` — Lists available skills with "use when" triggers
- [ ] Skill routing: Match user intent to skill via "use when" patterns
- [ ] At least 3 bootstrap skills:
  - `memory` — Memory operations
  - `dev` — Development operations
  - `research` — Research operations

**Skill Structure:**
```
skills/{skill_name}/
├── skill.md          # "use when" triggers in front matter
├── workflows/
│   └── default.md    # Default workflow
└── tools/
    └── .gitkeep      # Tools added later
```

**Success Criteria:**
```bash
$ aura skill list
# Returns:
# memory - "use when: user asks about memory, context, learnings, history"
# dev - "use when: user asks to build, code, implement, fix"
# research - "use when: user asks to research, find, look up, investigate"

$ aura skill create art
# Creates: skills/art/ with skill.md, workflows/, tools/
```

---

## PHASE 8: Validation & Guardrails
**Depends on:** Phase 7 complete
**Principles:** #5 (Spec/Test/Evals), #7 (ENG/SRE)

**Deliverables:**
- [ ] Schema validation on all writes (reject malformed content)
- [ ] Constraint checker: Rejects operations violating Project_Brief.md
- [ ] Index rebuild command: `aura memory rebuild-index`
- [ ] Health check: `aura memory health`
- [ ] Context compliance test: Verify 4-layer enforcement works

**Success Criteria:**
```bash
$ aura memory health
# Returns: "Memory system healthy. 47 files, 12 directories, 0 validation errors"

$ aura memory write user_context "invalid yaml:::"
# Returns: "ERROR: Schema validation failed. See meta/templates/user_context.template.md"

$ aura test context-compliance
# Returns: "4-layer enforcement: PASS (97% compliance over 100 test prompts)"
```

---

## PHASE 9: Documentation Lock
**Depends on:** Phase 8 complete
**Principles:** #1 (Clear Thinking), #5 (Spec First)

**Deliverables:**
- [ ] `README.md` — System overview, quick start
- [ ] `ARCHITECTURE.md` — Full technical spec
- [ ] All three guardrail docs moved to `meta/guardrails/`
- [ ] Agent onboarding doc: How new agents load context
- [ ] CLI reference: All commands documented
- [ ] Skill authoring guide: How to create new skills

**Success Criteria:**
- New agent can read `meta/guardrails/` and understand system without questions
- All constraint docs version-controlled and immutable after Phase 9
- Human can understand system from README alone

---

## EXECUTION RULES

1. Phases execute in order. No skipping.
2. If Phase N is incomplete, Phase N+1 cannot start.
3. Each phase ends with all success criteria passing.
4. Agent must reference `Decisions_Log.md` if proposing any deviation.
5. Git commit after each phase completion.
