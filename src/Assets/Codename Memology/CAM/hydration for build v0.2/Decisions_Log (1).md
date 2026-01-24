# Decisions_Log.md
## Infinite Aura Memory System — Decision Audit Trail

---

## HOW TO USE THIS DOC

When an agent questions a constraint or proposes an alternative:
1. Search this log for the relevant decision
2. Read the reasoning
3. If proposing override: Document new reasoning in session decisions.md
4. If decision marked "LOCKED": No override without human approval

---

## DECISION 001: Filesystem-Based Storage (UFC)

**Context:** Choosing between database (Postgres, SQLite), vector store (Pinecone, Weaviate), or filesystem for memory persistence.

**Decision:** Use filesystem-based storage following Kai's Unified Filesystem Context (UFC) pattern.

**Reasoning:**
- Principle #2 (Scaffolding > Model): System design matters more than model intelligence
- Principle #3 (Deterministic): Filesystem is deterministic. Same path = same file. Always.
- Principle #6 (UNIX): Files are the universal interface. Every tool can read/write files.
- Principle #8 (CLI): grep, find, cat work on files. No special tooling needed.
- Text is "one hop from thought" — clarity of articulation matters more than syntax
- Zero dependencies. No database to manage, no connection strings, no migrations.
- Git-trackable. Full version history out of the box.

**Expected Outcome:** All memory operations reduce to file read/write. Agents can inspect memory directly. Human can browse with file explorer.

**Reversible:** NO (LOCKED). This is foundational architecture. Changing later requires full rewrite.

---

## DECISION 002: Unified Context Across All Agents

**Context:** Should each agent have its own memory, or share one unified store?

**Decision:** One unified memory store at `~/.infinite-aura/memory/`. All agents read/write to same location.

**Reasoning:**
- Principle #2 (Scaffolding): Unified context is the substrate for the entire system
- UFC model: Unified means no context loss. Agent A's learnings are visible to Agent B.
- Eliminates duplication. One source of truth per entity.
- Orchestrator can see everything. No hidden state.
- Agents coordinate through memory, not message passing (simpler, more reliable).
- Avoids the problem of "all that intelligence is in the other repo"

**Expected Outcome:** When Engineer learns something, Architect can reference it. No "I didn't know that" failures.

**Reversible:** NO (LOCKED). Agent isolation would require different file structure.

---

## DECISION 003: Text-Only, No Embeddings

**Context:** Should we use vector embeddings for semantic search?

**Decision:** No embeddings. Text-only (Markdown, YAML, JSON).

**Reasoning:**
- Principle #3 (Deterministic): Embeddings are probabilistic. Same query can return different results.
- Principle #7 (ENG/SRE): Embeddings add external dependencies (OpenAI API, vector DB).
- Vendor lock-in: Embedding models change. Pinecone could deprecate. Text is forever.
- Debuggability: Can't inspect an embedding. Can inspect text with `cat`.
- Haystack problem: Even with better models, more context = more garbage. Clean context beats large context.
- grep-based search is sufficient for structured, nested filesystem.

**Expected Outcome:** Memory is 100% human-readable. Search is deterministic. No API costs for search.

**Reversible:** YES (but not recommended). Could add embedding layer later without breaking text layer.

---

## DECISION 004: Append-Only History Pattern

**Context:** Should session records be editable or immutable?

**Decision:** Append-only. Sessions are never deleted or modified after close.

**Reasoning:**
- Principle #12 (Custom History): History is the learning substrate. Deleting history deletes learning.
- Audit trail: Can replay any decision. "Why did we do X?" → Check session from that date.
- Debugging: When something breaks, can trace back through session history.
- Git-native: Append-only maps to git commits. Each session = potential commit.
- Learning accumulation: Agents learn from ALL past work, not just recent.

**Expected Outcome:** Full audit trail. Can reconstruct any past state. Agents can learn from all history.

**Reversible:** NO (LOCKED). Allowing edits would break audit guarantees.

