/**
 * MemoryPipeline - Manages 3-tier memory structure
 *
 * The pipeline organizes memory into three tiers:
 * - CAPTURE (work/): Raw, unprocessed information
 * - SYNTHESIS (learning/): Processed insights and patterns
 * - APPLICATION (archive/): Refined, ready-to-use knowledge
 */

import { PathValidator } from '../path-validator';
import { FileOperations } from '../file-operations';
import { DirectoryOperations } from '../directory-operations';
import { MemoryError, ErrorCodes } from '../../exceptions';

/**
 * Memory tier enumeration
 */
export enum MemoryTier {
  /** Raw, unprocessed information (work/) */
  CAPTURE = 'work',
  /** Processed insights and patterns (learning/) */
  SYNTHESIS = 'learning',
  /** Refined, ready-to-use knowledge (archive/) */
  APPLICATION = 'archive',
  /** Root level directories (not in a tier) */
  ROOT = 'root',
}

/**
 * Tier configuration
 */
interface TierConfig {
  path: string;
  subdirectories: string[];
}

/**
 * Result of tier validation
 */
export interface TierValidationResult {
  valid: boolean;
  missingTiers: MemoryTier[];
  missingDirectories: string[];
}

/**
 * Content promotion result
 */
export interface PromotionResult {
  success: boolean;
  sourceTier: MemoryTier;
  targetTier: MemoryTier;
  sourcePath: string;
  targetPath: string;
}

/** Tier configurations */
const TIER_CONFIGS: Record<MemoryTier, TierConfig | null> = {
  [MemoryTier.CAPTURE]: {
    path: 'work',
    subdirectories: ['INBOX', 'SCRATCHPAD', 'OBSERVATIONS'],
  },
  [MemoryTier.SYNTHESIS]: {
    path: 'learning',
    subdirectories: ['PATTERNS', 'INSIGHTS', 'LEARNINGS', 'DECISIONS'],
  },
  [MemoryTier.APPLICATION]: {
    path: 'archive',
    subdirectories: ['KNOWLEDGE', 'PROCEDURES', 'REFERENCE', 'ARCHIVE'],
  },
  [MemoryTier.ROOT]: null,
};

/** Mapping from directory paths to tiers */
const DIRECTORY_TO_TIER: Record<string, MemoryTier> = {
  // CAPTURE tier
  work: MemoryTier.CAPTURE,
  'work/INBOX': MemoryTier.CAPTURE,
  'work/SCRATCHPAD': MemoryTier.CAPTURE,
  'work/OBSERVATIONS': MemoryTier.CAPTURE,
  // SYNTHESIS tier
  learning: MemoryTier.SYNTHESIS,
  'learning/PATTERNS': MemoryTier.SYNTHESIS,
  'learning/INSIGHTS': MemoryTier.SYNTHESIS,
  'learning/LEARNINGS': MemoryTier.SYNTHESIS,
  'learning/DECISIONS': MemoryTier.SYNTHESIS,
  // APPLICATION tier
  archive: MemoryTier.APPLICATION,
  'archive/KNOWLEDGE': MemoryTier.APPLICATION,
  'archive/PROCEDURES': MemoryTier.APPLICATION,
  'archive/REFERENCE': MemoryTier.APPLICATION,
  'archive/ARCHIVE': MemoryTier.APPLICATION,
};

/**
 * Manages 3-tier memory pipeline structure
 */
export class MemoryPipeline {
  private readonly basePath: string;
  private readonly pathValidator: PathValidator;
  private readonly fileOps: FileOperations;
  private readonly directoryOps: DirectoryOperations;
  private initialized: boolean = false;

  /**
   * Create a new MemoryPipeline instance
   * @param basePath - Base path to memory directory (e.g., ~/.infinite-aura-ts/memory/)
   */
  constructor(basePath: string) {
    this.pathValidator = new PathValidator(basePath);
    this.basePath = this.pathValidator.getBasePath();
    this.fileOps = new FileOperations(this.pathValidator);
    this.directoryOps = new DirectoryOperations(this.pathValidator);
  }

