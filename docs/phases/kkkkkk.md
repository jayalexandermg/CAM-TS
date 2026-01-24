# CAM Enhancement Prompts - Clean Execution Format

**Generated:** January 23, 2026
**Total Prompts:** 24 (Prompts 21-44)
**Waves:** 7 parallel execution groups

---

# Wave 1 (Start Together - No Dependencies)

---

## Prompt_21

```
PROMPT 21: Trait System Foundation - Traits.yaml + Types

[CONTEXT]
CAM Enhancement - Phase 7: Custom Agent Template System
Repository: /home/ubuntu/github_repos/CAM-TS (or /workspaces/infinite-aura-ts)

CAM has 4 base agents but no dynamic composition capability. This prompt creates the foundational trait system based on PAI's pattern.

PAI Reference: /home/ubuntu/github_repos/PAI/Packs/pai-agents-skill/src/skills/Agents/Data/Traits.yaml

[TASK]
Create the trait system foundation with Traits.yaml and TypeScript types.

## Part 1: Create Directory Structure
```bash
mkdir -p src/agents/traits
mkdir -p src/agents/factory
mkdir -p src/agents/templates
mkdir -p src/agents/profiles
mkdir -p src/agents/definitions
```

## Part 2: Create src/agents/traits/types.ts
```typescript
export interface TraitDefinition {
  name: string;
  description: string;
  keywords?: string[];
  prompt_fragment?: string;
}

export interface TraitsData {
  expertise: Record<string, TraitDefinition>;
  personality: Record<string, TraitDefinition>;
  approach: Record<string, TraitDefinition>;
  examples: Record<string, {
    description: string;
    traits: string[];
  }>;
}

export type TraitCategory = 'expertise' | 'personality' | 'approach';

export interface ComposedTraits {
  expertise: TraitDefinition[];
  personality: TraitDefinition[];
  approach: TraitDefinition[];
}

export interface TraitMatch {
  trait: string;
  category: TraitCategory;
  confidence: number;
  matchedKeywords: string[];
}
```

## Part 3: Create src/agents/traits/Traits.yaml

Include at minimum:

### Expertise Areas (12 required):
1. security - Vulnerabilities, threat modeling, penetration testing, OWASP
2. legal - Contract analysis, compliance, regulatory frameworks
3. finance - Valuation, risk assessment, financial modeling
4. technical - Software architecture, system design, debugging
5. research - Academic methodology, source evaluation, synthesis
6. creative - Content creation, storytelling, visual thinking
7. business - Market analysis, competitive positioning, strategy
8. data - Statistical analysis, visualization, pattern recognition
9. medical - Healthcare knowledge, treatment protocols
10. communications - Messaging strategy, audience analysis
11. devops - CI/CD, infrastructure, deployment, monitoring
12. ux - User experience, usability, accessibility

Each expertise must have: name, description, keywords[], prompt_fragment

### Personality Dimensions (10 required):
1. skeptical - Questions assumptions, demands evidence
2. enthusiastic - Positive framing, encouraging
3. cautious - Considers edge cases, failure modes
4. bold - Willing to take risks, strong claims
5. analytical - Data-driven, logical, systematic
6. creative - Lateral thinking, unexpected connections
7. empathetic - Considers human impact, user-centered
8. contrarian - Takes opposing view deliberately
9. pragmatic - Focuses on what works in practice
10. meticulous - Attention to detail, precision

Each personality must have: name, description, prompt_fragment

### Approach Styles (8 required):
1. thorough - Exhaustive analysis, comprehensive
2. rapid - Quick assessment, efficiency-focused
3. systematic - Structured approach, step-by-step
4. exploratory - Follow interesting threads, flexible
5. comparative - Evaluates options, trade-off analysis
6. synthesizing - Combines multiple sources
7. adversarial - Red team approach, find weaknesses
8. consultative - Advisory stance, recommendations

Each approach must have: name, description, prompt_fragment

### Example Compositions (8 required):
- security_audit: security + skeptical + thorough + adversarial
- contract_review: legal + cautious + meticulous + systematic
- market_analysis: business + analytical + comparative + thorough
- code_review: technical + meticulous + systematic + skeptical
- creative_brief: creative + enthusiastic + exploratory
- red_team: contrarian + skeptical + adversarial + bold
- ux_research: ux + empathetic + systematic + thorough
- devops_audit: devops + analytical + systematic + thorough

## Part 4: Create src/agents/traits/index.ts
Export all types and create a loadTraits function stub:
```typescript
export * from './types';

// Stub for TraitLoader (will be implemented in Prompt 22)
export async function loadTraits(): Promise<TraitsData> {
  throw new Error('TraitLoader not yet implemented - see Prompt 22');
}
```

## Part 5: Create tests/agents/traits/Traits.test.ts
Write 15+ unit tests verifying:
- YAML file exists and is valid
- All required expertise areas present (12+)
- All required personality dimensions present (10+)
- All required approach styles present (8+)
- All required examples present (8+)
- Each trait has required fields (name, description)
- Keywords are arrays for expertise
- prompt_fragment exists for personality and approach
- Example compositions reference valid trait names
- TypeScript types compile correctly

[VERIFICATION]
Show me:
1. Directory structure: tree src/agents/
2. Traits.yaml content (full file)
3. types.ts content (full file)
4. Test output: pnpm test tests/agents/traits/
5. Trait counts per category

[SUCCESS CRITERIA]
✅ src/agents/traits/Traits.yaml created with 12+ expertise, 10+ personality, 8+ approach
✅ src/agents/traits/types.ts created with all interfaces
✅ src/agents/traits/index.ts exports all types
✅ 8+ example compositions defined
✅ All traits have required fields
✅ 15+ tests passing
✅ YAML syntax valid: npx yaml-lint src/agents/traits/Traits.yaml
```

end of Prompt_21

---

## Prompt_25

```
PROMPT 25: Skill Template System

[CONTEXT]
CAM Enhancement - Phase 8: Skills Enhancement
Repository: /home/ubuntu/github_repos/CAM-TS

PAI has a standardized skill structure. This prompt creates the canonical skill template for all CAM skills.

[TASK]
Create the skill template system with standard structure and validation.

## Part 1: Create Directory Structure
```bash
mkdir -p src/skills/templates
mkdir -p src/skills/routing
mkdir -p src/skills/customization
mkdir -p src/skills/CreateSkill
```

## Part 2: Create src/skills/templates/SKILL_TEMPLATE.md
```markdown
# {SkillName}

## Description
{Brief description of what this skill does - 1-2 sentences}

## USE WHEN
- {Trigger condition 1 - when should this skill be invoked}
- {Trigger condition 2}
- {Trigger condition 3}

## Keywords
{comma-separated keywords for intent matching}

## Capabilities
1. {Capability 1 - specific thing this skill can do}
2. {Capability 2}
3. {Capability 3}

## Inputs
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| {param1}  | string | yes | {description} |
| {param2}  | number | no | {description with default value} |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| {field1} | string | {what this output contains} |
| {field2} | boolean | {what this indicates} |

## Example Usage
\`\`\`typescript
const result = await invoke('{SkillName}', {
  param1: 'example value',
  param2: 42
});
\`\`\`

## Workflows
- [{Workflow1}](./Workflows/Workflow1.md) - {brief description}

## Tools
- [{Tool1}](./Tools/Tool1.ts) - {brief description}

## Notes
{Any additional notes, limitations, or considerations}
```

## Part 3: Create src/skills/templates/SkillTemplate.ts
```typescript
export interface SkillDefinition {
  name: string;
  description: string;
  useWhen: string[];
  keywords: string[];
  capabilities: string[];
  inputs: SkillInput[];
  outputs: SkillOutput[];
  workflows?: string[];
  tools?: string[];
  notes?: string;
}

export interface SkillInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface SkillOutput {
  name: string;
  type: string;
  description: string;
}

export interface SkillDirectoryStructure {
  skillName: string;
  hasWorkflows: boolean;
  hasTools: boolean;
  hasData: boolean;
}

export class SkillTemplate {
  /**
   * Validate a skill directory structure
   */
  async validateStructure(skillPath: string): Promise<ValidationResult> {
    // Check SKILL.md exists
    // Check optional Workflows/ directory
    // Check optional Tools/ directory
    // Check optional Data/ directory
  }

  /**
   * Parse SKILL.md into SkillDefinition
   */
  async parseSkillMd(skillPath: string): Promise<SkillDefinition> {
    // Read SKILL.md
    // Parse sections
    // Extract USE WHEN triggers
    // Extract keywords
    // Return structured definition
  }

  /**
   * Generate skill directory from template
   */
  async generate(config: SkillGeneratorConfig): Promise<string> {
    // Create directories
    // Render SKILL.md from template
    // Return created path
  }

  /**
   * Validate skill definition completeness
   */
  validateDefinition(skill: SkillDefinition): ValidationResult {
    const errors: string[] = [];
    if (!skill.name) errors.push('Missing skill name');
    if (!skill.description) errors.push('Missing description');
    if (skill.useWhen.length === 0) errors.push('Missing USE WHEN triggers');
    if (skill.keywords.length === 0) errors.push('Missing keywords');
    // ... more validations
    return { valid: errors.length === 0, errors };
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface SkillGeneratorConfig {
  name: string;
  description: string;
  useWhen: string[];
  keywords: string[];
  hasWorkflows: boolean;
  hasTools: boolean;
  hasData: boolean;
}
```

## Part 4: Create src/skills/templates/index.ts
```typescript
export * from './SkillTemplate';
export { SKILL_TEMPLATE_MD } from './SKILL_TEMPLATE.md'; // Export as string constant
```

## Part 5: Create tests/skills/templates/SkillTemplate.test.ts
Write 12+ tests:
- Template renders correctly with all fields
- Validation catches missing required fields
- Structure validation detects missing SKILL.md
- Keywords parsed correctly
- USE WHEN triggers extracted
- Input/output tables parsed
- Generate creates correct directory structure
- Partial configs handled (missing optional fields)

[VERIFICATION]
Show me:
1. SKILL_TEMPLATE.md content
2. SkillTemplate.ts content
3. Test output: pnpm test tests/skills/templates/
4. Generated example skill structure

[SUCCESS CRITERIA]
✅ SKILL_TEMPLATE.md comprehensive template created
✅ SkillTemplate.ts implements validation and parsing
✅ All interfaces exported
✅ 12+ tests passing
✅ Template renders valid markdown
```

end of Prompt_25

---

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

---

# Wave 2 (Depends on Wave 1)

---

## Prompt_22

```
PROMPT 22: TraitLoader + Inference Implementation

[CONTEXT]
CAM Enhancement - Phase 7: Custom Agent Template System
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 21 (Traits.yaml and types)

With traits defined, implement loading and inference capabilities.

[TASK]
Create TraitLoader to read Traits.yaml and TraitInference to extract traits from natural language.

