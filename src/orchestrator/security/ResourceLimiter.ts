import { SecurityConfig, ResourceUsage } from './types';

export class ResourceLimiter {
  private config: SecurityConfig;
  private usage: ResourceUsage;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.usage = {
      agentCount: 0,
      activeAgents: 0,
      sessionCount: 0
    };
  }

  canCreateAgent(_sessionId: string): boolean {
    // Check total agent limit
    if (this.usage.agentCount >= this.config.maxAgentsPerSession) {
      return false;
    }

    // Check concurrent agent limit
    if (this.usage.activeAgents >= this.config.maxConcurrentAgents) {
      return false;
    }

    return true;
  }

  incrementAgentCount(): void {
    this.usage.agentCount++;
    this.usage.activeAgents++;
  }

  decrementActiveAgents(): void {
    if (this.usage.activeAgents > 0) {
      this.usage.activeAgents--;
    }
  }

  incrementSessionCount(): void {
    this.usage.sessionCount++;
  }

  decrementSessionCount(): void {
    if (this.usage.sessionCount > 0) {
      this.usage.sessionCount--;
    }
  }

  getUsage(): ResourceUsage {
    return { ...this.usage };
  }

  reset(): void {
    this.usage = {
      agentCount: 0,
      activeAgents: 0,
      sessionCount: 0
    };
  }

  isWithinLimits(): boolean {
    return (
      this.usage.agentCount <= this.config.maxAgentsPerSession &&
      this.usage.activeAgents <= this.config.maxConcurrentAgents
    );
  }
}
