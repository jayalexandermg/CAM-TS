/**
 * Infinite Aura - Context-Aware Memory (CAM)
 *
 * A KAI-baseline personal AI memory and orchestrator system.
 * Provides persistent, evolving AI memory with self-healing capabilities.
 *
 * @packageDocumentation
 */

// =============================================================================
// Memory Module - Core memory scaffold and file operations
// =============================================================================
export {
  MemoryScaffold,
  ValidationResult,
  SecurityAuditResult,
  SecurityStatus,
  MemoryScaffoldOptions,
  PathValidator,
  FileNamingConvention,
  ParsedFilename,
  DirectoryOperations,
  DirectoryStats,
  DirectoryValidationResult,
  DirectoryOperationsOptions,
  FileOperations,
  FileStats,
  FileOperationsOptions,
  SecurityAuditLogger,
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
  SecurityAuditLoggerOptions,
  CoreManager,
  CoreContext,
  CoreManagerOptions,
  MemoryPipeline,
  MemoryTier,
  TierValidationResult,
  PromotionResult,
} from './memory';

// =============================================================================
// Context Module - 4-layer context loading and preprompt injection
// =============================================================================
export {
  // Types
  ContextLayer,
  ALL_CONTEXT_LAYERS,
  ContextRequest,
  UserContext,
  ProjectContext,
  SessionContext,
  AgentContext,
  RelevanceScores,
  LoadedContext,
  ContextConfig,
  CachedContext,
  DEFAULT_CONTEXT_CONFIG,
  DEFAULT_USER_CONTEXT,
  DEFAULT_RELEVANCE_SCORES,
  USER_CONTEXT_FILES,
  PROJECT_CONTEXT_FILES,
  AGENT_CONTEXT_FILES,
  // Preprompt hydrator types
  SkillAgentContext,
  ScoredContext,
  CachedLayer,
  PrepromptHydratorConfig,
  DEFAULT_PREPROMPT_HYDRATOR_CONFIG,
  LAYER_1_PRIORITIES,
  LAYER_2_PRIORITIES,
  LAYER_1_MARKERS,
  LAYER_2_MARKERS,
  LAYER_NAMES,
  // Loaders
  ContextLoader,
  UserContextLoader,
  ProjectContextLoader,
  SessionContextLoader,
  AgentContextLoader,
  // Relevance
  RelevanceScorer,
  RelevanceScorerConfig,
  DEFAULT_RELEVANCE_SCORER_CONFIG,
  // Cache
  ContextCache,
  ContextCacheConfig,
  DEFAULT_CONTEXT_CACHE_CONFIG,
  // Dynamic loader
  DynamicContextLoader,
  DynamicContextLoaderConfig,
  DEFAULT_DYNAMIC_CONTEXT_LOADER_CONFIG,
  // Preprompt
  PrepromptInjector,
  PrepromptInjectorOptions,
  PrepromptLayer,
  TokenManager,
  TokenManagerConfig,
  DEFAULT_TOKEN_MANAGER_CONFIG,
  PrepromptHydrator,
} from './context';

// =============================================================================
// Hooks Module - Event capture and routing system
// =============================================================================
export * from './hooks';

// =============================================================================
// Session Module - Session lifecycle management
// =============================================================================
export { SessionManager, SessionManagerOptions, SessionState } from './session';

// =============================================================================
// Skills Module - Skill management system
// =============================================================================
export {
  SkillManager,
  SkillParser,
  IntentMatcher,
  SkillRouter,
  SkillActivator,
  Skill,
  SkillDefinition,
  SkillWorkflow,
  SkillTool,
  SkillExample,
  SkillValidationResult,
  CreateSkillOptions,
  SKILL_STRUCTURE,
  SKILLS_DIR,
  IntentMatch,
  RoutingOptions,
  RoutingResult,
  RoutingEntry,
  SkillContext,
  ActiveSkill,
  ActivationResult,
  ActivationOptions,
} from './skills';

// =============================================================================
// Guardrails Module - Safety policy layer
// =============================================================================
export * from './guardrails';

// =============================================================================
// Routing Module - Content-based routing system
// =============================================================================
export * from './routing';

// =============================================================================
// Learning Module - Interestingness scoring and learning detection
// =============================================================================
export * from './learning';

// =============================================================================
// Agents Module - Agent spawning and management
// =============================================================================
export { Agent, AgentSpawner, BASE_AGENTS } from './agents';
export type { AgentDefinition, AgentConfig, AgentResult, AgentState, AgentStatus } from './agents';

// =============================================================================
// Orchestrator Module - Central coordination
// =============================================================================
export {
  Orchestrator,
  OrchestratorDependencies,
  TaskManager,
  Task,
  ErrorHandler,
  ErrorClassifier,
  RetryManager,
  SecurityManager,
  InputValidator,
  OutputSanitizer,
  ResourceLimiter,
  LLMClient,
} from './orchestrator';
export type {
  OrchestratorConfig,
  OrchestratorState,
  TaskRequest,
  TaskResult,
  TaskOptions,
  TaskMetadata,
  ErrorCategory,
  ErrorSeverity,
  ClassifiedError,
  RetryConfig,
  RetryResult,
  ResourceUsage,
  SecurityConfig,
  LLMConfig as OrchestratorLLMConfig,
  LLMResponse,
  LLMMessage,
  LLMRequest,
} from './orchestrator';

// =============================================================================
// History Module - UOCS and history storage
// =============================================================================
export { HistoryStorage, UOCS } from './history';
export type {
  HistoryEntry,
  HistoryEntryType,
  SessionTranscript,
  TranscriptTurn,
  Learning,
  Decision,
} from './history';