  /**
   * Initialize 3-tier pipeline structure
   * Creates tier directories and subdirectories if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      // Ensure base path exists
      await this.pathValidator.ensureBasePathExists();

      // Create tier directories and subdirectories
      for (const tier of [MemoryTier.CAPTURE, MemoryTier.SYNTHESIS, MemoryTier.APPLICATION]) {
        const config = TIER_CONFIGS[tier];
        if (!config) continue;

        // Create tier root directory
        await this.directoryOps.createDirectory(config.path);

        // Create subdirectories
        for (const subdir of config.subdirectories) {
          await this.directoryOps.createDirectory(`${config.path}/${subdir}`);
        }
      }

      this.initialized = true;
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(
        `Failed to initialize memory pipeline: ${err.message}`,
        ErrorCodes.MEMORY_INIT_ERROR,
        { basePath: this.basePath, error: err.message }
      );
    }
  }

  /**
   * Get the tier for a given directory path
   * @param directory - Relative directory path (e.g., 'work/INBOX')
   * @returns The tier the directory belongs to, or ROOT if not in a tier
   */
  getTier(directory: string): MemoryTier {
    // Normalize path separators
    const normalized = directory.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

    // Check exact match first
    if (DIRECTORY_TO_TIER[normalized]) {
      return DIRECTORY_TO_TIER[normalized];
    }

    // Check if path starts with a tier prefix
    for (const [path, tier] of Object.entries(DIRECTORY_TO_TIER)) {
      if (normalized.startsWith(path + '/') || normalized === path) {
        return tier;
      }
    }

    return MemoryTier.ROOT;
  }

  /**
   * Get the configuration for a tier
   * @param tier - Memory tier
   * @returns Tier configuration or null for ROOT
   */
  getTierConfig(tier: MemoryTier): TierConfig | null {
    return TIER_CONFIGS[tier];
  }

  /**
   * Get the root directory path for a tier
   * @param tier - Memory tier
   * @returns Directory path for the tier, or empty string for ROOT
   */
  getTierPath(tier: MemoryTier): string {
    const config = TIER_CONFIGS[tier];
    return config?.path ?? '';
  }

  /**
   * Get all subdirectories for a tier
   * @param tier - Memory tier
   * @returns Array of subdirectory names
   */
  getTierSubdirectories(tier: MemoryTier): string[] {
    const config = TIER_CONFIGS[tier];
    return config?.subdirectories ?? [];
  }

  /**
   * Move content from one tier to another (promote)
   * @param from - Source file path (relative)
   * @param to - Destination file path (relative)
   * @param content - Content to write
   * @returns Promotion result
   */
  async promote(from: string, to: string, content: string): Promise<PromotionResult> {
    const sourceTier = this.getTier(from);
    const targetTier = this.getTier(to);

    try {
      // Write content to target location
      await this.fileOps.writeFile(to, content);

      // Delete source file if it exists
      if (await this.fileOps.fileExists(from)) {
        await this.fileOps.deleteFile(from);
      }

      return {
        success: true,
        sourceTier,
        targetTier,
        sourcePath: from,
        targetPath: to,
      };
    } catch (error) {
      const err = error as Error;
      throw new MemoryError(
        `Failed to promote content from ${from} to ${to}: ${err.message}`,
        ErrorCodes.MEMORY_SAVE_ERROR,
        { from, to, sourceTier, targetTier, error: err.message }
      );
    }
  }

