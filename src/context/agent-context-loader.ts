/**
 * Infinite Aura - Agent Context Loader
 *
 * Layer 4: Loads agent context from agents/{agentId}/ directory.
 * Loaded if agentId is present in the request.
 */

import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { HookEvent } from '../hooks/types';
import { ContextLoader } from './context-loader';
import { ContextConfig, ContextRequest, AgentContext, AGENT_CONTEXT_FILES } from './types';

/**
 * Loads agent context from the agents/{agentId}/ directory
 *
 * Agent context includes:
 * - Capabilities
 * - History (recent events)
 * - Performance metrics
 */
export class AgentContextLoader extends ContextLoader {
  private readonly agentsBaseDir: string;

  constructor(
    fileOps: FileOperations,
    dirOps: DirectoryOperations,
    config: Partial<ContextConfig> = {},
    agentsBaseDir: string = 'agents'
  ) {
    super(fileOps, dirOps, config);
    this.agentsBaseDir = agentsBaseDir;
  }

  /**
   * Load agent context
   */
  async load(request: ContextRequest): Promise<AgentContext | undefined> {
    // Need agentId to load agent context
    if (!request.agentId) {
      return undefined;
    }

    const agentDir = `${this.agentsBaseDir}/${request.agentId}`;

    // Check if agent directory exists
    const exists = await this.directoryExists(agentDir);
    if (!exists) {
      return undefined;
    }

    const capabilities = await this.loadCapabilities(request.agentId);
    const history = await this.loadRecentEvents(
      request.agentId,
      request.maxTokens || this.config.maxTokensPerLayer
    );
    const performance = await this.loadPerformance(request.agentId);

    return {
      agentId: request.agentId,
      capabilities,
      history,
      performance,
      metadata: {},
    };
  }

  /**
   * Load agent capabilities from capabilities.json
   */
  private async loadCapabilities(agentId: string): Promise<string[]> {
    const filePath = `${this.agentsBaseDir}/${agentId}/${AGENT_CONTEXT_FILES.capabilities}`;
    const data = await this.parseJSON<{ capabilities?: string[] }>(filePath, {});
    return Array.isArray(data.capabilities) ? data.capabilities : Array.isArray(data) ? data : [];
  }

  /**
   * Load recent agent events from *.jsonl files
   */
  private async loadRecentEvents(agentId: string, maxTokens: number): Promise<HookEvent[]> {
    const agentDir = `${this.agentsBaseDir}/${agentId}`;
    const files = await this.loadFiles(agentDir);

    // Filter for JSONL files
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

    // Load and combine events from all JSONL files
    let allEvents: HookEvent[] = [];
    for (const file of jsonlFiles) {
      const filePath = `${agentDir}/${file}`;
      const events = await this.parseJSONL(filePath);
      allEvents = allEvents.concat(events);
    }

    // Limit by tokens
    return this.limitEventsByTokens(allEvents, maxTokens);
  }

  /**
   * Load agent performance metrics from performance.json
   */
  private async loadPerformance(agentId: string): Promise<Record<string, number>> {
    const filePath = `${this.agentsBaseDir}/${agentId}/${AGENT_CONTEXT_FILES.performance}`;
    const data = await this.parseJSON<Record<string, number>>(filePath, {});

    // Ensure all values are numbers
    const performance: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        performance[key] = value;
      }
    }

    return performance;
  }

  /**
   * Get agents base directory
   */
  getAgentsBaseDir(): string {
    return this.agentsBaseDir;
  }
}
