# Infinite Aura TS - API Documentation

Complete API reference for the Infinite Aura TypeScript memory system.

## Table of Contents

- [Memory Scaffold API](#memory-scaffold-api)
- [Path Validation API](#path-validation-api)
- [File Operations API](#file-operations-api)
- [Directory Operations API](#directory-operations-api)
- [Exception API](#exception-api)
- [Guardrails API](#guardrails-api)
- [Security Audit API](#security-audit-api)

---

## Memory Scaffold API

The main entry point for the memory system.

### Class: `MemoryScaffold`

```typescript
import { MemoryScaffold } from 'infinite-aura-ts';
```

#### Constructor

```typescript
constructor(basePath?: string, options?: MemoryScaffoldOptions)
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `basePath` | `string` | `~/.infinite-aura-ts/memory/` | Root path for memory storage |
| `options` | `MemoryScaffoldOptions` | `{}` | Configuration options |

**Options:**
```typescript
interface MemoryScaffoldOptions {
  enableSecurityAudit?: boolean;  // Enable audit logging (default: true)
  auditLogPath?: string;          // Path for audit log
  maxDepth?: number;              // Maximum directory depth (default: 3)
}
```

**Example:**
```typescript
// Default configuration
const scaffold = new MemoryScaffold();

// Custom path and options
const scaffold = new MemoryScaffold('/custom/path/', {
  enableSecurityAudit: true,
  maxDepth: 4
});
```

#### Methods

##### `initialize(): Promise<void>`

Initializes the memory scaffold by creating all required directories and initial files.

**Throws:** `MemoryError` if initialization fails

**Example:**
```typescript
const scaffold = new MemoryScaffold();
await scaffold.initialize();
```

##### `validate(): Promise<ValidationResult>`

Validates the memory scaffold structure.

**Returns:**
```typescript
interface ValidationResult {
  valid: boolean;       // True if structure is valid
  missing: string[];    // List of missing directories/files
  errors: string[];     // Validation errors encountered
  directories: number;  // Count of valid directories
  files: number;        // Count of valid files
}
```

**Example:**
```typescript
const result = await scaffold.validate();
if (!result.valid) {
  console.log('Missing:', result.missing);
}
```

##### `getPathValidator(): PathValidator`

Returns the PathValidator instance for path security operations.

##### `getDirectoryOps(): DirectoryOperations`

Returns the DirectoryOperations instance for directory management.

##### `getFileOps(): FileOperations`

Returns the FileOperations instance for file I/O.

##### `runSecurityAudit(): Promise<SecurityAuditResult>`

Runs a comprehensive security audit on the memory structure.

**Returns:**
```typescript
interface SecurityAuditResult {
  passed: boolean;                          // Overall audit result
  timestamp: Date;                          // When audit was run
  findings: string[];                       // Issues found
  directoryValidation: DirectoryValidationResult;
  symlinksBlocked: number;                  // Count of symlinks found
  permissionIssues: number;                 // Count of permission problems
  recommendations: string[];                // Suggested fixes
}
```

**Example:**
```typescript
const audit = await scaffold.runSecurityAudit();
if (!audit.passed) {
  console.log('Issues:', audit.findings);
  console.log('Recommendations:', audit.recommendations);
}
```

##### `getSecurityStatus(): Promise<SecurityStatus>`

Returns current security status.

**Returns:**
```typescript
interface SecurityStatus {
  lastAuditTime?: Date;
  violationCount: number;
  warnings: string[];
  isSecure: boolean;
}
```

##### `repairPermissions(): Promise<{repaired: string[], failed: string[]}>`

Attempts to repair file/directory permissions.

##### `destroy(): Promise<void>`

Removes all memory scaffold files and directories. **Use with caution.**

---

## Path Validation API

Security-focused path validation with attack detection.

### Class: `PathValidator`

```typescript
import { PathValidator } from 'infinite-aura-ts';
```

#### Constructor

```typescript
constructor(basePath: string)
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `basePath` | `string` | Base path for boundary enforcement |

#### Methods

##### `validate(inputPath: string): void`

Validates a path for security issues. Throws on any violation.

**Throws:**
- `PathValidationError` - Invalid path format
- `SecurityError` - Security violation (traversal, injection, etc.)

**Example:**
```typescript
const validator = new PathValidator('/home/user/.infinite-aura-ts/');

try {
  validator.validate('context/user.md');  // OK
  validator.validate('../../../etc/passwd');  // Throws SecurityError
} catch (error) {
  console.error('Security violation:', error.message);
}
```

##### `isWithinBoundary(absolutePath: string): boolean`

Checks if an absolute path is within the allowed boundary.

**Example:**
```typescript
const isValid = validator.isWithinBoundary('/home/user/.infinite-aura-ts/context/user.md');
// Returns: true
```

##### `resolvePath(relativePath: string): string`

Resolves a relative path to absolute, with security validation.

**Throws:** `PathValidationError`, `SecurityError`

**Example:**
```typescript
const absolute = validator.resolvePath('context/user.md');
// Returns: '/home/user/.infinite-aura-ts/memory/context/user.md'
```

##### `sanitizePath(inputPath: string): string`

Sanitizes a path by removing dangerous characters.

**Note:** This does NOT make a malicious path safe. Use for normalization only.

**Example:**
```typescript
const clean = validator.sanitizePath('context//user.md');
// Returns: 'context/user.md'
```

##### `isSymlink(absolutePath: string): Promise<boolean>`

Checks if a path is a symbolic link.

##### `validateNoSymlink(relativePath: string): Promise<void>`

Validates that a path is not a symbolic link.

**Throws:** `SecurityError` if symlink detected

##### `validateNoSymlinksInPath(relativePath: string): Promise<void>`

Validates that no component in the path hierarchy is a symlink.

##### `validatePermissions(relativePath: string, mode?: 'read' | 'write' | 'readwrite'): Promise<void>`

Validates file/directory permissions.

**Throws:** `FileOperationError` if permissions insufficient

##### `getPathDepth(relativePath: string): number`

Returns the depth of a path (number of directory levels).

##### `validateMaxDepth(relativePath: string, maxDepth?: number): void`

Validates that path depth doesn't exceed maximum.

**Throws:** `PathValidationError` if depth exceeded

##### `validateSecure(relativePath: string, options?: object): Promise<void>`

Enhanced validation including symlink and permission checks.

**Options:**
```typescript
{
  checkSymlinks?: boolean;    // Check for symlinks (default: true)
  checkPermissions?: boolean; // Check permissions (default: true)
  maxDepth?: number;          // Maximum depth to allow
}
```

---

## File Operations API

File I/O operations with locking and security.

### Class: `FileOperations`

```typescript
import { FileOperations } from 'infinite-aura-ts';
```

#### Methods

##### `readFile(relativePath: string): Promise<string>`

Reads a file and returns its content.

**Throws:** `FileOperationError` with code `FILE_NOT_FOUND` or `FILE_READ_ERROR`

**Example:**
```typescript
const content = await fileOps.readFile('context/user.md');
```

##### `writeFile(relativePath: string, content: string): Promise<void>`

Writes content to a file, creating parent directories if needed. Uses atomic write (temp file + rename).

**Throws:** `FileOperationError` with code `FILE_WRITE_ERROR`

**Example:**
```typescript
await fileOps.writeFile('context/notes.md', '# Notes\n\nContent here.');
```

##### `appendFile(relativePath: string, content: string): Promise<void>`

Appends content to a file. Ensures content ends with newline.

**Throws:** `FileOperationError` with code `FILE_APPEND_ERROR`

**Example:**
```typescript
await fileOps.appendFile('history/raw-outputs/log.txt', 'New log entry');
```

##### `fileExists(relativePath: string): Promise<boolean>`

Checks if a file exists.

**Example:**
```typescript
if (await fileOps.fileExists('context/user.md')) {
  // File exists
}
```

##### `deleteFile(relativePath: string): Promise<void>`

Deletes a file. **Blocked for files in history/ directory** (append-only policy).

**Throws:**
- `DestructiveActionBlockedError` for history/ files
- `FileOperationError` for other errors

**Example:**
```typescript
await fileOps.deleteFile('context/temp.md');  // OK
await fileOps.deleteFile('history/log.jsonl');  // Throws DestructiveActionBlockedError
```

##### `copyFile(sourceRelativePath: string, destRelativePath: string): Promise<void>`

Copies a file from source to destination.

##### `getFileStats(relativePath: string): Promise<FileStats>`

Gets file statistics.

**Returns:**
```typescript
interface FileStats {
  size: number;     // File size in bytes
  created: Date;    // Creation time
  modified: Date;   // Last modified time
  lines: number;    // Line count
  path: string;     // File path
}
```

##### `appendJsonLine(relativePath: string, data: object): Promise<void>`

Appends a JSON object as a single line (JSONL format).

**Example:**
```typescript
await fileOps.appendJsonLine('history/learnings/2024-01.jsonl', {
  timestamp: new Date().toISOString(),
  learning: 'Important insight',
  confidence: 0.9
});
```

##### `readJsonLines<T>(relativePath: string): Promise<T[]>`

Reads a JSONL file and parses all lines.

**Example:**
```typescript
interface Learning {
  timestamp: string;
  learning: string;
  confidence: number;
}

const learnings = await fileOps.readJsonLines<Learning>('history/learnings/2024-01.jsonl');
```

### File Locking

##### `lockFile(relativePath: string, timeoutMs?: number): Promise<void>`

Acquires an exclusive lock on a file. Handles stale locks (>60 seconds).

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `relativePath` | `string` | - | Path to lock |
| `timeoutMs` | `number` | `5000` | Timeout for acquiring lock |

**Throws:** `FileOperationError` on timeout or failure

##### `unlockFile(relativePath: string): Promise<void>`

Releases a file lock.

##### `isLocked(relativePath: string): Promise<boolean>`

Checks if a file is currently locked.

##### `withFileLock<T>(relativePath: string, operation: () => Promise<T>, timeoutMs?: number): Promise<T>`

Executes an operation with exclusive file lock. Automatically releases lock when done.

**Example:**
```typescript
const result = await fileOps.withFileLock('context/user.md', async () => {
  const content = await fileOps.readFile('context/user.md');
  await fileOps.writeFile('context/user.md', content + '\nNew line');
  return 'success';
});
```

##### `verifyFileIntegrity(relativePath: string): Promise<boolean>`

Verifies file integrity (exists, within boundary, no symlinks, readable).

##### `releaseAllLocks(): Promise<void>`

Releases all active locks (cleanup operation).

---

## Directory Operations API

Directory management with security validation.

### Class: `DirectoryOperations`

```typescript
import { DirectoryOperations } from 'infinite-aura-ts';
```

#### Methods

##### `createDirectory(relativePath: string): Promise<void>`

Creates a directory (and parents if needed).

**Example:**
```typescript
await dirOps.createDirectory('projects/new-project');
```

##### `directoryExists(relativePath: string): Promise<boolean>`

Checks if a directory exists.

##### `listDirectories(relativePath: string): Promise<string[]>`

Lists subdirectories in a directory.

**Throws:** `FileOperationError` with code `DIRECTORY_NOT_FOUND`

**Example:**
```typescript
const dirs = await dirOps.listDirectories('history');
// Returns: ['raw-outputs', 'learnings', 'sessions', 'research', 'decisions', 'execution']
```

##### `listFiles(relativePath: string): Promise<string[]>`

Lists files in a directory.

##### `getDirectoryStats(relativePath: string): Promise<DirectoryStats>`

Gets directory statistics.

**Returns:**
```typescript
interface DirectoryStats {
  size: number;       // Total size of files
  fileCount: number;  // Number of files
  subdirCount: number;// Number of subdirectories
  created: Date;
  modified: Date;
  path: string;
}
```

##### `removeDirectory(relativePath: string, recursive?: boolean): Promise<void>`

Removes a directory. Set `recursive: true` to remove non-empty directories.

##### `validateDirectoryStructure(relativePath?: string, expectedDirs?: string[]): Promise<DirectoryValidationResult>`

Validates directory structure for security issues.

**Returns:**
```typescript
interface DirectoryValidationResult {
  valid: boolean;
  issues: string[];
  symlinksFound: string[];
  permissionIssues: string[];
  depthViolations: string[];
}
```

##### `enforceMaxDepth(relativePath: string, maxDepth?: number): Promise<void>`

Enforces maximum directory depth constraint.

**Throws:** `ValidationError` if depth exceeded

---

## Exception API

Custom exception hierarchy with error codes.

### Base Class: `InfiniteAuraError`

```typescript
import { InfiniteAuraError, ErrorCodes } from 'infinite-aura-ts';
```

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `code` | `ErrorCode` | Machine-readable error code |
| `details` | `ErrorDetails` | Additional error context |
| `timestamp` | `Date` | When error occurred |

**Methods:**
- `toJSON()` - Serialize to JSON-compatible object
- `toString()` - String representation

### Exception Classes

| Class | Code | Description |
|-------|------|-------------|
| `PathValidationError` | `INVALID_PATH`, `PATH_TRAVERSAL`, `PATH_TOO_LONG` | Path validation failures |
| `FileOperationError` | `FILE_NOT_FOUND`, `FILE_READ_ERROR`, `FILE_WRITE_ERROR`, `FILE_APPEND_ERROR` | File I/O errors |
| `SecurityError` | `SECURITY_VIOLATION`, `UNAUTHORIZED_ACCESS`, `COMMAND_INJECTION`, `NULL_BYTE_INJECTION`, `SYMLINK_DETECTED` | Security violations |
| `ConfigurationError` | `CONFIG_INVALID`, `CONFIG_MISSING`, `CONFIG_PARSE_ERROR` | Configuration errors |
| `MemoryError` | `MEMORY_INIT_ERROR`, `MEMORY_LOAD_ERROR`, `MEMORY_SAVE_ERROR`, `MEMORY_CORRUPT` | Memory scaffold errors |
| `ContextError` | `CONTEXT_LOAD_ERROR`, `CONTEXT_PARSE_ERROR`, `CONTEXT_NOT_FOUND` | Context loading errors |
| `ValidationError` | `VALIDATION_FAILED`, `SCHEMA_MISMATCH`, `REQUIRED_FIELD_MISSING` | Data validation errors |

### Guardrail Exception Classes

| Class | Code | Description |
|-------|------|-------------|
| `GuardrailViolationError` | `GUARDRAIL_VIOLATION` | Base guardrail violation |
| `ToolAccessDeniedError` | `TOOL_ACCESS_DENIED` | Tool usage blocked |
| `FileSystemBoundaryError` | `FILESYSTEM_BOUNDARY` | Outside allowed paths |
| `DestructiveActionBlockedError` | `DESTRUCTIVE_ACTION_BLOCKED` | Dangerous operation blocked |
| `RateLimitExceededError` | `RATE_LIMIT_EXCEEDED` | Rate limit hit |
| `AppendOnlyViolationError` | `APPEND_ONLY_VIOLATION` | Append-only policy violation |
| `TextOnlyViolationError` | `TEXT_ONLY_VIOLATION` | Binary file detected |

### Error Codes

```typescript
const ErrorCodes = {
  // Base
  UNKNOWN: 'UNKNOWN',

  // Path validation
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  INVALID_PATH: 'INVALID_PATH',
  PATH_TOO_LONG: 'PATH_TOO_LONG',

  // File operations
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  FILE_APPEND_ERROR: 'FILE_APPEND_ERROR',
  FILE_EXISTS: 'FILE_EXISTS',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',

  // Security
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  COMMAND_INJECTION: 'COMMAND_INJECTION',
  NULL_BYTE_INJECTION: 'NULL_BYTE_INJECTION',
  SYMLINK_DETECTED: 'SYMLINK_DETECTED',

  // Guardrails
  GUARDRAIL_VIOLATION: 'GUARDRAIL_VIOLATION',
  TOOL_ACCESS_DENIED: 'TOOL_ACCESS_DENIED',
  FILESYSTEM_BOUNDARY: 'FILESYSTEM_BOUNDARY',
  DESTRUCTIVE_ACTION_BLOCKED: 'DESTRUCTIVE_ACTION_BLOCKED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  APPEND_ONLY_VIOLATION: 'APPEND_ONLY_VIOLATION',
  TEXT_ONLY_VIOLATION: 'TEXT_ONLY_VIOLATION',
  // ... and more
};
```

**Example:**
```typescript
try {
  await fileOps.readFile('nonexistent.md');
} catch (error) {
  if (error instanceof FileOperationError && error.code === ErrorCodes.FILE_NOT_FOUND) {
    console.log('File does not exist');
  }
}
```

---

## Guardrails API

Security policy enforcement layer.

### Interfaces

#### `GuardrailPolicy`

```typescript
interface GuardrailPolicy {
  id: string;                                    // Unique identifier
  name: string;                                  // Human-readable name
  description: string;                           // What the policy enforces
  enabled: boolean;                              // Is policy active
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'warn' | 'block' | 'log';
  appliesTo?: string[];                          // Paths/operations covered
  excludes?: string[];                           // Excluded paths
}
```

#### `GuardrailResult`

```typescript
interface GuardrailResult {
  allowed: boolean;             // Is action allowed
  violations: GuardrailViolation[];
  warnings: string[];
  checkDurationMs?: number;
}
```

### Default Policies

| Policy ID | Name | Severity | Description |
|-----------|------|----------|-------------|
| `file-system-boundary` | File System Boundary | critical | Blocks access outside ~/.infinite-aura-ts/ |
| `path-traversal-prevention` | Path Traversal Prevention | critical | Blocks ../, absolute paths |
| `destructive-operations` | Destructive Operations Guard | high | Requires confirmation for delete/truncate |
| `append-only-history` | Append-Only History | critical | Enforces append-only for history/ |
| `text-only-enforcement` | Text-Only Enforcement | high | Blocks binary files |
| `command-injection-prevention` | Command Injection Prevention | critical | Blocks shell metacharacters |
| `rate-limiting` | Rate Limiting | medium | Prevents excessive operations |

### Policy Functions

```typescript
import { getPolicyById, getPoliciesBySeverity, getEnabledPolicies, isCriticalPolicy } from 'infinite-aura-ts';

// Get a specific policy
const policy = getPolicyById('file-system-boundary');

// Get all critical policies
const critical = getPoliciesBySeverity('critical');

// Get enabled policies
const enabled = getEnabledPolicies();

// Check if policy is critical
const isCritical = isCriticalPolicy('file-system-boundary');  // true
```

---

## Security Audit API

Audit logging for security events.

### Class: `SecurityAuditLogger`

```typescript
import { SecurityAuditLogger, SecurityEventType } from 'infinite-aura-ts';
```

#### Event Types

```typescript
enum SecurityEventType {
  ACCESS_ATTEMPT = 'ACCESS_ATTEMPT',
  VIOLATION = 'VIOLATION',
  BOUNDARY_CHECK = 'BOUNDARY_CHECK',
  SYMLINK_DETECTED = 'SYMLINK_DETECTED',
  PERMISSION_CHECK = 'PERMISSION_CHECK',
  FILE_LOCK = 'FILE_LOCK',
  FILE_UNLOCK = 'FILE_UNLOCK',
  SECURITY_AUDIT = 'SECURITY_AUDIT',
  INITIALIZATION = 'INITIALIZATION',
}
```

#### Methods

##### `logSecurityEvent(type, severity, message, details?): Promise<SecurityEvent>`

Logs a security event.

##### `logViolation(violation: GuardrailViolation): Promise<SecurityEvent>`

Logs a guardrail violation.

##### `logAccessAttempt(filePath, action, allowed, reason?): Promise<SecurityEvent>`

Logs a file access attempt.

##### `logFileLock(filePath, acquired): Promise<SecurityEvent>`

Logs file lock/unlock operations.

##### `getRecentEvents(limit?): Promise<SecurityEvent[]>`

Gets recent security events from audit log.

##### `getViolations(limit?): Promise<SecurityEvent[]>`

Gets recent violation events.

---

## Security Patterns

Attack detection utilities.

### Class: `SecurityPatterns`

```typescript
import { SecurityPatterns } from 'infinite-aura-ts';
```

#### Detection Methods

| Method | Detects |
|--------|---------|
| `detectPathTraversal(input)` | ../, URL-encoded variants, etc. |
| `detectCommandInjection(input)` | Shell metacharacters, pipes, etc. |
| `detectNullByte(input)` | Null byte injection attempts |
| `detectAbsolutePath(input)` | Absolute paths (Unix, Windows, UNC) |
| `detectSpecialFile(input)` | Device files, /proc, /etc/passwd |
| `detectDangerousProtocol(input)` | javascript:, data:, file: URIs |
| `detectEncodingAttack(input)` | Double encoding, hex, unicode |

**Example:**
```typescript
const result = SecurityPatterns.detectPathTraversal('../../../etc/passwd');
if (result.detected) {
  console.log('Violations:', result.violations);
}

// Check all patterns at once
const allResults = SecurityPatterns.checkAll(input);

// Quick check if any violation
const hasViolation = SecurityPatterns.hasAnyViolation(input);
```
