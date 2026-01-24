# Memory System Builder - Context Documents

## Required Reading Before Each Build Task

### 1. System Architecture
**File:** `/workspaces/infinite-aura/docs/infinite_aura_analysis.md`

**What it contains:**
- Existing Infinite Aura architecture
- Hard constraints (C1-C9)
- 13 KAI Principles
- Target UFC memory structure
- Python module structure
- Integration points

**Read this for:** Understanding what we're building and why

### 2. PAI/KAI Memory System Deep Dive
**File:** `/workspaces/infinite-aura/docs/pai_kai_memory_system_analysis.md`

**What it contains:**
- 80-page comprehensive analysis
- Memory-first philosophy
- Kai History System architecture
- Hook patterns and implementation
- Best practices from Daniel Miessler

**Read this for:** Understanding memory system patterns and principles

### 3. Agent Architecture Guide
**File:** `/workspaces/infinite-aura/docs/agent_architecture_analysis.md`

**What it contains:**
- 62-page agent architecture analysis
- Orchestrator patterns
- Sub-agent coordination
- Meta-agent patterns
- Tool calling and routing

**Read this for:** Understanding how agents will use the memory system

---

## Quick Reference: Hard Constraints (C1-C9)

**C1:** Text-only storage (MD/YAML/JSON) - NO databases, NO binary
**C2:** No embeddings/vectors - Deterministic retrieval only
**C3:** Append-only history - Never delete, only add
**C4:** Unified memory - All agents share ONE memory store
**C5:** CLI-first access - `aura memory {command}`
**C6:** 4-layer context load - User → Project → Session → Agent
**C7:** Max 3 levels of nesting - Keep structure flat
**C8:** Code before prompts - Write code, not just prompts
**C9:** Solve once, reuse forever - Build reusable components

---

## Quick Reference: 13 KAI Principles

1. **Clear Thinking** - Understand before building
2. **Scaffolding > Model** - Context is everything
3. **Determinism** - Predictable, reproducible results
4. **Code Before Prompts** - Write code, not essays
5. **UNIX Philosophy** - Small, composable tools
6. **CLI-First** - Command-line interface primary
7. **Text as Format** - Human-readable, version-controllable
8. **Filesystem as Database** - Simple, transparent storage
9. **Append-Only** - Never delete, only add
10. **Unified Memory** - One source of truth
11. **4-Layer Context** - User → Project → Session → Agent
12. **Max 3 Levels** - Flat structure
13. **Solve Once** - Build reusable components

---

## Before Starting Any Build Task

1. ✅ Read the relevant section of `infinite_aura_analysis.md`
2. ✅ Review constraints (C1-C9) above
3. ✅ Check KAI Principles above
4. ✅ Verify max 3 levels nesting (C7)
5. ✅ Confirm text-only storage (C1)
6. ✅ Ensure CLI-first approach (C5)

---

## During Build

- Follow constraints strictly
- Use text-only storage (MD/YAML/JSON)
- Maintain append-only history
- Keep max 3 levels of nesting
- Build for CLI-first access

---

## After Build

- Verify against constraints (C1-C9)
- Check nesting levels (max 3)
- Confirm text-only storage
- Test CLI access
- Validate against analysis docs