## Part 1: Create src/agents/factory/TraitLoader.ts
```typescript
import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import { TraitsData, TraitDefinition, TraitCategory } from '../traits/types';

export class TraitLoader {
  private traitsData: TraitsData | null = null;
  private traitsPath: string;
  private loadPromise: Promise<TraitsData> | null = null;

  constructor(traitsPath?: string) {
    this.traitsPath = traitsPath || './src/agents/traits/Traits.yaml';
  }

  /**
   * Load traits from YAML file (cached)
   */
  async load(): Promise<TraitsData> {
    if (this.traitsData) return this.traitsData;

    if (!this.loadPromise) {
      this.loadPromise = this.loadFromFile();
    }

    return this.loadPromise;
  }

  private async loadFromFile(): Promise<TraitsData> {
    const content = await fs.readFile(this.traitsPath, 'utf-8');
    this.traitsData = yaml.parse(content) as TraitsData;
    this.validateTraitsData(this.traitsData);
    return this.traitsData;
  }

  /**
   * Validate loaded traits data
   */
  private validateTraitsData(data: TraitsData): void {
    if (!data.expertise || Object.keys(data.expertise).length < 10) {
      throw new Error('Traits.yaml must have at least 10 expertise areas');
    }
    if (!data.personality || Object.keys(data.personality).length < 8) {
      throw new Error('Traits.yaml must have at least 8 personality types');
    }
    if (!data.approach || Object.keys(data.approach).length < 6) {
      throw new Error('Traits.yaml must have at least 6 approach styles');
    }
    // Validate each trait has required fields
    for (const [key, trait] of Object.entries(data.expertise)) {
      if (!trait.name || !trait.description) {
        throw new Error(`Expertise "${key}" missing required fields`);
      }
    }
  }

  /**
   * Get a specific trait by category and name
   */
  getTrait(category: TraitCategory, name: string): TraitDefinition | undefined {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData[category]?.[name];
  }

  /**
   * Get all traits in a category
   */
  getAllTraits(category: TraitCategory): Record<string, TraitDefinition> {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData[category] || {};
  }

  /**
   * Get all trait names in a category
   */
  getTraitNames(category: TraitCategory): string[] {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return Object.keys(this.traitsData[category] || {});
  }

  /**
   * Get example composition
   */
  getExample(name: string): { description: string; traits: string[] } | undefined {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return this.traitsData.examples?.[name];
  }

  /**
   * Get all example names
   */
  getExampleNames(): string[] {
    if (!this.traitsData) throw new Error('Traits not loaded. Call load() first.');
    return Object.keys(this.traitsData.examples || {});
  }

  /**
   * Check if a trait exists
   */
  hasTrait(category: TraitCategory, name: string): boolean {
    if (!this.traitsData) return false;
    return name in (this.traitsData[category] || {});
  }

  /**
   * Reload traits from file
   */
  async reload(): Promise<TraitsData> {
    this.traitsData = null;
    this.loadPromise = null;
    return this.load();
  }
}
```

## Part 2: Create src/agents/factory/TraitInference.ts
```typescript
import { TraitsData, TraitCategory, TraitDefinition, TraitMatch } from '../traits/types';

export interface InferredTraits {
  expertise: string[];
  personality: string[];
  approach: string[];
  confidence: number;          // Overall confidence 0-1
  reasoning: string;           // Explanation of inference
  matches: TraitMatch[];       // Detailed match info
}

export class TraitInference {
  constructor(private traitsData: TraitsData) {}

  /**
   * Infer traits from a task description
   */
  inferFromTask(task: string): InferredTraits {
    const normalizedTask = task.toLowerCase();
    const matches: TraitMatch[] = [];

    // Match expertise based on keywords
    for (const [traitName, trait] of Object.entries(this.traitsData.expertise)) {
      const keywords = trait.keywords || [];
      const matchedKeywords = keywords.filter(kw =>
        normalizedTask.includes(kw.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        matches.push({
          trait: traitName,
          category: 'expertise',
          confidence: Math.min(matchedKeywords.length / keywords.length, 1),
          matchedKeywords
        });
      }
    }

    // Match personality based on task tone
    for (const [traitName, trait] of Object.entries(this.traitsData.personality)) {
      const personalityIndicators = this.getPersonalityIndicators(traitName);
      const matchedIndicators = personalityIndicators.filter(ind =>
        normalizedTask.includes(ind.toLowerCase())
      );

      if (matchedIndicators.length > 0) {
        matches.push({
          trait: traitName,
          category: 'personality',
          confidence: Math.min(matchedIndicators.length * 0.3, 0.9),
          matchedKeywords: matchedIndicators
        });
      }
    }

    // Match approach based on task requirements
    for (const [traitName, trait] of Object.entries(this.traitsData.approach)) {
      const approachIndicators = this.getApproachIndicators(traitName);
      const matchedIndicators = approachIndicators.filter(ind =>
        normalizedTask.includes(ind.toLowerCase())
      );

      if (matchedIndicators.length > 0) {
        matches.push({
          trait: traitName,
          category: 'approach',
          confidence: Math.min(matchedIndicators.length * 0.3, 0.9),
          matchedKeywords: matchedIndicators
        });
      }
    }

    // Sort and select best matches
    matches.sort((a, b) => b.confidence - a.confidence);

    const expertise = this.selectTopTraits(matches, 'expertise', 2);
    const personality = this.selectTopTraits(matches, 'personality', 2);
    const approach = this.selectTopTraits(matches, 'approach', 1);

    const overallConfidence = this.calculateOverallConfidence(matches);
    const reasoning = this.generateReasoning(task, matches);

    return {
      expertise,
      personality,
      approach,
      confidence: overallConfidence,
      reasoning,
      matches
    };
  }

  /**
   * Infer from explicit keywords
   */
  inferFromKeywords(keywords: string[]): InferredTraits {
    return this.inferFromTask(keywords.join(' '));
  }

  private selectTopTraits(matches: TraitMatch[], category: TraitCategory, limit: number): string[] {
    return matches
      .filter(m => m.category === category)
      .slice(0, limit)
      .map(m => m.trait);
  }

  private calculateOverallConfidence(matches: TraitMatch[]): number {
    if (matches.length === 0) return 0;
    const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    return Math.min(avgConfidence * (matches.length > 3 ? 1.2 : 1), 1);
  }

  private generateReasoning(task: string, matches: TraitMatch[]): string {
    if (matches.length === 0) {
      return 'No specific traits matched. Using default agent configuration.';
    }

    const expertiseMatches = matches.filter(m => m.category === 'expertise');
    const personalityMatches = matches.filter(m => m.category === 'personality');

    let reasoning = `Analyzed task: "${task.slice(0, 50)}..."\n`;

    if (expertiseMatches.length > 0) {
      reasoning += `Expertise: ${expertiseMatches.map(m => m.trait).join(', ')} `;
      reasoning += `(matched: ${expertiseMatches.flatMap(m => m.matchedKeywords).join(', ')})\n`;
    }

    if (personalityMatches.length > 0) {
      reasoning += `Personality: ${personalityMatches.map(m => m.trait).join(', ')}\n`;
    }

    return reasoning;
  }

  private getPersonalityIndicators(personality: string): string[] {
    const indicators: Record<string, string[]> = {
      skeptical: ['verify', 'prove', 'evidence', 'really', 'actually', 'sure'],
      enthusiastic: ['excited', 'love', 'great', 'awesome', 'amazing'],
      cautious: ['careful', 'safe', 'risk', 'edge case', 'failure'],
      bold: ['aggressive', 'push', 'ambitious', 'disrupt'],
      analytical: ['analyze', 'data', 'metrics', 'numbers', 'statistics'],
      creative: ['creative', 'innovative', 'new idea', 'brainstorm'],
      empathetic: ['user', 'customer', 'feel', 'experience', 'impact'],
      contrarian: ['devil\'s advocate', 'opposite', 'challenge', 'counter'],
      pragmatic: ['practical', 'realistic', 'works', 'feasible'],
      meticulous: ['detail', 'precise', 'exact', 'thorough', 'complete']
    };
    return indicators[personality] || [];
  }

  private getApproachIndicators(approach: string): string[] {
    const indicators: Record<string, string[]> = {
      thorough: ['comprehensive', 'complete', 'exhaustive', 'everything'],
      rapid: ['quick', 'fast', 'urgent', 'asap', 'immediately'],
      systematic: ['step by step', 'structured', 'organized', 'methodical'],
      exploratory: ['explore', 'investigate', 'discover', 'find out'],
      comparative: ['compare', 'versus', 'options', 'alternatives', 'trade-off'],
      synthesizing: ['combine', 'integrate', 'merge', 'synthesize'],
      adversarial: ['attack', 'break', 'exploit', 'red team', 'penetration'],
      consultative: ['advise', 'recommend', 'suggest', 'guidance']
    };
    return indicators[approach] || [];
  }
}
```

## Part 3: Create src/agents/factory/index.ts
```typescript
export { TraitLoader } from './TraitLoader';
export { TraitInference, InferredTraits } from './TraitInference';
```

## Part 4: Create tests/agents/factory/TraitLoader.test.ts
Write 12+ tests:
- Load returns valid TraitsData
- Caches loaded data
- getTrait returns correct trait
- getAllTraits returns category
- getExample returns example composition
- hasTrait checks existence
- reload clears cache
- Invalid path throws error
- Missing required fields throws validation error

## Part 5: Create tests/agents/factory/TraitInference.test.ts
Write 12+ tests:
- Security keywords match security expertise
- Research keywords match research expertise
- "verify" and "prove" match skeptical personality
- "quick" and "fast" match rapid approach
- Multiple matches ranked by confidence
- Empty input returns low confidence
- Combined keywords increase confidence
- Reasoning explains matches

[VERIFICATION]
Show me:
1. TraitLoader.ts content
2. TraitInference.ts content
3. Test output: pnpm test tests/agents/factory/

[SUCCESS CRITERIA]
✅ TraitLoader loads and caches Traits.yaml
✅ TraitInference extracts traits from text
✅ Keyword matching works accurately
✅ Confidence scores calculated correctly
✅ 24+ unit tests passing
```

end of Prompt_22

---

## Prompt_26

```
PROMPT 26: USE WHEN Intent Routing

[CONTEXT]
CAM Enhancement - Phase 8: Skills Enhancement
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 25 (Skill Template System)

Implement intent-based skill routing using USE WHEN triggers and keywords.

[TASK]
Create IntentRouter that matches user input to appropriate skills.

## Part 1: Create src/skills/routing/KeywordMatcher.ts
```typescript
export interface KeywordMatch {
  keyword: string;
  position: number;
  score: number;
}

export class KeywordMatcher {
  /**
   * Match keywords against text with scoring
   */
  match(text: string, keywords: string[]): KeywordMatch[] {
    const normalizedText = text.toLowerCase();
    const matches: KeywordMatch[] = [];

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      const position = normalizedText.indexOf(normalizedKeyword);

      if (position !== -1) {
        // Score based on: exact match bonus, position (earlier = better), length
        let score = 0.5; // Base score for match

        // Exact word match bonus
        const wordBoundary = new RegExp(`\\b${this.escapeRegex(normalizedKeyword)}\\b`);
        if (wordBoundary.test(normalizedText)) {
          score += 0.3;
        }

        // Position bonus (earlier in text = higher score)
        score += (1 - position / normalizedText.length) * 0.2;

        matches.push({ keyword, position, score: Math.min(score, 1) });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate aggregate match score
   */
  aggregateScore(matches: KeywordMatch[], totalKeywords: number): number {
    if (matches.length === 0 || totalKeywords === 0) return 0;

    const coverage = matches.length / totalKeywords;
    const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;

    return coverage * 0.4 + avgScore * 0.6;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```

