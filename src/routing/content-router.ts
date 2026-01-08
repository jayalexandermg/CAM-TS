/**
 * Infinite Aura - Content Router
 *
 * Routes events to multiple UFC directories based on content classification.
 */

import { HookEvent } from '../hooks/types';
import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { FileNamingConvention } from '../memory/file-naming';
import { InterestingnessScorer } from '../learning/interestingness-scorer';
import { LearnedPromoter } from '../learning/learned-promoter';
import { ContentClassifier } from './content-classifier';
import {
  Classification,
  RoutingConfig,
  RoutingDestination,
  RoutingResult,
  DEFAULT_ROUTING_CONFIG,
  TaskType,
} from './types';

/**
 * Options for the content router
 */
export interface ContentRouterOptions {
  /** Routing configuration */
  config?: Partial<RoutingConfig>;
  /** Base directory for history */
  historyBaseDir?: string;
  /** Base directory for projects */
  projectsBaseDir?: string;
  /** Base directory for agents */
  agentsBaseDir?: string;
  /** Base directory for tasks */
  tasksBaseDir?: string;
  /** Optional interestingness scorer for learning */
  scorer?: InterestingnessScorer;
  /** Optional learned event promoter */
  promoter?: LearnedPromoter;
}

/**
 * Content-based router for intelligent event distribution
 *
 * Routes events to multiple UFC directories based on:
 * - Event classification (project, agent, task type)
 * - Routing configuration
 * - Confidence thresholds
 */
export class ContentRouter {
  private readonly classifier: ContentClassifier;
  private readonly fileOps: FileOperations;
  private readonly dirOps: DirectoryOperations;
  private readonly fileNaming: FileNamingConvention;
  private readonly config: RoutingConfig;
  private readonly scorer?: InterestingnessScorer;
  private readonly promoter?: LearnedPromoter;

  private readonly historyBaseDir: string;
  private readonly projectsBaseDir: string;
  private readonly agentsBaseDir: string;
  private readonly tasksBaseDir: string;

  /** Cache of generated filenames per directory */
  private readonly filenameCache: Map<string, string> = new Map();

  constructor(
    classifier: ContentClassifier,
    fileOps: FileOperations,
    dirOps: DirectoryOperations,
    options: ContentRouterOptions = {}
  ) {
    this.classifier = classifier;
    this.fileOps = fileOps;
    this.dirOps = dirOps;
    this.fileNaming = new FileNamingConvention();
    this.config = {
      ...DEFAULT_ROUTING_CONFIG,
      ...options.config,
    };

    this.historyBaseDir = options.historyBaseDir ?? 'history/execution';
    this.projectsBaseDir = options.projectsBaseDir ?? 'projects';
    this.agentsBaseDir = options.agentsBaseDir ?? 'agents';
    this.tasksBaseDir = options.tasksBaseDir ?? 'tasks';
    this.scorer = options.scorer;
    this.promoter = options.promoter;
  }

  /**
   * Route an event to appropriate destinations based on classification
   */
  async route(event: HookEvent): Promise<RoutingResult> {
    // Classify the event
    const classification = this.classifier.classify(event);

    // Score event for interestingness (if scorer is available)
    const interestingnessScore = this.scorer ? this.scorer.score(event) : undefined;

    // Determine destinations
    const destinations = this.determineDestinations(event, classification);

    // Write to all destinations
    const errors: string[] = [];

    for (const destination of destinations) {
      try {
        await this.writeToDestination(event, destination);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(`Failed to write to ${destination.directory}: ${err.message}`);
      }
    }

    // Promote if interesting (if promoter is available and score meets threshold)
    let promotionResult;
    if (this.promoter && interestingnessScore && destinations.length > 0) {
      promotionResult = await this.promoter.promote(
        event,
        interestingnessScore,
        destinations[0].directory
      );
    }

    return {
      event,
      destinations,
      classification,
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      interestingnessScore,
      promotionResult,
    };
  }

