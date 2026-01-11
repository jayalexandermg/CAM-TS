# Claude Code Instructions

## Package Manager

**PNPM only** - Never use npm or npx.

## Commands

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Standards

- **TypeScript**: Strict mode enabled
- **Coverage**: 90%+ required
- **Tests**: All tests must pass before committing

## Project State

- **Phase 1**: Complete (including PROMPT 4A)
- **Phase 2**: In progress (PROMPT 8A complete)
- **Next**: PROMPT 9A (Content-Based Routing)

## Architecture

Memory location: `~/.infinite-aura-ts/memory/`

Key components:
- `MemoryScaffold` - Main memory management class
- `CoreManager` - CORE directory for user identity
- `MemoryPipeline` - 3-tier memory pipeline (work/learning/archive)
- `PrepromptInjector` - System prompt composition with context layers
- `SessionManager` - Session lifecycle management
- `SessionStartHook` - Loads CORE context on session start