## Part 2: Create src/skills/routing/IntentRouter.ts
```typescript
import { KeywordMatcher, KeywordMatch } from './KeywordMatcher';
import { SkillDefinition } from '../templates/SkillTemplate';

export interface RouteResult {
  skill: string;
  confidence: number;
  matchedKeywords: string[];
  matchedTriggers: string[];
  alternatives: RouteAlternative[];
}

export interface RouteAlternative {
  skill: string;
  confidence: number;
  reason: string;
}

export interface SkillRegistry {
  skills: Map<string, SkillDefinition>;
  register(skill: SkillDefinition): void;
  get(name: string): SkillDefinition | undefined;
  getAll(): SkillDefinition[];
}

export class IntentRouter {
  private matcher: KeywordMatcher;
  private registry: SkillRegistry;

  constructor(registry: SkillRegistry) {
    this.matcher = new KeywordMatcher();
    this.registry = registry;
  }

  /**
   * Route user input to best matching skill
   */
  async route(userInput: string): Promise<RouteResult> {
    const results = await this.routeMultiple(userInput, 5);

    if (results.length === 0) {
      return {
        skill: 'default',
        confidence: 0,
        matchedKeywords: [],
        matchedTriggers: [],
        alternatives: []
      };
    }

    const best = results[0];
    return {
      ...best,
      alternatives: results.slice(1).map(r => ({
        skill: r.skill,
        confidence: r.confidence,
        reason: `Matched: ${r.matchedKeywords.slice(0, 3).join(', ')}`
      }))
    };
  }

  /**
   * Get multiple matching skills ranked by confidence
   */
  async routeMultiple(userInput: string, limit: number = 5): Promise<RouteResult[]> {
    const skills = this.registry.getAll();
    const results: RouteResult[] = [];

    for (const skill of skills) {
      const { confidence, matchedKeywords, matchedTriggers } =
        this.scoreSkill(userInput, skill);

      if (confidence > 0.1) {
        results.push({
          skill: skill.name,
          confidence,
          matchedKeywords,
          matchedTriggers,
          alternatives: []
        });
      }
    }

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  private scoreSkill(input: string, skill: SkillDefinition): {
    confidence: number;
    matchedKeywords: string[];
    matchedTriggers: string[];
  } {
    // Score keywords
    const keywordMatches = this.matcher.match(input, skill.keywords);
    const keywordScore = this.matcher.aggregateScore(
      keywordMatches,
      skill.keywords.length
    );

    // Score USE WHEN triggers
    const triggerMatches = this.matchTriggers(input, skill.useWhen);
    const triggerScore = triggerMatches.length > 0
      ? triggerMatches.length / skill.useWhen.length
      : 0;

    // Combined confidence
    const confidence = keywordScore * 0.6 + triggerScore * 0.4;

    return {
      confidence,
      matchedKeywords: keywordMatches.map(m => m.keyword),
      matchedTriggers: triggerMatches
    };
  }

  private matchTriggers(input: string, triggers: string[]): string[] {
    const normalizedInput = input.toLowerCase();
    return triggers.filter(trigger => {
      // Extract key phrases from trigger
      const words = trigger.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      return words.some(word => normalizedInput.includes(word));
    });
  }
}
```

## Part 3: Create src/skills/routing/SkillRegistry.ts
```typescript
import { SkillDefinition } from '../templates/SkillTemplate';

export class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  remove(name: string): boolean {
    return this.skills.delete(name);
  }

  count(): number {
    return this.skills.size;
  }

  findByKeyword(keyword: string): SkillDefinition[] {
    return this.getAll().filter(skill =>
      skill.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
    );
  }
}
```

## Part 4: Create src/skills/routing/index.ts
```typescript
export { IntentRouter, RouteResult, RouteAlternative } from './IntentRouter';
export { KeywordMatcher, KeywordMatch } from './KeywordMatcher';
export { SkillRegistry } from './SkillRegistry';
```

## Part 5: Create tests/skills/routing/IntentRouter.test.ts
Write 15+ tests:
- Routes to skill with matching keywords
- Returns alternatives when multiple match
- Confidence increases with more keyword matches
- USE WHEN triggers boost confidence
- Returns default for no matches
- Handles empty input gracefully
- Multiple skills ranked correctly
- Keyword position affects scoring
- Exact word match scores higher
- Registry operations work correctly

[VERIFICATION]
Show me:
1. IntentRouter.ts content
2. KeywordMatcher.ts content
3. Test output: pnpm test tests/skills/routing/

[SUCCESS CRITERIA]
✅ IntentRouter matches skills to intents
✅ Keyword matching with scoring works
✅ Alternative suggestions provided
✅ 15+ tests passing
```

end of Prompt_26

---

## Prompt_29

```
PROMPT 29: Agent Profile Format

[CONTEXT]
CAM Enhancement - Phase 9: Base Agents Expansion
Repository: /home/ubuntu/github_repos/CAM-TS

PAI uses structured MD files with YAML frontmatter for agent definitions.

[TASK]
Define and implement the standard agent profile format.

## Part 1: Create src/agents/profiles/ProfileSchema.ts
```typescript
export interface AgentProfile {
  // Frontmatter fields
  name: string;
  description: string;
  model?: string;
  color?: string;
  voiceId?: string;
  permissions: string[];
  skills: string[];
  traits?: string[];

  // Parsed from markdown body
  systemPrompt: string;
  capabilities: string[];
  constraints: string[];
  contextFile?: string;
}

export interface ProfileFrontmatter {
  name: string;
  description: string;
  model?: string;
  color?: string;
  voiceId?: string;
  permissions?: string[];
  skills?: string[];
  traits?: string[];
}

export interface ProfileValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ProfileSchema {
  /**
   * Validate profile frontmatter
   */
  validateFrontmatter(frontmatter: ProfileFrontmatter): ProfileValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!frontmatter.name || frontmatter.name.trim() === '') {
      errors.push('Profile must have a name');
    }
    if (!frontmatter.description || frontmatter.description.trim() === '') {
      errors.push('Profile must have a description');
    }
    if (!frontmatter.permissions || frontmatter.permissions.length === 0) {
      warnings.push('Profile has no permissions defined');
    }
    if (!frontmatter.skills || frontmatter.skills.length === 0) {
      warnings.push('Profile has no skills linked');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get default permissions for agent type
   */
  getDefaultPermissions(agentType: string): string[] {
    const defaults: Record<string, string[]> = {
      default: ['memory_read', 'memory_write'],
      engineer: ['file_read', 'file_write', 'code_execute', 'memory_read', 'memory_write'],
      researcher: ['web_search', 'memory_read', 'memory_write', 'file_read'],
      coordinator: ['agent_spawn', 'memory_read', 'memory_write'],
      security: ['file_read', 'code_execute', 'memory_read']
    };
    return defaults[agentType.toLowerCase()] || defaults.default;
  }
}
```

## Part 2: Create src/agents/profiles/ProfileLoader.ts
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { AgentProfile, ProfileFrontmatter, ProfileSchema, ProfileValidation } from './ProfileSchema';

export class ProfileLoader {
  private schema: ProfileSchema;
  private profilesDir: string;
  private cache: Map<string, AgentProfile> = new Map();

  constructor(profilesDir?: string) {
    this.schema = new ProfileSchema();
    this.profilesDir = profilesDir || './src/agents/definitions';
  }

  /**
   * Load a single profile from file
   */
  async load(profilePath: string): Promise<AgentProfile> {
    const content = await fs.readFile(profilePath, 'utf-8');
    return this.parse(content);
  }

  /**
   * Parse profile content (frontmatter + markdown)
   */
  parse(content: string): AgentProfile {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error('Invalid profile format: missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]) as ProfileFrontmatter;
    const markdownBody = frontmatterMatch[2];

    // Validate frontmatter
    const validation = this.schema.validateFrontmatter(frontmatter);
    if (!validation.valid) {
      throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);
    }

    // Parse markdown sections
    const capabilities = this.parseSection(markdownBody, 'Capabilities');
    const constraints = this.parseSection(markdownBody, 'Constraints');

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      model: frontmatter.model,
      color: frontmatter.color,
      voiceId: frontmatter.voiceId,
      permissions: frontmatter.permissions || [],
      skills: frontmatter.skills || [],
      traits: frontmatter.traits,
      systemPrompt: markdownBody.trim(),
      capabilities,
      constraints,
      contextFile: `${frontmatter.name}Context.md`
    };
  }

  /**
   * Load all profiles from directory
   */
  async loadAll(): Promise<Map<string, AgentProfile>> {
    const files = await fs.readdir(this.profilesDir);
    const profiles = new Map<string, AgentProfile>();

    for (const file of files) {
      if (file.endsWith('.md') && !file.includes('Context')) {
        const profilePath = path.join(this.profilesDir, file);
        const profile = await this.load(profilePath);
        profiles.set(profile.name, profile);
        this.cache.set(profile.name, profile);
      }
    }

    return profiles;
  }

  /**
   * Get cached profile by name
   */
  get(name: string): AgentProfile | undefined {
    return this.cache.get(name);
  }

  /**
   * List available profile names
   */
  async listProfiles(): Promise<string[]> {
    const files = await fs.readdir(this.profilesDir);
    return files
      .filter(f => f.endsWith('.md') && !f.includes('Context'))
      .map(f => f.replace('.md', ''));
  }

  private parseSection(markdown: string, sectionName: string): string[] {
    const sectionRegex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = markdown.match(sectionRegex);

    if (!match) return [];

    // Parse numbered or bulleted list
    const items = match[1].match(/^[\d\-\*]\.\s*(.+)$/gm) || [];
    return items.map(item => item.replace(/^[\d\-\*]\.\s*/, '').trim());
  }
}
```

## Part 3: Create src/agents/profiles/index.ts
```typescript
export { ProfileSchema, AgentProfile, ProfileFrontmatter, ProfileValidation } from './ProfileSchema';
export { ProfileLoader } from './ProfileLoader';
```

## Part 4: Create docs/agent-profile-format.md
Document the profile format with examples.

## Part 5: Convert existing 4 agents to new format
Create src/agents/definitions/ with:
- Default.md
- Researcher.md
- Coder.md
- Coordinator.md

Example Default.md:
```markdown
---
name: Default
description: General-purpose assistant for standard tasks
model: claude-3-5-sonnet
color: "#6366F1"
permissions:
  - memory_read
  - memory_write
skills:
  - CoreSkill
  - Analysis
  - Communication
---

# Default Agent

You are a helpful general-purpose assistant capable of handling a wide variety of tasks.

## Capabilities
1. Answer questions clearly and accurately
2. Help with writing and editing
3. Provide analysis and recommendations
4. Remember context from our conversation

