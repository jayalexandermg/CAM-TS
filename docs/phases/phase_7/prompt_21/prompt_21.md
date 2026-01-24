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
