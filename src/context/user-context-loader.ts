/**
 * Infinite Aura - User Context Loader
 *
 * Layer 1: Loads user context from user/ directory.
 * Always loaded as foundational context.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { ContextLoader } from './context-loader';
import {
  ContextConfig,
  ContextRequest,
  UserContext,
  USER_CONTEXT_FILES,
  DEFAULT_USER_CONTEXT,
} from './types';

/**
 * Loads user context from the user/ directory
 *
 * User context includes:
 * - Preferences (language, style, etc.)
 * - Goals
 * - Constraints
 * - Working style
 */
export class UserContextLoader extends ContextLoader {
  constructor(
    fileOps: FileOperations,
    dirOps: DirectoryOperations,
    config: Partial<ContextConfig> = {}
  ) {
    super(fileOps, dirOps, config);
  }

  /**
   * Load user context
   */
  async load(_request: ContextRequest): Promise<UserContext | undefined> {
    // User context is always loaded (foundational)
    const preferences = await this.loadPreferences();
    const goals = await this.loadGoals();
    const constraints = await this.loadConstraints();
    const workingStyle = await this.loadWorkingStyle();

    // Check if we have any user data
    const hasData =
      Object.keys(preferences).length > 0 ||
      goals.length > 0 ||
      constraints.length > 0 ||
      workingStyle.length > 0;

    if (!hasData) {
      return undefined;
    }

    return {
      preferences,
      goals,
      constraints,
      workingStyle,
      metadata: {},
    };
  }

  /**
   * Load user preferences from preferences.json
   */
  private async loadPreferences(): Promise<Record<string, unknown>> {
    return this.parseJSON<Record<string, unknown>>(USER_CONTEXT_FILES.preferences, {});
  }

  /**
   * Load user goals from goals.json
   */
  private async loadGoals(): Promise<string[]> {
    const data = await this.parseJSON<{ goals?: string[] }>(USER_CONTEXT_FILES.goals, {});
    return Array.isArray(data.goals) ? data.goals : Array.isArray(data) ? data : [];
  }

  /**
   * Load user constraints from constraints.json
   */
  private async loadConstraints(): Promise<string[]> {
    const data = await this.parseJSON<{ constraints?: string[] }>(
      USER_CONTEXT_FILES.constraints,
      {}
    );
    return Array.isArray(data.constraints) ? data.constraints : Array.isArray(data) ? data : [];
  }

  /**
   * Load working style from working-style.json
   */
  private async loadWorkingStyle(): Promise<string> {
    const data = await this.parseJSON<{ workingStyle?: string; style?: string }>(
      USER_CONTEXT_FILES.workingStyle,
      {}
    );
    return data.workingStyle || data.style || '';
  }

  /**
   * Get default user context
   */
  getDefaultContext(): UserContext {
    return { ...DEFAULT_USER_CONTEXT };
  }
}
