/**
 * Infinite Aura - Dynamic Context Loader
 *
 * Main orchestrator for the 4-layer context hydration system.
 * Coordinates loading from User → Project → Session → Agent layers.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { UserContextLoader } from './user-context-loader';
import { ProjectContextLoader } from './project-context-loader';
import { SessionContextLoader } from './session-context-loader';
import { AgentContextLoader } from './agent-context-loader';
import { RelevanceScorer, RelevanceScorerConfig } from './relevance-scorer';
import { ContextCache, ContextCacheConfig } from './context-cache';
import {
  ContextConfig,
  ContextRequest,
  LoadedContext,
  ContextLayer,
  RelevanceScores,
  DEFAULT_CONTEXT_CONFIG,
  DEFAULT_RELEVANCE_SCORES,
} from './types';

/**
 * Configuration for the dynamic context loader
 */
export interface DynamicContextLoaderConfig extends ContextConfig {
  /** Cache configuration */
  cache: Partial<ContextCacheConfig>;
  /** Relevance scorer configuration */
  scorer: Partial<RelevanceScorerConfig>;
  /** User context base directory */
  userBaseDir: string;
  /** Projects base directory */
  projectsBaseDir: string;
  /** Sessions base directory */
  sessionsBaseDir: string;
  /** Agents base directory */
  agentsBaseDir: string;
}

/**
 * Default dynamic context loader configuration
 */
export const DEFAULT_DYNAMIC_CONTEXT_LOADER_CONFIG: DynamicContextLoaderConfig = {
  ...DEFAULT_CONTEXT_CONFIG,
  cache: {},
  scorer: {},
  userBaseDir: 'user',
  projectsBaseDir: 'projects',
  sessionsBaseDir: 'history/sessions',
  agentsBaseDir: 'agents',
};

/**
 * Main orchestrator for 4-layer context loading
 */
export class DynamicContextLoader {
  private readonly config: DynamicContextLoaderConfig;
  private readonly fileOps: FileOperations;
  private readonly dirOps: DirectoryOperations;
  private readonly userLoader: UserContextLoader;
  private readonly projectLoader: ProjectContextLoader;
  private readonly sessionLoader: SessionContextLoader;
  private readonly agentLoader: AgentContextLoader;
  private readonly scorer: RelevanceScorer;
  private readonly cache: ContextCache;

  constructor(
    fileOps: FileOperations,
    dirOps: DirectoryOperations,
    config: Partial<DynamicContextLoaderConfig> = {}
  ) {
    this.config = {
      ...DEFAULT_DYNAMIC_CONTEXT_LOADER_CONFIG,
      ...config,
    };
    this.fileOps = fileOps;
    this.dirOps = dirOps;

    // Initialize layer loaders
    this.userLoader = new UserContextLoader(fileOps, dirOps, this.config);
    this.projectLoader = new ProjectContextLoader(
      fileOps,
      dirOps,
      this.config,
      this.config.projectsBaseDir
    );
    this.sessionLoader = new SessionContextLoader(
      fileOps,
      dirOps,
      this.config,
      this.config.sessionsBaseDir
    );
    this.agentLoader = new AgentContextLoader(
      fileOps,
      dirOps,
      this.config,
      this.config.agentsBaseDir
    );

    // Initialize scorer and cache
    this.scorer = new RelevanceScorer(this.config.scorer);
    this.cache = new ContextCache(this.config.cache);
  }

  /**
   * Load context based on request parameters
   * This is the main entry point for context loading
   */
  async load(request: ContextRequest): Promise<LoadedContext> {
    // Check cache first
    const cached = this.cache.get(request);
    if (cached) {
      return cached;
    }

    // Determine which layers to load
    const layers = this.determineLayers(request);

    // Load contexts from each layer in parallel
    const [userContext, projectContext, sessionContext, agentContext] = await Promise.all([
      layers.includes(ContextLayer.USER) ? this.userLoader.load(request) : undefined,
      layers.includes(ContextLayer.PROJECT) ? this.projectLoader.load(request) : undefined,
      layers.includes(ContextLayer.SESSION) ? this.sessionLoader.load(request) : undefined,
      layers.includes(ContextLayer.AGENT) ? this.agentLoader.load(request) : undefined,
    ]);

    // Calculate relevance scores
    const relevanceScores = this.scorer.scoreAll(
      userContext,
      projectContext,
      sessionContext,
      agentContext,
      request
    );

    // Calculate total tokens
    const totalTokens = this.calculateTotalTokens(
      userContext,
      projectContext,
      sessionContext,
      agentContext
    );

    // Create loaded context
    const loadedContext: LoadedContext = {
      userContext,
      projectContext,
      sessionContext,
      agentContext,
      relevanceScores,
      totalTokens,
      loadedAt: new Date().toISOString(),
    };

    // Cache the result
    this.cache.set(request, loadedContext);

    return loadedContext;
  }

