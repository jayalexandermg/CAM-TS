# Infinite Aura Memory System - Comprehensive Analysis
**Generated:** 2025-12-29  
**Purpose:** Technical analysis for Phase 1 implementation prompts (Python-based)

---

## Executive Summary

**Project:** Infinite Aura - A Python-based PAI/KAI memory system  
**Location:** `/workspaces/infinite-aura`  
**Language:** Python 3.11 (NOT TypeScript/Node.js)  
**OS:** Linux (WSL2)  
**Current Status:** Phase 0 complete (scaffold, core Python structure, Redis caching, memory event bus foundation)  
**Next Phase:** Phase 1 - Directory Scaffold & Foundation

**Core Architecture:** UFC (Unified Filesystem Context) - The filesystem IS the context system. No databases, no embeddings, no vector stores. Text-only storage (Markdown/YAML/JSON).

---

## 1. EXISTING ARCHITECTURE (Phase 0 Complete)

### 1.1 Project Structure
Based on user statement, the following exists at `/workspaces/infinite-aura`:
- ✅ Repository scaffold (git initialized)
- ✅ Core Python 3.11 structure
- ✅ Redis caching layer
- ✅ Memory event bus foundation (likely pub/sub pattern)

### 1.2 UFC Memory Architecture (To Be Built)

The target UFC structure is filesystem-based at `~/.infinite-aura/memory/`:

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
│           └── {tool}.py     # NOTE: Python, not TypeScript
│
├── index/                    # Search indexes (generated)
├── backups/                  # Automated backups
└── meta/                     # System metadata
    ├── version.md
    ├── templates/            # Schema templates
    └── guardrails/           # Constraint docs
```

**CRITICAL CONSTRAINT:** Maximum 3 levels of nesting. Deeper nesting causes context loading issues.

### 1.3 Memory Event Bus (Exists in Phase 0)
The project has a "memory event bus foundation" - likely a pub/sub pattern for:
- Broadcasting memory writes to interested components
- Triggering cache invalidation in Redis
- Logging memory operations
- Enabling async processing of memory events

**Integration Point:** The CLI layer should emit events to this bus for all memory operations.

### 1.4 Redis Caching Layer (Exists in Phase 0)
Redis is being used for:
- Fast lookups of frequently accessed memory files
- Caching agent context blobs (4-layer contexts)
- Potentially session state management

**Integration Point:** CLI read operations should check Redis first, fall back to filesystem.

---

## 2. THE 13 KAI PRINCIPLES (Governing All Decisions)

Every implementation decision must trace back to these:

| # | Principle | Implementation Impact |
|---|-----------|----------------------|
| 1 | Clear Thinking + Prompting is King | All prompts and docs must be precise |
| 2 | Scaffolding > Model | System design over AI intelligence |
| 3 | As Deterministic as Possible | Prefer code over prompts |
| 4 | Code Before Prompts | If it can be code, make it code |
| 5 | Spec / Test / Evals First | Define success before building |
| 6 | UNIX Philosophy | Small tools, one job, composable |
| 7 | ENG / SRE Principles | Production practices, reliability |
| 8 | CLI as Interface | All operations via CLI commands |
| 9 | Goal → Code → CLI → Prompts → Agents | Execution flow hierarchy |
| 10 | Meta / Self Update System | System upgrades itself (Phase 2) |
| 11 | Custom Skill Management | Routing → Workflows → Tools (Phase 2) |
| 12 | Custom History System | Sessions, learnings, decisions (THIS BUILD) |
| 13 | Custom Agent Personalities | Agent identity and voice (Phase 2) |

**Principle #9 Execution Flow:**
```
GOAL (what you want) 
  → CODE (deterministic implementation in Python)
    → CLI (command-line interface: `aura memory {command}`)
      → PROMPTS (natural language to invoke CLI)
        → AGENTS (orchestrate multiple CLI calls)
