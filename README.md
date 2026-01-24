# Infinite Aura TS

A KAI-baseline Context-Aware Memory (CAM) system for AI agents built in TypeScript.

## Overview

Infinite Aura TS is a self-healing, self-improving memory system for AI agents. It provides a secure, structured foundation for persistent AI memory that grows and evolves over time.

**Inspired by:** Daniel Miessler's Personal AI Infrastructure (PAI/KAI) - a vision for persistent, evolving AI memory.

**Built for:** Entity 1 (personal AI orchestrator)

## Features

- **Context-Aware Memory (CAM)** - Intelligent memory system with 4-layer context loading
- **UFC-style Memory Architecture** - 18 structured directories for organized memory storage
- **Orchestrator System** - Central coordination with agent spawning and task management
- **Skill System** - Self-contained units with definitions, workflows, and tools
- **Custom Exception Hierarchy** - 14 specialized exception classes with error codes
- **Guardrails/Safety Policy Layer** - 7 security policies for safe operation
- **Security Hardening** - Audit logging, file locking, symlink protection
- **UOCS Integration** - Unified Output Capture System for history tracking
- **Comprehensive Test Coverage** - 500+ tests with 90%+ coverage

## Installation

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install from Source

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

### Using the CAM Factory (Recommended)

The simplest way to get started is using the `createCAM` factory function:

```typescript
import { createCAM } from 'infinite-aura-ts';

async function main() {
  // Create CAM with defaults
  const cam = await createCAM({
    autoInitialize: true,
  });

  // Process a request through the orchestrator
  const result = await cam.orchestrator.process({
    input: 'Hello, world!',
    sessionId: 'my-session',
  });

  console.log('Result:', result.output);

  // Shutdown when done
  await cam.shutdown();
}

main();
```

### With Custom Configuration

```typescript
import { createCAM } from 'infinite-aura-ts';

const cam = await createCAM({
  config: {
    orchestrator: {
      maxConcurrentTasks: 10,
      defaultTimeout: 60000,
    },
    logging: {
      level: 'debug',
    },
  },
  memoryBasePath: '/custom/path/memory',
  autoInitialize: true,
});
```

### Direct Component Usage

For more control, you can use components directly:

```typescript
import { MemoryScaffold, Orchestrator } from 'infinite-aura-ts';

// Create memory scaffold
const memory = new MemoryScaffold('~/.infinite-aura-ts/memory/');
await memory.initialize();

// Validate structure
const result = await memory.validate();
console.log(`Valid: ${result.valid}, Directories: ${result.directories}`);

// Access file operations
const fileOps = memory.getFileOps();

// Write a file
await fileOps.writeFile('context/notes.md', '# My Notes\n\nSome content here.');

// Read a file
const content = await fileOps.readFile('context/notes.md');

// Append to JSONL file (for history)
await fileOps.appendJsonLine('history/learnings/2024-01.jsonl', {
  timestamp: new Date().toISOString(),
  learning: 'Something important',
  category: 'insight',
});

// Run security audit
const auditResult = await memory.runSecurityAudit();
console.log(`Security audit passed: ${auditResult.passed}`);
```

### With File Locking

