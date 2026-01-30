# Verification Checklist

Comprehensive verification documentation for Infinite Aura TS (CAM - Context-Aware Memory) - a self-healing, self-improving memory system for AI agents.

## Quick Start

Run all verification checks with:

```bash
./verify.sh
```

Or run individual checks:

```bash
./verify.sh --type, -t      # Type checking only
./verify.sh --lint, -l      # Linting only
./verify.sh --format, -f    # Format checking only
./verify.sh --test, -T      # Tests only
./verify.sh --coverage, -c  # Tests with coverage
./verify.sh --security, -s  # Security audit
./verify.sh --build, -b     # Build verification
./verify.sh --all, -a       # All checks (default)
./verify.sh --quick, -q     # Quick checks (type, lint, format)
./verify.sh --help, -h      # Show help
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | One or more checks failed |

---

## Tier 1: Essential Checks (Required)

These checks must pass before any commit or merge.

### 1. TypeScript Type Checking

**Command:** `pnpm typecheck`

**What it verifies:**
- [ ] All types are correctly defined
- [ ] No implicit `any` types (strict mode)
- [ ] Correct function return types
- [ ] Null/undefined safety (strictNullChecks)
- [ ] No unused locals/parameters

**Expected result:** Exit code 0, no errors

### 2. ESLint Rules Compliance

**Command:** `pnpm lint`

**What it verifies:**
- [ ] No explicit `any` types (`@typescript-eslint/no-explicit-any`)
- [ ] Explicit function return types (`@typescript-eslint/explicit-function-return-type`)
- [ ] No unused variables (`@typescript-eslint/no-unused-vars`)
- [ ] ESLint recommended rules
- [ ] TypeScript-ESLint recommended rules

**Expected result:** Exit code 0, no warnings or errors

### 3. Code Formatting

**Command:** `pnpm format:check`

**What it verifies:**
- [ ] Consistent indentation (2 spaces)
- [ ] Semicolons present
- [ ] Single quotes for strings
- [ ] Trailing commas (ES5 style)
- [ ] Line width <= 100 characters
- [ ] LF line endings

**Expected result:** Exit code 0, all files formatted correctly

### 4. Unit & Integration Tests

**Command:** `pnpm test`

**What it verifies:**
- [ ] All 109+ test files pass
- [ ] Unit tests for all modules
- [ ] Integration tests for key systems:
  - [ ] CLI integration
  - [ ] Context system integration
  - [ ] Hook system integration
  - [ ] Learning system integration
  - [ ] Routing system integration
- [ ] Error path coverage
- [ ] Edge case handling

**Expected result:** Exit code 0, all tests passing

### 5. Test Coverage Thresholds

**Command:** `pnpm test:coverage`

**Coverage requirements (minimum 80%, target 90%+):**
- [ ] Branches: >= 80%
- [ ] Functions: >= 80%
- [ ] Lines: >= 80%
- [ ] Statements: >= 80%

**Expected result:** Exit code 0, coverage meets thresholds

---

## Tier 2: CI/CD Checks

These checks run automatically in the CI pipeline.

### 6. Composite Check

**Command:** `pnpm check:all`

**Executes in order:**
1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm test`

**Expected result:** Exit code 0, all checks pass

### 7. Pre-commit Hooks

**Command:** `pnpm precommit`

**What it verifies:**
- [ ] Staged TypeScript files pass ESLint (with auto-fix)
- [ ] Staged files are formatted with Prettier
- [ ] Type checking passes for staged files
- [ ] JSON/Markdown files are formatted

**Expected result:** Exit code 0, hooks pass

### 8. Security Audit

**Command:** `pnpm audit`

**What it verifies:**
- [ ] No high severity vulnerabilities
- [ ] No critical severity vulnerabilities
- [ ] Moderate vulnerabilities reviewed

**Expected result:** Exit code 0, no moderate+ vulnerabilities

---

## Tier 3: Specialized Checks

### 9. Error Path Coverage

**Test files:**
- `tests/coverage/error-paths.test.ts`
- `tests/orchestrator/errors/ErrorClassifier.test.ts`
- `tests/orchestrator/errors/ErrorHandler.test.ts`
- `tests/orchestrator/errors/RetryManager.test.ts`

**What it verifies:**
- [ ] FileOperationError handling
- [ ] SecurityError handling
- [ ] ConfigurationError handling
- [ ] MemoryError handling
- [ ] ContextError handling
- [ ] ValidationError handling
- [ ] GuardrailViolationError handling
- [ ] Retry logic with backoff
- [ ] Error classification accuracy

### 10. Integration Test Suites

**Test files:**
- `tests/cli/integration.test.ts`
- `tests/context/integration/context-system.integration.test.ts`
- `tests/hooks/integration/hook-system.integration.test.ts`
- `tests/learning/integration/learning-system.integration.test.ts`
- `tests/routing/integration/routing-system.integration.test.ts`

**What it verifies:**
- [ ] Component interactions work correctly
- [ ] Cross-module data flow
- [ ] System behavior under realistic conditions

### 11. Edge Case Testing

**Test file:** `tests/edge-cases/boundary-conditions.test.ts`

**What it verifies:**
- [ ] Boundary conditions
- [ ] Extreme input values
- [ ] Empty/null handling
- [ ] Large data handling

---

## Tier 4: Pre-Release Verification

### 12. Build Artifact Verification

**Command:** `pnpm build`