---

## DECISION 005: CLI-First Access Interface

**Context:** How do agents interact with memory? Direct file access, API, or CLI?

**Decision:** CLI-first. All memory ops via `aura memory {command}`.

**Reasoning:**
- Principle #8 (CLI as Interface): CLI is the universal agent interface.
- Principle #9 (Goal→Code→CLI→Prompts→Agents): CLI is step 3 in the execution flow.
- AI loves CLI: "Nothing more clear than how to use a command line tool, assuming it's well documented."
- Abstraction layer: CLI can add validation, logging, backups without agents knowing.
- Testability: Can test CLI commands in isolation.
- Composability: Can pipe CLI commands together (UNIX philosophy).
- Future-proof: Can swap implementation behind CLI without changing agent behavior.

**Expected Outcome:** Agents never touch files directly. All access through CLI. Consistent behavior.

**Reversible:** YES. Could add API layer alongside CLI later.

---

## DECISION 006: 4-Layer Agent Onboarding

**Context:** What context should an agent have when it starts?

**Decision:** Every agent loads 4 layers on spawn: User → Project → Session → Agent State.

**Reasoning:**
- Principle #2 (Scaffolding): Context loading is system-level, not agent-level responsibility.
- Kai's 4-Layer Agent Context model: This is the proven pattern.
- No blank slates: Agent enters with full context. No "who am I?" or "what's the project?"
- Reduces token waste: Agent doesn't ask questions it could answer from context.
- Consistency: Every agent follows same initialization pattern.
- Orchestrator control: Orchestrator assembles context, not agent.

**Expected Outcome:** Agent is productive immediately. No warm-up. No context-gathering phase.

**Reversible:** NO (LOCKED). This is core agent spawn protocol.

---

## DECISION 007: 4-Layer Context Enforcement

**Context:** AI says it read context but didn't, or gets overwhelmed by haystack problem.

**Decision:** 4-layer enforcement system: (1) UFC description file loaded first, (2) prompt submit hook re-reads context, (3) aggressive instructions in config, (4) symlinks in every project.

**Reasoning:**
- Principle #2 (Scaffolding): Don't rely on model to remember — force the issue with structure.
- Problem is real: "Even with instructions in the claude.md it could say it read it and it didn't read it"
- Haystack problem: Even if it reads, too much content = lost in the middle
- System-level enforcement: Repeat and structure to ensure compliance
- 95%+ compliance achieved with this approach

**Expected Outcome:** Agent actually loads correct context. Stays on task. Doesn't forget tools.

**Reversible:** YES. Could simplify if models improve. Not recommended for now.

---

## DECISION 008: Max 3 Levels of Nesting

**Context:** How deep should the UFC directory structure go?

**Decision:** Maximum 3 levels of nesting in context directories.

**Reasoning:**
- Principle #1 (Clear Thinking): Deeper nesting = harder to reason about
- "I haven't tried four or five, but I have a feeling things might get wonky"
- Context loading complexity increases with depth
- 3 levels sufficient for: category → entity → detail
- Keeps grep/find operations fast and predictable

**Expected Outcome:** Context structure remains navigable. No "lost in the tree" problems.

**Reversible:** YES. Could experiment with 4 levels if needed.

---

## DECISION 009: Session-Based Work Partitioning

**Context:** How do we segment work for tracking and learning?

**Decision:** Each work session creates a timestamped directory in `sessions/`.

**Reasoning:**
- Principle #12 (Custom History): Sessions are the unit of work history
- Clear boundaries: Session start = new directory. Session end = archive.
- Learnings extraction: At session end, learnings are extracted and appended to agent memory.
- Debugging: Issues can be isolated to specific sessions.
- Git alignment: Each session maps to a logical commit point.

**Expected Outcome:** Clean separation between work sessions. Easy to review what happened when.

**Reversible:** YES. Could change session granularity later.

---

## DECISION 010: Schema-Enforced Content

