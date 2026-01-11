/**
 * Infinite Aura - Project Context Loader
 *
 * Layer 2: Loads project context from projects/{projectId}/ directory.
 * Loaded if projectId is present in the request.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { HookEvent } from '../hooks/types';
import { ContextLoader } from './context-loader';
import { ContextConfig, ContextRequest, ProjectContext, PROJECT_CONTEXT_FILES } from './types';

/**
 * Loads project context from the projects/{projectId}/ directory
 *
 * Project context includes:
 * - Description
 * - History (recent events)
 * - Patterns (learned)
 * - Key files
 */
export class ProjectContextLoader extends ContextLoader {
  private readonly projectsBaseDir: string;

  constructor(
    fileOps: FileOperations,
    dirOps: DirectoryOperations,
    config: Partial<ContextConfig> = {},
    projectsBaseDir: string = 'projects'
  ) {
    super(fileOps, dirOps, config);
    this.projectsBaseDir = projectsBaseDir;
  }

  /**
   * Load project context
   */
  async load(request: ContextRequest): Promise<ProjectContext | undefined> {
    // Need projectId to load project context
    if (!request.projectId) {
      return undefined;
    }

    const projectDir = `${this.projectsBaseDir}/${request.projectId}`;

    // Check if project directory exists
    const exists = await this.directoryExists(projectDir);
    if (!exists) {
      return undefined;
    }

    const description = await this.loadDescription(request.projectId);
    const history = await this.loadRecentEvents(
      request.projectId,
      request.maxTokens || this.config.maxTokensPerLayer
    );
    const patterns = await this.loadPatterns(request.projectId);
    const files = await this.loadKeyFiles(request.projectId);

    return {
      projectId: request.projectId,
      description,
      history,
      patterns,
      files,
      metadata: {},
    };
  }

  /**
   * Load project description from description.json
   */
  private async loadDescription(projectId: string): Promise<string> {
    const filePath = `${this.projectsBaseDir}/${projectId}/${PROJECT_CONTEXT_FILES.description}`;
    const data = await this.parseJSON<{ description?: string; name?: string }>(filePath, {});
    return data.description || data.name || '';
  }

  /**
   * Load recent project events from *.jsonl files
   */
  private async loadRecentEvents(projectId: string, maxTokens: number): Promise<HookEvent[]> {
    const projectDir = `${this.projectsBaseDir}/${projectId}`;
    const files = await this.loadFiles(projectDir);

    // Filter for JSONL files
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

    // Load and combine events from all JSONL files
    let allEvents: HookEvent[] = [];
    for (const file of jsonlFiles) {
      const filePath = `${projectDir}/${file}`;
      const events = await this.parseJSONL(filePath);
      allEvents = allEvents.concat(events);
    }

    // Limit by tokens
    return this.limitEventsByTokens(allEvents, maxTokens);
  }

  /**
   * Load learned patterns from patterns.json
   */
  private async loadPatterns(projectId: string): Promise<string[]> {
    const filePath = `${this.projectsBaseDir}/${projectId}/${PROJECT_CONTEXT_FILES.patterns}`;
    const data = await this.parseJSON<{ patterns?: string[] }>(filePath, {});
    return Array.isArray(data.patterns) ? data.patterns : Array.isArray(data) ? data : [];
  }

  /**
   * Load key files list from files.json
   */
  private async loadKeyFiles(projectId: string): Promise<string[]> {
    const filePath = `${this.projectsBaseDir}/${projectId}/${PROJECT_CONTEXT_FILES.files}`;
    const data = await this.parseJSON<{ files?: string[] }>(filePath, {});
    return Array.isArray(data.files) ? data.files : Array.isArray(data) ? data : [];
  }

  /**
   * Get projects base directory
   */
  getProjectsBaseDir(): string {
    return this.projectsBaseDir;
  }
}
