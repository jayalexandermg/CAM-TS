# Phase Quick Reference

Condensed view of all phases for fast lookup. Full details in `Memory_Checklist.md`.

---

## Phase 1: Directory Scaffold - COMPLETE (2025-12-30)

**Depends on:** Nothing
**Status:** COMPLETE
**Key deliverables:**

- [x] Create `~/.infinite-aura/memory/` with full structure (17 directories)
- [x] `context/system.md` describing UFC
- [x] Init git repository
- [x] Python module (infinite_aura.memory.scaffold)
- [x] Unit tests (7 tests, 100% passing)
- [x] Quality checks (Black, Flake8, MyPy)
      **Success:** All criteria passed, validation script confirms

## Phase 2: Schema Definition

**Depends on:** Phase 1
**Key deliverables:** 8 templates in `meta/templates/` (user_context, project_context, agent_personality, session_record, skill, workflow, decision, learning)
**Success:** Agent can copy+populate without asking questions

## Phase 3: Core CLI Commands

**Depends on:** Phase 2
**Key deliverables:** `aura memory` commands — read, write, append, search, list, init-session, close-session
**Success:** All commands work per documented examples

## Phase 4: 4-Layer Context Enforcement

**Depends on:** Phase 3
**Key deliverables:** `context/system.md` describes UFC, prompt submit hook re-reads context, aggressive config instructions, symlinks utility
**Success:** 95%+ context compliance, boot shows loaded files

## Phase 5: 4-Layer Agent Onboarding

**Depends on:** Phase 4
**Key deliverables:** `aura agent spawn` command, context loader assembles User→Project→Session→Agent layers, <100ms assembly
**Success:** Agent spawns with full context blob in system prompt

## Phase 6: Agent Write-Back

**Depends on:** Phase 5
**Key deliverables:** On task complete, agent writes to session, learnings, project status, decisions; auto-backup; git commit; learning extraction
**Success:** All write locations updated after task, recoverable from backups

## Phase 7: Skill Scaffold

**Depends on:** Phase 6
**Key deliverables:** `skills/` structure, `aura skill create/list`, 3 bootstrap skills (memory, dev, research), "use when" routing
**Success:** `aura skill list` shows skills with triggers

## Phase 8: Validation & Guardrails

**Depends on:** Phase 7
**Key deliverables:** Schema validation on writes, constraint checker, `aura memory rebuild-index`, `aura memory health`, context compliance test
**Success:** Health check passes, invalid writes rejected, 97%+ compliance

## Phase 9: Documentation Lock

**Depends on:** Phase 8
**Key deliverables:** README.md, ARCHITECTURE.md, guardrail docs in `meta/guardrails/`, agent onboarding doc, CLI reference, skill authoring guide
**Success:** New agent can understand system from docs alone

---

## Execution Rules (Always)

1. Phases execute in order. No skipping.
2. If Phase N incomplete, Phase N+1 cannot start.
3. Each phase ends with all success criteria passing.
4. Reference `Decisions_Log.md` for any deviation.
5. Git commit after each phase completion.
