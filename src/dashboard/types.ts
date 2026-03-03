export interface DashboardConfig {
  port: number;
  host: string;
  enabled: boolean;
  refreshInterval: number; // ms, for auto-refresh
}

export interface SystemStatus {
  healthy: boolean;
  model: string;
  uptime: number;
  memoryEntries: number;
  activeSkills: number;
  activeAgents: number;
  lastSessionId?: string;
}

export interface MemoryStats {
  totalEntries: number;
  byTier: Record<string, number>;
  recentCrystals: number;
  storageEstimate: string;
}

export interface SkillStats {
  baselineCount: number;
  communityCount: number;
  topPerformers: { name: string; successRate: number }[];
  gapsDetected: number;
}

export interface AgentStats {
  totalSpawned: number;
  activeNow: number;
  traitEvolutionEntries: number;
  recentAgents: { id: string; traits: string[]; outcome: string }[];
}

export interface DashboardRoute {
  path: string;
  method: 'GET' | 'POST';
  handler: string;
}
