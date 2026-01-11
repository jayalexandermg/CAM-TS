/**
 * Infinite Aura - Entry point
 *
 * Context-Aware Memory (CAM) system for AI assistants.
 */

// Memory module
export * from './memory';

// Context module
export * from './context';

// Hooks module
export * from './hooks';

// Session module
export * from './session';

// Skills module
export * from './skills';

// Exceptions - use named exports to avoid conflicts
export {
  ErrorCodes,
  ErrorCode,
  ErrorDetails,
  SerializedError,
  InfiniteAuraError,
  PathValidationError,
  FileOperationError,
  SecurityError,
  ConfigurationError,
  MemoryError,
  ContextError,
  ValidationError,
  GuardrailViolationError,
  ToolAccessDeniedError,
  FileSystemBoundaryError,
  DestructiveActionBlockedError,
  RateLimitExceededError,
  AppendOnlyViolationError,
  TextOnlyViolationError,
  InvalidEventError,
  AggregateHandlerError,
} from './exceptions';
