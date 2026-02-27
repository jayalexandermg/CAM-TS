/**
 * Configuration Manager
 *
 * Manages loading, saving, and accessing CAM configuration.
 * Supports file-based configuration with environment variable overrides.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CAMConfig, PartialCAMConfig, LogLevel } from './types';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: CAMConfig = {
  memory: {
    baseDir: path.join(
      process.env.HOME || process.env.USERPROFILE || '~',
      '.infinite-aura-ts',
      'memory'
    ),
  },
  orchestrator: {
    maxConcurrentTasks: 5,
    defaultTimeout: 30000,
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-opus-4-5-20251101',
  },
  logging: {
    level: 'info',
  },
};

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS = {
  CAM_MEMORY_BASE_DIR: 'memory.baseDir',
  CAM_ORCHESTRATOR_MAX_CONCURRENT: 'orchestrator.maxConcurrentTasks',
  CAM_ORCHESTRATOR_TIMEOUT: 'orchestrator.defaultTimeout',
  CAM_LLM_PROVIDER: 'llm.provider',
  CAM_LLM_MODEL: 'llm.model',
  CAM_LLM_API_KEY: 'llm.apiKey',
  CAM_LOG_LEVEL: 'logging.level',
  CAM_LOG_FILE: 'logging.file',
} as const;

/**
 * ConfigManager handles loading, saving, and accessing configuration
 */
export class ConfigManager {
  private config: CAMConfig;
  private configPath: string;

  /**
   * Create a new ConfigManager instance
   * @param configPath Path to the configuration file
   */
  constructor(configPath?: string) {
    this.configPath =
      configPath ||
      path.join(
        process.env.HOME || process.env.USERPROFILE || '~',
        '.infinite-aura-ts',
        'config.json'
      );
    this.config = this.deepClone(DEFAULT_CONFIG);
  }

  /**
   * Load configuration from file and apply environment overrides
   */
  load(): CAMConfig {
    // Start with defaults
    this.config = this.deepClone(DEFAULT_CONFIG);

    // Load from file if exists
    if (fs.existsSync(this.configPath)) {
      try {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent) as PartialCAMConfig;
        this.config = this.mergeConfig(this.config, fileConfig);
      } catch {
        // If file is invalid, use defaults
      }
    }

    // Apply environment variable overrides
    this.applyEnvOverrides();

    return this.config;
  }

  /**
   * Save current configuration to file
   */
  save(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Get the current configuration
   */
  getConfig(): CAMConfig {
    return this.deepClone(this.config);
  }

  /**
   * Update configuration with partial values
   * @param updates Partial configuration to apply
   */
  update(updates: PartialCAMConfig): CAMConfig {
    this.config = this.mergeConfig(this.config, updates);
    return this.getConfig();
  }

  /**
   * Get a specific configuration value by path
   * @param keyPath Dot-separated path to the config value
   */
  get<T>(keyPath: string): T | undefined {
    const parts = keyPath.split('.');
    let value: unknown = this.config;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * Set a specific configuration value by path
   * @param keyPath Dot-separated path to the config value
   * @param value Value to set
   */
  set<T>(keyPath: string, value: T): void {
    const parts = keyPath.split('.');
    let current: Record<string, unknown> = this.config as unknown as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Reset configuration to defaults
   */
  reset(): CAMConfig {
    this.config = this.deepClone(DEFAULT_CONFIG);
    return this.getConfig();
  }

  /**
   * Get the configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Check if a configuration file exists
   */
  configExists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Apply environment variable overrides to the configuration
   */
  private applyEnvOverrides(): void {
    for (const [envVar, configPath] of Object.entries(ENV_MAPPINGS)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        this.setFromEnv(configPath, envValue);
      }
    }
  }

  /**
   * Set a configuration value from an environment variable
   */
  private setFromEnv(configPath: string, value: string): void {
    // Parse numeric values
    if (
      configPath === 'orchestrator.maxConcurrentTasks' ||
      configPath === 'orchestrator.defaultTimeout'
    ) {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        this.set(configPath, numValue);
      }
      return;
    }

    // Validate log level
    if (configPath === 'logging.level') {
      const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      if (validLevels.includes(value as LogLevel)) {
        this.set(configPath, value as LogLevel);
      }
      return;
    }

    // String values
    this.set(configPath, value);
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  /**
   * Merge partial configuration into existing configuration
   */
  private mergeConfig(base: CAMConfig, updates: PartialCAMConfig): CAMConfig {
    const result = this.deepClone(base);

    if (updates.memory) {
      result.memory = { ...result.memory, ...updates.memory };
    }
    if (updates.orchestrator) {
      result.orchestrator = { ...result.orchestrator, ...updates.orchestrator };
    }
    if (updates.llm) {
      result.llm = { ...result.llm, ...updates.llm };
    }
    if (updates.logging) {
      result.logging = { ...result.logging, ...updates.logging };
    }

    return result;
  }
}
