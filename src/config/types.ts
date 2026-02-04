/**
 * Configuration Types
 *
 * Type definitions for the CAM configuration system.
 */

import { LLMProvider, LLMModel } from '../llm/types';

/**
 * Log levels for the logging system
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Memory configuration options
 */
export interface MemoryConfig {
  /** Base directory for memory storage */
  baseDir: string;
}

/**
 * Orchestrator configuration options
 */
export interface OrchestratorConfigSection {
  /** Maximum concurrent tasks allowed */
  maxConcurrentTasks: number;
  /** Default timeout for tasks in milliseconds */
  defaultTimeout: number;
}

/**
 * LLM provider configuration options
 */
export interface LLMConfigSection {
  /** LLM provider name (e.g., 'anthropic', 'mock') */
  provider: LLMProvider;
  /** Model name to use */
  model: LLMModel;
  /** API key for the provider (optional, can use env vars) */
  apiKey?: string;
}

/**
 * Logging configuration options
 */
export interface LoggingConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Optional file path for log output */
  file?: string;
}

/**
 * Main CAM configuration interface
 */
export interface CAMConfig {
  /** Memory system configuration */
  memory: MemoryConfig;
  /** Orchestrator configuration */
  orchestrator: OrchestratorConfigSection;
  /** LLM provider configuration */
  llm: LLMConfigSection;
  /** Logging configuration */
  logging: LoggingConfig;
}

/**
 * Partial CAM configuration for updates
 */
export type PartialCAMConfig = {
  memory?: Partial<MemoryConfig>;
  orchestrator?: Partial<OrchestratorConfigSection>;
  llm?: Partial<LLMConfigSection>;
  logging?: Partial<LoggingConfig>;
};

/** @deprecated Use LLMConfigSection instead */
export type LLMConfig = LLMConfigSection;