```

---

## 3. TECHNICAL DECISIONS (From Decisions_Log.md)

### 3.1 Core Architectural Decisions (LOCKED - Cannot Change)

| Decision | Rationale | Status |
|----------|-----------|--------|
| **D001: Filesystem-Based Storage (UFC)** | Text is "one hop from thought", zero dependencies, git-trackable, grep-searchable | LOCKED |
| **D002: Unified Context** | All agents share ONE memory store - no duplication, no context loss | LOCKED |
| **D003: No Embeddings** | Deterministic > probabilistic, no vendor lock-in, debuggable | LOCKED |
| **D004: Append-Only History** | Full audit trail, learning accumulation, replay capability | LOCKED |
| **D005: CLI-First Access** | All memory ops via `aura memory {command}` - never direct file access | LOCKED |
| **D006: 4-Layer Agent Onboarding** | User → Project → Session → Agent state (loaded on spawn) | LOCKED |
| **D007: 4-Layer Context Enforcement** | System-level enforcement to ensure AI actually reads context (95%+ compliance) | LOCKED |
| **D015: Zero External Dependencies** | Core system has no external service dependencies | LOCKED |
| **D017: Goal→Code→CLI→Prompts→Agents** | This is the execution model | LOCKED |

### 3.2 Implementation Decisions (Flexible)

| Decision | Rationale | Status |
|----------|-----------|--------|
| **D008: Max 3 Levels Nesting** | Prevents "lost in the tree" problems | Reversible |
| **D009: Session-Based Work** | Each session = timestamped directory | Reversible |
| **D010: Schema-Enforced Content** | All files follow schemas in `meta/templates/` | Reversible |
| **D011: Git as Version Control** | Memory dir is a git repo, session close triggers commit | Reversible |
| **D012: Orchestrator as Single Entry Point** | Only orchestrator spawns agents | Reversible (v2) |
| **D013: Backup Before Write** | Every write creates backup in `backups/` | Reversible |
| **D014: Learnings as First-Class** | Explicit extraction and consolidation | LOCKED |

### 3.3 Design Patterns

1. **UFC Pattern**: Filesystem as context system, nested structure, max 3 levels
2. **4-Layer Context Loading**: User → Project → Session → Agent
3. **Append-Only Pattern**: History never modified, only appended
4. **CLI Abstraction**: All access through commands, never direct file I/O
5. **Event Bus Pattern**: Memory operations emit events (already in Phase 0)
6. **Redis Cache Pattern**: Fast lookups with filesystem fallback (already in Phase 0)
7. **Schema Validation**: Templates define structure, writes validated before commit

---

## 4. HARD CONSTRAINTS (C1-C9 - NON-NEGOTIABLE)

| ID | Constraint | Rationale | Validation |
|----|-----------|-----------|------------|
| **C1** | Text-only storage (MD/YAML/JSON) | Searchable, no vendor lock-in, git-trackable | Reject binary files |
| **C2** | No embeddings/vectors | Deterministic search, no API costs | No vector libraries |
| **C3** | Append-only history | Full audit trail | Sessions never deleted/modified |
| **C4** | Unified memory (all agents share) | No knowledge duplication | Single `~/.infinite-aura/memory/` |
| **C5** | CLI-first access | Abstraction, validation, consistency | All ops via `aura memory {cmd}` |
| **C6** | 4-layer context on spawn | Full context always | Orchestrator loads all 4 layers |
| **C7** | Max 3 levels nesting | Prevents context loading issues | Validation rejects deeper |
| **C8** | Code before prompts | Deterministic execution | Tools are code, not prompts |
| **C9** | Solve once, reuse forever | UNIX philosophy, accumulate power | Build reusable modules |

---

## 5. WHAT'S ALREADY DONE (Phase 0)

Based on user statement, the following is complete:

### ✅ Repository Scaffold
- Git repository initialized at `/workspaces/infinite-aura`
- Basic project structure (Python)
- Development environment configured (Python 3.11, WSL2)

### ✅ Core Python Structure
Likely includes:
- Package structure (e.g., `infinite_aura/` or `src/infinite_aura/`)
- Python modules for core functionality
- Setup files (`setup.py`, `pyproject.toml`, or similar)
- Dependencies management (`requirements.txt` or `pyproject.toml`)

### ✅ Redis Caching
- Redis integration established
- Cache layer for memory operations
- Likely using `redis-py` or similar Python library
- Cache invalidation strategy implemented

### ✅ Memory Event Bus Foundation
- Pub/sub pattern implemented (possibly using Redis pub/sub)
- Event types defined for memory operations
- Event emission infrastructure in place
- Event handlers/subscribers architecture

**Note:** The actual file structure at `/workspaces/infinite-aura` needs to be examined to see exact implementation.

---

## 6. WHAT NEEDS TO BE BUILT (Phase 1 - Immediate Next Steps)

### Phase 1: Directory Scaffold

**Dependencies:** None (start here)  
**Principles:** #6 (UNIX), #2 (Scaffolding)

#### Deliverables:

1. **Create Memory Root**
   - [ ] Create `~/.infinite-aura/memory/` directory
   - [ ] Set proper permissions (user read/write only)

2. **Create Full Directory Structure**
   - [ ] All directories per UFC architecture (see section 1.2)
   - [ ] Use `.gitkeep` files in empty directories
   - [ ] Max 3 levels nesting enforced

3. **Create Core Files**
   - [ ] `user_context.md` (empty, will be populated later)
   - [ ] `current_projects.md` (empty)
   - [ ] `orchestrator_state.md` (empty)
   - [ ] `context/system.md` - **CRITICAL**: Describes UFC structure itself (loaded first)
   - [ ] `meta/version.md` - System version info

4. **Initialize Git**
   - [ ] `git init` in `~/.infinite-aura/memory/`
   - [ ] Create `.gitignore` (exclude `index/`, `backups/` from tracking)
   - [ ] Initial commit: "Phase 1: Initialize UFC memory structure"

#### Success Criteria:

```bash
# Test 1: Directory structure exists
$ ls ~/.infinite-aura/memory/
# Returns: user_context.md current_projects.md orchestrator_state.md context/ projects/ agents/ sessions/ history/ skills/ index/ backups/ meta/

# Test 2: Context subdirectories exist
$ ls ~/.infinite-aura/memory/context/
# Returns: system.md tools/ projects/ agents/

# Test 3: Git initialized
$ git -C ~/.infinite-aura/memory/ status
# Returns: clean working tree

