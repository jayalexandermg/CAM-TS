/**
 * Infinite Aura - Preprompt Injector
 *
 * Manages system prompt and context injection for CAM.
 * Supports multiple context layers that are injected into the system prompt
 * before the AI responds.
 */

/**
 * Context layer configuration
 */
export interface PrepromptLayer {
  /** Layer identifier */
  name: string;
  /** Context content for this layer */
  content: string;
  /** Priority for ordering (lower = earlier in prompt) */
  priority: number;
}

/**
 * Options for PrepromptInjector
 */
export interface PrepromptInjectorOptions {
  /** Base system prompt to start with */
  baseSystemPrompt?: string;
  /** Marker for context section start */
  contextStartMarker?: string;
  /** Marker for context section end */
  contextEndMarker?: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<PrepromptInjectorOptions> = {
  baseSystemPrompt: '',
  contextStartMarker: '--- CONTEXT (Loaded on Session Start) ---',
  contextEndMarker: '--- END CONTEXT ---',
};

/**
 * Manages system prompt composition with context injection
 *
 * The PrepromptInjector allows multiple context layers to be injected
 * into the system prompt. Each layer has a name, content, and priority
 * that determines its order in the final prompt.
 *
 * Typical layer structure:
 * - core (priority 0): User identity from CORE directory
 * - project (priority 10): Active project context
 * - session (priority 20): Current session context
 * - agent (priority 30): Agent-specific context
 */
export class PrepromptInjector {
  private baseSystemPrompt: string;
  private readonly injectedContext: Map<string, PrepromptLayer>;
  private readonly contextStartMarker: string;
  private readonly contextEndMarker: string;

  /**
   * Create a new PrepromptInjector
   * @param options - Configuration options
   */
  constructor(options: PrepromptInjectorOptions = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.baseSystemPrompt = opts.baseSystemPrompt;
    this.contextStartMarker = opts.contextStartMarker;
    this.contextEndMarker = opts.contextEndMarker;
    this.injectedContext = new Map();
  }

  /**
   * Inject context into a specific layer
   * @param layer - Layer name (e.g., 'core', 'project', 'session')
   * @param content - Context content to inject
   * @param priority - Priority for ordering (default: 50)
   */
  injectContext(layer: string, content: string, priority: number = 50): void {
    this.injectedContext.set(layer, {
      name: layer,
      content,
      priority,
    });
  }

  /**
   * Get the complete system prompt with all injected context
   * @returns Full system prompt with context sections
   */
  getSystemPrompt(): string {
    const contextSection = this.buildContextSection();

    if (!contextSection) {
      return this.baseSystemPrompt;
    }

    // If base prompt is empty, just return context
    if (!this.baseSystemPrompt) {
      return contextSection;
    }

    // Compose: base prompt + context section
    return `${this.baseSystemPrompt}\n\n${contextSection}`;
  }

  /**
   * Build the context section from all layers
   * @returns Formatted context section or empty string if no context
   */
  private buildContextSection(): string {
    if (this.injectedContext.size === 0) {
      return '';
    }

    // Sort layers by priority
    const sortedLayers = Array.from(this.injectedContext.values()).sort(
      (a, b) => a.priority - b.priority
    );

    // Build content from layers
    const layerContents = sortedLayers
      .filter((layer) => layer.content.trim().length > 0)
      .map((layer) => layer.content)
      .join('\n\n');

    if (!layerContents) {
      return '';
    }

    return `${this.contextStartMarker}\n\n${layerContents}\n\n${this.contextEndMarker}`;
  }

  /**
   * Clear a specific layer
   * @param layer - Layer name to clear
   * @returns true if layer was cleared, false if not found
   */
  clearLayer(layer: string): boolean {
    return this.injectedContext.delete(layer);
  }

  /**
   * Clear all injected context
   */
  clearAll(): void {
    this.injectedContext.clear();
  }

  /**
   * Get injected context for a specific layer
   * @param layer - Layer name
   * @returns Layer content or undefined if not found
   */
  getLayerContext(layer: string): string | undefined {
    return this.injectedContext.get(layer)?.content;
  }

  /**
   * Get all layer names
   * @returns Array of layer names
   */
  getLayers(): string[] {
    return Array.from(this.injectedContext.keys());
  }

  /**
   * Get layer priority
   * @param layer - Layer name
   * @returns Priority or undefined if not found
   */
  getLayerPriority(layer: string): number | undefined {
    return this.injectedContext.get(layer)?.priority;
  }

  /**
   * Check if a layer exists
   * @param layer - Layer name
   * @returns true if layer exists
   */
  hasLayer(layer: string): boolean {
    return this.injectedContext.has(layer);
  }

  /**
   * Get the number of injected layers
   * @returns Number of layers
   */
  getLayerCount(): number {
    return this.injectedContext.size;
  }

  /**
   * Set the base system prompt
   * @param prompt - New base system prompt
   */
  setBaseSystemPrompt(prompt: string): void {
    this.baseSystemPrompt = prompt;
  }

  /**
   * Get the base system prompt
   * @returns Base system prompt
   */
  getBaseSystemPrompt(): string {
    return this.baseSystemPrompt;
  }

  /**
   * Get context start marker
   * @returns Context start marker string
   */
  getContextStartMarker(): string {
    return this.contextStartMarker;
  }

  /**
   * Get context end marker
   * @returns Context end marker string
   */
  getContextEndMarker(): string {
    return this.contextEndMarker;
  }
}
