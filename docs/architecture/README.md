# Infinite Aura TS - Architecture Documentation

Comprehensive architecture documentation for the Infinite Aura TypeScript memory system.

## Table of Contents

- [System Architecture](#system-architecture)
- [Memory Architecture](#memory-architecture)
- [Security Architecture](#security-architecture)
- [Exception Architecture](#exception-architecture)
- [Design Decisions](#design-decisions)
- [PAI Adaptations](#pai-adaptations)

---

## System Architecture

### High-Level Overview

Infinite Aura TS is a layered architecture designed for security, extensibility, and reliability.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                              │
│    (Future: Hooks, Dynamic Context, Content Routing, Learning Engine)       │
├─────────────────────────────────────────────────────────────────────────────┤
│                              SERVICE LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  MemoryScaffold │  │  SecurityAudit  │  │    (Future: Orchestrator)   │  │
│  │    (Facade)     │  │    (Logger)     │  │                             │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────────────┘  │
│           │                    │                                            │
├───────────┼────────────────────┼────────────────────────────────────────────┤
│           │      CORE LAYER    │                                            │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌─────────────────────────────┐  │
│  │ FileOperations  │  │ DirectoryOps    │  │     FileNamingConvention    │  │
│  │  (Read/Write)   │  │ (Create/List)   │  │       (Parse/Generate)      │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────────────┘  │
│           │                    │                                            │
├───────────┼────────────────────┼────────────────────────────────────────────┤
│           │   SECURITY LAYER   │                                            │
│  ┌────────┴────────────────────┴────────┐  ┌─────────────────────────────┐  │
│  │            PathValidator             │  │      SecurityPatterns       │  │
│  │  • Boundary Enforcement              │  │  • Path Traversal Detection │  │
│  │  • Symlink Protection                │  │  • Injection Detection      │  │
│  │  • Permission Validation             │  │  • Encoding Attack Detection│  │
│  └──────────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           POLICY LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Guardrails (7 Policies)                      │    │
│  │  • File System Boundary      • Text-Only Enforcement                │    │
│  │  • Path Traversal Prevention • Command Injection Prevention         │    │
│  │  • Destructive Operations    • Rate Limiting                        │    │
│  │  • Append-Only History                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           EXCEPTION LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    InfiniteAuraError (Base)                         │    │
│  │  ├── PathValidationError    ├── SecurityError                       │    │
│  │  ├── FileOperationError     ├── ConfigurationError                  │    │
│  │  ├── MemoryError            ├── ValidationError                     │    │
│  │  └── ContextError           └── GuardrailViolationError (+ 6 more)  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FILE SYSTEM                                       │
│                     ~/.infinite-aura-ts/memory/                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         MemoryScaffold                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  • initialize()   • validate()   • runSecurityAudit()      │  │
│  │  • getFileOps()   • getDirectoryOps()  • getPathValidator()│  │
│  └────────────────────────────────────────────────────────────┘  │
│           │                   │                    │             │
│           ▼                   ▼                    ▼             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐ │
│  │  FileOperations │ │ DirectoryOps    │ │   PathValidator     │ │
│  │  • readFile()   │ │ • createDir()   │ │   • validate()      │ │
│  │  • writeFile()  │ │ • listFiles()   │ │   • resolvePath()   │ │
│  │  • appendFile() │ │ • listDirs()    │ │   • isWithinBoundary│ │
│  │  • lockFile()   │ │ • validateStruct│ │   • validateSecure()│ │
│  └─────────────────┘ └─────────────────┘ └─────────────────────┘ │
│           │                                        │             │
│           ▼                                        ▼             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    SecurityAuditLogger                      │ │
│  │  • logSecurityEvent()  • logViolation()  • getRecentEvents()│ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
    User Request                    Security Check             File System
         │                               │                          │
         ▼                               │                          │
┌─────────────────┐                      │                          │
│ MemoryScaffold  │                      │                          │
│                 │                      │                          │
│  validate path ─┼──────────────────────┤                          │
│                 │                      ▼                          │
│                 │            ┌─────────────────┐                  │
│                 │            │  PathValidator  │                  │
│                 │            │                 │                  │
│                 │            │ 1. Check nulls  │                  │
│                 │            │ 2. Traversal    │                  │
│                 │            │ 3. Injection    │                  │
│                 │            │ 4. Boundary     │                  │
│                 │            │ 5. Symlinks     │                  │
│                 │            └────────┬────────┘                  │
│                 │                     │                           │
│                 │         ┌───────────┴───────────┐               │
│                 │         │                       │               │
│                 │    [BLOCKED]               [ALLOWED]            │
│                 │         │                       │               │
│                 │         ▼                       ▼               │
│                 │  ┌──────────────┐      ┌───────────────┐        │
│                 │  │ Throw Error  │      │ FileOperations│        │
│                 │  │ Log Audit    │      │               │────────┤
│                 │  └──────────────┘      │  read/write   │        │
│                 │                        │  with locking │        │
│                 │                        └───────────────┘        │
└─────────────────┘                               │                 │
                                                  ▼                 │
                                         ┌───────────────┐          │
                                         │ Audit Logger  │          │
                                         │ (JSONL file)  │          │
                                         └───────────────┘          │
```

---

## Memory Architecture

### UFC-Style Directory Structure

The memory system uses 18 directories organized in a hierarchical structure inspired by the UFC (Universal File Convention) pattern.

```
~/.infinite-aura-ts/memory/
│
├── context/                    # User and system context
│   ├── user.md                 # User preferences, working style
│   └── system.md               # Environment, capabilities, constraints
│
├── projects/                   # Project tracking
│   └── current.md              # Active and backlog projects
│
├── agents/                     # Agent state and coordination
│   └── orchestrator.md         # Orchestrator mode, tasks, context
│
├── sessions/                   # Session management
│
├── history/                    # APPEND-ONLY historical data
│   ├── raw-outputs/            # Raw interaction outputs
│   ├── learnings/              # Extracted learnings (JSONL)
│   ├── sessions/               # Session history
│   ├── research/               # Research findings
│   ├── decisions/              # Decision records
│   └── execution/              # Execution logs
│
├── skills/                     # Learned capabilities
│
├── index/                      # Search indexes and caches
│
├── backups/                    # Automatic backups
│
└── meta/                       # System metadata
    ├── version.md              # Memory system version
    ├── verification/           # Verification records
    └── security-audit.jsonl    # Security audit log
```

### File Naming Conventions

Files follow structured naming patterns for organization and parsing:

```
Pattern: {type}_{date}_{id}.{ext}

Examples:
  learning_2024-01-15_abc123.jsonl
  session_2024-01-15_def456.jsonl
  decision_2024-01-15_ghi789.md
```

### JSONL Format

Historical data uses JSONL (JSON Lines) format for append-only storage:

```jsonl
{"timestamp":"2024-01-15T10:30:00Z","type":"learning","content":"...","confidence":0.9}
{"timestamp":"2024-01-15T11:00:00Z","type":"learning","content":"...","confidence":0.85}
```

### 4-Layer Context Model

Context is organized in a hierarchical model:

```
┌─────────────────────────────────────────┐
│              USER CONTEXT               │  (Persistent)
│  Preferences, style, communication      │
├─────────────────────────────────────────┤
│            PROJECT CONTEXT              │  (Semi-persistent)
│  Current projects, goals, constraints   │
├─────────────────────────────────────────┤
│           SESSION CONTEXT               │  (Session-scoped)
│  Current task, mode, active files       │
├─────────────────────────────────────────┤
│            AGENT CONTEXT                │  (Ephemeral)
│  Orchestrator state, tool status        │
└─────────────────────────────────────────┘
```

---

## Security Architecture

### Path Validation (10-Tier Attack Detection)

The PathValidator implements comprehensive attack detection:

| Tier | Attack Type | Detection |
|------|-------------|-----------|
| 1 | Path Traversal | `../`, URL-encoded variants, mixed encoding |
| 2 | Command Injection | `;`, `|`, `&`, `$()`, backticks |
| 3 | Null Byte Injection | `\x00`, `%00`, unicode null |
| 4 | Absolute Paths | Unix `/`, Windows `C:\`, UNC `\\` |
| 5 | Special Files | `/dev/`, `/proc/`, `/etc/passwd` |
| 6 | Protocol Injection | `javascript:`, `data:`, `file:` |
| 7 | Encoding Attacks | Double encoding, hex, unicode, HTML entities |
| 8 | Symlinks | Symbolic link detection and blocking |
| 9 | Permission Issues | Read/write permission validation |
| 10 | Depth Violations | Maximum directory depth enforcement |

### Guardrails (7 Policies)

```
┌─────────────────────────────────────────────────────────────────┐
│                    GUARDRAIL POLICIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CRITICAL (Cannot be disabled)                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. FILE_SYSTEM_BOUNDARY                                 │    │
│  │    Blocks access outside ~/.infinite-aura-ts/           │    │
│  │                                                         │    │
│  │ 2. PATH_TRAVERSAL_PREVENTION                            │    │
│  │    Blocks ../, absolute paths, traversal attempts       │    │
│  │                                                         │    │
│  │ 3. APPEND_ONLY_HISTORY                                  │    │
│  │    Blocks modification/deletion of history/* files      │    │
│  │                                                         │    │
│  │ 4. COMMAND_INJECTION_PREVENTION                         │    │
│  │    Blocks shell metacharacters and injection attempts   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  OPTIONAL (Can be relaxed)                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 5. DESTRUCTIVE_OPERATIONS                               │    │
│  │    Requires confirmation for delete/truncate            │    │
│  │                                                         │    │
│  │ 6. TEXT_ONLY_ENFORCEMENT                                │    │
│  │    Blocks binary files (C1 constraint)                  │    │
│  │                                                         │    │
│  │ 7. RATE_LIMITING                                        │    │
│  │    Prevents excessive operations (DoS protection)       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Audit Logging

All security-relevant events are logged to `meta/security-audit.jsonl`:

```jsonl
{"id":"evt_1705312200_a1b2c3d4","timestamp":"2024-01-15T10:30:00Z","type":"ACCESS_ATTEMPT","severity":"info","message":"Access allowed: read on context/user.md","path":"context/user.md","action":"read","allowed":true}
{"id":"evt_1705312205_e5f6g7h8","timestamp":"2024-01-15T10:30:05Z","type":"VIOLATION","severity":"critical","message":"Path traversal detected","path":"../../../etc/passwd","action":"read","allowed":false}
```

### File Locking

Exclusive file access using lock files:

```
File: context/user.md
Lock: context/user.md.lock

Lock file contents:
{
  "pid": 12345,
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "context/user.md"
}
```

Features:
- Automatic stale lock detection (>60 seconds)
- Configurable timeout
- `withFileLock()` helper for safe operations

### Symlink Protection

All file operations validate that paths contain no symbolic links:

1. Check if path component is a symlink
2. Resolve symlinks to real path
3. Verify resolved path is within boundary
4. Block if symlink escapes boundary

---

## Exception Architecture

### Exception Hierarchy

```
InfiniteAuraError (Base)
├── PathValidationError
├── FileOperationError
├── SecurityError
├── ConfigurationError
├── MemoryError
├── ContextError
├── ValidationError
└── GuardrailViolationError
    ├── ToolAccessDeniedError
    ├── FileSystemBoundaryError
    ├── DestructiveActionBlockedError
    ├── RateLimitExceededError
    ├── AppendOnlyViolationError
    └── TextOnlyViolationError
```

### Error Handling Patterns

**Fail-Fast Pattern:**
```typescript
try {
  validator.validate(path);  // Throws immediately on violation
  await fileOps.readFile(path);
} catch (error) {
  if (error instanceof SecurityError) {
    // Security violation - log and reject
    logger.error('Security violation', error.toJSON());
    throw error;  // Re-throw, don't continue
  }
}
```

**Error Context Pattern:**
```typescript
throw new FileOperationError(
  'Failed to read file',
  ErrorCodes.FILE_NOT_FOUND,
  {
    path: relativePath,
    absolutePath,
    operation: 'read'
  }
);
```

---

## Design Decisions

### Why TypeScript (vs Bun)

| Decision | TypeScript + Node.js |
|----------|---------------------|
| **Stability** | Mature, well-tested runtime |
| **Ecosystem** | Largest npm ecosystem |
| **Tooling** | Excellent IDE support, debugging |
| **Compatibility** | Works everywhere |
| **Future** | Can migrate to Bun later if needed |

### Why Async (vs Sync)

| Decision | Async/Await |
|----------|-------------|
| **Performance** | Non-blocking I/O for concurrent operations |
| **Scalability** | Can handle multiple requests |
| **Best Practice** | Modern Node.js standard |
| **Consistency** | All file operations are async |

### Why Class-Based (vs Functional)

| Decision | Class-Based |
|----------|-------------|
| **Encapsulation** | State management (locks, paths) |
| **Organization** | Clear module boundaries |
| **Testability** | Easy to mock and stub |
| **Extension** | Inheritance for specialized errors |

### Why Exceptions (vs Fail-Silent)

| Decision | Explicit Exceptions |
|----------|---------------------|
| **Visibility** | Errors are never hidden |
| **Debugging** | Stack traces, error codes |
| **Security** | Security violations are loud |
| **Predictability** | No silent failures |

### Why PostgreSQL (vs Other DBs)

| Decision | PostgreSQL (Future Phase 2+) |
|----------|------------------------------|
| **JSONB** | Native JSON support |
| **Full-Text Search** | Built-in search capabilities |
| **Transactions** | ACID compliance |
| **Extensions** | pgvector for future embeddings |

Note: Phase 1 uses file system only. Database integration planned for later phases.

---

## PAI Adaptations

This system is inspired by Daniel Miessler's Personal AI Infrastructure (PAI/KAI).

### What We Adapted from PAI

| PAI Concept | Our Implementation |
|-------------|-------------------|
| UFC Directory Structure | 18 directories with specific purposes |
| 4-Layer Context | User > Project > Session > Agent |
| JSONL History | Append-only historical records |
| Separation of Concerns | Context, Skills, History, Projects |
| Audit Trail | Security audit logging |

### What We Changed and Why

| Change | Reason |
|--------|--------|
| TypeScript instead of Python | Stronger typing, better IDE support |
| File locking | Multi-agent concurrency safety |
| 10-tier security | More comprehensive attack detection |
| Explicit exceptions | Fail-fast security model |
| Guardrail policies | Configurable, extensible safety |

### Key Differences

1. **Security Focus**: More aggressive security than original PAI
2. **Type Safety**: Full TypeScript with strict mode
3. **Testability**: 90%+ coverage requirement
4. **Modular Design**: Clear separation of concerns
5. **Operating Contract**: Explicit C1-C7 constraints encoded in policies

### Operating Contract Constraints

The system implements these constraints from the Operating Contract:

| Constraint | Implementation |
|------------|----------------|
| **C1: Text-Only** | TEXT_ONLY_ENFORCEMENT policy, allowed extensions list |
| **C2: No Embeddings** | No vector operations in Phase 1 |
| **C3: Append-Only History** | APPEND_ONLY_HISTORY policy, delete blocked for history/ |
| **C4-C7** | Future phases (hooks, learning, etc.) |