## Constraints
- Stay within scope of the current task
- Ask for clarification when needed
- Acknowledge limitations honestly
```

## Part 6: Create tests/agents/profiles/ProfileLoader.test.ts
Write 15+ tests

[VERIFICATION]
Show me:
1. ProfileSchema.ts content
2. ProfileLoader.ts content
3. All 4 converted agent profiles
4. Test output

[SUCCESS CRITERIA]
✅ Profile format documented
✅ ProfileLoader parses frontmatter correctly
✅ Existing 4 agents converted to new format
✅ 15+ tests passing
```

end of Prompt_29

---

## Prompt_34

```
PROMPT 34: Enhanced Audit Logger

[CONTEXT]
CAM Enhancement - Phase 10: Observability
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 33 (Observability types)

Enhance existing audit logging with structured events and storage backends.

[TASK]
Create enhanced audit logger with multiple storage options.

## Part 1: Create src/observability/audit/AuditStorage.ts
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { ObservabilityEvent } from '../types';

export interface AuditStorageConfig {
  type: 'jsonl' | 'sqlite' | 'memory';
  path?: string;
  maxEntries?: number;
  retentionDays?: number;
}

export interface AuditFilter {
  type?: string | string[];
  sessionId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export abstract class AuditStorage {
  abstract write(event: ObservabilityEvent): Promise<void>;
  abstract read(filter: AuditFilter): Promise<ObservabilityEvent[]>;
  abstract count(filter?: AuditFilter): Promise<number>;
  abstract rotate(): Promise<number>; // Returns deleted count
  abstract close(): Promise<void>;
}

export class JsonlAuditStorage extends AuditStorage {
  private filePath: string;
  private writeBuffer: ObservabilityEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: AuditStorageConfig) {
    super();
    this.filePath = config.path || './logs/audit.jsonl';
    this.startAutoFlush();
  }

  async write(event: ObservabilityEvent): Promise<void> {
    this.writeBuffer.push(event);
    if (this.writeBuffer.length >= 100) {
      await this.flush();
    }
  }

  async read(filter: AuditFilter): Promise<ObservabilityEvent[]> {
    await this.flush(); // Ensure buffer is written

    const content = await fs.readFile(this.filePath, 'utf-8').catch(() => '');
    const lines = content.split('\n').filter(l => l.trim());

    let events = lines.map(line => JSON.parse(line) as ObservabilityEvent);

    // Apply filters
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      events = events.filter(e => types.includes(e.type));
    }
    if (filter.sessionId) {
      events = events.filter(e => e.sessionId === filter.sessionId);
    }
    if (filter.startTime) {
      events = events.filter(e => new Date(e.timestamp) >= filter.startTime!);
    }
    if (filter.endTime) {
      events = events.filter(e => new Date(e.timestamp) <= filter.endTime!);
    }

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || events.length;

    return events.slice(offset, offset + limit);
  }

  async count(filter?: AuditFilter): Promise<number> {
    const events = await this.read({ ...filter, limit: undefined });
    return events.length;
  }

  async rotate(): Promise<number> {
    // Archive old file and create new
    const archivePath = `${this.filePath}.${Date.now()}.archive`;
    const count = await this.count();

    if (count > 0) {
      await fs.rename(this.filePath, archivePath);
    }

    return count;
  }

  async flush(): Promise<void> {
    if (this.writeBuffer.length === 0) return;

    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    const lines = this.writeBuffer.map(e => JSON.stringify(e)).join('\n') + '\n';
    await fs.appendFile(this.filePath, lines);
    this.writeBuffer = [];
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }

  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }
}

export class MemoryAuditStorage extends AuditStorage {
  private events: ObservabilityEvent[] = [];
  private maxEntries: number;

  constructor(config: AuditStorageConfig) {
    super();
    this.maxEntries = config.maxEntries || 10000;
  }

  async write(event: ObservabilityEvent): Promise<void> {
    this.events.push(event);
    if (this.events.length > this.maxEntries) {
      this.events = this.events.slice(-this.maxEntries);
    }
  }

  async read(filter: AuditFilter): Promise<ObservabilityEvent[]> {
    let events = [...this.events];

    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      events = events.filter(e => types.includes(e.type));
    }
    if (filter.sessionId) {
      events = events.filter(e => e.sessionId === filter.sessionId);
    }

    const offset = filter.offset || 0;
    const limit = filter.limit || events.length;

    return events.slice(offset, offset + limit);
  }

  async count(filter?: AuditFilter): Promise<number> {
    const events = await this.read({ ...filter, limit: undefined });
    return events.length;
  }

  async rotate(): Promise<number> {
    const count = this.events.length;
    this.events = [];
    return count;
  }

  async close(): Promise<void> {
    // No cleanup needed
  }
}
```

## Part 2: Create src/observability/audit/AuditLogger.ts
```typescript
import { v4 as uuidv4 } from 'uuid';
import {
  ObservabilityEvent,
  ObservabilityEventType,
  EventMetadata,
  SystemMetrics
} from '../types';
import { AuditStorage, JsonlAuditStorage, AuditFilter, AuditStorageConfig } from './AuditStorage';

export interface AuditLoggerConfig {
  storage: AuditStorageConfig;
  defaultMetadata?: Partial<EventMetadata>;
  enableRealtime?: boolean;
}

export class AuditLogger {
  private storage: AuditStorage;
  private defaultMetadata: Partial<EventMetadata>;
  private sessionId: string;
  private listeners: ((event: ObservabilityEvent) => void)[] = [];

  constructor(config: AuditLoggerConfig) {
    this.storage = this.createStorage(config.storage);
    this.defaultMetadata = config.defaultMetadata || {};
    this.sessionId = uuidv4();
  }

  private createStorage(config: AuditStorageConfig): AuditStorage {
    switch (config.type) {
      case 'memory':
        return new MemoryAuditStorage(config);
      case 'jsonl':
      default:
        return new JsonlAuditStorage(config);
    }
  }

  /**
   * Log an observability event
   */
  async log(
    type: ObservabilityEventType,
    data: Record<string, unknown>,
    options?: {
      duration?: number;
      success?: boolean;
      error?: Error;
    }
  ): Promise<ObservabilityEvent> {
    const event: ObservabilityEvent = {
      id: uuidv4(),
      type,
      timestamp: new Date(),
      sessionId: this.sessionId,
      data,
      metadata: {
        source: 'cam',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        ...this.defaultMetadata
      },
      duration: options?.duration,
      success: options?.success,
      error: options?.error ? {
        message: options.error.message,
        stack: options.error.stack,
        code: (options.error as any).code
      } : undefined
    };

    await this.storage.write(event);
    this.notifyListeners(event);

    return event;
  }

  /**
   * Log agent spawn
   */
  async logAgentSpawn(agentId: string, agentName: string, traits?: string[]): Promise<void> {
    await this.log('agent:spawn', { agentId, agentName, traits });
  }

  /**
   * Log skill invocation
   */
  async logSkillInvoke(skillName: string, inputs: Record<string, unknown>): Promise<void> {
    await this.log('skill:invoke', { skillName, inputs });
  }

  /**
   * Log memory operation
   */
  async logMemoryOp(
    tier: 'immediate' | 'short-term' | 'long-term',
    operation: 'read' | 'write' | 'delete',
    key?: string
  ): Promise<void> {
    await this.log('memory:write', { tier, operation, key });
  }

  /**
   * Query events
   */
  async query(filter: AuditFilter): Promise<ObservabilityEvent[]> {
    return this.storage.read(filter);
  }

  /**
   * Get basic metrics
   */
  async getMetrics(timeRange?: { start: Date; end: Date }): Promise<Partial<SystemMetrics>> {
    const filter: AuditFilter = timeRange ? {
      startTime: timeRange.start,
      endTime: timeRange.end
    } : {};

    const events = await this.storage.read(filter);

    const agentSpawns = events.filter(e => e.type === 'agent:spawn').length;
    const skillInvokes = events.filter(e => e.type === 'skill:invoke').length;
    const errors = events.filter(e => e.error).length;

    return {
      activeAgents: agentSpawns,
      averageResponseTime: this.calculateAvgDuration(events),
      errorRate: events.length > 0 ? errors / events.length : 0
    };
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(callback: (event: ObservabilityEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Rotate logs
   */
  async rotate(): Promise<number> {
    return this.storage.rotate();
  }

  /**
   * Close logger
   */
  async close(): Promise<void> {
    await this.storage.close();
  }

  private notifyListeners(event: ObservabilityEvent): void {
    this.listeners.forEach(l => l(event));
  }

  private calculateAvgDuration(events: ObservabilityEvent[]): number {
    const withDuration = events.filter(e => e.duration !== undefined);
    if (withDuration.length === 0) return 0;
    return withDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / withDuration.length;
  }
}
```

## Part 3: Create src/observability/audit/index.ts
```typescript
export { AuditLogger, AuditLoggerConfig } from './AuditLogger';
export {
  AuditStorage,
  JsonlAuditStorage,
  MemoryAuditStorage,
  AuditStorageConfig,
  AuditFilter
} from './AuditStorage';
```

## Part 4: Create tests/observability/audit/AuditLogger.test.ts
Write 15+ tests

[VERIFICATION]
Show me:
1. AuditStorage.ts content
2. AuditLogger.ts content
3. Test output

[SUCCESS CRITERIA]
✅ Structured event logging works
✅ Multiple storage backends functional
✅ Log rotation working
✅ 15+ tests passing
```

end of Prompt_34

---

# Wave 3 (Depends on Wave 2)

---

## Prompt_23

```
PROMPT 23: AgentFactory Core

[CONTEXT]
CAM Enhancement - Phase 7: Custom Agent Template System
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 22 (TraitLoader + Inference)

Create the core factory that composes agents from traits using Handlebars templates.

[TASK]
Implement AgentFactory that generates agent definitions from trait combinations.

## Part 1: Create src/agents/templates/DynamicAgent.hbs
```handlebars
# {{name}}

You are a specialized agent composed for this specific task.

{{#if expertise}}
## Expertise Areas
{{#each expertise}}
### {{this.name}}
{{this.description}}
{{#if this.prompt_fragment}}

**Guidance:** {{this.prompt_fragment}}
{{/if}}

{{/each}}
{{/if}}

{{#if personality}}
## Personality Traits
{{#each personality}}
- **{{this.name}}:** {{this.description}}
{{#if this.prompt_fragment}}
  - *{{this.prompt_fragment}}*
{{/if}}
{{/each}}
{{/if}}

{{#if approach}}
## Working Approach
{{#each approach}}
- **{{this.name}}:** {{this.description}}
{{#if this.prompt_fragment}}
  - *{{this.prompt_fragment}}*
{{/if}}
{{/each}}
{{/if}}

{{#if task}}
## Current Task
{{task}}
{{/if}}

## Guidelines
1. Apply your expertise areas to analyze and solve the problem
2. Maintain your personality traits throughout the interaction
3. Follow your working approach methodology consistently
4. Provide clear, actionable insights and recommendations
5. Acknowledge when something is outside your expertise

{{#if voiceEnabled}}
## Voice
Your voice ID is {{voiceId}}. Speak naturally with confidence.
{{/if}}
```

