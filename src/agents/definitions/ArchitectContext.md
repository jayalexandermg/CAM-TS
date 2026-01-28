# Architect Context

## CAM Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Orchestrator                             │
│  (Task routing, agent coordination, workflow management)     │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Agents  │   │  Memory  │   │  Skills  │
    │ (Profiles│   │ Scaffold │   │ Registry │
    │  Traits) │   │          │   │          │
    └──────────┘   └──────────┘   └──────────┘
```

### Memory Architecture (3-Tier Pipeline)

1. **Work Memory** - Active task context, ephemeral
2. **Learning Memory** - Patterns and insights, session-persistent
3. **Archive Memory** - Long-term storage, permanent

### Core Directories
- `CORE/` - User identity and preferences
- `work/` - Current session working memory
- `learning/` - Cross-session learned patterns
- `archive/` - Permanent knowledge storage

## Design Principles

### Separation of Concerns
- Each module has a single responsibility
- Clear interfaces between components
- Minimal coupling, high cohesion

### Extensibility
- Plugin architecture for skills
- Profile-based agent configuration
- Trait composition for behavior

### Testability
- Dependency injection for mocking
- Pure functions where possible
- Integration tests for workflows

## Component Relationships

### Agent System
```
AgentProfile → AgentFactory → Agent Instance
     ↓              ↓
   Traits      TraitLoader → TraitInference
```

### Memory System
```
MemoryScaffold → MemoryPipeline → CoreManager
                      ↓
               PrepromptInjector
```

### Session Lifecycle
```
SessionManager → SessionStartHook → PrepromptInjector
      ↓
HistoryManager
```

## ADR Template

When documenting architectural decisions:

```markdown
# ADR-{number}: {Title}

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue we're addressing?

## Decision
What is the change we're proposing?

## Consequences
What are the positive and negative effects?

## Alternatives Considered
What other options were evaluated?
```

## Key Design Decisions

### ADR-001: Markdown-Based Agent Profiles
- **Decision**: Use markdown with YAML frontmatter for agent definitions
- **Rationale**: Human-readable, version-controllable, easy to edit
- **Trade-off**: Less type-safe than pure TypeScript

### ADR-002: 3-Tier Memory Pipeline
- **Decision**: Separate work, learning, and archive memory
- **Rationale**: Different retention policies and access patterns
- **Trade-off**: More complex than single memory store

### ADR-003: Trait Composition
- **Decision**: Agents composed of reusable traits
- **Rationale**: DRY principle, flexible agent configuration
- **Trade-off**: Indirection adds complexity
