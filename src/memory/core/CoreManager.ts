/**
 * CoreManager - Manages CORE directory for user identity
 *
 * The CORE directory contains user identity files that are loaded on every session:
 * - USER.md: User identity (name, role, expertise, goals)
 * - PREFERENCES.md: User preferences (communication style, detail level)
 * - ACTIVE_PROJECTS.md: Current projects and focus areas
 */

import * as path from 'path';
import { PathValidator } from '../path-validator';
import { FileOperations } from '../file-operations';
import { DirectoryOperations } from '../directory-operations';
import { MemoryError, ErrorCodes } from '../../exceptions';

/**
 * Core context containing all CORE file contents
 */
export interface CoreContext {
  /** Contents of USER.md */
  user: string;
  /** Contents of PREFERENCES.md */
  preferences: string;
  /** Contents of ACTIVE_PROJECTS.md */
  activeProjects: string;
}

/**
 * Options for CoreManager initialization
 */
export interface CoreManagerOptions {
  /** Whether to create template files if they don't exist */
  createTemplates?: boolean;
}

/** CORE directory path relative to memory root */
const CORE_DIR = 'CORE';

/** CORE file names */
const CORE_FILES = {
  USER: 'USER.md',
  PREFERENCES: 'PREFERENCES.md',
  ACTIVE_PROJECTS: 'ACTIVE_PROJECTS.md',
} as const;

/** Template content for USER.md */
const USER_TEMPLATE = `# User Identity

## Name
[User's name]

## Role
[User's primary role/profession]

## Expertise
- [Area 1]
- [Area 2]
- [Area 3]

## Goals
- [Goal 1]
- [Goal 2]
- [Goal 3]

## Background
[Brief background context]
`;

/** Template content for PREFERENCES.md */
const PREFERENCES_TEMPLATE = `# User Preferences

## Communication Style
- Tone: [Direct/Friendly/Formal/etc.]
- Detail Level: [High/Medium/Low]
- Format: [Bullet points/Paragraphs/Mixed]

## Working Style
- Pace: [Fast/Moderate/Deliberate]
- Approach: [Hands-on/Guided/Independent]

## Technical Preferences
- Code Style: [Verbose/Concise/Balanced]
- Documentation: [Extensive/Minimal/Balanced]
`;

/** Template content for ACTIVE_PROJECTS.md */
const ACTIVE_PROJECTS_TEMPLATE = `# Active Projects

## Current Focus
[Primary project or focus area]

## Active Projects
1. **[Project Name]**
   - Status: [Active/Planning/On Hold]
   - Priority: [High/Medium/Low]
   - Context: [Brief description]

## Recent Context
[Recent work, decisions, or important context]
`;

/**
 * Manages CORE directory and user identity files
 */
export class CoreManager {
  private readonly basePath: string;
  private readonly pathValidator: PathValidator;
  private readonly fileOps: FileOperations;
  private readonly directoryOps: DirectoryOperations;
  private initialized: boolean = false;

  /**
   * Create a new CoreManager instance
   * @param basePath - Base path to memory directory (e.g., ~/.infinite-aura-ts/memory/)
   */
  constructor(basePath: string) {
    this.pathValidator = new PathValidator(basePath);
    this.basePath = this.pathValidator.getBasePath();
    this.fileOps = new FileOperations(this.pathValidator);
    this.directoryOps = new DirectoryOperations(this.pathValidator);
  }

  /**
   * Initialize CORE directory with template files
   * Creates CORE directory and template files if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      // Ensure base path exists
      await this.pathValidator.ensureBasePathExists();

      // Create CORE directory
      await this.directoryOps.createDirectory(CORE_DIR);

      // Create template files if they don't exist
      const userPath = this.getCoreFilePath(CORE_FILES.USER);
      const preferencesPath = this.getCoreFilePath(CORE_FILES.PREFERENCES);
      const activeProjectsPath = this.getCoreFilePath(CORE_FILES.ACTIVE_PROJECTS);

      if (!(await this.fileOps.fileExists(userPath))) {
        await this.fileOps.writeFile(userPath, USER_TEMPLATE);
      }

      if (!(await this.fileOps.fileExists(preferencesPath))) {
        await this.fileOps.writeFile(preferencesPath, PREFERENCES_TEMPLATE);
      }

      if (!(await this.fileOps.fileExists(activeProjectsPath))) {
        await this.fileOps.writeFile(activeProjectsPath, ACTIVE_PROJECTS_TEMPLATE);
      }

      this.initialized = true;
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(
        `Failed to initialize CORE directory: ${err.message}`,
        ErrorCodes.MEMORY_INIT_ERROR,
        { basePath: this.basePath, error: err.message }
      );
    }
  }

  /**
   * Load all CORE files and return as CoreContext object
   * @returns CoreContext containing all CORE file contents
   */
  async loadCore(): Promise<CoreContext> {
    try {
      const [user, preferences, activeProjects] = await Promise.all([
        this.readUser(),
        this.readPreferences(),
        this.readActiveProjects(),
      ]);

      return {
        user,
        preferences,
        activeProjects,
      };
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(
        `Failed to load CORE context: ${err.message}`,
        ErrorCodes.MEMORY_LOAD_ERROR,
        { error: err.message }
      );
    }
  }