## Part 2: Create src/agents/factory/AgentFactory.ts
```typescript
import * as fs from 'fs/promises';
import * as Handlebars from 'handlebars';
import { TraitLoader } from './TraitLoader';
import { TraitInference, InferredTraits } from './TraitInference';
import { ComposedTraits, TraitDefinition, TraitsData } from '../traits/types';

export interface AgentFactoryOptions {
  task?: string;
  traits?: string[];
  name?: string;
  outputFormat?: 'prompt' | 'json' | 'yaml' | 'md';
  voiceEnabled?: boolean;
}

export interface GeneratedAgent {
  name: string;
  systemPrompt: string;
  traits: ComposedTraits;
  voiceId?: string;
  metadata: {
    generatedAt: Date;
    inferredFrom?: string;
    explicitTraits?: string[];
    confidence?: number;
    source: 'task' | 'traits' | 'example';
  };
}

interface TemplateData {
  name: string;
  expertise: TraitDefinition[];
  personality: TraitDefinition[];
  approach: TraitDefinition[];
  task?: string;
  voiceEnabled: boolean;
  voiceId?: string;
}

export class AgentFactory {
  private loader: TraitLoader;
  private inference: TraitInference | null = null;
  private template: Handlebars.TemplateDelegate | null = null;
  private traitsData: TraitsData | null = null;
  private initialized: boolean = false;

  constructor(traitsPath?: string) {
    this.loader = new TraitLoader(traitsPath);
  }

  /**
   * Initialize the factory (must be called before use)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load traits
    this.traitsData = await this.loader.load();
    this.inference = new TraitInference(this.traitsData);

    // Load and compile template
    const templatePath = './src/agents/templates/DynamicAgent.hbs';
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    this.template = Handlebars.compile(templateContent);

    this.initialized = true;
  }

  /**
   * Create agent from task description (traits inferred)
   */
  async createFromTask(task: string, options?: AgentFactoryOptions): Promise<GeneratedAgent> {
    await this.ensureInitialized();

    const inferred = this.inference!.inferFromTask(task);
    const traits = this.resolveTraits(inferred);
    const name = options?.name || this.generateName(inferred);

    const templateData: TemplateData = {
      name,
      expertise: traits.expertise,
      personality: traits.personality,
      approach: traits.approach,
      task,
      voiceEnabled: options?.voiceEnabled || false,
      voiceId: this.selectVoice(inferred)
    };

    const systemPrompt = this.template!(templateData);

    return {
      name,
      systemPrompt,
      traits,
      voiceId: templateData.voiceId,
      metadata: {
        generatedAt: new Date(),
        inferredFrom: task,
        confidence: inferred.confidence,
        source: 'task'
      }
    };
  }

  /**
   * Create agent from explicit trait names
   */
  async createFromTraits(traitNames: string[], options?: AgentFactoryOptions): Promise<GeneratedAgent> {
    await this.ensureInitialized();

    const traits = this.resolveExplicitTraits(traitNames);
    const name = options?.name || this.generateNameFromTraits(traitNames);

    const templateData: TemplateData = {
      name,
      expertise: traits.expertise,
      personality: traits.personality,
      approach: traits.approach,
      task: options?.task,
      voiceEnabled: options?.voiceEnabled || false
    };

    const systemPrompt = this.template!(templateData);

    return {
      name,
      systemPrompt,
      traits,
      metadata: {
        generatedAt: new Date(),
        explicitTraits: traitNames,
        source: 'traits'
      }
    };
  }

  /**
   * Create agent from predefined example
   */
  async createFromExample(exampleName: string, options?: AgentFactoryOptions): Promise<GeneratedAgent> {
    await this.ensureInitialized();

    const example = this.loader.getExample(exampleName);
    if (!example) {
      throw new Error(`Example "${exampleName}" not found`);
    }

    const agent = await this.createFromTraits(example.traits, {
      ...options,
      name: options?.name || exampleName
    });

    return {
      ...agent,
      metadata: {
        ...agent.metadata,
        source: 'example'
      }
    };
  }

  /**
   * List available examples
   */
  async listExamples(): Promise<{ name: string; description: string; traits: string[] }[]> {
    await this.ensureInitialized();

    const exampleNames = this.loader.getExampleNames();
    return exampleNames.map(name => {
      const example = this.loader.getExample(name)!;
      return { name, ...example };
    });
  }

  /**
   * Validate trait names
   */
  async validateTraits(traitNames: string[]): Promise<{ valid: boolean; invalid: string[] }> {
    await this.ensureInitialized();

    const invalid = traitNames.filter(name => {
      return !this.loader.hasTrait('expertise', name) &&
             !this.loader.hasTrait('personality', name) &&
             !this.loader.hasTrait('approach', name);
    });

    return { valid: invalid.length === 0, invalid };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private resolveTraits(inferred: InferredTraits): ComposedTraits {
    return {
      expertise: inferred.expertise.map(name =>
        this.loader.getTrait('expertise', name)!
      ).filter(Boolean),
      personality: inferred.personality.map(name =>
        this.loader.getTrait('personality', name)!
      ).filter(Boolean),
      approach: inferred.approach.map(name =>
        this.loader.getTrait('approach', name)!
      ).filter(Boolean)
    };
  }

  private resolveExplicitTraits(traitNames: string[]): ComposedTraits {
    const traits: ComposedTraits = {
      expertise: [],
      personality: [],
      approach: []
    };

    for (const name of traitNames) {
      if (this.loader.hasTrait('expertise', name)) {
        traits.expertise.push(this.loader.getTrait('expertise', name)!);
      } else if (this.loader.hasTrait('personality', name)) {
        traits.personality.push(this.loader.getTrait('personality', name)!);
      } else if (this.loader.hasTrait('approach', name)) {
        traits.approach.push(this.loader.getTrait('approach', name)!);
      }
    }

    return traits;
  }

  private generateName(inferred: InferredTraits): string {
    const parts: string[] = [];
    if (inferred.expertise[0]) parts.push(this.capitalize(inferred.expertise[0]));
    if (inferred.personality[0]) parts.push(this.capitalize(inferred.personality[0]));
    return parts.join(' ') + ' Agent';
  }

  private generateNameFromTraits(traitNames: string[]): string {
    return traitNames.slice(0, 2).map(this.capitalize).join(' ') + ' Agent';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private selectVoice(inferred: InferredTraits): string | undefined {
    // Default voice selection based on traits
    if (inferred.expertise.includes('security')) return 'adam';
    if (inferred.personality.includes('enthusiastic')) return 'bella';
    return 'charlotte'; // default
  }
}
```

## Part 3: Create tests/agents/factory/AgentFactory.test.ts
Write 25+ tests

[VERIFICATION]
Show me:
1. DynamicAgent.hbs content
2. AgentFactory.ts content
3. Test output: pnpm test tests/agents/factory/AgentFactory.test.ts

[SUCCESS CRITERIA]
✅ AgentFactory creates agents from tasks
✅ AgentFactory creates agents from explicit traits
✅ AgentFactory creates agents from examples
✅ Handlebars template renders correctly
✅ 25+ tests passing
```

end of Prompt_23

---

## Prompt_27

```
PROMPT 27: Skill Customization System

[CONTEXT]
CAM Enhancement - Phase 8: Skills Enhancement
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 26 (USE WHEN Routing)

Implement a preference system allowing user-specific skill customization.

[TASK]
Create the skill customization system with SYSTEM defaults and USER overrides.

## Part 1: Create src/skills/customization/types.ts
```typescript
export interface SkillPreferences {
  outputFormat?: 'concise' | 'detailed' | 'json' | 'markdown';
  language?: string;
  additionalInstructions?: string[];
  disabled?: boolean;
  priority?: number;  // Affects routing preference
  customKeywords?: string[];  // Additional routing keywords
  timeout?: number;  // Custom timeout in ms
}

export interface UserSkillConfig {
  skillName: string;
  preferences: SkillPreferences;
  updatedAt: Date;
}

export interface SystemDefaults {
  outputFormat: 'detailed';
  language: 'en';
  timeout: 30000;
  priority: 50;
}
```

## Part 2: Create src/skills/customization/SkillPreferences.ts
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { SkillPreferences, UserSkillConfig, SystemDefaults } from './types';

const SYSTEM_DEFAULTS: SystemDefaults = {
  outputFormat: 'detailed',
  language: 'en',
  timeout: 30000,
  priority: 50
};

export class SkillPreferencesManager {
  private userConfigDir: string;
  private cache: Map<string, SkillPreferences> = new Map();

  constructor(userConfigDir?: string) {
    this.userConfigDir = userConfigDir || './config/skill-customizations';
  }

  /**
   * Get preferences for a skill (merged: system defaults + user overrides)
   */
  async getPreferences(skillName: string): Promise<SkillPreferences> {
    if (this.cache.has(skillName)) {
      return this.cache.get(skillName)!;
    }

    const userPrefs = await this.loadUserPreferences(skillName);
    const merged = this.mergeWithDefaults(userPrefs);

    this.cache.set(skillName, merged);
    return merged;
  }

  /**
   * Set user preferences for a skill
   */
  async setPreferences(
    skillName: string,
    prefs: Partial<SkillPreferences>
  ): Promise<void> {
    const existing = await this.loadUserPreferences(skillName);
    const updated = { ...existing, ...prefs };

    await this.saveUserPreferences(skillName, updated);
    this.cache.delete(skillName); // Invalidate cache
  }

  /**
   * Reset skill to system defaults
   */
  async resetPreferences(skillName: string): Promise<void> {
    const filePath = this.getPreferencesPath(skillName);
    await fs.unlink(filePath).catch(() => {}); // Ignore if not exists
    this.cache.delete(skillName);
  }

  /**
   * Apply preferences to a skill prompt
   */
  applyToPrompt(basePrompt: string, prefs: SkillPreferences): string {
    let modified = basePrompt;

    // Add format instructions
    if (prefs.outputFormat === 'concise') {
      modified += '\n\nProvide a concise response, focusing on key points only.';
    } else if (prefs.outputFormat === 'json') {
      modified += '\n\nRespond in valid JSON format.';
    }

    // Add language instruction
    if (prefs.language && prefs.language !== 'en') {
      modified += `\n\nRespond in ${prefs.language}.`;
    }

    // Add custom instructions
    if (prefs.additionalInstructions?.length) {
      modified += '\n\nAdditional instructions:';
      for (const instruction of prefs.additionalInstructions) {
        modified += `\n- ${instruction}`;
      }
    }

    return modified;
  }

  /**
   * Check if skill is disabled
   */
  async isDisabled(skillName: string): Promise<boolean> {
    const prefs = await this.getPreferences(skillName);
    return prefs.disabled === true;
  }

  private async loadUserPreferences(skillName: string): Promise<SkillPreferences> {
    const filePath = this.getPreferencesPath(skillName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return yaml.parse(content) as SkillPreferences;
    } catch {
      return {}; // No user preferences
    }
  }