**Context:** Should memory files follow strict schemas or be freeform?

**Decision:** All memory files must conform to defined schemas in `meta/templates/`.

**Reasoning:**
- Principle #5 (Spec/Test/Evals First): Schema is the spec. Validates before write.
- Principle #1 (Clear Thinking): Schemas force clear articulation
- Agent reliability: Agents can depend on fields existing. No "field might be there" uncertainty.
- Generation accuracy: When agent creates content, schema guides structure.
- Parsing simplicity: Consistent format = consistent parsing.

**Expected Outcome:** Every memory file is valid according to its schema. Malformed writes rejected.

**Reversible:** YES. Could relax schemas later (not recommended).

---

## DECISION 011: Git as Version Control

**Context:** How do we version memory state?

**Decision:** Memory directory is a git repository. Session close triggers commit.

**Reasoning:**
- Principle #7 (ENG/SRE): Git is production standard for version control.
- Built-in backup: Git history is automatic backup.
- Branching possible: Could branch for experimental work (future).
- Diff visibility: Can see exactly what changed between states.
- No additional tooling: Git is universally available.

**Expected Outcome:** Full version history. Can revert to any state. Changes are traceable.

**Reversible:** YES. Could swap to different VCS (not recommended).

---

## DECISION 012: Orchestrator as Single Entry Point

**Context:** Can agents spawn other agents, or only orchestrator?

**Decision:** Only orchestrator spawns agents. Agents cannot spawn agents directly.

**Reasoning:**
- Principle #2 (Scaffolding): Single point of control prevents chaos
- Simplicity: No recursive spawn chaos.
- Resource management: Orchestrator tracks all active agents.
- Context consistency: Orchestrator ensures 4-layer context is loaded correctly.
- Debugging: Clear chain of command. Always know who spawned whom.

**Expected Outcome:** Orchestrator is the only entity that calls `aura agent spawn`. Agents request, orchestrator approves.

**Reversible:** YES. Could add agent-to-agent spawning in v2 with safeguards.

---

## DECISION 013: Backup Before Write

**Context:** How do we protect against bad writes?

**Decision:** Every write operation creates a backup first in `backups/`.

**Reasoning:**
- Principle #7 (ENG/SRE): Never overwrite without backup.
- Recovery: Bad write? Restore from backup.
- Low cost: Files are small. Backup is cheap.
- Confidence: Agents can write without fear of data loss.

**Expected Outcome:** `backups/` contains timestamped copies. Any write is recoverable.

**Reversible:** YES. Could disable for performance (not recommended).

---

## DECISION 014: Learnings as First-Class Entity

**Context:** How do we capture what agents learn?

**Decision:** Every agent has a `learnings.md` file. Learnings are explicitly extracted and appended. Consolidated copy goes to `history/learnings/`.

