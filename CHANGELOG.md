# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-06

### Phase 1 Complete - Memory Scaffold + Security + Tests

#### Added

**Exception Hierarchy (PROMPT 1)**
- `InfiniteAuraError` - Base exception class with error codes and serialization
- `PathValidationError` - Path validation failures
- `FileOperationError` - File I/O errors
- `SecurityError` - Security violations
- `ConfigurationError` - Configuration errors
- `MemoryError` - Memory scaffold failures
- `ContextError` - Context loading failures
- `ValidationError` - Data validation failures
- Guardrail exception classes (7 additional):
  - `GuardrailViolationError`
  - `ToolAccessDeniedError`
  - `FileSystemBoundaryError`
  - `DestructiveActionBlockedError`
  - `RateLimitExceededError`
  - `AppendOnlyViolationError`
  - `TextOnlyViolationError`

**Security Patterns (PROMPT 1)**
- 10-tier attack detection utilities
- Path traversal detection
- Command injection detection
- Null byte injection detection
- Absolute path detection
- Special file detection
- Dangerous protocol detection
- Encoding attack detection

**Guardrails Foundation (PROMPT 2)**
- 7 default security policies:
  - FILE_SYSTEM_BOUNDARY
  - PATH_TRAVERSAL_PREVENTION
  - DESTRUCTIVE_OPERATIONS
  - APPEND_ONLY_HISTORY
  - TEXT_ONLY_ENFORCEMENT
  - COMMAND_INJECTION_PREVENTION
  - RATE_LIMITING
- 8 guardrail interfaces
- Policy lookup helpers

**Memory Scaffold (PROMPT 3-5)**
- `MemoryScaffold` - Main facade class
- `PathValidator` - Path security with boundary enforcement
- `FileOperations` - File I/O with atomic writes and locking
- `DirectoryOperations` - Directory management with validation
- `FileNamingConvention` - Filename parsing and generation
- 18 UFC-style directories structure

**Security Hardening (PROMPT 6)**
- `SecurityAuditLogger` - JSONL audit logging
- File locking mechanism with stale lock detection
- Symlink protection (recursive detection)
- Permission validation
- Security audit functionality

**Testing (PROMPT 6)**
- 472 comprehensive tests
- 90.05% statement coverage
- 83.27% branch coverage
- 98.56% function coverage
- Unit tests for all components
- Integration tests
- Edge case tests
- Performance tests

**Documentation (PROMPT 7)**
- Comprehensive README.md
- API documentation (docs/api/README.md)
- Architecture documentation (docs/architecture/README.md)
- Phase 1 completion report (docs/phase1-completion.md)
- Verification report (docs/verification/phase1-verification.md)

**DevOps (PROMPT 7)**
- GitHub Actions CI workflow
- ESLint configuration
- Prettier configuration
- Jest configuration
- lint-staged for pre-commit hooks

#### Prompts Completed
1. PROMPT 1: Project Setup + Exception Hierarchy
2. PROMPT 2: Guardrails Foundation
3. PROMPT 3: Memory Scaffold Core
4. PROMPT 4: Path Validation + Security
5. PROMPT 5: File/Directory Operations
6. PROMPT 6: Security Hardening + Comprehensive Tests
7. PROMPT 7: Documentation + Git + Phase 1 Completion

---

## [Unreleased]

### Planned for Phase 2
- Hook System (pre/post operation hooks)
- Dynamic Context (real-time context assembly)
- Content Routing (intelligent file placement)
- Learning Engine (extract and store learnings)
- Living Hydration (session restoration)