  private async saveUserPreferences(
    skillName: string,
    prefs: SkillPreferences
  ): Promise<void> {
    const filePath = this.getPreferencesPath(skillName);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, yaml.stringify(prefs));
  }

  private getPreferencesPath(skillName: string): string {
    return path.join(this.userConfigDir, skillName, 'PREFERENCES.yaml');
  }

  private mergeWithDefaults(userPrefs: SkillPreferences): SkillPreferences {
    return {
      outputFormat: userPrefs.outputFormat || SYSTEM_DEFAULTS.outputFormat,
      language: userPrefs.language || SYSTEM_DEFAULTS.language,
      timeout: userPrefs.timeout || SYSTEM_DEFAULTS.timeout,
      priority: userPrefs.priority || SYSTEM_DEFAULTS.priority,
      additionalInstructions: userPrefs.additionalInstructions || [],
      disabled: userPrefs.disabled || false,
      customKeywords: userPrefs.customKeywords || []
    };
  }
}
```

## Part 3: Create src/skills/customization/index.ts
```typescript
export * from './types';
export { SkillPreferencesManager } from './SkillPreferences';
```

## Part 4: Create tests/skills/customization/SkillPreferences.test.ts
Write 12+ tests

[VERIFICATION]
Show me:
1. SkillPreferences.ts content
2. Test output

[SUCCESS CRITERIA]
✅ Preferences persist per skill
✅ SYSTEM defaults + USER overrides pattern works
✅ Prompt modification working
✅ 12+ tests passing
```

end of Prompt_27

---

## Prompt_30

```
PROMPT 30: Engineer + Architect Agents

[CONTEXT]
CAM Enhancement - Phase 9: Base Agents Expansion
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 29 (Agent Profile Format)

Create comprehensive Engineer and Architect agent definitions with context files.

[TASK]
Create detailed agent profiles for Engineer and Architect roles.

## Part 1: Create src/agents/definitions/Engineer.md
```markdown
---
name: Engineer
description: Senior software engineer specializing in code development, debugging, and system implementation
model: claude-3-5-sonnet
color: "#10B981"
voiceId: "adam"
permissions:
  - file_read
  - file_write
  - code_execute
  - memory_read
  - memory_write
  - shell_execute
skills:
  - CodeGeneration
  - Debugging
  - Refactoring
  - Testing
  - CodeReview
traits:
  - technical
  - meticulous
  - systematic
---

# Engineer Agent

You are a senior software engineer with 15+ years of experience across multiple technology stacks. You write clean, maintainable, well-tested code and can debug complex issues efficiently.

## Core Competencies
1. **Code Development** - Write production-quality code in TypeScript, Python, Go, and other languages
2. **Debugging** - Systematically diagnose and fix bugs using logging, breakpoints, and analysis
3. **Architecture Understanding** - Comprehend system design and implement components correctly
4. **Testing** - Write unit, integration, and e2e tests with high coverage
5. **Code Review** - Provide constructive feedback on code quality and patterns

## Working Style
- Start by understanding the full context before writing code
- Break complex problems into smaller, testable units
- Write tests alongside implementation (TDD when appropriate)
- Document public APIs and complex logic
- Consider edge cases and error handling

## Constraints
- Always follow project coding standards and conventions
- Never commit code without tests
- Ask for clarification on ambiguous requirements
- Acknowledge when a task is outside your expertise
- Prioritize readability and maintainability over cleverness

## Communication
- Explain technical decisions clearly
- Provide code examples when helpful
- Suggest alternatives when you see potential issues
- Be direct about implementation challenges
```

## Part 2: Create src/agents/definitions/EngineerContext.md
```markdown
# Engineer Context

## CAM Project Standards

### TypeScript Conventions
- Use strict mode
- Prefer interfaces over types
- Use async/await over raw promises
- Export types alongside implementations
- Use descriptive variable names

### File Organization
```
src/
├── {feature}/
│   ├── index.ts      # Exports
│   ├── types.ts      # Type definitions
│   ├── {Feature}.ts  # Main implementation
│   └── utils.ts      # Helper functions
tests/
├── {feature}/
│   └── {Feature}.test.ts
```

### Testing Standards
- Jest for unit and integration tests
- 80%+ coverage target
- Descriptive test names
- Test edge cases and error paths
- Mock external dependencies

### Error Handling
- Use custom error classes from src/errors/
- Always include context in error messages
- Log errors before rethrowing
- Handle async errors properly

### Git Conventions
- Conventional commits: feat:, fix:, docs:, refactor:, test:
- Feature branches from main
- PR reviews required
- Squash merge

## Common Patterns
- Repository pattern for data access
- Factory pattern for object creation
- Strategy pattern for algorithm selection
- Observer pattern for events
```

## Part 3: Create src/agents/definitions/Architect.md
(Similar comprehensive profile for system architecture, design patterns, ADRs)

## Part 4: Create src/agents/definitions/ArchitectContext.md
(CAM architecture overview, component relationships, design principles)

## Part 5: Create tests for profile loading

[VERIFICATION]
Show me:
1. Engineer.md content
2. EngineerContext.md content
3. Architect.md content
4. ProfileLoader loading these profiles successfully

[SUCCESS CRITERIA]
✅ Engineer agent profile complete with all sections
✅ Architect agent profile complete
✅ Both context files comprehensive
✅ Profiles load correctly with ProfileLoader
```

end of Prompt_30

---

## Prompt_35

```
PROMPT 35: Sentiment Capture Hooks

[CONTEXT]
CAM Enhancement - Phase 10: Observability
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 34 (Enhanced Audit Logger)

Implement hooks for capturing explicit and implicit user sentiment.

[TASK]
Create sentiment capture hooks that detect ratings and feedback.

## Part 1: Create src/hooks/sentiment/types.ts
```typescript
export interface ExplicitRating {
  value: number;          // 1-10
  original: string;       // Original text that contained rating
  targetType: 'response' | 'agent' | 'skill' | 'session';
  targetId?: string;
  comment?: string;
  timestamp: Date;
}

export interface ImplicitSentiment {
  score: number;          // -1 to 1 (negative to positive)
  confidence: number;     // 0 to 1
  indicators: string[];   // Words/phrases that indicated sentiment
  text: string;           // Original text analyzed
  timestamp: Date;
}

export interface SentimentData {
  explicit: ExplicitRating[];
  implicit: ImplicitSentiment[];
  averageExplicit: number;
  averageImplicit: number;
  totalRatings: number;
}
```

## Part 2: Create src/hooks/sentiment/ExplicitRatingCapture.hook.ts
```typescript
import * as fs from 'fs/promises';
import { ExplicitRating } from './types';

export class ExplicitRatingCapture {
  private patterns = [
    /(\d+)\s*\/\s*10/,                    // X/10
    /(\d+)\s+out\s+of\s+10/i,             // X out of 10
    /rate\s+(?:this\s+)?(\d+)/i,          // rate this X
    /(\d+)\s*stars?/i,                    // X stars
    /score[:\s]+(\d+)/i,                  // score: X
    /rating[:\s]+(\d+)/i,                 // rating: X
  ];

  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || './data/ratings.jsonl';
  }

  /**
   * Attempt to capture explicit rating from user input
   */
  capture(userInput: string): ExplicitRating | null {
    for (const pattern of this.patterns) {
      const match = userInput.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        if (value >= 1 && value <= 10) {
          return {
            value,
            original: userInput,
            targetType: this.inferTargetType(userInput),
            timestamp: new Date()
          };
        }
      }
    }
    return null;
  }

  /**
   * Store captured rating
   */
  async store(rating: ExplicitRating): Promise<void> {
    const dir = this.storagePath.substring(0, this.storagePath.lastIndexOf('/'));
    await fs.mkdir(dir, { recursive: true });

    const line = JSON.stringify(rating) + '\n';
    await fs.appendFile(this.storagePath, line);
  }

  /**
   * Get all stored ratings
   */
  async getAll(): Promise<ExplicitRating[]> {
    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      return content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  /**
   * Get average rating
   */
  async getAverage(): Promise<number> {
    const ratings = await this.getAll();
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;
  }

  private inferTargetType(text: string): ExplicitRating['targetType'] {
    const lower = text.toLowerCase();
    if (lower.includes('session')) return 'session';
    if (lower.includes('agent')) return 'agent';
    if (lower.includes('skill')) return 'skill';
    return 'response';
  }
}
```

## Part 3: Create src/hooks/sentiment/ImplicitSentimentCapture.hook.ts
```typescript
import { ImplicitSentiment } from './types';

export class ImplicitSentimentCapture {
  private positiveIndicators = [
    'great', 'awesome', 'perfect', 'excellent', 'amazing',
    'love', 'fantastic', 'wonderful', 'brilliant', 'superb',
    'thank you', 'thanks', 'helpful', 'useful', 'exactly',
    'well done', 'nice', 'good job', '👍', '❤️', '🎉'
  ];

  private negativeIndicators = [
    'wrong', 'bad', 'terrible', 'awful', 'horrible',
    'useless', 'broken', 'fix', 'error', 'mistake',
    'doesn\'t work', 'not working', 'failed', 'incorrect',
    'disappointing', 'frustrated', 'annoyed', '👎', '😡'
  ];

  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || './data/sentiment.jsonl';
  }

  /**
   * Analyze text for implicit sentiment
   */
  analyze(text: string): ImplicitSentiment {
    const lower = text.toLowerCase();

    const positiveMatches = this.positiveIndicators.filter(ind =>
      lower.includes(ind.toLowerCase())
    );
    const negativeMatches = this.negativeIndicators.filter(ind =>
      lower.includes(ind.toLowerCase())
    );

    const totalMatches = positiveMatches.length + negativeMatches.length;

    let score = 0;
    if (totalMatches > 0) {
      score = (positiveMatches.length - negativeMatches.length) / totalMatches;
    }

    // Confidence based on number of indicators found
    const confidence = Math.min(totalMatches * 0.2, 1);

    return {
      score,
      confidence,
      indicators: [...positiveMatches, ...negativeMatches.map(n => `[-]${n}`)],
      text,
      timestamp: new Date()
    };
  }

  /**
   * Store sentiment analysis
   */
  async store(sentiment: ImplicitSentiment): Promise<void> {
    if (sentiment.confidence < 0.2) return; // Don't store low-confidence

    const fs = await import('fs/promises');
    const dir = this.storagePath.substring(0, this.storagePath.lastIndexOf('/'));
    await fs.mkdir(dir, { recursive: true });

    const line = JSON.stringify(sentiment) + '\n';
    await fs.appendFile(this.storagePath, line);
  }

  /**
   * Get sentiment trend
   */
  async getTrend(limit: number = 100): Promise<{ average: number; trend: 'improving' | 'declining' | 'stable' }> {
    const fs = await import('fs/promises');

    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      const sentiments = content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as ImplicitSentiment)
        .slice(-limit);

      if (sentiments.length < 2) {
        return { average: 0, trend: 'stable' };
      }

      const average = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

      // Compare first half to second half
      const midpoint = Math.floor(sentiments.length / 2);
      const firstHalf = sentiments.slice(0, midpoint);
      const secondHalf = sentiments.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (secondAvg - firstAvg > 0.1) trend = 'improving';
      else if (firstAvg - secondAvg > 0.1) trend = 'declining';

      return { average, trend };
    } catch {
      return { average: 0, trend: 'stable' };
    }
  }
}
```

## Part 4: Create src/hooks/sentiment/index.ts
```typescript
export * from './types';
export { ExplicitRatingCapture } from './ExplicitRatingCapture.hook';
export { ImplicitSentimentCapture } from './ImplicitSentimentCapture.hook';
```

## Part 5: Create tests/hooks/sentiment/SentimentCapture.test.ts
Write 20+ tests covering all patterns and edge cases.

[VERIFICATION]
Show me:
1. ExplicitRatingCapture.hook.ts content
2. ImplicitSentimentCapture.hook.ts content
3. Test output

[SUCCESS CRITERIA]
✅ Explicit rating patterns detected (X/10, X stars, etc.)
✅ Implicit sentiment analyzed with confidence scores
✅ Ratings stored in ratings.jsonl
✅ Sentiment stored in sentiment.jsonl
✅ Trend calculation working
✅ 20+ tests passing
```