// =============================================================================
// CLI Module - Command-line interface
// =============================================================================
export {
  CommandParser,
  CommandRouter,
  InteractiveMode,
  OrchestratorBridge,
  Session as CLISession,
  SessionManager as CLISessionManager,
  HelpCommand,
  VersionCommand,
  InitCommand,
} from './cli';
export type { Command, CommandResult, CommandHandler } from './cli';

// =============================================================================
// Persona Module - Agent personality management
// =============================================================================
export { Persona, PersonaManager } from './persona';

// =============================================================================
// Config Module - Configuration management
// =============================================================================
export { ConfigManager, DEFAULT_CONFIG } from './config';
export type {
  CAMConfig,
  PartialCAMConfig,
  MemoryConfig,
  OrchestratorConfigSection,
  LLMConfig,
  LoggingConfig,
  LogLevel,
} from './config';

// =============================================================================
// Exceptions Module - Custom error hierarchy
// =============================================================================
export {
  // Error codes
  ErrorCodes,
  // Base error
  InfiniteAuraError,
  // Core errors
  PathValidationError,
  FileOperationError,
  SecurityError,
  ConfigurationError,
  MemoryError,
  ContextError,
  ValidationError,
  // Guardrail errors
  GuardrailViolationError,
  ToolAccessDeniedError,
  FileSystemBoundaryError,
  DestructiveActionBlockedError,
  RateLimitExceededError,
  AppendOnlyViolationError,
  TextOnlyViolationError,
  // Hook errors
  InvalidEventError,
  HandlerError,
  AggregateHandlerError,
  HookBlockedError,
} from './exceptions';
export type { ErrorCode, ErrorDetails, SerializedError } from './exceptions';

// =============================================================================
// CAM Factory - Main entry point for creating CAM instances
// =============================================================================

import { Orchestrator } from './orchestrator';
import type { OrchestratorDependencies } from './orchestrator';
import { MemoryScaffold } from './memory';
import type { MemoryScaffoldOptions } from './memory';
import { ConfigManager } from './config';
import type { CAMConfig, PartialCAMConfig } from './config';
import * as os from 'os';
import * as path from 'path';

/**
 * Options for creating a CAM instance
 */
export interface CAMOptions {
  /** Custom configuration (merged with defaults) */
  config?: PartialCAMConfig;

  /** Custom memory base path (defaults to ~/.infinite-aura-ts/memory) */
  memoryBasePath?: string;

  /** Optional dependencies for testing/customization */
  dependencies?: OrchestratorDependencies;

  /** Whether to initialize memory scaffold on creation */
  autoInitialize?: boolean;
}

/**
 * The main CAM instance containing all components
 */
export interface CAMInstance {
  /** The central orchestrator */
  orchestrator: Orchestrator;

  /** Memory scaffold for file operations */
  memory: MemoryScaffold;

  /** Configuration manager */
  configManager: ConfigManager;

  /** Full resolved configuration */
  config: CAMConfig;

  /** Initialize the CAM system (creates directories, etc.) */
  initialize(): Promise<void>;

  /** Shutdown the CAM system gracefully */
  shutdown(): Promise<void>;
}

/**
 * Create a new Context-Aware Memory (CAM) instance.
 *
 * This is the main entry point for using the Infinite Aura system.
 * It creates and wires together all the core components.
 *
 * @param options - Configuration options for the CAM instance
 * @returns A fully configured CAM instance
 *
 * @example
 * ```typescript
 * import { createCAM } from 'infinite-aura-ts';
 *
 * // Create with defaults
 * const cam = await createCAM();
 * await cam.initialize();
 *
 * // Process a request
 * const result = await cam.orchestrator.process({
 *   input: 'Hello, world!',
 *   sessionId: 'my-session',
 * });
 *
 * // Shutdown when done
 * await cam.shutdown();
 * ```
 *
 * @example
 * ```typescript
 * // Create with custom configuration
 * const cam = await createCAM({
 *   config: {
 *     orchestrator: {
 *       maxConcurrentTasks: 10,
 *     },
 *     logging: {
 *       level: 'debug',
 *     },
 *   },
 *   memoryBasePath: '/custom/path/memory',
 *   autoInitialize: true,
 * });
 * ```
 */
export async function createCAM(options: CAMOptions = {}): Promise<CAMInstance> {
  // Resolve memory base path
  const memoryBasePath =
    options.memoryBasePath || path.join(os.homedir(), '.infinite-aura-ts', 'memory');

  // Create config manager and apply custom config if provided
  const configManager = new ConfigManager();
  let config: CAMConfig;
  if (options.config) {
    config = configManager.update(options.config);
  } else {
    config = configManager.getConfig();
  }

  // Create memory scaffold
  const memoryOptions: MemoryScaffoldOptions = {
    enableSecurityAudit: true,
  };
  const memory = new MemoryScaffold(memoryBasePath, memoryOptions);

  // Create orchestrator with config
  const orchestrator = new Orchestrator(
    {
      maxConcurrentTasks: config.orchestrator.maxConcurrentTasks,
      defaultTimeout: config.orchestrator.defaultTimeout,
      enableLogging: true,
      memoryBasePath,
    },
    options.dependencies
  );

  // Create the CAM instance
  const cam: CAMInstance = {
    orchestrator,
    memory,
    configManager,
    config,

    async initialize(): Promise<void> {
      await memory.initialize();
    },

    async shutdown(): Promise<void> {
      await orchestrator.shutdown();
    },
  };

  // Auto-initialize if requested
  if (options.autoInitialize) {
    await cam.initialize();
  }

  return cam;
}

/**
 * Version information for the Infinite Aura package
 */
export const VERSION = '0.1.0';

/**
 * Package name
 */
export const PACKAGE_NAME = 'infinite-aura-ts';