  /**
   * Load only user context (Layer 1)
   */
  async loadUserContext(request: ContextRequest): Promise<LoadedContext> {
    const userContext = await this.userLoader.load(request);
    const relevanceScores: RelevanceScores = {
      ...DEFAULT_RELEVANCE_SCORES,
      user: this.scorer.scoreUserContext(userContext, request),
    };

    return {
      userContext,
      relevanceScores,
      totalTokens: this.calculateContextTokens(userContext),
      loadedAt: new Date().toISOString(),
    };
  }

  /**
   * Load up to project context (Layers 1-2)
   */
  async loadProjectContext(request: ContextRequest): Promise<LoadedContext> {
    const [userContext, projectContext] = await Promise.all([
      this.userLoader.load(request),
      this.projectLoader.load(request),
    ]);

    const relevanceScores: RelevanceScores = {
      ...DEFAULT_RELEVANCE_SCORES,
      user: this.scorer.scoreUserContext(userContext, request),
      project: this.scorer.scoreProjectContext(projectContext, request),
    };

    return {
      userContext,
      projectContext,
      relevanceScores,
      totalTokens:
        this.calculateContextTokens(userContext) + this.calculateContextTokens(projectContext),
      loadedAt: new Date().toISOString(),
    };
  }

  /**
   * Load up to session context (Layers 1-3)
   */
  async loadSessionContext(request: ContextRequest): Promise<LoadedContext> {
    const [userContext, projectContext, sessionContext] = await Promise.all([
      this.userLoader.load(request),
      this.projectLoader.load(request),
      this.sessionLoader.load(request),
    ]);

    const relevanceScores: RelevanceScores = {
      ...DEFAULT_RELEVANCE_SCORES,
      user: this.scorer.scoreUserContext(userContext, request),
      project: this.scorer.scoreProjectContext(projectContext, request),
      session: this.scorer.scoreSessionContext(sessionContext, request),
    };

    return {
      userContext,
      projectContext,
      sessionContext,
      relevanceScores,
      totalTokens:
        this.calculateContextTokens(userContext) +
        this.calculateContextTokens(projectContext) +
        this.calculateContextTokens(sessionContext),
      loadedAt: new Date().toISOString(),
    };
  }

  /**
   * Load all contexts (Layers 1-4)
   */
  async loadFullContext(request: ContextRequest): Promise<LoadedContext> {
    return this.load({
      ...request,
      layers: [ContextLayer.USER, ContextLayer.PROJECT, ContextLayer.SESSION, ContextLayer.AGENT],
    });
  }

  /**
   * Check if context is cached for a request
   */
  isCached(request: ContextRequest): boolean {
    return this.cache.has(request);
  }

  /**
   * Invalidate cache for a request
   */
  invalidateCache(request: ContextRequest): boolean {
    return this.cache.invalidate(request);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Prune expired cache entries
   */
  pruneCache(): number {
    return this.cache.prune();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): ReturnType<ContextCache['getStats']> {
    return this.cache.getStats();
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<DynamicContextLoaderConfig> {
    return { ...this.config };
  }

  /**
   * Get relevance scorer
   */
  getScorer(): RelevanceScorer {
    return this.scorer;
  }

  /**
   * Get context cache
   */
  getCache(): ContextCache {
    return this.cache;
  }

  /**
   * Determine which layers to load based on request
   */
  private determineLayers(request: ContextRequest): ContextLayer[] {
    // If layers explicitly specified, use those
    if (request.layers && request.layers.length > 0) {
      return request.layers;
    }

    // Otherwise, determine based on request parameters
    const layers: ContextLayer[] = [ContextLayer.USER]; // User is always loaded

    if (request.projectId) {
      layers.push(ContextLayer.PROJECT);
    }

    if (request.sessionId) {
      layers.push(ContextLayer.SESSION);
    }

    if (request.agentId) {
      layers.push(ContextLayer.AGENT);
    }

    return layers;
  }

  /**
   * Calculate total tokens across all contexts
   */
  private calculateTotalTokens(
    userContext: unknown,
    projectContext: unknown,
    sessionContext: unknown,
    agentContext: unknown
  ): number {
    return (
      this.calculateContextTokens(userContext) +
      this.calculateContextTokens(projectContext) +
      this.calculateContextTokens(sessionContext) +
      this.calculateContextTokens(agentContext)
    );
  }

  /**
   * Calculate approximate tokens for a context object
   */
  private calculateContextTokens(context: unknown): number {
    if (!context) {
      return 0;
    }

    try {
      const text = JSON.stringify(context);
      // Approximate: 1 token ≈ 4 characters
      return Math.ceil(text.length / 4);
    } catch {
      return 0;
    }
  }
}