# Test 4: context/system.md exists and describes UFC
$ cat ~/.infinite-aura/memory/context/system.md | head -n 5
# Returns: UFC description header
```

#### Python Implementation Considerations:

1. **Module Structure**
   - Create `infinite_aura.memory.scaffold` module
   - Function: `initialize_memory_structure(memory_root: Path) -> bool`
   - Should be idempotent (safe to run multiple times)

2. **Integration with Event Bus**
   - Emit `memory.structure.initialized` event when complete
   - Include directory count and file count in event payload

3. **Integration with Redis Cache**
   - No caching needed for scaffold creation
   - Cache `context/system.md` after creation (frequently accessed)

4. **Error Handling**
   - Check for existing structure (don't overwrite)
   - Handle permission errors gracefully
   - Validate max 3-level nesting during creation

---

## 7. PHASE 2-9 OVERVIEW (Future Work)

### Phase 2: Schema Definition
- Create templates in `meta/templates/` for all memory file types
- Define required/optional fields, data types, examples
- **Focus:** Clear specifications so agents can generate valid content

### Phase 3: Core CLI Commands
- Implement `aura memory` CLI with subcommands:
  - `read`, `write`, `append`, `search`, `list`
  - `init-session`, `close-session`
- **Language:** Python (NOT TypeScript as shown in docs)
- **Architecture:** CLI wrapper calls Python modules

### Phase 4: 4-Layer Context Enforcement
- Implement system that ensures AI reads context
- Hook into prompt submission (if applicable)
- Force reload of `context/system.md` on every operation

### Phase 5: 4-Layer Agent Onboarding
- `aura agent spawn` command
- Context loader assembles: User → Project → Session → Agent
- Context blob < 100ms assembly time

### Phase 6: Agent Write-Back
- Agents write learnings, decisions, session records
- Automatic backups before writes
- Git commits after session close

### Phase 7: Skill Scaffold (Routing Only)
- Create skill structure: `skill.md` + `workflows/` + `tools/`
- "use when" trigger system
- Bootstrap skills: memory, dev, research

### Phase 8: Validation & Guardrails
- Schema validation on all writes
- Constraint checker (enforces C1-C9)
- Health check command

### Phase 9: Documentation Lock
- README, ARCHITECTURE.md
- Move constraint docs to `meta/guardrails/`
- CLI reference documentation

---

## 8. INTEGRATION POINTS

### 8.1 With Existing Python Code

The memory system should integrate with existing Python structure at `/workspaces/infinite-aura`:

```python
# Example integration structure
from infinite_aura.memory import Memory
from infinite_aura.cache import RedisCache
from infinite_aura.events import EventBus

# Initialize memory system
memory = Memory(
    root_path=Path.home() / ".infinite-aura" / "memory",
    cache=RedisCache(),
    event_bus=EventBus()
)

# Read operation (checks cache, emits event)
content = memory.read("user_context.md")

# Write operation (validates, backs up, caches, emits event)
memory.write("agents/engineer/learnings.md", content, append=True)

# Search operation (grep-based, deterministic)
results = memory.search("optimization", scope="history/learnings")
```

### 8.2 Event Bus Integration

Memory operations should emit events:

```python
# Event types to emit
EVENTS = [
    "memory.file.read",      # payload: {path, cached: bool}
    "memory.file.written",   # payload: {path, bytes, backup_path}
    "memory.file.appended",  # payload: {path, entry, timestamp}
    "memory.search.executed",# payload: {query, scope, result_count}
    "memory.session.started",# payload: {session_id, timestamp}
    "memory.session.closed", # payload: {session_id, learnings_count, commit_hash}
]
```

### 8.3 Redis Cache Integration

```python
# Cache strategy
CACHE_RULES = {
    "context/system.md": "always",           # Loaded on every operation
    "user_context.md": "always",             # Frequently accessed
    "context/tools/tools.md": "always",      # Frequently accessed
    "projects/*/context.md": "per_session",  # Cache during active session
    "agents/*/personality.md": "per_spawn",  # Cache when agent active
    "sessions/*": "never",                   # Append-only, no caching
    "history/*": "never",                    # Too large, search-only
}

# Cache invalidation
# - On write: invalidate specific file
# - On session close: clear session-scoped caches
# - On agent despawn: clear agent-scoped caches
```

### 8.4 CLI Entry Point

The `aura` CLI should be the only interface:

```python
# CLI structure (using Click or Typer)
# Command: aura memory <subcommand>

import typer
from pathlib import Path
from infinite_aura.memory import Memory

app = typer.Typer()
memory_app = typer.Typer()
app.add_typer(memory_app, name="memory")

@memory_app.command()
def read(path: str):
    """Read a memory file."""
    memory = Memory.from_default()
    content = memory.read(path)
    typer.echo(content)

@memory_app.command()
def append(path: str, content: str):
    """Append to a memory file with timestamp."""
    memory = Memory.from_default()
    memory.append(path, content)
    typer.echo(f"✓ Appended to {path}")

# ... more commands
```

### 8.5 Schema Validation Integration

```python
# Schema validation should happen at write time
from infinite_aura.memory.schemas import validate_schema

def write(self, path: str, content: str, validate: bool = True):
    """Write content to memory file."""
    if validate:
        schema_path = self._get_schema_for_path(path)
        if schema_path:
            is_valid, errors = validate_schema(content, schema_path)
            if not is_valid:
                raise ValidationError(f"Schema validation failed: {errors}")
    
    # Create backup
    self._create_backup(path)
    
    # Write file
    self._write_file(path, content)
    
    # Emit event
    self.event_bus.emit("memory.file.written", {
        "path": path,
        "bytes": len(content),
        "backup_path": self._last_backup_path
    })
    
    # Update cache
    self.cache.set(path, content)
```

### 8.6 Orchestrator Integration

The orchestrator should use the memory system for agent spawning:

```python
from infinite_aura.orchestrator import Orchestrator
from infinite_aura.memory import Memory

orchestrator = Orchestrator(memory=Memory.from_default())

# Spawn agent with 4-layer context
agent = orchestrator.spawn_agent(
    agent_name="engineer",
    project="infinite-aura-memory",
    task="implement search command"
)