```typescript
const fileOps = memory.getFileOps();

// Execute operation with exclusive file lock
const result = await fileOps.withFileLock('context/user.md', async () => {
  const content = await fileOps.readFile('context/user.md');
  const updated = content + '\n## New Section\n';
  await fileOps.writeFile('context/user.md', updated);
  return 'Updated successfully';
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       INFINITE AURA TS (CAM)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Orchestrator │  │    Agents    │  │        Skills         │  │
│  │   (Brain)    │  │  (Workers)   │  │   (Capabilities)      │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴───────────┐  │
│  │                    Context System                          │  │
│  │     User → Project → Session → Agent (4 Layers)           │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────┐  ┌────────┴──────┐  ┌─────────────────────┐   │
│  │  Exceptions │  │   Guardrails  │  │   Memory Scaffold   │   │
│  │  (14 types) │  │  (7 policies) │  │    (6 classes)      │   │
│  └──────┬──────┘  └───────┬───────┘  └──────────┬──────────┘   │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           │                                     │
│         ┌─────────────────┴─────────────────┐                   │
│         │         Security Layer            │                   │
│         │   • Path Validation (10-tier)     │                   │
│         │   • Audit Logging                 │                   │
│         │   • File Locking                  │                   │
│         │   • Symlink Protection            │                   │
│         └───────────────────────────────────┘                   │
├─────────────────────────────────────────────────────────────────┤
│                    File System (Memory)                         │
│  ~/.infinite-aura-ts/memory/                                    │
│  ├── CORE/         (Identity & preferences)                     │
│  ├── context/      (Active context)                             │
│  ├── projects/     (Project data)                               │
│  ├── agents/       (Agent state)                                │
│  ├── sessions/     (Session data)                               │
│  ├── history/      (UOCS output capture)                        │
│  │   ├── raw-outputs/                                           │
│  │   ├── learnings/                                             │
│  │   ├── sessions/                                              │
│  │   ├── research/                                              │
│  │   ├── decisions/                                             │
│  │   └── execution/                                             │
│  ├── skills/       (Skill definitions)                          │
│  ├── index/        (Search indices)                             │
│  ├── backups/      (Automatic backups)                          │
│  └── meta/         (System metadata)                            │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### createCAM(options)

Factory function to create a fully configured CAM instance.

```typescript
interface CAMOptions {
  config?: PartialCAMConfig;      // Custom configuration
  memoryBasePath?: string;        // Custom memory path
  dependencies?: OrchestratorDependencies;  // For testing
  autoInitialize?: boolean;       // Auto-initialize memory
}

interface CAMInstance {
  orchestrator: Orchestrator;     // Central coordinator
  memory: MemoryScaffold;         // Memory operations
  configManager: ConfigManager;   // Configuration
  config: CAMConfig;              // Resolved config
  initialize(): Promise<void>;    // Initialize system
  shutdown(): Promise<void>;      // Graceful shutdown
}
```

### Orchestrator

The central coordinator that manages agents, skills, and tasks.

```typescript
const orchestrator = new Orchestrator(config, dependencies);

// Process a request
const result = await orchestrator.process({
  input: 'User input',
  sessionId: 'session-123',
  context: { ... },
  options: { preferredSkill: 'research' },
});

// Get state
const state = orchestrator.getState();
// { activeTasks, completedTasks, failedTasks, activeAgents, uptime }

// Access components
const taskManager = orchestrator.getTaskManager();
const securityManager = orchestrator.getSecurityManager();
const agentSpawner = orchestrator.getAgentSpawner();

// Shutdown
await orchestrator.shutdown();
```

### MemoryScaffold

Core memory management with security features.

```typescript
const memory = new MemoryScaffold(basePath, options);

await memory.initialize();           // Create directories
const validation = await memory.validate();  // Validate structure
const audit = await memory.runSecurityAudit();  // Security check

const fileOps = memory.getFileOps();       // File operations
const dirOps = memory.getDirectoryOps();   // Directory operations
const coreManager = memory.getCore();      // CORE context
const pipeline = memory.getPipeline();     // Memory tiers
```

### FileOperations

Safe file operations with locking.

```typescript
const fileOps = memory.getFileOps();

await fileOps.writeFile(path, content);
const content = await fileOps.readFile(path);
await fileOps.appendFile(path, content);
await fileOps.deleteFile(path);
const exists = await fileOps.exists(path);
const stats = await fileOps.getFileStats(path);

// JSONL operations
await fileOps.appendJsonLine(path, object);
const lines = await fileOps.readJsonLines(path);

// With file locking
await fileOps.withFileLock(path, async () => {
  // Exclusive access
});
```

### SkillManager

Manage and activate skills.

```typescript
const skillManager = new SkillManager(memoryBasePath);

await skillManager.loadSkills();
const skills = skillManager.listSkills();
const skill = skillManager.getSkill('research');
const valid = skillManager.validateSkill(skillDef);
```

### AgentSpawner

Create and manage agents.

```typescript
const spawner = new AgentSpawner();