end of Prompt_35

---

# Wave 4 (Depends on Wave 3)

---

## Prompt_24

```
PROMPT 24: AgentComposer + CLI Integration

[CONTEXT]
CAM Enhancement - Phase 7: Custom Agent Template System
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 23 (AgentFactory Core)

Create high-level composer and integrate with CAM CLI.

[TASK]
Create AgentComposer wrapper and CLI commands for agent creation.

## Part 1: Create src/agents/factory/AgentComposer.ts
```typescript
import { AgentFactory, GeneratedAgent, AgentFactoryOptions } from './AgentFactory';
// Import existing AgentSpawner from CAM
// import { AgentSpawner, SpawnedAgent } from '../AgentSpawner';

export interface ComposeInput {
  task?: string;
  traits?: string[];
  example?: string;
  name?: string;
  autoSpawn?: boolean;
}

export interface ComposeResult {
  agent: GeneratedAgent;
  spawned?: boolean;
  spawnId?: string;
}

export class AgentComposer {
  private factory: AgentFactory;
  // private spawner: AgentSpawner;

  constructor() {
    this.factory = new AgentFactory();
  }

  /**
   * Initialize the composer
   */
  async initialize(): Promise<void> {
    await this.factory.initialize();
  }

  /**
   * Compose an agent from various inputs
   */
  async compose(input: ComposeInput): Promise<ComposeResult> {
    let agent: GeneratedAgent;

    if (input.example) {
      agent = await this.factory.createFromExample(input.example, {
        name: input.name,
        task: input.task
      });
    } else if (input.traits && input.traits.length > 0) {
      agent = await this.factory.createFromTraits(input.traits, {
        name: input.name,
        task: input.task
      });
    } else if (input.task) {
      agent = await this.factory.createFromTask(input.task, {
        name: input.name
      });
    } else {
      throw new Error('Must provide task, traits, or example');
    }

    const result: ComposeResult = { agent };

    // Auto-spawn if requested
    // if (input.autoSpawn) {
    //   const spawned = await this.spawner.spawn(agent);
    //   result.spawned = true;
    //   result.spawnId = spawned.id;
    // }

    return result;
  }

  /**
   * List available examples
   */
  async listExamples(): Promise<{ name: string; description: string; traits: string[] }[]> {
    return this.factory.listExamples();
  }

  /**
   * List all available traits by category
   */
  async listTraits(): Promise<{
    expertise: string[];
    personality: string[];
    approach: string[];
  }> {
    await this.factory.initialize();
    // Access through factory's loader
    return {
      expertise: [], // TODO: Expose through factory
      personality: [],
      approach: []
    };
  }

  /**
   * Validate trait names
   */
  async validateTraits(traits: string[]): Promise<{ valid: boolean; invalid: string[] }> {
    return this.factory.validateTraits(traits);
  }

  /**
   * Preview agent without spawning
   */
  async preview(input: ComposeInput): Promise<string> {
    const result = await this.compose({ ...input, autoSpawn: false });
    return result.agent.systemPrompt;
  }
}
```

## Part 2: Create src/cli/commands/agent-factory.ts
```typescript
import { Command } from 'commander';
import { AgentComposer } from '../../agents/factory/AgentComposer';