# Orchestrator internally:
# 1. Loads 4 layers (User, Project, Session, Agent)
# 2. Assembles context blob
# 3. Injects into agent system prompt
# 4. Agent starts with full context (<100ms)
```

---

## 9. FILE PATHS & MODULE NAMES (Python-Based)

### 9.1 Expected Python Package Structure

```
/workspaces/infinite-aura/
├── infinite_aura/              # Main package
│   ├── __init__.py
│   ├── memory/                 # Memory system module
│   │   ├── __init__.py
│   │   ├── scaffold.py         # Phase 1: Directory creation
│   │   ├── schemas.py          # Phase 2: Schema validation
│   │   ├── cli.py              # Phase 3: CLI commands implementation
│   │   ├── context.py          # Phase 4-5: Context loading/enforcement
│   │   ├── writeback.py        # Phase 6: Agent write operations
│   │   ├── skills.py           # Phase 7: Skill management
│   │   └── validation.py       # Phase 8: Guardrails
│   ├── cache/                  # Redis caching (Phase 0 - exists)
│   │   ├── __init__.py
│   │   └── redis_cache.py
│   ├── events/                 # Event bus (Phase 0 - exists)
│   │   ├── __init__.py
│   │   └── bus.py
│   └── orchestrator/           # Agent orchestration (future)
│       ├── __init__.py
│       └── spawn.py
├── cli/                        # CLI entry points
│   └── aura.py                 # Main CLI: `aura memory ...`
├── tests/                      # Test suite
│   ├── test_memory_scaffold.py
│   ├── test_memory_cli.py
│   ├── test_context_loading.py
│   └── ...
├── pyproject.toml              # Dependencies and config
├── README.md
└── ARCHITECTURE.md
```

### 9.2 Memory Root Structure (To Be Created)

```
~/.infinite-aura/memory/
├── user_context.md           # infinite_aura.memory.read("user_context")
├── current_projects.md       # infinite_aura.memory.read("current_projects")
├── orchestrator_state.md     # infinite_aura.memory.read("orchestrator_state")
├── context/
│   ├── system.md             # ALWAYS loaded first
│   ├── tools/
│   │   └── tools.md
│   ├── projects/
│   │   └── {project}/context.md
│   └── agents/
│       └── {agent}/context.md
├── projects/{project}/
│   ├── context.md            # Project goal, status, constraints
│   ├── decisions.md          # Decision records
│   ├── learnings.md          # Project-specific learnings
│   ├── team.md               # Assigned agents
│   └── artifacts/            # Project outputs
├── agents/{agent}/
│   ├── personality.md        # Agent identity
│   ├── skills.md             # Agent capabilities
│   ├── learnings.md          # Agent learnings
│   ├── state.md              # Current assignments
│   └── history.md            # Past work
├── sessions/{timestamp}/
│   ├── context.md            # Session goal
│   ├── work_log.md           # What happened
│   ├── decisions.md          # Decisions made
│   ├── results.md            # Outputs
│   └── learnings.md          # Session learnings
├── history/
│   ├── sessions/             # Session summaries
│   ├── learnings/            # Consolidated learnings
│   ├── decisions/            # Decision records
│   └── research/             # Research notes
├── skills/{skill}/
│   ├── skill.md              # "use when" triggers
│   ├── workflows/
│   │   └── {workflow}.md
│   └── tools/
│       └── {tool}.py         # Python tools (NOT TypeScript)
├── index/                    # Generated search indexes
├── backups/                  # Timestamped backups
└── meta/
    ├── version.md
    ├── templates/            # Schema templates (Phase 2)
    │   ├── user_context.template.md
    │   ├── project_context.template.md
    │   ├── agent_personality.template.md
    │   ├── session_record.template.md
    │   ├── skill.template.md
    │   ├── workflow.template.md
    │   ├── decision.template.md
    │   └── learning.template.md
    └── guardrails/           # Phase 9: Move constraint docs here
        ├── Project_Brief.md
        ├── Memory_Checklist.md
        ├── Decisions_Log.md
        └── OPERATING_CONTRACT.md
```

### 9.3 Key Module Interfaces (Python)

```python
# infinite_aura/memory/__init__.py
from .scaffold import initialize_memory_structure
from .cli import MemoryCLI
from .context import ContextLoader, FourLayerContext
from .writeback import MemoryWriter

class Memory:
    """Main memory system interface."""
    
    def __init__(self, root_path: Path, cache, event_bus):
        self.root = root_path
        self.cache = cache
        self.events = event_bus
    
    @classmethod
    def from_default(cls):
        """Create Memory instance from default location."""
        return cls(
            root_path=Path.home() / ".infinite-aura" / "memory",
            cache=RedisCache.from_env(),
            event_bus=EventBus.from_env()
        )
    
    def read(self, path: str) -> str:
        """Read memory file (checks cache first)."""
        ...
    
    def write(self, path: str, content: str, validate: bool = True):
        """Write memory file (validates, backs up, caches)."""
        ...
    
    def append(self, path: str, content: str):
        """Append timestamped entry to memory file."""
        ...
    
    def search(self, query: str, scope: str = None) -> List[SearchResult]:
        """Search memory using grep (deterministic)."""
        ...
    
    def load_context(self, layers: List[str]) -> str:
        """Load and merge multiple context layers."""
        ...