// Register agent definitions
spawner.registerAgent(definition);

// Spawn an agent
const agent = await spawner.spawn('researcher', {
  sessionId: 'session-123',
});

// List agents
const activeAgents = spawner.listAgents();
const definitions = spawner.listAgentDefinitions();

// Terminate
await spawner.terminate(agent.id);
await spawner.terminateAll();
```

### Error Handling

All errors extend `InfiniteAuraError` with error codes:

```typescript
import { InfiniteAuraError, ErrorCodes, PathValidationError } from 'infinite-aura-ts';

try {
  await fileOps.readFile('../../../etc/passwd');
} catch (error) {
  if (error instanceof PathValidationError) {
    console.log(error.code);  // 'PATH_TRAVERSAL'
    console.log(error.toJSON());  // Serializable
  }
}
```

## Component Overview

| Component | Description | Key Classes |
|-----------|-------------|-------------|
| **Memory** | Core scaffold and operations | MemoryScaffold, FileOperations, CoreManager |
| **Context** | 4-layer context loading | DynamicContextLoader, PrepromptInjector |
| **Hooks** | Event capture and routing | SessionStartHook, PostToolUseHook, UOCS |
| **Skills** | Skill management | SkillManager, SkillRouter, SkillActivator |
| **Agents** | Agent spawning | Agent, AgentSpawner |
| **Orchestrator** | Central coordination | Orchestrator, TaskManager, SecurityManager |
| **Exceptions** | Custom error hierarchy | 14 exception classes |
| **Guardrails** | Security policy enforcement | 7 default policies |

## Development

### Project Structure

```
infinite-aura-ts/
├── src/
│   ├── index.ts             # Main entry point & CAM factory
│   ├── memory/              # Memory scaffold
│   ├── context/             # Context loading system
│   ├── hooks/               # Event hooks (UOCS)
│   ├── skills/              # Skill system
│   ├── agents/              # Agent system
│   ├── orchestrator/        # Central orchestrator
│   ├── cli/                 # CLI infrastructure
│   ├── persona/             # Persona management
│   ├── config/              # Configuration
│   ├── routing/             # Content routing
│   ├── learning/            # Learning detection
│   ├── history/             # History storage
│   ├── guardrails/          # Safety policies
│   └── exceptions/          # Error hierarchy
├── tests/                   # Test suite
├── docs/                    # Documentation
└── dist/                    # Compiled output
```

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

# Run tests with coverage
pnpm test:coverage

# Run all checks
pnpm check:all
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
| Unit | Individual function/class tests | 400+ |
| Integration | Component interaction tests | 100+ |
| Edge Cases | Boundary conditions, error paths | 30+ |
| Performance | Concurrent operations, stress tests | 10+ |
| **Total** | **All tests** | **500+** |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CAM_MEMORY_BASE_DIR` | Memory base directory | `~/.infinite-aura-ts/memory` |
| `CAM_ORCHESTRATOR_MAX_CONCURRENT` | Max concurrent tasks | `5` |
| `CAM_ORCHESTRATOR_TIMEOUT` | Default timeout (ms) | `30000` |
| `CAM_LLM_PROVIDER` | LLM provider | `anthropic` |
| `CAM_LLM_MODEL` | LLM model | `claude-3-sonnet-20240229` |
| `CAM_LLM_API_KEY` | API key | - |
| `CAM_LOG_LEVEL` | Log level | `info` |

### Configuration File

Configuration can be stored in `~/.infinite-aura-ts/config.json`:

```json
{
  "memory": {
    "baseDir": "/custom/path/memory"
  },
  "orchestrator": {
    "maxConcurrentTasks": 10,
    "defaultTimeout": 60000
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-sonnet-20240229"
  },
  "logging": {
    "level": "debug",
    "file": "/var/log/cam.log"
  }
}
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- **Daniel Miessler** - PAI/KAI vision and Operating Contract principles
- **Entity 1** - Target deployment platform
- **Operating Contract** - Core constraints (C1-C7) that guide the design