  /**
   * Determine routing destinations based on classification
   */
  private determineDestinations(
    event: HookEvent,
    classification: Classification
  ): RoutingDestination[] {
    const destinations: RoutingDestination[] = [];

    // Skip routing if confidence is too low
    const meetsConfidenceThreshold = classification.confidence >= this.config.minConfidence;

    // 1. Always route to history/execution (if configured)
    if (this.config.alwaysRouteToHistory) {
      destinations.push({
        directory: this.historyBaseDir,
        filename: this.getOrCreateFilename(this.historyBaseDir, 'EVENTS', 'all'),
        reason: 'All events are captured in execution history',
      });
    }

    // Only add conditional routes if confidence threshold is met
    if (!meetsConfidenceThreshold) {
      return destinations;
    }

    // 2. Route to projects/{projectId}/ if project routing enabled
    if (this.config.enableProjectRouting && classification.projectId) {
      const projectDir = `${this.projectsBaseDir}/${classification.projectId}`;
      const taskDesc = classification.taskType || 'events';
      destinations.push({
        directory: projectDir,
        filename: this.getOrCreateFilename(
          projectDir,
          this.taskTypeToFileType(classification.taskType),
          taskDesc
        ),
        reason: `Project-specific event for project '${classification.projectId}'`,
      });
    }

    // 3. Route to agents/{agentId}/ if agent routing enabled
    if (this.config.enableAgentRouting && classification.agentId) {
      const agentDir = `${this.agentsBaseDir}/${classification.agentId}`;
      const taskDesc = classification.taskType || 'events';
      destinations.push({
        directory: agentDir,
        filename: this.getOrCreateFilename(
          agentDir,
          this.taskTypeToFileType(classification.taskType),
          taskDesc
        ),
        reason: `Agent-specific event for agent '${classification.agentId}'`,
      });
    }

    // 4. Route to tasks/{taskType}/ if task type routing enabled
    if (
      this.config.enableTaskTypeRouting &&
      classification.taskType &&
      classification.taskType !== TaskType.OTHER
    ) {
      const taskDir = `${this.tasksBaseDir}/${classification.taskType}`;
      const desc = this.generateTaskDescription(event, classification);
      destinations.push({
        directory: taskDir,
        filename: this.getOrCreateFilename(taskDir, classification.taskType.toUpperCase(), desc),
        reason: `Task-specific event of type '${classification.taskType}'`,
      });
    }

    return destinations;
  }

  /**
   * Write event to a destination
   */
  private async writeToDestination(
    event: HookEvent,
    destination: RoutingDestination
  ): Promise<void> {
    // Ensure directory exists
    await this.dirOps.ensureDirectory(destination.directory);

    // Format event as JSONL
    const jsonLine = JSON.stringify(event);

    // Write to file
    const filePath = `${destination.directory}/${destination.filename}`;
    await this.fileOps.appendFile(filePath, jsonLine);
  }

  /**
   * Get or create a filename for a directory
   */
  private getOrCreateFilename(directory: string, type: string, description: string): string {
    const cacheKey = `${directory}:${type}:${description}`;

    let filename = this.filenameCache.get(cacheKey);
    if (!filename) {
      filename = this.fileNaming.generateFilename(type, description, 'jsonl');
      this.filenameCache.set(cacheKey, filename);
    }

    return filename;
  }

  /**
   * Convert task type to file type string
   */
  private taskTypeToFileType(taskType?: TaskType): string {
    if (!taskType || taskType === TaskType.OTHER) {
      return 'EVENTS';
    }
    return taskType.toUpperCase();
  }

  /**
   * Generate a description for task-based routing
   */
  private generateTaskDescription(event: HookEvent, classification: Classification): string {
    // Try to extract a meaningful description
    if (classification.projectId) {
      return classification.projectId;
    }

    if (classification.agentId) {
      return classification.agentId;
    }

    // Extract first meaningful word from content
    const words = event.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (words.length > 0) {
      return words[0];
    }

    return 'events';
  }

  /**
   * Reset filename cache (useful for starting new sessions)
   */
  resetFilenameCache(): void {
    this.filenameCache.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<RoutingConfig> {
    return { ...this.config };
  }

  /**
   * Get the classifier instance
   */
  getClassifier(): ContentClassifier {
    return this.classifier;
  }

  /**
   * Get cached filenames count
   */
  getCachedFilenameCount(): number {
    return this.filenameCache.size;
  }

  /**
   * Get the scorer instance (if available)
   */
  getScorer(): InterestingnessScorer | undefined {
    return this.scorer;
  }

  /**
   * Get the promoter instance (if available)
   */
  getPromoter(): LearnedPromoter | undefined {
    return this.promoter;
  }

  /**
   * Check if learning features are enabled
   */
  hasLearningEnabled(): boolean {
    return this.scorer !== undefined && this.promoter !== undefined;
  }
}
