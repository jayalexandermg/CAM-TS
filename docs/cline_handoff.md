# Cline Handoff — Infinite Aura TypeScript

## Project

**Infinite Aura TS** — Filesystem-based memory system for AI agents (TypeScript port of Python reference).

## Operating Rules

1. **DeepAgent is architect** — await instructions, execute exactly
2. **No extra changes** without explaining why and getting approval
3. **Phase-ordered** — complete Phase N before starting N+1
4. **Document deviations** in `Decisions_Log.md` per Operating Contract

## Hard Constraints (C1-C9)

| C1 | Text-only (MD/YAML/JSON) — no databases |
| C2 | No embeddings/vectors — deterministic retrieval only |
| C3 | Append-only history — never delete |
| C4 | Unified memory — all agents share one store |
| C5 | CLI-first — `aura memory {command}` |
| C6 | 4-layer context — User→Project→Session→Agent |
| C7 | Max 3 levels nesting |
| C8 | Code before prompts |
| C9 | Solve once, reuse forever |

## Architecture (Current)

```
src/
├── exceptions/    # 40+ error codes, SecurityPatterns
├── guardrails/    # 7 policies: boundaries, append-only, text-only, rate-limit
└── memory/        # MemoryScaffold, PathValidator, FileOps, DirOps, SecurityAudit
```

## Phase Status

| Phase | Status |
|-------|--------|
| 1 | ✅ Complete — Directory scaffold, 16 dirs |
| 2 | ⏳ Next — Schema definition (8 templates) |
| 3-9 | 🔲 Pending |

## Key Patterns

- **KAI/PAI memory-first philosophy** — context is everything
- **Guardrails enforce Operating Contract** — no bypass
- **Security-first** — all paths validated, symlinks blocked
- **Append-only history/** — writes only, no modification

## Reference Docs

- `.claude/skills/memory-builder-skill/references/operating_contract.md`
- `.claude/skills/memory-builder-skill/references/phase_reference.md`
- `.claude/skills/memory-builder-skill/references/context_docs.md`