export function registerAgentFactoryCommands(program: Command): void {
  const composer = new AgentComposer();

  program
    .command('agent:create')
    .description('Create a dynamic agent from traits or task')
    .option('-t, --task <task>', 'Task description to infer traits from')
    .option('--traits <traits>', 'Comma-separated trait names')
    .option('-e, --example <name>', 'Use predefined example composition')
    .option('-n, --name <name>', 'Custom agent name')
    .option('-f, --format <format>', 'Output format (prompt|json|yaml)', 'prompt')
    .option('--spawn', 'Automatically spawn the agent')
    .action(async (options) => {
      try {
        await composer.initialize();

        const traits = options.traits?.split(',').map((t: string) => t.trim());

        const result = await composer.compose({
          task: options.task,
          traits,
          example: options.example,
          name: options.name,
          autoSpawn: options.spawn
        });

        if (options.format === 'json') {
          console.log(JSON.stringify(result.agent, null, 2));
        } else if (options.format === 'yaml') {
          const yaml = await import('yaml');
          console.log(yaml.stringify(result.agent));
        } else {
          console.log('\n=== Generated Agent ===\n');
          console.log(`Name: ${result.agent.name}`);
          console.log(`Source: ${result.agent.metadata.source}`);
          if (result.agent.metadata.confidence) {
            console.log(`Confidence: ${(result.agent.metadata.confidence * 100).toFixed(1)}%`);
          }
          console.log('\n--- System Prompt ---\n');
          console.log(result.agent.systemPrompt);
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program
    .command('agent:list-traits')
    .description('List available traits by category')
    .action(async () => {
      try {
        await composer.initialize();
        const traits = await composer.listTraits();

        console.log('\n=== Available Traits ===\n');

        console.log('Expertise:');
        traits.expertise.forEach(t => console.log(`  - ${t}`));

        console.log('\nPersonality:');
        traits.personality.forEach(t => console.log(`  - ${t}`));

        console.log('\nApproach:');
        traits.approach.forEach(t => console.log(`  - ${t}`));
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program
    .command('agent:list-examples')
    .description('List predefined example compositions')
    .action(async () => {
      try {
        await composer.initialize();
        const examples = await composer.listExamples();

        console.log('\n=== Example Compositions ===\n');

        for (const ex of examples) {
          console.log(`${ex.name}:`);
          console.log(`  Description: ${ex.description}`);
          console.log(`  Traits: ${ex.traits.join(', ')}`);
          console.log();
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program
    .command('agent:preview <task>')
    .description('Preview agent that would be created for a task')
    .action(async (task) => {
      try {
        await composer.initialize();
        const prompt = await composer.preview({ task });
        console.log(prompt);
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });
}
```

## Part 3: Update src/cli/index.ts to register new commands

## Part 4: Create tests/agents/factory/AgentComposer.test.ts
Write 20+ tests

## Part 5: Create tests/cli/agent-factory.test.ts
Test CLI commands work correctly

[VERIFICATION]
Show me:
1. AgentComposer.ts content
2. agent-factory.ts CLI commands
3. Test output
4. Example CLI usage: pnpm cli agent:create -t "Review security of this API"

[SUCCESS CRITERIA]
✅ AgentComposer provides unified interface
✅ CLI commands work correctly
✅ Multiple output formats supported
✅ Example compositions listable
✅ 20+ tests passing
```

end of Prompt_24

---

## Prompt_28

```
PROMPT 28: CreateSkill Workflow

[CONTEXT]
CAM Enhancement - Phase 8: Skills Enhancement
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 27 (Skill Customization)

Create a skill that generates new skills from templates.

[TASK]
Implement the CreateSkill skill for automated skill scaffolding.

## Part 1: Create src/skills/CreateSkill/SKILL.md
```markdown
# CreateSkill

## Description
Generates new CAM skills from templates with validation and canonicalization.

## USE WHEN
- User wants to create a new skill
- User says "create skill", "new skill", "add skill"
- User needs to scaffold a skill structure

## Keywords
create, new, skill, scaffold, generate, add, template

## Capabilities
1. Generate skill directory structure
2. Create SKILL.md from template
3. Validate skill name and structure
4. Canonicalize skill names to TitleCase
5. Generate initial test file

## Inputs
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | Name of the skill to create |
| description | string | yes | Brief description of what the skill does |
| useWhen | string[] | yes | Trigger conditions for the skill |
| keywords | string[] | no | Keywords for intent matching |
| hasWorkflows | boolean | no | Include Workflows/ directory (default: false) |
| hasTools | boolean | no | Include Tools/ directory (default: false) |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| path | string | Path to created skill directory |
| files | string[] | List of created files |
| valid | boolean | Whether validation passed |

## Example Usage
```typescript
const result = await invoke('CreateSkill', {
  name: 'DataAnalysis',
  description: 'Analyzes datasets and provides insights',
  useWhen: ['User wants to analyze data', 'User has a CSV or dataset'],
  keywords: ['analyze', 'data', 'statistics', 'insights'],
  hasTools: true
});
```
```

## Part 2: Create src/skills/CreateSkill/Tools/SkillGenerator.ts
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { SkillTemplate, SkillGeneratorConfig, ValidationResult } from '../../templates/SkillTemplate';

export interface GenerationResult {
  success: boolean;
  path: string;
  files: string[];
  errors: string[];
}

export class SkillGenerator {
  private template: SkillTemplate;
  private skillsDir: string;

  constructor(skillsDir?: string) {
    this.template = new SkillTemplate();
    this.skillsDir = skillsDir || './src/skills';
  }

  /**
   * Generate a new skill from configuration
   */
  async generate(config: SkillGeneratorConfig): Promise<GenerationResult> {
    const errors: string[] = [];
    const files: string[] = [];

    // Canonicalize name
    const canonicalName = this.canonicalize(config.name);
    const skillPath = path.join(this.skillsDir, canonicalName);

    // Check if skill already exists
    try {
      await fs.access(skillPath);
      return {
        success: false,
        path: skillPath,
        files: [],
        errors: [`Skill "${canonicalName}" already exists at ${skillPath}`]
      };
    } catch {
      // Directory doesn't exist, continue
    }

    try {
      // Create directories
      await fs.mkdir(skillPath, { recursive: true });
      files.push(skillPath);

      if (config.hasWorkflows) {
        await fs.mkdir(path.join(skillPath, 'Workflows'), { recursive: true });
        files.push(path.join(skillPath, 'Workflows'));
      }

      if (config.hasTools) {
        await fs.mkdir(path.join(skillPath, 'Tools'), { recursive: true });
        files.push(path.join(skillPath, 'Tools'));
      }

      if (config.hasData) {
        await fs.mkdir(path.join(skillPath, 'Data'), { recursive: true });
        files.push(path.join(skillPath, 'Data'));
      }

      // Generate SKILL.md
      const skillMd = this.renderSkillMd(config, canonicalName);
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      await fs.writeFile(skillMdPath, skillMd);
      files.push(skillMdPath);

      // Generate index.ts
      const indexTs = this.renderIndexTs(canonicalName);
      const indexPath = path.join(skillPath, 'index.ts');
      await fs.writeFile(indexPath, indexTs);
      files.push(indexPath);

      // Validate generated skill
      const validation = await this.validate(skillPath);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }

      return {
        success: errors.length === 0,
        path: skillPath,
        files,
        errors
      };
    } catch (error) {
      return {
        success: false,
        path: skillPath,
        files,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Validate a skill directory
   */
  async validate(skillPath: string): Promise<ValidationResult> {
    return this.template.validateStructure(skillPath);
  }

  /**
   * Canonicalize skill name to TitleCase
   */
  canonicalize(name: string): string {
    // Remove special characters
    const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, '');

    // Convert to TitleCase
    return cleaned
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private renderSkillMd(config: SkillGeneratorConfig, canonicalName: string): string {
    return `# ${canonicalName}

## Description
${config.description}

## USE WHEN
${config.useWhen.map(t => `- ${t}`).join('\n')}

## Keywords
${(config.keywords || []).join(', ')}

## Capabilities
1. [Describe capability 1]
2. [Describe capability 2]

## Inputs
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| [param] | [type] | [yes/no] | [description] |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| [field] | [type] | [description] |

## Example Usage
\`\`\`typescript
const result = await invoke('${canonicalName}', {
  // parameters
});
\`\`\`

${config.hasWorkflows ? '## Workflows\n- [WorkflowName](./Workflows/WorkflowName.md)\n' : ''}
${config.hasTools ? '## Tools\n- [ToolName](./Tools/ToolName.ts)\n' : ''}
`;
  }

  private renderIndexTs(canonicalName: string): string {
    return `// ${canonicalName} Skill
// Auto-generated by CreateSkill

export const skillName = '${canonicalName}';

export async function invoke(params: Record<string, unknown>): Promise<unknown> {
  // TODO: Implement skill logic
  throw new Error('${canonicalName} skill not yet implemented');
}
`;
  }
}
```

## Part 3: Create src/skills/CreateSkill/Workflows/CreateNewSkill.md
Document the workflow steps

## Part 4: Create src/skills/CreateSkill/index.ts
Export skill entry point

## Part 5: Create tests/skills/CreateSkill/CreateSkill.test.ts
Write 15+ tests

[VERIFICATION]
Show me:
1. SKILL.md content
2. SkillGenerator.ts content
3. Generated example skill structure
4. Test output

[SUCCESS CRITERIA]
✅ CreateSkill generates valid skill structure
✅ Name canonicalization works (e.g., "data analysis" → "DataAnalysis")
✅ Generated skills load correctly
✅ 15+ tests passing
```

end of Prompt_28

---

## Prompt_31

```
PROMPT 31: Security + Designer Agents

[CONTEXT]
CAM Enhancement - Phase 9: Base Agents Expansion
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 30 (Engineer + Architect)

Create Security and Designer agent profiles.

[TASK]
Create comprehensive agent profiles for security auditing and UX/UI design.

## Part 1: Create src/agents/definitions/Security.md
(Full profile for security/pentester agent with OWASP expertise, threat modeling, CVE analysis)

## Part 2: Create src/agents/definitions/SecurityContext.md
(Security checklist, common vulnerabilities, audit procedures)

## Part 3: Create src/agents/definitions/Designer.md
(UX researcher + UI designer with accessibility standards)

## Part 4: Create src/agents/definitions/DesignerContext.md
(Design system reference, component patterns, accessibility guidelines)

## Part 5: Verify 8+ agent profiles available
List all profile files and verify loading

[VERIFICATION]
Show me:
1. Security.md content
2. Designer.md content
3. List of all 8+ agent profiles
4. ProfileLoader.loadAll() result

[SUCCESS CRITERIA]
✅ Security agent profile complete with OWASP expertise
✅ Designer agent profile complete with accessibility focus
✅ Context files comprehensive
✅ 8+ agents now available
```

end of Prompt_31

---

## Prompt_36

```
PROMPT 36: Status Line + Task Watcher

[CONTEXT]
CAM Enhancement - Phase 10: Observability
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 35 (Sentiment Capture)

Implement real-time status display and background task monitoring.

[TASK]
Create StatusLine for real-time status and TaskWatcher for background tasks.

## Part 1: Create src/observability/status/StatusLine.ts
(Implementation with model, context usage %, learning score, agents, tasks)

## Part 2: Create src/observability/status/TaskWatcher.ts
(Track background tasks, completion callbacks)

## Part 3: Create src/observability/status/index.ts
(Exports)

## Part 4: Create tests/observability/status/StatusLine.test.ts
Write 12+ tests

[VERIFICATION]
Show me:
1. StatusLine.ts content
2. TaskWatcher.ts content
3. Test output

[SUCCESS CRITERIA]
✅ Status line renders: [model] Context: X% | Learning: Y | Agents: Z
✅ Task watcher tracks background tasks
✅ Updates in real-time
✅ 12+ tests passing
```

end of Prompt_36

---

# Wave 5 (Depends on Wave 4)

---

## Prompt_32

```
PROMPT 32: Parallel Agent Spawning

[CONTEXT]
CAM Enhancement - Phase 9: Base Agents Expansion
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 24 (AgentComposer)

Implement parallel agent spawning with spot-check validation.

[TASK]
Create ParallelSpawner for concurrent agent execution with result aggregation.

(Full implementation of ParallelSpawner.ts, SpotCheck.ts, SpawnParallelAgents.md workflow)

[SUCCESS CRITERIA]
✅ Parallel spawning with concurrency limits
✅ Spot check validates results
✅ Aggregation strategies work (merge, vote, first-success)
✅ 20+ tests passing
```

end of Prompt_32

---

## Prompt_37

```
PROMPT 37: Dashboard UI

[CONTEXT]
CAM Enhancement - Phase 10: Observability
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 36 (Status Line)

Create web-based dashboard for monitoring CAM operations.

[TASK]
Create Express + WebSocket dashboard with real-time updates.

(Full implementation of server.ts, index.html, app.js, styles.css)

[SUCCESS CRITERIA]
✅ Dashboard server starts on port 3000
✅ Real-time updates via WebSocket
✅ Agent activity visible
✅ Event log displays
```

end of Prompt_37

---

## Prompt_38

```
PROMPT 38: VERIFY.md Pattern

[CONTEXT]
CAM Enhancement - Phase 11: Testing & Validation
Repository: /home/ubuntu/github_repos/CAM-TS

Create verification documentation and automation.

[TASK]
Create VERIFY.md checklist and verify.sh automation script.

(Full VERIFY.md with all checks, verify.sh script)

[SUCCESS CRITERIA]
✅ VERIFY.md comprehensive
✅ verify.sh executable and returns proper exit codes
✅ All checks documented
```

end of Prompt_38

---

# Wave 6 (Depends on Wave 5)

---

## Prompt_39

```
PROMPT 39: Integration Test Suite

[CONTEXT]
CAM Enhancement - Phase 11: Testing & Validation
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 38 (VERIFY.md)

Create comprehensive end-to-end integration tests.

[TASK]
Create integration tests covering full workflows.

(Tests for agent lifecycle, memory workflow, skill invocation, multi-agent coordination)

Target: 30+ integration tests

[SUCCESS CRITERIA]
✅ All workflows tested
✅ 30+ integration tests
✅ No mocked LLM calls (use fixtures)
✅ Tests pass reliably
```

end of Prompt_39

---

## Prompt_40

```
PROMPT 40: Performance Benchmarks

[CONTEXT]
CAM Enhancement - Phase 11: Testing & Validation
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 39 (Integration Tests)

Create performance benchmark suite.

[TASK]
Create benchmarks for critical operations.

(Benchmarks for agent spawn, memory ops, skill routing, trait inference)

[SUCCESS CRITERIA]
✅ Benchmarks run without errors
✅ Baseline measurements recorded
✅ Performance targets documented
✅ Results output as JSON
```

end of Prompt_40

---

## Prompt_41

```
PROMPT 41: RLM Core Architecture

[CONTEXT]
CAM Enhancement - Phase 12: RLM Integration
Repository: /home/ubuntu/github_repos/CAM-TS

Reference PDFs in /home/ubuntu/Uploads/:
- Technical Architecture of Sandboxing and Recursion in RLMs
- Production-Grade RLMs Implementation Playbook
- The Infinite Memory Trick: How RLMs Defeat Context Rot

[TASK]
Implement RLM core engine with recursive reasoning capabilities.

(Full implementation of RLMEngine.ts, ReasoningLoop.ts, types.ts)

[SUCCESS CRITERIA]
✅ RLMEngine solves simple problems directly
✅ Complex problems decomposed correctly
✅ Recursion depth limited properly
✅ Synthesis combines results accurately
✅ 25+ tests passing
```

end of Prompt_41

---

# Wave 7 (Final - Depends on Wave 6)

---

## Prompt_42

```
PROMPT 42: RLM Sandboxing

[CONTEXT]
CAM Enhancement - Phase 12: RLM Integration
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 41 (RLM Core)

[TASK]
Implement sandboxing for isolated reasoning step execution.

(Full implementation of Sandbox.ts, StateManager.ts, RollbackManager.ts)

[SUCCESS CRITERIA]
✅ Sandbox isolates execution
✅ State changes tracked
✅ Rollback restores previous state
✅ 20+ tests passing
```

end of Prompt_42

---

## Prompt_43

```
PROMPT 43: RLM Context Manager

[CONTEXT]
CAM Enhancement - Phase 12: RLM Integration
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 41 (RLM Core)

Reference: "The Infinite Memory Trick: How RLMs Defeat Context Rot"

[TASK]
Implement context management with compression and relevance scoring.

(Full implementation of ContextManager.ts, ContextCompressor.ts, RelevanceScorer.ts)

[SUCCESS CRITERIA]
✅ Context fits within token limits
✅ Relevance scoring accurate
✅ Compression preserves meaning
✅ 20+ tests passing
```

end of Prompt_43

---

## Prompt_44

```
PROMPT 44: RLM Integration + Tests

[CONTEXT]
CAM Enhancement - Phase 12: RLM Integration
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompts 42 + 43 (Sandboxing + Context)

[TASK]
Create orchestrator connecting RLM to agents and CLI interface.

(Full implementation of RLMOrchestrator.ts, AgentRLMBridge.ts, CLI commands)

[SUCCESS CRITERIA]
✅ RLM integrates with agent system
✅ Memory integration working
✅ CLI commands functional (rlm:solve, rlm:analyze)
✅ 25+ integration tests passing
✅ Phase 12 complete
```

end of Prompt_44

---

# Execution Summary

| Wave | Prompts | Can Run In Parallel | Estimated Duration |
|------|---------|--------------------|--------------------|
| 1 | 21, 25, 33 | Yes (3 prompts) | 4 hours |
| 2 | 22, 26, 29, 34 | Yes (4 prompts) | 4 hours |
| 3 | 23, 27, 30, 35 | Yes (4 prompts) | 5 hours |
| 4 | 24, 28, 31, 36 | Yes (4 prompts) | 4 hours |
| 5 | 32, 37, 38 | Yes (3 prompts) | 5 hours |
| 6 | 39, 40, 41 | Yes (3 prompts) | 5 hours |
| 7 | 42, 43, 44 | Yes (3 prompts) | 6 hours |

**Total Sequential Time:** ~33 hours (with parallelization)
**Total Calendar Time:** ~4-5 days