# infinite_aura/memory/context.py
class FourLayerContext:
    """Implements 4-layer agent context loading."""
    
    def load_for_agent(
        self,
        agent_name: str,
        project_name: str,
        session_id: str
    ) -> str:
        """Load all 4 layers: User → Project → Session → Agent."""
        layers = [
            self.memory.read("user_context.md"),           # Layer 1
            self.memory.read(f"projects/{project_name}/context.md"),  # Layer 2
            self.memory.read(f"sessions/{session_id}/context.md"),    # Layer 3
            self._load_agent_state(agent_name),            # Layer 4
        ]
        return self._merge_layers(layers)
    
    def _load_agent_state(self, agent_name: str) -> str:
        """Load agent-specific files and merge."""
        files = [
            f"agents/{agent_name}/personality.md",
            f"agents/{agent_name}/skills.md",
            f"agents/{agent_name}/learnings.md",
        ]
        return "\n\n---\n\n".join(self.memory.read(f) for f in files)
```

---

## 10. CRITICAL SUCCESS CRITERIA (From Project_Brief)

Phase 1 must enable the following in future phases:

- [ ] **Performance**: Orchestrator spawns agent with full 4-layer context in <100ms
- [ ] **CLI Access**: Any agent can read context via `aura memory read {path}`
- [ ] **CLI Append**: Any agent can append learnings via `aura memory append {path} "{content}"`
- [ ] **Deterministic Search**: Search returns same results via `aura memory search "{query}"`
- [ ] **Auto Session Management**: Session records auto-created on start, auto-archived on end
- [ ] **Git Trackable**: All memory is version-controlled (no binary, no embeddings)
- [ ] **Zero Dependencies**: No databases, no vector stores (except Redis for caching)
- [ ] **Context Compliance**: 4-layer enforcement achieves 95%+ context compliance
- [ ] **Skill Routing**: Skills route correctly via "use when" triggers

---

## 11. EXPLICIT OUT OF SCOPE

These are NOT to be implemented in current build:

### ❌ Phase 2+ Features
- Voice pipeline integration
- Agent personality customization beyond base template
- Meta/self-update system
- Full skill builder
- Multi-user memory separation
- Cloud sync/backup

### ❌ Never (Violates Constraints)
- Semantic/vector search (violates C2)
- External database dependencies (violates C15)
- Direct file access by agents (violates C5)
- Modifiable session history (violates C3)
- Deeper than 3-level nesting (violates C7)

---

## 12. PYTHON-SPECIFIC IMPLEMENTATION NOTES

### 12.1 Why Python (Not TypeScript)

The original Kai documentation shows TypeScript/Node.js examples, but this project is Python-based:

- **Original Docs:** Show `.ts` files in `skills/*/tools/`
- **Infinite Aura:** Uses Python 3.11, so all tools should be `.py` files
- **CLI Implementation:** Should use Python frameworks (Click, Typer, argparse)
- **Integration:** Redis client is `redis-py`, not `ioredis`

### 12.2 Python Tooling Recommendations

```python
# Recommended libraries for implementation

# CLI framework
typer  # Modern, type-hinted CLI framework (recommended)
# OR
click  # More established, very flexible

# File operations
pathlib  # Standard library, better than os.path

# YAML/JSON parsing
pyyaml  # For YAML front matter
json    # Standard library for JSON

# Redis caching
redis-py  # Official Python Redis client

# Schema validation
pydantic  # Type validation for schemas
# OR
marshmallow  # Schema validation and serialization

# Git operations
gitpython  # Python git wrapper

# Search/grep
re  # Standard library regex
subprocess  # Call grep directly (more efficient for large searches)

# Testing
pytest  # Modern testing framework
pytest-cov  # Coverage reporting
```

### 12.3 Python CLI Example

```python
# cli/aura.py - Main CLI entry point
import typer
from pathlib import Path
from infinite_aura.memory import Memory

app = typer.Typer()
memory_app = typer.Typer()
app.add_typer(memory_app, name="memory")

@memory_app.command("read")
def memory_read(path: str):
    """Read a memory file.
    
    Example:
        aura memory read user_context
        aura memory read projects/infinite-aura/context.md
    """
    try:
        memory = Memory.from_default()
        content = memory.read(path)
        typer.echo(content)
    except FileNotFoundError:
        typer.echo(f"Error: Memory file not found: {path}", err=True)
        raise typer.Exit(1)

@memory_app.command("append")
def memory_append(
    path: str,
    content: str,
    timestamp: bool = typer.Option(True, help="Include timestamp")
):
    """Append content to a memory file.
    
    Example:
        aura memory append agents/engineer/learnings "Learned: Python async patterns"
    """
    try:
        memory = Memory.from_default()
        memory.append(path, content, timestamp=timestamp)
        typer.echo(f"✓ Appended to {path}")
    except Exception as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(1)

@memory_app.command("search")
def memory_search(
    query: str,
    path: str = typer.Option(None, help="Scope search to specific path")
):
    """Search memory using grep.
    
    Example:
        aura memory search "optimization"
        aura memory search "optimization" --path history/learnings
    """
    memory = Memory.from_default()
    results = memory.search(query, scope=path)
    
    if not results:
        typer.echo(f"No results found for: {query}")
        return
    
    for result in results:
        typer.echo(f"{result.file}:{result.line_number}: {result.line}")

if __name__ == "__main__":
    app()
```

### 12.4 Event Bus Integration (Python)

```python
# infinite_aura/events/bus.py
from typing import Dict, Any, Callable, List
import redis
import json

class EventBus:
    """Memory event bus using Redis pub/sub."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = redis_client.pubsub()
        self.handlers: Dict[str, List[Callable]] = {}
    
    @classmethod
    def from_env(cls):
        """Create EventBus from environment variables."""
        redis_client = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379")
        )
        return cls(redis_client)
    
    def emit(self, event_type: str, payload: Dict[str, Any]):
        """Emit an event to the bus."""
        message = json.dumps({
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat()
        })
        self.redis.publish(f"memory:{event_type}", message)
    
    def subscribe(self, event_type: str, handler: Callable):
        """Subscribe to an event type."""
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
        self.pubsub.subscribe(f"memory:{event_type}")
    
    def listen(self):
        """Start listening for events (blocking)."""
        for message in self.pubsub.listen():
            if message["type"] == "message":
                self._handle_message(message)
    
    def _handle_message(self, message):
        """Process incoming event message."""
        data = json.loads(message["data"])
        event_type = data["type"]
        
        if event_type in self.handlers:
            for handler in self.handlers[event_type]:
                handler(data["payload"])
```

### 12.5 Redis Caching Integration (Python)

```python
# infinite_aura/cache/redis_cache.py
import redis
import json
from typing import Optional
from pathlib import Path

class RedisCache:
    """Redis cache for memory files."""
    
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.redis = redis_client
        self.ttl = ttl  # Default 1 hour TTL
    
    @classmethod
    def from_env(cls):
        """Create RedisCache from environment variables."""
        redis_client = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379")
        )
        return cls(redis_client)
    
    def _cache_key(self, path: str) -> str:
        """Generate cache key for memory path."""
        return f"memory:{path}"
    
    def get(self, path: str) -> Optional[str]:
        """Get cached memory file content."""
        cached = self.redis.get(self._cache_key(path))
        if cached:
            return cached.decode("utf-8")
        return None
    
    def set(self, path: str, content: str, ttl: Optional[int] = None):
        """Cache memory file content."""
        ttl = ttl or self.ttl
        self.redis.setex(
            self._cache_key(path),
            ttl,
            content.encode("utf-8")
        )
    
    def invalidate(self, path: str):
        """Invalidate cached memory file."""
        self.redis.delete(self._cache_key(path))
    
    def clear_scope(self, scope: str):
        """Clear all cache keys under a scope (e.g., 'sessions')."""
        pattern = f"memory:{scope}:*"
        for key in self.redis.scan_iter(pattern):
            self.redis.delete(key)
```

---

## 13. IMPLEMENTATION CHECKLIST FOR PHASE 1

Use this as a task breakdown for Claude Code:

### Task 1: Create Memory Root Directory
```bash
# Create ~/.infinite-aura/memory/ with proper permissions
mkdir -p ~/.infinite-aura/memory
chmod 700 ~/.infinite-aura/memory
```

### Task 2: Create Full Directory Structure
```bash
# Create all UFC directories (max 3 levels)
# Reference section 1.2 for complete structure
```

### Task 3: Create Initial Files
```bash
# Create empty core files
touch ~/.infinite-aura/memory/user_context.md
touch ~/.infinite-aura/memory/current_projects.md
touch ~/.infinite-aura/memory/orchestrator_state.md

# Create context/system.md with UFC description
# This is CRITICAL - loaded first always
```

### Task 4: Create .gitkeep Files
```bash
# Add .gitkeep to all empty directories
# Ensures git tracks directory structure
```

### Task 5: Create meta/version.md
```bash
# Document system version and creation timestamp
```

### Task 6: Initialize Git Repository
```bash
cd ~/.infinite-aura/memory
git init
# Create .gitignore (exclude index/ and backups/)
git add .
git commit -m "Phase 1: Initialize UFC memory structure"
```

### Task 7: Python Module - scaffold.py
```python
# Create infinite_aura/memory/scaffold.py
# Function: initialize_memory_structure()
# Should be idempotent, emit events, validate structure
```

### Task 8: Validation Script
```python
# Create script to validate Phase 1 success criteria
# Run all tests from section 6
```

### Task 9: Integration Testing
```python
# Test event bus emission
# Test Redis cache (if applicable to scaffold)
# Test from existing Python code
```

### Task 10: Documentation
```markdown
# Update project README with Phase 1 completion
# Document memory structure location and purpose
```

---

## 14. PROMPT TEMPLATE FOR CLAUDE CODE (Phase 1)

Use this template when creating implementation prompts:

```
CONTEXT:
- Project: Infinite Aura (Python 3.11, Linux/WSL2)
- Location: /workspaces/infinite-aura
- Phase 0 Complete: Repo scaffold, Python structure, Redis cache, event bus
- Current Phase: Phase 1 - Directory Scaffold

GOAL:
Create the UFC (Unified Filesystem Context) directory structure at ~/.infinite-aura/memory/

CONSTRAINTS (NON-NEGOTIABLE):
- C1: Text-only storage (MD/YAML/JSON)
- C7: Maximum 3 levels of nesting
- C9: Make it reusable (module, not script)
- Must emit events to existing event bus
- Must initialize git repository

DELIVERABLES:
1. Create full directory structure (see STRUCTURE below)
2. Create context/system.md describing UFC
3. Create meta/version.md with version info
4. Add .gitkeep to empty directories
5. Initialize git with .gitignore
6. Python module: infinite_aura.memory.scaffold
7. Validation: Run success criteria tests

STRUCTURE:
[Paste section 1.2 UFC structure here]

PYTHON MODULE INTERFACE:
```python
def initialize_memory_structure(
    memory_root: Path = Path.home() / ".infinite-aura" / "memory",
    event_bus: Optional[EventBus] = None
) -> bool:
    """
    Initialize UFC memory directory structure.
    
    Args:
        memory_root: Root directory for memory system
        event_bus: Event bus for emitting events (optional)
    
    Returns:
        True if successful, False if already initialized
    
    Raises:
        PermissionError: If unable to create directories
    """
    pass
```

SUCCESS CRITERIA:
[Paste section 6 success criteria here]

INTEGRATION:
- Must work with existing event bus at infinite_aura.events
- Must work with existing Redis cache at infinite_aura.cache
- Must not break existing Phase 0 code

VALIDATION:
After implementation, run:
1. ls -la ~/.infinite-aura/memory/
2. git -C ~/.infinite-aura/memory/ status
3. python -c "from infinite_aura.memory.scaffold import initialize_memory_structure; initialize_memory_structure()"
```

---

## 15. QUESTIONS TO ANSWER BEFORE STARTING PHASE 1

1. **Existing Python Package Structure**
   - What is the exact package name? (`infinite_aura` or something else?)
   - Where is the main package located? (`/workspaces/infinite-aura/src/` or `/workspaces/infinite-aura/infinite_aura/`?)
   - What dependency management is used? (pip, poetry, pipenv?)

2. **Event Bus Implementation**
   - What module contains the event bus? (`infinite_aura.events.bus`?)
   - What is the class name? (`EventBus`?)
   - What method emits events? (`.emit()`, `.publish()`, `.send()`?)
   - What event naming convention is used? (`memory.file.read` or `memory:file:read`?)

3. **Redis Cache Implementation**
   - What module contains the Redis cache? (`infinite_aura.cache.redis`?)
   - What is the class name? (`RedisCache`, `Cache`?)
   - How is it initialized? (`.from_env()`, `__init__(url)`?)
   - Is it already connected and ready to use?

4. **CLI Framework Decision**
   - Which CLI framework to use? (Typer recommended, but check existing code)
   - Is there already an `aura` command? Or does one need to be created?
   - Where should the CLI entry point be? (`cli/aura.py`, `infinite_aura/cli.py`?)

5. **Testing Framework**
   - Is pytest already configured?
   - Where should tests go? (`tests/`, `infinite_aura/tests/`?)
   - Are there existing test utilities to reuse?

6. **Git Configuration**
   - Should the memory repo be separate from the main project repo?
   - User preferences for git author name/email in memory commits?
   - Should memory changes be submodule or completely separate?

---

## 16. RISK AREAS & MITIGATION

### Risk 1: Permission Issues
**Risk:** `~/.infinite-aura/memory/` creation fails due to permissions  
**Mitigation:** 
- Check permissions before creating
- Provide clear error messages
- Offer fallback location (e.g., `/tmp/infinite-aura-memory/` for testing)

### Risk 2: Event Bus Not Ready
**Risk:** Phase 0 event bus isn't actually ready or has different interface  
**Mitigation:**
- Make event bus optional in Phase 1
- Add null checks before emitting events
- Phase 1 can complete without event bus (emit later)

### Risk 3: Path Conflicts
**Risk:** `~/.infinite-aura/memory/` already exists with different structure  
**Mitigation:**
- Check for existing structure before creating
- Offer migration option
- Offer clean slate option (backup + recreate)

### Risk 4: Git Conflicts
**Risk:** Git initialization conflicts with existing git repo  
**Mitigation:**
- Check if already git repo before `git init`
- Make git initialization optional (can add later)
- Ensure memory repo is separate from main project repo

### Risk 5: Context/System.md Content
**Risk:** Unclear what should go in `context/system.md`  
**Mitigation:**
- Create comprehensive template based on Project_Brief.md
- Include UFC structure description
- Include loading order instructions
- Make it the "self-describing" file for the system

---

## 17. SUCCESS METRICS

After Phase 1 completion, these should all be true:

✅ **Structure Created**
- [ ] Directory `~/.infinite-aura/memory/` exists
- [ ] All directories per UFC spec exist
- [ ] Max nesting depth is 3 levels
- [ ] All empty directories have `.gitkeep`

✅ **Files Created**
- [ ] `user_context.md` (empty but exists)
- [ ] `current_projects.md` (empty but exists)
- [ ] `orchestrator_state.md` (empty but exists)
- [ ] `context/system.md` (describes UFC structure)
- [ ] `meta/version.md` (version and timestamp)

✅ **Git Initialized**
- [ ] Git repository initialized
- [ ] `.gitignore` present and correct
- [ ] Initial commit made
- [ ] `git status` shows clean tree

✅ **Python Module Works**
- [ ] `from infinite_aura.memory.scaffold import initialize_memory_structure` succeeds
- [ ] Function is idempotent (safe to run twice)
- [ ] Function returns correct status
- [ ] Function emits events (if event bus available)

✅ **Validation Passes**
- [ ] All success criteria from Memory_Checklist.md Phase 1 pass
- [ ] No errors in logs
- [ ] Structure matches spec exactly

✅ **Integration Works**
- [ ] Doesn't break existing Phase 0 code
- [ ] Event bus receives events (if implemented)
- [ ] Redis cache is compatible (even if not used yet)

---

## 18. NEXT STEPS AFTER PHASE 1

Once Phase 1 is complete and validated:

1. **Phase 2 Prep**: Start defining schemas in `meta/templates/`
2. **Phase 3 Prep**: Design CLI command structure (`aura memory {subcommand}`)
3. **Documentation**: Update ARCHITECTURE.md with Phase 1 implementation notes
4. **Team Sync**: Show structure to user, get feedback
5. **Begin Phase 2**: Schema definition (templates for all memory file types)

---

## 19. REFERENCES

- **Project Brief**: `/home/ubuntu/Uploads/Project_Brief.md` - Constraints and architecture
- **Memory Checklist**: `/home/ubuntu/Uploads/Memory_Checklist.md` - Phased build plan
- **Decisions Log**: `/home/ubuntu/Uploads/Decisions_Log.md` - Why decisions were made
- **Operating Contract**: `/home/ubuntu/Uploads/OPERATING_CONTRACT.md` - Agent behavioral rules

---

## APPENDIX A: UFC STRUCTURE VISUALIZATION

```
~/.infinite-aura/memory/
│
├── 📄 Root Files (3 files)
│   ├── user_context.md          ← Who is the user
│   ├── current_projects.md      ← Active projects list
│   └── orchestrator_state.md    ← Orchestrator status
│
├── 📁 context/ (LOADED FIRST)
│   ├── 📄 system.md             ← UFC description (critical)
│   ├── 📁 tools/
│   │   └── 📄 tools.md
│   ├── 📁 projects/ (max 3 levels)
│   │   └── 📁 {project}/
│   │       └── 📄 context.md
│   └── 📁 agents/ (max 3 levels)
│       └── 📁 {agent}/
│           └── 📄 context.md
│
├── 📁 projects/ (detailed project memory)
│   └── 📁 {project}/
│       ├── 📄 context.md
│       ├── 📄 decisions.md
│       ├── 📄 learnings.md
│       ├── 📄 team.md
│       └── 📁 artifacts/
│
├── 📁 agents/ (per-agent memory)
│   └── 📁 {agent}/
│       ├── 📄 personality.md
│       ├── 📄 skills.md
│       ├── 📄 learnings.md
│       ├── 📄 state.md
│       └── 📄 history.md
│
├── 📁 sessions/ (append-only work sessions)
│   └── 📁 {YYYY-MM-DD-HH-MM-SS}/
│       ├── 📄 context.md
│       ├── 📄 work_log.md
│       ├── 📄 decisions.md
│       ├── 📄 results.md
│       └── 📄 learnings.md
│
├── 📁 history/ (consolidated history)
│   ├── 📁 sessions/
│   ├── 📁 learnings/
│   ├── 📁 decisions/
│   └── 📁 research/
│
├── 📁 skills/ (skill definitions)
│   └── 📁 {skill}/
│       ├── 📄 skill.md       ← "use when" triggers
│       ├── 📁 workflows/
│       │   └── 📄 {workflow}.md
│       └── 📁 tools/
│           └── 📄 {tool}.py  ← Python tools
│
├── 📁 index/ (generated, not git-tracked)
├── 📁 backups/ (timestamped, not git-tracked)
└── 📁 meta/ (system metadata)
    ├── 📄 version.md
    ├── 📁 templates/ (Phase 2)
    │   ├── user_context.template.md
    │   ├── project_context.template.md
    │   └── ... (more templates)
    └── 📁 guardrails/ (Phase 9)
        ├── Project_Brief.md
        ├── Memory_Checklist.md
        ├── Decisions_Log.md
        └── OPERATING_CONTRACT.md
```

---

## APPENDIX B: 4-LAYER CONTEXT LOADING FLOW

```
AGENT SPAWN REQUEST
        ↓
┌───────────────────────────────────┐
│   ORCHESTRATOR                    │
│   receives spawn command          │
└───────────────────────────────────┘
        ↓
┌───────────────────────────────────┐
│   CONTEXT LOADER                  │
│   assembles 4 layers              │
└───────────────────────────────────┘
        ↓
    ┌───┴───┬───────┬────────┐
    ↓       ↓       ↓        ↓
┌───────┐ ┌──────┐ ┌──────┐ ┌────────┐
│LAYER 1│ │LAYER 2│ │LAYER 3│ │LAYER 4 │
│ USER  │ │PROJECT│ │SESSION│ │ AGENT  │
└───────┘ └──────┘ └──────┘ └────────┘
    │       │       │        │
    └───────┴───────┴────────┘
            ↓
┌───────────────────────────────────┐
│   CONTEXT BLOB                    │
│   (merged, <100ms)                │
└───────────────────────────────────┘
            ↓
┌───────────────────────────────────┐
│   AGENT SYSTEM PROMPT             │
│   injected with full context      │
└───────────────────────────────────┘
            ↓
┌───────────────────────────────────┐
│   AGENT STARTS                    │
│   (fully hydrated, no questions)  │
└───────────────────────────────────┘
```

---

## APPENDIX C: EVENT FLOW DIAGRAM

```
USER/AGENT
    ↓
┌──────────┐
│   CLI    │ aura memory read user_context
└──────────┘
    ↓
┌──────────────────┐
│  Memory Module   │
└──────────────────┘
    ↓ ↓ ↓
    │ │ └──→ [Event Bus] → emit("memory.file.read")
    │ └────→ [Redis Cache] → check cache
    └──────→ [Filesystem] → read file (if cache miss)
         ↓
    ┌────────┐
    │ Return │
    │ Content│
    └────────┘
         ↓
      [CLI]
         ↓
     [Output]


WRITE FLOW:

USER/AGENT
    ↓
┌──────────┐
│   CLI    │ aura memory write agents/engineer/learnings.md "..."
└──────────┘
    ↓
┌──────────────────┐
│  Memory Module   │
└──────────────────┘
    ↓ ↓ ↓ ↓ ↓
    │ │ │ │ └──→ [Event Bus] → emit("memory.file.written")
    │ │ │ └────→ [Redis Cache] → invalidate old, cache new
    │ │ └──────→ [Filesystem] → write file
    │ └────────→ [Backups] → create backup first
    └──────────→ [Schema Validator] → validate content
         ↓
    ┌─────────┐
    │ Success │
    └─────────┘
```

---

*End of Analysis Document*
*Ready for Phase 1 implementation prompt generation*