**What it verifies:**
- [ ] TypeScript compiles to JavaScript
- [ ] Type definitions (.d.ts) generated
- [ ] Source maps generated
- [ ] Output in dist/ directory

**Expected result:** Exit code 0, dist/ populated

### 13. CLI Execution Test

**Commands:**
```bash
pnpm build:cli
./dist/cli/main.js --help
```

**What it verifies:**
- [ ] CLI is executable
- [ ] Help output displays correctly
- [ ] No runtime errors on startup

### 14. Dependency Lockfile Integrity

**Command:** `pnpm install --frozen-lockfile`

**What it verifies:**
- [ ] pnpm-lock.yaml is up to date
- [ ] Reproducible installations
- [ ] No missing dependencies

---

## Module-Specific Verification

### Memory System (`src/memory/`)
- [ ] File operations handle permissions correctly
- [ ] Security layer validates all paths
- [ ] Atomic writes with temp file strategy
- [ ] Proper cleanup on errors

### Orchestrator (`src/orchestrator/`)
- [ ] Task scheduling works correctly
- [ ] Error handling and retry logic
- [ ] State management consistency

### Agents (`src/agents/`)
- [ ] Agent spawning and lifecycle
- [ ] Profile and trait management
- [ ] Factory pattern implementation

### Context System (`src/context/`)
- [ ] 4-layer context loading
- [ ] Preprompt injection
- [ ] Context merging

### Guardrails (`src/guardrails/`)
- [ ] Safety policy enforcement
- [ ] Content validation
- [ ] Rate limiting

### Skills (`src/skills/`)
- [ ] Skill parsing and routing
- [ ] Skill execution
- [ ] Error handling

---

## Verification Status Template

Use this template for release verification:

```markdown
## Release Verification: v[VERSION]

Date: [DATE]
Verified by: [NAME]

### Essential Checks
- [ ] TypeScript type checking: PASS/FAIL
- [ ] ESLint compliance: PASS/FAIL
- [ ] Code formatting: PASS/FAIL
- [ ] Unit tests: PASS/FAIL ([X]/[Y] tests)
- [ ] Coverage: PASS/FAIL ([X]% lines)

### CI/CD Checks
- [ ] check:all: PASS/FAIL
- [ ] Pre-commit hooks: PASS/FAIL
- [ ] Security audit: PASS/FAIL

### Pre-Release
- [ ] Build successful: PASS/FAIL
- [ ] CLI functional: PASS/FAIL
- [ ] Lockfile valid: PASS/FAIL

### Notes
[Any issues or observations]
```

---

## Automation

The `verify.sh` script automates all checks:

```bash
# Make executable (first time only)
chmod +x verify.sh

# Run all checks
./verify.sh

# Run specific check
./verify.sh --coverage
```

Exit codes:
- `0`: All checks passed
- `1`: One or more checks failed

---

## Troubleshooting

### Type Errors
```bash
# Get detailed type errors
pnpm exec tsc --noEmit --pretty
```

### Lint Errors
```bash
# Auto-fix lint errors
pnpm lint:fix
```

### Format Errors
```bash
# Auto-fix format errors
pnpm format
```

### Test Failures
```bash
# Run specific test file
pnpm test -- path/to/test.ts

# Run tests in watch mode
pnpm test:watch
```

### Coverage Gaps
```bash
# Generate HTML coverage report
pnpm test:coverage
# Open coverage/lcov-report/index.html
```

---

## Module Coverage Summary

| Module | Unit Tests | Integration | Error Paths | Status |
|--------|------------|-------------|-------------|--------|
| `agents/` | Yes | - | Yes | Active |
| `cli/` | Yes | Yes | Yes | Active |
| `config/` | Yes | - | Yes | Active |
| `context/` | Yes | Yes | Yes | Active |
| `exceptions/` | Yes | - | - | Active |
| `guardrails/` | Yes | - | Yes | Active |
| `history/` | Yes | - | Yes | Active |
| `hooks/` | Yes | Yes | Yes | Active |
| `learning/` | Yes | Yes | Yes | Active |
| `memory/` | Yes | - | Yes | Active |
| `observability/` | Yes | - | Yes | Active |
| `orchestrator/` | Yes | - | Yes | Active |
| `persona/` | Yes | - | Yes | Active |
| `routing/` | Yes | Yes | Yes | Active |
| `skills/` | Yes | - | Yes | Active |

---

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on:
- Push to `main`/`master`
- Pull requests to `main`/`master`

### Pipeline Steps
1. Checkout repository
2. Install pnpm v9
3. Setup Node.js 20.x with cache
4. Install dependencies (`--frozen-lockfile`)
5. Run `pnpm check:all`
6. Run `pnpm precommit`
7. Upload coverage to Codecov

---

## Pre-Commit Checklist

Before committing, ensure:

- [ ] `./verify.sh --quick` passes
- [ ] New code has corresponding tests
- [ ] Coverage thresholds maintained (80%+ min, 90%+ target)
- [ ] No `any` types introduced
- [ ] Error paths tested
- [ ] Documentation updated if needed

---

## Release Checklist

Before releasing:

- [ ] `./verify.sh --all` passes
- [ ] `pnpm build` succeeds
- [ ] CLI executable works (`./dist/cli/main.js --help`)
- [ ] All integration tests pass
- [ ] Security audit clean
- [ ] CHANGELOG updated
- [ ] Version bumped appropriately
- [ ] Git tag created
