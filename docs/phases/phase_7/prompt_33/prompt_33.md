## Prompt_33

```
PROMPT 33: Observability Core Types

[CONTEXT]
CAM Enhancement - Phase 10: Observability
Repository: /home/ubuntu/github_repos/CAM-TS

Define the foundational types for the observability system before implementation.

[TASK]
Create comprehensive TypeScript types for events, metrics, and observability data.

## Part 1: Create Directory Structure
```bash
mkdir -p src/observability/types
mkdir -p src/observability/audit
mkdir -p src/observability/sentiment
mkdir -p src/observability/status
mkdir -p src/observability/dashboard
```

## Part 2: Create src/observability/types/events.ts
```typescript
export type ObservabilityEventType =
  | 'agent:spawn'
  | 'agent:complete'
  | 'agent:error'
  | 'agent:terminate'
  | 'skill:invoke'
  | 'skill:complete'
  | 'skill:error'
  | 'memory:write'
  | 'memory:read'
  | 'memory:consolidate'
  | 'user:rating'
  | 'user:feedback'
  | 'session:start'
  | 'session:end'
  | 'rlm:step'
  | 'rlm:complete'
  | 'system:error'
  | 'system:warning';

export interface EventMetadata {
  source: string;          // Component that emitted event
  version: string;         // CAM version
  environment: string;     // dev/staging/prod
  correlationId?: string;  // For tracing related events
  parentId?: string;       // Parent event for hierarchies
  tags?: string[];         // Custom tags
}

export interface ObservabilityEvent {
  id: string;                      // UUID
  type: ObservabilityEventType;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  data: Record<string, unknown>;   // Event-specific payload
  metadata: EventMetadata;
  duration?: number;               // For timed events (ms)
  success?: boolean;               // For completion events
  error?: ErrorInfo;               // For error events
}

export interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

// Specific event data types
export interface AgentSpawnEventData {
  agentId: string;
  agentName: string;
  traits?: string[];
  task?: string;
}

export interface SkillInvokeEventData {
  skillName: string;
  inputs: Record<string, unknown>;
  matchConfidence?: number;
}

export interface MemoryEventData {
  tier: 'immediate' | 'short-term' | 'long-term';
  operation: 'read' | 'write' | 'delete' | 'consolidate';
  key?: string;
  size?: number;
}

export interface RatingEventData {
  rating: number;           // 1-10
  ratingType: 'explicit' | 'implicit';
  targetType: 'agent' | 'skill' | 'response' | 'session';
  targetId?: string;
  comment?: string;
}
```

## Part 3: Create src/observability/types/metrics.ts
```typescript
export interface MemoryMetrics {
  immediateTokens: number;
  shortTermTokens: number;
  longTermEntries: number;
  totalSize: number;           // bytes
  hitRate: number;             // cache hit rate 0-1
  averageRetrievalTime: number; // ms
}

export interface AgentMetrics {
  totalSpawned: number;
  activeCount: number;
  averageTaskDuration: number;  // ms
  successRate: number;          // 0-1
  errorRate: number;            // 0-1
  byType: Record<string, number>; // count by agent type
}

export interface SkillMetrics {
  totalInvocations: number;
  averageLatency: number;       // ms
  successRate: number;
  popularSkills: { name: string; count: number }[];
  routingAccuracy: number;      // 0-1
}

export interface SystemMetrics {
  uptime: number;               // seconds
  activeAgents: number;
  memoryCurrent: MemoryMetrics;
  skillStats: SkillMetrics;
  agentStats: AgentMetrics;
  averageResponseTime: number;  // ms
  errorRate: number;            // 0-1
  requestsPerMinute: number;
  timestamp: Date;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface TimeSeriesMetric {
  name: string;
  points: TimeSeriesPoint[];
  aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count';
}

export interface MetricsDashboardData {
  system: SystemMetrics;
  timeSeries: {
    responseTime: TimeSeriesMetric;
    activeAgents: TimeSeriesMetric;
    errorRate: TimeSeriesMetric;
    memoryUsage: TimeSeriesMetric;
  };
  recentEvents: ObservabilityEvent[];
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}
```

## Part 4: Create src/observability/types/index.ts
```typescript
export * from './events';
export * from './metrics';

// Re-export commonly used types
export type {
  ObservabilityEvent,
  ObservabilityEventType,
  EventMetadata,
  SystemMetrics,
  MetricsDashboardData,
} from './events';
```

## Part 5: Create tests/observability/types/types.test.ts
Write tests verifying:
- All event types are valid strings
- Event interfaces have required fields
- Metric interfaces are complete
- Types can be instantiated correctly
- Serialization/deserialization works

[VERIFICATION]
Show me:
1. events.ts content
2. metrics.ts content
3. index.ts exports
4. Test output

[SUCCESS CRITERIA]
✅ All event types defined (18+ types)
✅ All metric interfaces complete
✅ Types exported correctly
✅ Documentation inline
✅ Tests pass
```

end of Prompt_33
