/**
 * StatusCommand
 *
 * Shows orchestrator state, active agents, and resource usage.
 * Provides system visibility for monitoring and debugging.
 */

import { BaseCommandHandler, Command, CommandResult } from '../types';
import { Orchestrator } from '../../orchestrator/Orchestrator';
import { OrchestratorState } from '../../orchestrator/types';

/**
 * Status command handler - displays system state and resource usage
 */
export class StatusCommand extends BaseCommandHandler {
  private readonly orchestrator: Orchestrator;

  /**
   * Create a new StatusCommand instance
   * @param orchestrator - Orchestrator instance to query for status
   */
  constructor(orchestrator: Orchestrator) {
    super();
    this.orchestrator = orchestrator;
  }

  async execute(command: Command): Promise<CommandResult> {
    const subcommand = command.subcommand || 'all';

    switch (subcommand) {
      case 'all':
        return this.success(this.formatFullStatus());
      case 'agents':
        return this.success(this.formatAgentStatus());
      case 'tasks':
        return this.success(this.formatTaskStatus());
      case 'resources':
        return this.success(this.formatResourceStatus());
      case 'sessions':
        return this.success(this.formatSessionStatus());
      default:
        return this.failure(`Unknown status subcommand: ${subcommand}`);
    }
  }

  getHelp(): string {
    return `
status [subcommand]

Show system status information.

Subcommands:
  all       Show all status information (default)
  agents    Show active agents
  tasks     Show task queue status
  resources Show resource usage
  sessions  Show active UOCS sessions

Examples:
  status
  status agents
  status tasks
    `.trim();
  }

  getDescription(): string {
    return 'Show orchestrator state, active agents, and resource usage';
  }

  /**
   * Format full system status
   */
  private formatFullStatus(): string {
    const state = this.orchestrator.getState();
    const config = this.orchestrator.getConfig();

    const lines: string[] = [
      '\n=== CAM System Status ===',
      '',
      this.formatOrchestratorState(state),
      '',
      this.formatAgentStatus(),
      '',
      this.formatTaskStatus(),
      '',
      this.formatResourceStatus(),
      '',
      this.formatSessionStatus(),
      '',
      '--- Configuration ---',
      `Max Concurrent Tasks: ${config.maxConcurrentTasks}`,
      `Default Timeout: ${config.defaultTimeout}ms`,
      `LLM Provider: ${config.llmProvider || 'not configured'}`,
      `LLM Model: ${config.llmModel || 'not configured'}`,
      '',
    ];

    return lines.join('\n');
  }

  /**
   * Format orchestrator state summary
   */
  private formatOrchestratorState(state: OrchestratorState): string {
    const uptimeStr = this.formatUptime(state.uptime);

    return [
      '--- Orchestrator State ---',
      `Uptime: ${uptimeStr}`,
      `Active Tasks: ${state.activeTasks}`,
      `Completed Tasks: ${state.completedTasks}`,
      `Failed Tasks: ${state.failedTasks}`,
      `Active Agents: ${state.activeAgents}`,
    ].join('\n');
  }

  /**
   * Format agent status
   */
  private formatAgentStatus(): string {
    const spawner = this.orchestrator.getAgentSpawner();
    const agents = spawner.listAgents();
    const activeAgents = spawner.getActiveAgents();

    const lines: string[] = ['--- Agent Status ---', `Total Agents: ${agents.length}`];

    if (activeAgents.length === 0) {
      lines.push('No active agents');
    } else {
      lines.push(`Active Agents (${activeAgents.length}):`);
      for (const agent of activeAgents) {
        const state = agent.getState();
        const duration = agent.getDuration();
        const durationStr = duration ? ` (${Math.round(duration / 1000)}s)` : '';

        lines.push(`  - ${agent.getId()}`);
        lines.push(`    Type: ${state.definition.name}`);
        lines.push(`    Status: ${state.status}${durationStr}`);
        lines.push(`    Session: ${state.sessionId}`);
        if (state.currentTask) {
          lines.push(`    Current Task: ${state.currentTask.substring(0, 50)}...`);
        }
      }
    }

    // Show registered agent definitions
    const definitions = spawner.listAgentDefinitions();
    lines.push('');
    lines.push(`Registered Agent Types: ${definitions.join(', ')}`);

    return lines.join('\n');
  }

  /**
   * Format task status
   */
  private formatTaskStatus(): string {
    const taskManager = this.orchestrator.getTaskManager();
    const stats = taskManager.getStats();
    const pendingTasks = taskManager.getPendingTasks();
    const runningTasks = taskManager.getRunningTasks();

    const lines: string[] = [
      '--- Task Status ---',
      `Pending: ${stats.pending}`,
      `Running: ${stats.running}`,
      `Completed: ${stats.completed}`,
      `Failed: ${stats.failed}`,
      `Queue Length: ${taskManager.getQueueLength()}`,
      `Max Concurrent: ${taskManager.getMaxConcurrent()}`,
    ];

    if (runningTasks.length > 0) {
      lines.push('');
      lines.push('Running Tasks:');
      for (const task of runningTasks) {
        const elapsed = Date.now() - task.metadata.startTime.getTime();
        lines.push(
          `  - ${task.id}: ${task.request.input.substring(0, 40)}... (${Math.round(elapsed / 1000)}s)`
        );
      }
    }

    if (pendingTasks.length > 0) {
      lines.push('');
      lines.push('Pending Tasks:');
      for (const task of pendingTasks.slice(0, 5)) {
        lines.push(`  - ${task.id}: ${task.request.input.substring(0, 40)}...`);
      }
      if (pendingTasks.length > 5) {
        lines.push(`  ... and ${pendingTasks.length - 5} more`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format resource usage status
   */
  private formatResourceStatus(): string {
    const securityManager = this.orchestrator.getSecurityManager();
    const taskManager = this.orchestrator.getTaskManager();
    const state = this.orchestrator.getState();

    // Get memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);

    const lines: string[] = [
      '--- Resource Usage ---',
      `Memory (Heap): ${heapUsedMB}MB / ${heapTotalMB}MB`,
      `Memory (RSS): ${rssMB}MB`,
      `Active Tasks: ${taskManager.getRunningCount()} / ${taskManager.getMaxConcurrent()}`,
      `Active Agents: ${state.activeAgents}`,
      `Can Accept Tasks: ${taskManager.canAcceptTask() ? 'Yes' : 'No'}`,
    ];

    // Add security manager stats if available
    try {
      const canCreateAgent = securityManager.canCreateAgent('status-check');
      lines.push(`Can Create Agent: ${canCreateAgent ? 'Yes' : 'No'}`);
    } catch {
      // Security manager might not support this check
    }

    return lines.join('\n');
  }

  /**
   * Format active UOCS sessions
   */
  private formatSessionStatus(): string {
    const uocs = this.orchestrator.getUOCS();
    const activeSessionIds = uocs.getActiveSessionIds();

    const lines: string[] = [
      '--- UOCS Sessions ---',
      `Active Sessions: ${activeSessionIds.length}`,
    ];

    if (activeSessionIds.length > 0) {
      lines.push('');
      lines.push('Session IDs:');
      for (const sessionId of activeSessionIds) {
        lines.push(`  - ${sessionId}`);
      }
    } else {
      lines.push('No active UOCS sessions');
    }

    return lines.join('\n');
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
