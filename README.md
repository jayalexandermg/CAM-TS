# Infinite Aura TS

A KAI-baseline personal AI memory and orchestrator system built in TypeScript.

## Overview

Infinite Aura TS is a self-healing, self-improving memory system for AI agents. It provides a secure, structured foundation for persistent AI memory that grows and evolves over time.

**Inspired by:** Daniel Miessler's Personal AI Infrastructure (PAI/KAI) - a vision for persistent, evolving AI memory.

**Built for:** Entity 1 (personal AI orchestrator)

## Features

- **UFC-style Memory Architecture** - 18 structured directories for organized memory storage
- **Custom Exception Hierarchy** - 14 specialized exception classes with error codes
- **Guardrails/Safety Policy Layer** - 7 security policies for safe operation
- **Security Hardening** - Audit logging, file locking, symlink protection
- **Comprehensive Test Coverage** - 472 tests with 90%+ coverage

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INFINITE AURA TS                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Exceptions │  │  Guardrails │  │     Memory Scaffold     │  │
│  │  (14 types) │  │ (7 policies)│  │      (6 classes)        │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         └────────────────┼─────────────────────┘                │
│                          │                                      │
│         ┌────────────────┴────────────────┐                     │
│         │         Security Layer          │                     │
│         │   • Path Validation (10-tier)   │                     │
│         │   • Audit Logging               │                     │
│         │   • File Locking                │                     │
│         │   • Symlink Protection          │                     │
│         └─────────────────────────────────┘                     │
├─────────────────────────────────────────────────────────────────┤
│                    File System (Memory)                         │
│  ~/.infinite-aura-ts/memory/                                    │
│  ├── context/      ├── history/       ├── skills/               │
│  ├── projects/     │   ├── raw-outputs/   ├── index/            │
│  ├── agents/       │   ├── learnings/     ├── backups/          │
│  └── sessions/     │   ├── sessions/      └── meta/             │
│                    │   ├── research/          └── verification/ │
│                    │   ├── decisions/                           │
│                    │   └── execution/                           │
└─────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Description | Files |
|-----------|-------------|-------|
| **Exceptions** | Custom error hierarchy with codes | 14 classes |
| **Guardrails** | Security policy enforcement | 7 policies, 8 interfaces |
| **Memory** | Core scaffold and operations | 6 classes |
| **Security** | Audit logging, file locking | Integrated |

### Directory Structure

```
infinite-aura-ts/
├── src/
│   ├── exceptions/          # Custom exception hierarchy
│   │   ├── index.ts         # All 14 exception classes
│   │   └── security-patterns.ts  # Attack detection utilities
│   ├── guardrails/          # Safety policy layer
│   │   ├── index.ts
│   │   ├── policies.ts      # 7 default policies
│   │   └── types.ts         # Guardrail interfaces
│   ├── memory/              # Memory scaffold
│   │   ├── scaffold.ts      # Main MemoryScaffold class
│   │   ├── path-validator.ts    # Path security
│   │   ├── file-operations.ts   # File I/O with locking
│   │   ├── directory-operations.ts  # Directory management
│   │   ├── file-naming.ts   # Naming conventions
│   │   └── security-audit.ts    # Audit logging
│   └── index.ts             # Entry point
├── tests/                   # Comprehensive test suite
├── docs/                    # Documentation
├── dist/                    # Compiled output
└── coverage/                # Test coverage reports
```

## Installation

### Prerequisites

- Node.js 20+
- pnpm 9+

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/infinite-aura-ts.git
cd infinite-aura-ts

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

### Dev Container (Recommended)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open folder in VS Code and select "Reopen in Container"

## Quick Start

### Basic Usage

```typescript
import { MemoryScaffold } from 'infinite-aura-ts';

// Create scaffold with default path (~/.infinite-aura-ts/memory/)
const scaffold = new MemoryScaffold();

// Initialize directory structure
await scaffold.initialize();

// Validate structure
const result = await scaffold.validate();
console.log(`Valid: ${result.valid}, Directories: ${result.directories}`);

// Access file operations
const fileOps = scaffold.getFileOps();

// Write a file
await fileOps.writeFile('context/notes.md', '# My Notes\n\nSome content here.');

// Read a file
const content = await fileOps.readFile('context/notes.md');

// Append to JSONL file (for history)
await fileOps.appendJsonLine('history/learnings/2024-01.jsonl', {
  timestamp: new Date().toISOString(),
  learning: 'Something important',
  category: 'insight'
});

// Run security audit
const auditResult = await scaffold.runSecurityAudit();
console.log(`Security audit passed: ${auditResult.passed}`);
```

### With File Locking

```typescript
const fileOps = scaffold.getFileOps();

// Execute operation with exclusive file lock
const result = await fileOps.withFileLock('context/user.md', async () => {
  const content = await fileOps.readFile('context/user.md');
  const updated = content + '\n## New Section\n';
  await fileOps.writeFile('context/user.md', updated);
  return 'Updated successfully';
});
```

## Development

### Project Structure

The project follows a modular architecture:

- **src/exceptions/** - Custom exception hierarchy for precise error handling
- **src/guardrails/** - Security policies and constraint enforcement
- **src/memory/** - Core memory scaffold, file/directory operations

### Quality Gates

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Format check
pnpm format:check

# Run tests
pnpm test

# Run all checks
pnpm check:all

# Pre-commit (lint-staged)
pnpm precommit
```

### Pre-commit Hooks

The project uses `lint-staged` for pre-commit hooks:

- TypeScript files are linted with ESLint
- All files are formatted with Prettier

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Test Categories

| Category | Description | Count |
|----------|-------------|-------|
| Unit | Individual function/class tests | 350+ |
| Integration | Component interaction tests | 80+ |
| Edge Cases | Boundary conditions, error paths | 30+ |
| Performance | Concurrent operations, stress tests | 10+ |
| **Total** | **All tests** | **472** |

### Coverage Report

```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   90.05 |    83.27 |   98.56 |   89.95 |
 exceptions               |   95.75 |    87.35 |     100 |   95.70 |
 guardrails               |     100 |      100 |     100 |     100 |
 memory                   |   88.22 |    81.44 |   98.01 |   88.14 |
--------------------------|---------|----------|---------|---------|
```

## Documentation

- [API Documentation](docs/api/README.md) - Complete API reference
- [Architecture Documentation](docs/architecture/README.md) - System design and decisions
- [Phase 1 Completion Report](docs/phase1-completion.md) - Development summary

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- **Daniel Miessler** - PAI/KAI vision and Operating Contract principles
- **Entity 1** - Target deployment platform
- **Operating Contract** - Core constraints (C1-C7) that guide the design
