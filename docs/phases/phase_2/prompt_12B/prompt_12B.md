PROMPT 12B: Intent Matching & Routing
Phase: 2 (Infrastructure)
Status: 🆕 NEW - Skill routing foundation
Time Estimate: 6-8 hours
Priority: CRITICAL
Dependencies: PROMPT 12A (Skill structure)

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.
All commands: pnpm install, pnpm test, pnpm run build, etc.

📋 CONTEXT
Current State
Project: Infinite Aura TypeScript (CAM)
Location: ~/.infinite-aura-ts/
Tests: 1,246 tests, 92.5% coverage
Skill System: Just built (SkillManager, skill definitions)
Skills: Have USE WHEN conditions in SKILL.md
What's Missing
Skills exist but there's no way to:

Match user requests to skills
Score skill relevance
Route requests to appropriate skill
Handle multi-skill scenarios
PAI has intent matching:

Analyzes user request
Scores against each skill's USE WHEN conditions
Routes to highest-confidence skill
Handles ambiguous requests
Why This Matters
Without intent matching:

Skills never activate
No intelligent routing
Manual skill selection only
Can't leverage skill system
With intent matching:

✅ Automatic skill activation
✅ Intelligent routing based on intent
✅ Confidence scoring
✅ Handles ambiguous requests
🎯 OBJECTIVE
Implement intent matching system that analyzes user requests, scores against skill USE WHEN conditions, and routes to the most appropriate skill.

After this prompt:

✅ IntentMatcher class analyzes requests
✅ Scores requests against skill USE WHEN conditions
✅ Routes to highest-confidence skill
✅ Handles no-match and multi-match scenarios
✅ Confidence thresholds
✅ 35-45 new tests added
✅ All existing tests still pass
📦 REQUIREMENTS

1. IntentMatcher Class
   Create src/skills/IntentMatcher.ts:

Responsibilities:

Analyze user request
Score against skill USE WHEN conditions
Return ranked skill matches
Handle confidence thresholds
Key Methods:

typescript
Copy
class IntentMatcher {
private skillManager: SkillManager;

constructor(skillManager: SkillManager);

// Match request to skills
async matchIntent(request: string): Promise<IntentMatch[]>;

// Get best matching skill
async getBestMatch(request: string, minConfidence?: number): Promise<IntentMatch | null>;

// Score request against single skill
private scoreSkill(request: string, skill: Skill): number;

// Extract keywords from request
private extractKeywords(request: string): string[];

// Match keywords against USE WHEN conditions
private matchConditions(keywords: string[], conditions: string[]): number;
}

interface IntentMatch {
skill: Skill;
confidence: number; // 0.0 to 1.0
matchedConditions: string[];
reason: string;
} 2. Scoring Algorithm
Simple keyword-based scoring:

typescript
Copy
private scoreSkill(request: string, skill: Skill): number {
const keywords = this.extractKeywords(request);
const conditions = skill.definition.useWhen;

let score = 0;
let matchedConditions: string[] = [];

for (const condition of conditions) {
const conditionKeywords = this.extractKeywords(condition);
const matches = keywords.filter(k =>
conditionKeywords.some(ck =>
ck.toLowerCase().includes(k.toLowerCase()) ||
k.toLowerCase().includes(ck.toLowerCase())
)
);

    if (matches.length > 0) {
      score += matches.length / keywords.length;
      matchedConditions.push(condition);
    }

}

// Normalize score to 0.0-1.0
return Math.min(score, 1.0);
} 3. SkillRouter Class
Create src/skills/SkillRouter.ts:

Responsibilities:

Route requests to skills
Handle routing decisions
Manage routing table
Track routing history
Key Methods:

typescript
Copy
class SkillRouter {
private intentMatcher: IntentMatcher;
private routingHistory: RoutingEntry[];

constructor(intentMatcher: IntentMatcher);

// Route request to skill
async route(request: string, options?: RoutingOptions): Promise<RoutingResult>;

// Get routing history
getHistory(): RoutingEntry[];

// Clear routing history
clearHistory(): void;
}

interface RoutingOptions {
minConfidence?: number; // Default: 0.5
allowMultiple?: boolean; // Default: false
preferredSkill?: string; // Prefer specific skill
}

interface RoutingResult {
skill: Skill | null;
confidence: number;
alternatives: IntentMatch[];
routed: boolean;
reason: string;
}