  /**
   * Read USER.md contents
   * @returns Contents of USER.md
   */
  async readUser(): Promise<string> {
    const filePath = this.getCoreFilePath(CORE_FILES.USER);
    try {
      return await this.fileOps.readFile(filePath);
    } catch (error) {
      const err = error as Error;
      throw new MemoryError(
        `Failed to read USER.md: ${err.message}`,
        ErrorCodes.MEMORY_LOAD_ERROR,
        { file: CORE_FILES.USER, error: err.message }
      );
    }
  }

  /**
   * Read PREFERENCES.md contents
   * @returns Contents of PREFERENCES.md
   */
  async readPreferences(): Promise<string> {
    const filePath = this.getCoreFilePath(CORE_FILES.PREFERENCES);
    try {
      return await this.fileOps.readFile(filePath);
    } catch (error) {
      const err = error as Error;
      throw new MemoryError(
        `Failed to read PREFERENCES.md: ${err.message}`,
        ErrorCodes.MEMORY_LOAD_ERROR,
        { file: CORE_FILES.PREFERENCES, error: err.message }
      );
    }
  }

  /**
   * Read ACTIVE_PROJECTS.md contents
   * @returns Contents of ACTIVE_PROJECTS.md
   */
  async readActiveProjects(): Promise<string> {
    const filePath = this.getCoreFilePath(CORE_FILES.ACTIVE_PROJECTS);
    try {
      return await this.fileOps.readFile(filePath);
    } catch (error) {
      const err = error as Error;
      throw new MemoryError(
        `Failed to read ACTIVE_PROJECTS.md: ${err.message}`,
        ErrorCodes.MEMORY_LOAD_ERROR,
        { file: CORE_FILES.ACTIVE_PROJECTS, error: err.message }
      );
    }
  }

  /**
   * Update USER.md with new content
   * @param content - New content for USER.md
   */
  async updateUser(content: string): Promise<void> {
    const filePath = this.getCoreFilePath(CORE_FILES.USER);
    try {
      await this.fileOps.writeFile(filePath, content);
    } catch (error) {
      const err = error as Error;
      throw new MemoryError(
        `Failed to update USER.md: ${err.message}`,
        ErrorCodes.MEMORY_SAVE_ERROR,
        { file: CORE_FILES.USER, error: err.message }
      );
    }
  }

  /**
   * Update PREFERENCES.md with new content
   * @param content - New content for PREFERENCES.md
   */
  async updatePreferences(content: string): Promise<void> {
    const filePath = this.getCoreFilePath(CORE_FILES.PREFERENCES);
    try {
      await this.fileOps.writeFile(filePath, content);
    } catch (error) {
      const err = error as Error;
      throw new MemoryError(
        `Failed to update PREFERENCES.md: ${err.message}`,
        ErrorCodes.MEMORY_SAVE_ERROR,
        { file: CORE_FILES.PREFERENCES, error: err.message }
      );
    }
  }

  /**
   * Update ACTIVE_PROJECTS.md with new content
   * @param content - New content for ACTIVE_PROJECTS.md
   */
  async updateActiveProjects(content: string): Promise<void> {
    const filePath = this.getCoreFilePath(CORE_FILES.ACTIVE_PROJECTS);
    try {
      await this.fileOps.writeFile(filePath, content);
    } catch (error) {
      const err = error as Error;
      throw new MemoryError(
        `Failed to update ACTIVE_PROJECTS.md: ${err.message}`,
        ErrorCodes.MEMORY_SAVE_ERROR,
        { file: CORE_FILES.ACTIVE_PROJECTS, error: err.message }
      );
    }
  }

  /**
   * Get CORE context formatted for preprompt hydration
   * @returns Formatted string containing all CORE context
   */
  async getCoreContext(): Promise<string> {
    const context = await this.loadCore();

    return `## User Identity
${context.user}

## User Preferences
${context.preferences}

## Active Projects
${context.activeProjects}`;
  }

  /**
   * Validate CORE directory structure
   * Checks that CORE directory and all required files exist
   * @returns true if CORE structure is valid, false otherwise
   */
  async validateCore(): Promise<boolean> {
    try {
      // Check CORE directory exists
      const coreExists = await this.directoryOps.directoryExists(CORE_DIR);
      if (!coreExists) {
        return false;
      }

      // Check all required files exist
      const userExists = await this.fileOps.fileExists(this.getCoreFilePath(CORE_FILES.USER));
      const preferencesExists = await this.fileOps.fileExists(
        this.getCoreFilePath(CORE_FILES.PREFERENCES)
      );
      const activeProjectsExists = await this.fileOps.fileExists(
        this.getCoreFilePath(CORE_FILES.ACTIVE_PROJECTS)
      );

      return userExists && preferencesExists && activeProjectsExists;
    } catch {
      return false;
    }
  }

  /**
   * Check if CORE directory exists
   * @returns true if CORE directory exists
   */
  async coreExists(): Promise<boolean> {
    return this.directoryOps.directoryExists(CORE_DIR);
  }

  /**
   * Get the path to the CORE directory
   * @returns Absolute path to CORE directory
   */
  getCorePath(): string {
    return path.join(this.basePath, CORE_DIR);
  }

  /**
   * Check if CoreManager has been initialized
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get relative path for a CORE file
   * @param filename - Name of the CORE file
   * @returns Relative path to the file
   */
  private getCoreFilePath(filename: string): string {
    return `${CORE_DIR}/${filename}`;
  }
}