  /**
   * Get all content (file paths) in a tier
   * @param tier - Memory tier to get content from
   * @returns Array of file paths in the tier
   */
  async getTierContent(tier: MemoryTier): Promise<string[]> {
    const config = TIER_CONFIGS[tier];
    if (!config) {
      return [];
    }

    const files: string[] = [];

    try {
      // Check tier root directory
      const tierExists = await this.directoryOps.directoryExists(config.path);
      if (!tierExists) {
        return [];
      }

      // Get files from tier root
      const rootFiles = await this.directoryOps.listFiles(config.path);
      files.push(...rootFiles.map((f) => `${config.path}/${f}`));

      // Get files from subdirectories
      for (const subdir of config.subdirectories) {
        const subdirPath = `${config.path}/${subdir}`;
        const subdirExists = await this.directoryOps.directoryExists(subdirPath);
        if (subdirExists) {
          const subdirFiles = await this.directoryOps.listFiles(subdirPath);
          files.push(...subdirFiles.map((f) => `${subdirPath}/${f}`));
        }
      }

      return files;
    } catch (error) {
      const err = error as Error;
      throw new MemoryError(
        `Failed to get tier content for ${tier}: ${err.message}`,
        ErrorCodes.MEMORY_LOAD_ERROR,
        { tier, error: err.message }
      );
    }
  }

  /**
   * Validate tier structure
   * Checks that all tier directories and subdirectories exist
   * @returns Validation result
   */
  async validateTiers(): Promise<TierValidationResult> {
    const missingTiers: MemoryTier[] = [];
    const missingDirectories: string[] = [];

    for (const tier of [MemoryTier.CAPTURE, MemoryTier.SYNTHESIS, MemoryTier.APPLICATION]) {
      const config = TIER_CONFIGS[tier];
      if (!config) continue;

      // Check tier root directory
      const tierExists = await this.directoryOps.directoryExists(config.path);
      if (!tierExists) {
        missingTiers.push(tier);
        missingDirectories.push(config.path);
        continue;
      }

      // Check subdirectories
      for (const subdir of config.subdirectories) {
        const subdirPath = `${config.path}/${subdir}`;
        const subdirExists = await this.directoryOps.directoryExists(subdirPath);
        if (!subdirExists) {
          missingDirectories.push(subdirPath);
        }
      }
    }

    return {
      valid: missingTiers.length === 0 && missingDirectories.length === 0,
      missingTiers,
      missingDirectories,
    };
  }

  /**
   * Check if a specific tier exists
   * @param tier - Memory tier to check
   * @returns true if tier directory exists
   */
  async tierExists(tier: MemoryTier): Promise<boolean> {
    const config = TIER_CONFIGS[tier];
    if (!config) {
      return false;
    }
    return this.directoryOps.directoryExists(config.path);
  }

  /**
   * Check if MemoryPipeline has been initialized
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all tier names (excluding ROOT)
   * @returns Array of tier names
   */
  getAllTiers(): MemoryTier[] {
    return [MemoryTier.CAPTURE, MemoryTier.SYNTHESIS, MemoryTier.APPLICATION];
  }

  /**
   * Get the next tier in the pipeline
   * @param currentTier - Current memory tier
   * @returns Next tier, or null if at APPLICATION tier
   */
  getNextTier(currentTier: MemoryTier): MemoryTier | null {
    switch (currentTier) {
      case MemoryTier.CAPTURE:
        return MemoryTier.SYNTHESIS;
      case MemoryTier.SYNTHESIS:
        return MemoryTier.APPLICATION;
      case MemoryTier.APPLICATION:
        return null;
      default:
        return MemoryTier.CAPTURE;
    }
  }

  /**
   * Get the previous tier in the pipeline
   * @param currentTier - Current memory tier
   * @returns Previous tier, or null if at CAPTURE tier
   */
  getPreviousTier(currentTier: MemoryTier): MemoryTier | null {
    switch (currentTier) {
      case MemoryTier.CAPTURE:
        return null;
      case MemoryTier.SYNTHESIS:
        return MemoryTier.CAPTURE;
      case MemoryTier.APPLICATION:
        return MemoryTier.SYNTHESIS;
      default:
        return null;
    }
  }
}