**Reasoning:**
- Principle #12 (Custom History): Learning accumulation is the point of memory.
- Explicit over implicit: Agent must state what it learned. Not inferred.
- Searchable: Learnings can be searched across agents via `history/learnings/`.
- Compounding: Over time, learnings become institutional knowledge.
- Upgrade path: Learnings feed into system self-improvement (Principle #10, Phase 2)

**Expected Outcome:** After each session, agent appends learnings. Knowledge compounds across all agents.

**Reversible:** NO (LOCKED). Learnings are core to memory value.

---

## DECISION 015: No External Dependencies in Core

**Context:** Can memory system depend on external services (APIs, databases)?

**Decision:** Core memory system has zero external dependencies.

**Reasoning:**
- Principle #3 (Deterministic): External services introduce non-determinism.
- Principle #7 (ENG/SRE): External deps = failure points.
- Offline capability: Memory works without internet.
- Vendor independence: No lock-in to any service.

**Expected Outcome:** Memory system runs on any machine with filesystem. No API keys needed.

**Reversible:** NO (LOCKED). Adding external deps would violate core architecture.

---

## DECISION 016: Skill 3-Layer Architecture

**Context:** How should skills be structured?

**Decision:** Each skill has 3 layers: Routing (skill.md with "use when"), Workflows (procedures), Tools (deterministic code).

**Reasoning:**
- Principle #11 (Custom Skill Management): This is the proven pattern from Kai
- Principle #4 (Code Before Prompts): Tools layer is CODE, not prompts
- Principle #3 (Deterministic): Tools execute deterministically
- Decoupling: Intent recognition separate from execution
- "use when" front matter: Anthropic-recommended pattern for skill routing
- Composability: Workflows can call multiple tools, skills can call other skills

**Expected Outcome:** Skills route correctly based on intent. Execution is deterministic where possible.

**Reversible:** NO (LOCKED). This is core skill architecture.

---

## DECISION 017: Goal → Code → CLI → Prompts → Agents Flow

**Context:** What is the execution model for the system?

**Decision:** Follow the 5-step flow: Goal → Code → CLI → Prompts → Agents.

**Reasoning:**
- Principle #9: This IS Principle #9. It's the execution model.
- Principle #4 (Code Before Prompts): Code comes before prompts in the flow
- Principle #8 (CLI as Interface): CLI is the interface between code and prompts
- "Figure out what you want to do. Figure out if you can do it in code. Build a CLI tool around it. Use prompting to run the CLI tool. Use skills or agents to call it or run in parallel."

**Expected Outcome:** Every capability follows this flow. Deterministic foundation, AI orchestration on top.

**Reversible:** NO (LOCKED). This is the core execution philosophy.

---

## DECISION 018: Solve Once, Reuse Forever

**Context:** How do we handle repeated problems?

**Decision:** Solve a problem once, turn it into a command/tool/module, integrate into system.

**Reasoning:**
- Principle #6 (UNIX Philosophy): Small tools that do one thing well, composable
- "I only want to make things once. I'm a Unix nerd all the way back."
- Chaining is where the power is: Commands stack like shell pipes
- Products emerge from components: Threshold (content filtering) built from Kai's components
- System grows more capable over time without rebuilding

**Expected Outcome:** Problems solved once become permanent capabilities. System accumulates power.

**Reversible:** YES (but why would you?).

---

## DECISION 019: Agents Hydrated via System Prompt

**Context:** How do agents receive their 4-layer context?

**Decision:** Context blob is injected into agent's system prompt before any user interaction.

**Reasoning:**
- Principle #6: Agent onboarding is same as tool configuration
- "I've actually taken that same context that I put at the top of CloudMD files and put it in the system prompt for the agents. So they actually get hydrated immediately with the right context before they even start."
- Ensures context is loaded BEFORE agent starts thinking
- No reliance on agent to "remember" to read context

**Expected Outcome:** Agent starts with full context in system prompt. No cold start.

**Reversible:** YES. Could use other injection methods.

---

## DECISION 020: Natural Language as Primary Interface

**Context:** How does user interact with the system?

**Decision:** Primary interface is natural language (voice/text). No slash commands required for DA functionality.

**Reasoning:**
- Building for Digital Assistant (DA) future, not chatbot present
- "I don't want to go to the command line and forward slash type get lifelog... voice, throw it over the wall."
- Slash commands exist but are secondary to natural language
- System should understand intent and route to correct skill/tool
- "use when" triggers enable natural language routing

**Expected Outcome:** User can speak naturally. System routes to correct capability.

**Reversible:** YES. Could add more explicit command modes.

---

## TEMPLATE FOR NEW DECISIONS

```markdown
## DECISION XXX: [Title]

**Context:** [What situation required a decision?]

**Decision:** [What was decided?]

**Reasoning:**
- Principle #N: [How this connects to the 13 principles]
- [Other reasoning points]

**Expected Outcome:** [What should happen as a result?]

**Reversible:** [YES/NO (LOCKED)] [Explanation]
```

---

*Agents: Add new decisions to this log during implementation. Use sequential numbering. Reference this log when questioning constraints.*