interface RoutingEntry {
timestamp: Date;
request: string;
skill: string | null;
confidence: number;
reason: string;
} 4. Routing Strategies
Handle different scenarios:

typescript
Copy
async route(request: string, options?: RoutingOptions): Promise<RoutingResult> {
const minConfidence = options?.minConfidence ?? 0.5;
const matches = await this.intentMatcher.matchIntent(request);

// No matches above threshold
if (matches.length === 0 || matches[0].confidence < minConfidence) {
return {
skill: null,
confidence: 0,
alternatives: matches,
routed: false,
reason: 'No skill matched with sufficient confidence'
};
}

// Single clear match
if (matches[0].confidence >= minConfidence) {
const skill = matches[0].skill;
this.recordRouting(request, skill.name, matches[0].confidence, 'Matched');

    return {
      skill,
      confidence: matches[0].confidence,
      alternatives: matches.slice(1),
      routed: true,
      reason: `Matched skill: ${skill.name}`
    };

}

// Multiple similar matches (ambiguous)
const topMatches = matches.filter(m =>
m.confidence >= minConfidence &&
m.confidence >= matches[0].confidence \* 0.9
);

if (topMatches.length > 1) {
return {
skill: null,
confidence: matches[0].confidence,
alternatives: topMatches,
routed: false,
reason: 'Ambiguous: multiple skills matched'
};
}

return {
skill: matches[0].skill,
confidence: matches[0].confidence,
alternatives: matches.slice(1),
routed: true,
reason: `Matched skill: ${matches[0].skill.name}`
};
}
📁 FILES TO CREATE/MODIFY
CREATE (New Files):
src/skills/IntentMatcher.ts
IntentMatcher class
Scoring algorithm
IntentMatch interface
src/skills/SkillRouter.ts
SkillRouter class
Routing logic
RoutingResult interface
src/skills/types.ts (update)
Add IntentMatch interface
Add RoutingResult interface
Add RoutingOptions interface
tests/skills/IntentMatcher.test.ts
Test intent matching
Test scoring
Test keyword extraction
Test condition matching
tests/skills/SkillRouter.test.ts
Test routing
Test no-match scenario
Test single-match scenario
Test multi-match scenario
Test routing history
MODIFY (Existing Files):
src/skills/index.ts
Export IntentMatcher
Export SkillRouter
Export new types
src/index.ts
Export IntentMatcher
Export SkillRouter
✅ TEST CRITERIA
IntentMatcher Tests (20-25 tests):
Intent Matching:
✅ Matches request to skills
✅ Returns ranked matches
✅ Scores correctly
✅ Handles no matches
Scoring:
✅ High score for exact matches
✅ Medium score for partial matches
✅ Low score for weak matches
✅ Zero score for no matches
Keyword Extraction:
✅ Extracts keywords from request
✅ Filters stop words
✅ Handles punctuation
Condition Matching:
✅ Matches keywords to conditions
✅ Case-insensitive matching
✅ Partial word matching
SkillRouter Tests (15-20 tests):
Routing:
✅ Routes to best match
✅ Returns null for no match
✅ Handles ambiguous matches
✅ Respects confidence threshold
Options:
✅ Respects minConfidence
✅ Respects preferredSkill
✅ Handles allowMultiple
History:
✅ Records routing decisions
✅ Can retrieve history
✅ Can clear history
🎯 SUCCESS CRITERIA
Functional:
✅ IntentMatcher working
✅ SkillRouter working
✅ Scoring algorithm working
✅ Routing strategies working
✅ Handles all scenarios (no-match, single-match, multi-match)
Testing:
✅ All existing tests pass (1,246 tests)
✅ 35-45 new tests added
✅ Total: ~1,281-1,291 tests
✅ Coverage maintained: 90%+
Quality:
✅ TypeScript types defined
✅ Error handling implemented
✅ Code follows existing patterns
✅ Documentation added
🔗 INTEGRATION POINTS
Uses (Existing):
SkillManager (PROMPT 12A): Loads skills and USE WHEN conditions
Used By (Future):
Skill Activation (PROMPT 12C): Uses routing to activate skills
Orchestrator (PROMPT 16): Uses routing for request handling
📚 PAI REFERENCE
Intent Matching:
PAI Pattern: Analyzes request, scores against USE WHEN conditions
PAI Routing: Routes to highest-confidence skill
PAI Behavior: Handles ambiguous requests gracefully
END OF PROMPT 12B
