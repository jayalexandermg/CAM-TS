# Spawn Parallel Agents Workflow

## Overview

The ParallelSpawner system enables concurrent agent execution with configurable concurrency limits, result aggregation strategies, and spot-check validation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       ParallelSpawner                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Configuration                                               ││
│  │  - concurrencyLimit: number                                  ││
│  │  - aggregationStrategy: merge | vote | first-success | all  ││
│  │  - timeout: number                                           ││
│  │  - spotCheck: SpotCheckConfig                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Batch Processor                                             ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                        ││
│  │  │ Agent 1 │ │ Agent 2 │ │ Agent N │  (concurrent batch)    ││
│  │  └─────────┘ └─────────┘ └─────────┘                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  SpotCheck Validator                                         ││
│  │  - Success validation                                        ││
│  │  - Data presence check                                       ││
│  │  - Error detection                                           ││
│  │  - Custom validators                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Result Aggregator                                           ││
│  │  - Merge: Combine object results                             ││
│  │  - Vote: Most common result wins                             ││
│  │  - First-Success: Return first successful result             ││
│  │  - All: Return array of all results                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Parallel Spawning

```typescript
import { ParallelSpawner } from '../src/agents/parallel';

const parallelSpawner = new ParallelSpawner();

const result = await parallelSpawner.spawnParallel({
  configs: [
    { definition: researcherDef, sessionId: 'session-1' },
    { definition: coderDef, sessionId: 'session-1' },
    { definition: reviewerDef, sessionId: 'session-1' },
  ],
  concurrencyLimit: 3,
  aggregationStrategy: 'merge',
});
```

### With Concurrency Limits

```typescript
// Process 10 agents, max 3 at a time
const result = await parallelSpawner.spawnParallel({
  configs: createAgentConfigs(10),
  concurrencyLimit: 3,
});
```

### With Spot-Check Validation

```typescript
import { SpotCheck } from '../src/agents/parallel';

const result = await parallelSpawner.spawnParallel({
  configs: agentConfigs,
  spotCheck: {
    enabled: true,
    sampleRate: 0.5, // Check 50% of results
    validators: [
      SpotCheck.createSuccessValidator(),
      SpotCheck.createDataPresentValidator(),
      SpotCheck.createCustomValidator(
        'quality-check',
        (result) => (result.metadata?.duration ?? 0) < 5000,
        'Execution took too long'
      ),
    ],
    failOnError: true,
  },
});
```

### Aggregation Strategies

#### Merge (Default)
Combines successful results into a single object:
```typescript
// Results: [{data: {a: 1}}, {data: {b: 2}}]
// Aggregated: {a: 1, b: 2}
```

#### Vote
Returns the most common result:
```typescript
// Results: ["yes", "yes", "no"]
// Aggregated: "yes"
```

#### First-Success
Returns the first successful result:
```typescript
const result = await parallelSpawner.spawnParallel({
  configs: agentConfigs,
  aggregationStrategy: 'first-success',
  stopOnFirstSuccess: true, // Stop processing after first success
});
```

#### All
Returns all results in an array:
```typescript
const result = await parallelSpawner.spawnParallel({
  configs: agentConfigs,
  aggregationStrategy: 'all',
});
// result.aggregatedResult = [
//   { agentId: 'agent_1', success: true, data: {...} },
//   { agentId: 'agent_2', success: true, data: {...} },
// ]
```

## Events

The ParallelSpawner emits events during execution:

```typescript
parallelSpawner.on('batchStarted', ({ batchIndex, batchSize }) => {
  console.log(`Starting batch ${batchIndex} with ${batchSize} agents`);
});

parallelSpawner.on('agentStarted', ({ agentId, index, total }) => {
  console.log(`Agent ${agentId} started (${index + 1}/${total})`);
});

parallelSpawner.on('agentCompleted', ({ agentId, result, duration }) => {
  console.log(`Agent ${agentId} completed in ${duration}ms`);
});

parallelSpawner.on('agentFailed', ({ agentId, error, duration }) => {
  console.log(`Agent ${agentId} failed: ${error.message}`);
});

parallelSpawner.on('batchCompleted', ({ batchIndex, results }) => {
  console.log(`Batch ${batchIndex} completed with ${results.length} results`);
});

parallelSpawner.on('spotCheckFailed', ({ agentId, results }) => {
  console.log(`Spot check failed for agent ${agentId}`);
});

parallelSpawner.on('allCompleted', ({ result }) => {
  console.log(`All agents completed. Success: ${result.success}`);
});
```

## SpotCheck Validators

### Built-in Validators

```typescript
// Check if result.success is true
SpotCheck.createSuccessValidator();

// Check if result.data is defined
SpotCheck.createDataPresentValidator();

// Check if result.error is undefined
SpotCheck.createNoErrorValidator();
```

### Custom Validators

```typescript
const customValidator = SpotCheck.createCustomValidator(
  'validator-name',
  (result, agent) => {
    // Return true if valid, false otherwise
    return result.data !== null;
  },
  'Optional failure message'
);
```

## Result Structure

```typescript
interface ParallelSpawnResult {
  success: boolean;              // True if any agent succeeded
  results: AgentExecutionResult[]; // Individual agent results
  aggregatedResult?: unknown;    // Combined result based on strategy
  spotCheckResults?: SpotCheckResult[]; // Validation results
  metadata: {
    totalAgents: number;
    successfulAgents: number;
    failedAgents: number;
    totalDuration: number;
    concurrencyLimit: number;
    aggregationStrategy: AggregationStrategy;
  };
}
```

## Best Practices

1. **Set appropriate concurrency limits** based on system resources and API rate limits
2. **Use spot-checks** for quality assurance on critical operations
3. **Choose the right aggregation strategy** for your use case
4. **Handle events** for monitoring and logging
5. **Set timeouts** to prevent hanging agents

## Error Handling

Errors in individual agents don't stop the entire batch:

```typescript
const result = await parallelSpawner.spawnParallel({
  configs: agentConfigs,
  timeout: 30000,
});

// Check for failures
const failures = result.results.filter(r => !r.result.success);
if (failures.length > 0) {
  console.log(`${failures.length} agents failed`);
}
```

## Integration with AgentComposer

```typescript
import { AgentComposer } from '../src/agents/factory/AgentComposer';
import { ParallelSpawner } from '../src/agents/parallel';

const composer = new AgentComposer();
await composer.ensureInitialized();

// Compose multiple agents
const definitions = await Promise.all([
  composer.compose({ mode: 'trait-based', traits: ['analytical', 'creative'] }),
  composer.compose({ mode: 'task-based', task: 'code-review' }),
  composer.compose({ mode: 'task-based', task: 'testing' }),
]);

// Spawn in parallel
const parallelSpawner = new ParallelSpawner();
const result = await parallelSpawner.spawnParallel({
  configs: definitions.map(d => ({
    definition: d.result.definition,
    sessionId: 'session-1',
  })),
  concurrencyLimit: 3,
});
```
