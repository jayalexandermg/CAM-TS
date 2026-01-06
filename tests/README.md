# Infinite Aura - Test Suite

## Overview

This directory contains the comprehensive test suite for Infinite Aura TypeScript memory system. The tests are organized into several categories to ensure thorough coverage of all functionality.

## Test Structure

```
tests/
├── exceptions/          # Exception class tests
│   ├── base.test.ts     # InfiniteAuraError tests
│   ├── core.test.ts     # Core exception tests
│   ├── guardrails.test.ts # Guardrail exception tests
│   └── security-patterns.test.ts # Security pattern tests
├── guardrails/          # Guardrails policy tests
│   └── policies.test.ts # Policy configuration tests
├── memory/              # Memory scaffold tests
│   ├── path-validator.test.ts # Path validation tests
│   ├── file-naming.test.ts # File naming convention tests
│   ├── directory-operations.test.ts # Directory ops tests
│   ├── file-operations.test.ts # File ops tests
│   ├── scaffold.test.ts # Memory scaffold tests
│   ├── security-audit.test.ts # Security audit tests
│   └── security-hardening.test.ts # Security hardening tests
├── integration/         # End-to-end integration tests
│   └── memory-workflow.test.ts # Complete workflow tests
├── edge-cases/          # Boundary condition tests
│   └── boundary-conditions.test.ts # Edge case tests
├── performance/         # Performance benchmarks
│   └── basic-benchmarks.test.ts # Basic perf tests
├── utils/               # Test utilities
│   └── test-helpers.ts  # Reusable test helpers
└── README.md            # This file
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Specific Test File
```bash
pnpm test -- tests/memory/scaffold.test.ts
```

### Run Tests by Pattern
```bash
pnpm test -- --testPathPattern="integration"
pnpm test -- --testPathPattern="edge-cases"
pnpm test -- --testPathPattern="performance"
```

### Run Tests with Verbose Output
```bash
pnpm test -- --verbose
```

## Test Categories

### Unit Tests (exceptions/, guardrails/, memory/)
- Test individual classes and functions in isolation
- Mock external dependencies when needed
- Focus on specific behavior and error handling

### Integration Tests (integration/)
- Test complete workflows end-to-end
- Use real file system operations
- Test component interactions

### Edge Case Tests (edge-cases/)
- Test boundary conditions
- Test with extreme inputs
- Test error recovery
- Test concurrent operations

### Performance Tests (performance/)
- Basic performance benchmarks
- Not comprehensive performance testing
- Sanity checks for major operations

## Test Utilities

The `tests/utils/test-helpers.ts` file provides reusable utilities:

### Scaffold Helpers
```typescript
// Create temporary test scaffold
const { scaffold, tempDir } = await createTempMemoryScaffold();

// Cleanup after tests
await cleanupTempScaffold(tempDir);
```

### Assertion Helpers
```typescript
// Assert async function throws
await assertThrowsAsync(
  async () => { throw new Error('test'); },
  Error,
  'test'
);

// Assert audit log contains entry
const event = await assertAuditLogContains(
  auditLogger,
  SecurityEventType.VIOLATION,
  'expected message'
);
```

### Performance Helpers
```typescript
// Measure execution time
const { result, timeMs } = await measureTime(async () => {
  return await someOperation();
});

// Run benchmark
const { avgMs, minMs, maxMs } = await benchmark(
  async () => { await operation(); },
  10 // iterations
);
```

## Writing New Tests

### Naming Conventions
- Test files: `*.test.ts`
- Describe blocks: Match class/function name
- Test cases: Start with "should"

### Test Structure
```typescript
describe('ClassName', () => {
  // Setup
  let instance: ClassName;
  let tempDir: string;

  beforeEach(async () => {
    // Initialize for each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  describe('methodName', () => {
    it('should do expected behavior', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle error case', async () => {
      // Test error handling
    });
  });
});
```

### Best Practices
1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up temp files/directories
3. **Determinism**: Tests should be deterministic (no flaky tests)
4. **Speed**: Keep unit tests fast (<100ms each)
5. **Clarity**: Test names should describe expected behavior
6. **Coverage**: Test both success and error paths

## Coverage Targets

| Category | Target |
|----------|--------|
| Overall | >90% |
| Exceptions | >95% |
| Memory | >90% |
| Guardrails | >90% |
| Branches | >80% |

## Adding Integration Tests

Integration tests should:
1. Test complete workflows
2. Use real file system (no mocks)
3. Test component interactions
4. Clean up all created files

Example:
```typescript
describe('Integration: Feature Workflow', () => {
  let scaffold: MemoryScaffold;
  let tempDir: string;

  beforeEach(async () => {
    const result = await createTempMemoryScaffold();
    scaffold = result.scaffold;
    tempDir = result.tempDir;
  });

  afterEach(async () => {
    await cleanupTempScaffold(tempDir);
  });

  it('should complete full workflow', async () => {
    // Test complete workflow
  });
});
```

## Debugging Tests

### Run Single Test
```bash
pnpm test -- --testNamePattern="should create all 18 directories"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/memory/scaffold.test.ts
```

### View Coverage Report
```bash
pnpm test:coverage
open coverage/lcov-report/index.html
```

## CI/CD Integration

Tests are run automatically on:
- Pre-commit (via lint-staged)
- Pull requests
- Main branch pushes

The `pnpm check:all` command runs:
1. TypeScript type checking
2. ESLint
3. Prettier format check
4. Jest tests
