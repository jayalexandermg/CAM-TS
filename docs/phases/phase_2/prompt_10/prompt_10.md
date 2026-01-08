PROMPT 10: Interestingness Scoring
Ready for the next step! Here's PROMPT 10:

File: docs/phases/phase_2/prompt_10/prompt_10.md
markdown
Copy

# PROMPT 10: Interestingness Scoring & Learning Indicators

**Phase:** 2 (Hook System + Dynamic Context + Content Routing)
**Prompt:** 10 of 24+ (Prompt 3 of 5 in Phase 2)
**Duration:** 2-3 hours
**Critical Level:** 🟡 MEDIUM

## Navigation

- **Previous:** [PROMPT 09](../prompt_09/prompt_09.md) (Content-Based Routing)
- **Next:** [PROMPT 11](../prompt_11/prompt_11.md) (Dynamic Context Loading)
- **Phase Overview:** [Phase 2 README](../README.md)

## Phase 2 Context

This is the third prompt of Phase 2. We've built the hook system (PROMPT 08) and content-based routing (PROMPT 09). Now we're adding interestingness scoring to identify and promote high-signal events to the `learned/` directory.

**Phase 2 Goal:** Build the nervous system that captures, routes, and contextualizes all events.

**Phase 2 Prompts:**

- PROMPT 08 ✅ - Hook System Foundation
- PROMPT 09 ✅ - Content-Based Routing
- **PROMPT 10** (this prompt) - Interestingness Scoring
- PROMPT 11 - Dynamic Context Loading
- PROMPT 12 - Hydration Strategy Registry

## Prerequisites

**PROMPT 09 must be complete:**

- ✅ 696 tests passing
- ✅ Content-based routing implemented
- ✅ Events routed to multiple destinations
- ✅ Classification working

**Verify PROMPT 09:**

```bash
cd C:\dev\infinite-aura-ts\
pnpm check:all  # Should pass
pnpm test       # Should show 696 tests passing
Context
What we're building:
An interestingness scorer that identifies high-signal events (decisions, breakthroughs, failures, patterns) and promotes them to the learned/ directory for future reference and meta-learning.

Current State (PROMPT 09):

Events are captured and routed to multiple destinations
All events are treated equally (no prioritization)
No mechanism to identify "important" events
Problem:
Not all events are equally valuable. Some events are high-signal:

Decisions: Important choices made by CAM or agents
Breakthroughs: New insights or solutions discovered
Failures: Errors or mistakes to learn from
Patterns: Recurring themes or behaviors
User Feedback: Explicit signals from the user
Solution:
Interestingness scorer that:

Analyzes events for learning indicators
Calculates interestingness score (0.0-1.0)
Promotes high-score events to learned/ directory
Tags events with learning indicators
Example:

typescript
Copy
// Low-interest event (routine operation)
Event {
  content: "Read file from disk",
  metadata: { ... }
}
// Interestingness: 0.2 (routine, not promoted)

// High-interest event (breakthrough)
Event {
  content: "Discovered new pattern: users prefer X over Y",
  metadata: { tags: ["insight", "pattern"] }
}
// Interestingness: 0.9 (promoted to learned/)
Task
Create interestingness scoring system that identifies and promotes high-signal events.

Part 1: Learning Indicator Types
Create src/learning/types.ts:

Define Learning Indicators:

typescript
Copy
export enum LearningIndicator {
  DECISION = 'decision',           // Important choice made
  BREAKTHROUGH = 'breakthrough',   // New insight discovered
  FAILURE = 'failure',             // Error or mistake
  PATTERN = 'pattern',             // Recurring theme
  USER_FEEDBACK = 'user_feedback', // Explicit user signal
  CONSTRAINT = 'constraint',       // Limitation discovered
  OPTIMIZATION = 'optimization',   // Improvement found
  QUESTION = 'question',           // Unanswered question
  HYPOTHESIS = 'hypothesis',       // Theory to test
  VALIDATION = 'validation',       // Hypothesis confirmed/rejected
}
Define Interestingness Score:

typescript
Copy
export interface InterestingnessScore {
  score: number;                    // 0.0-1.0
  indicators: LearningIndicator[];  // Which indicators detected
  reasons: string[];                // Why this score
  confidence: number;               // 0.0-1.0 confidence in score
}

export interface InterestingnessConfig {
  minScoreForPromotion: number;     // Min score to promote to learned/
  indicatorWeights: Map<LearningIndicator, number>; // Weight per indicator
  enableAutoPromotion: boolean;     // Auto-promote high-score events?
}
Define Learned Event:

typescript
Copy
export interface LearnedEvent {
  originalEvent: Event;
  interestingnessScore: InterestingnessScore;
  promotedAt: string;               // ISO 8601 timestamp
  learnedFrom: string;              // Source directory
}
Part 2: Interestingness Scorer
Create src/learning/interestingness-scorer.ts:

Purpose: Analyze events and calculate interestingness scores.

Requirements:

Detect learning indicators in event content and metadata
Calculate weighted score based on indicators
Provide reasons for score
Calculate confidence in score
Key Methods:

typescript
Copy
export class InterestingnessScorer {
  constructor(private config: InterestingnessConfig);

  score(event: Event): InterestingnessScore;

  private detectIndicators(event: Event): LearningIndicator[];
  private calculateScore(indicators: LearningIndicator[]): number;
  private generateReasons(
    event: Event,
    indicators: LearningIndicator[]
  ): string[];
  private calculateConfidence(
    event: Event,
    indicators: LearningIndicator[]
  ): number;
}
Indicator Detection Logic:

DECISION:

Keywords: "decided", "chose", "selected", "picked", "opted for"
Patterns: "decided to X", "chose X over Y"
Tags: "decision", "choice"
BREAKTHROUGH:

Keywords: "discovered", "realized", "found", "breakthrough", "insight"
Patterns: "discovered that X", "realized X"
Tags: "insight", "discovery", "breakthrough"
FAILURE:

Keywords: "failed", "error", "mistake", "wrong", "bug"
Patterns: "failed to X", "error: X"
Tags: "error", "failure", "bug"
Exception events (check event type)
PATTERN:

Keywords: "pattern", "recurring", "always", "never", "trend"
Patterns: "noticed that X", "pattern: X"
Tags: "pattern", "trend", "recurring"
USER_FEEDBACK:

Keywords: "user said", "feedback", "user wants", "user prefers"
Patterns: "user feedback: X"
Tags: "feedback", "user-input"
Metadata: userFeedback flag
CONSTRAINT:

Keywords: "limitation", "constraint", "can't", "unable to", "blocked"
Patterns: "can't do X because Y"
Tags: "constraint", "limitation"
OPTIMIZATION:

Keywords: "improved", "optimized", "faster", "better", "enhanced"
Patterns: "improved X by Y%"
Tags: "optimization", "improvement"
QUESTION:

Keywords: "why", "how", "what if", "should we", "question"
Patterns: "why does X?", "how to X?"
Tags: "question", "inquiry"
HYPOTHESIS:

Keywords: "hypothesis", "theory", "might", "could", "possibly"
Patterns: "hypothesis: X", "theory: X"
Tags: "hypothesis", "theory"
VALIDATION:

Keywords: "confirmed", "validated", "verified", "proved", "disproved"
Patterns: "confirmed that X", "validated X"
Tags: "validation", "verification"
Score Calculation:

typescript
Copy
// Default weights (configurable)
const DEFAULT_WEIGHTS = {
  DECISION: 0.7,
  BREAKTHROUGH: 0.9,
  FAILURE: 0.8,
  PATTERN: 0.85,
  USER_FEEDBACK: 0.95,
  CONSTRAINT: 0.75,
  OPTIMIZATION: 0.8,
  QUESTION: 0.6,
  HYPOTHESIS: 0.7,
  VALIDATION: 0.85,
};

// Score = average of indicator weights
// If multiple indicators, take weighted average
// Cap at 1.0
Confidence Calculation:

typescript
Copy
// High confidence (0.8-1.0): Multiple indicators, clear keywords
// Medium confidence (0.5-0.8): Single indicator, some keywords
// Low confidence (0.0-0.5): Weak indicators, unclear content
Part 3: Learned Event Promoter
Create src/learning/learned-promoter.ts:

Purpose: Promote high-score events to learned/ directory.

Requirements:

Check if event score exceeds threshold
Create LearnedEvent wrapper
Write to learned/ directory
Preserve original event + score metadata
Use FileOperations from Phase 1
Key Methods:

typescript
Copy
export class LearnedPromoter {
  constructor(
    private fileOps: FileOperations,
    private dirOps: DirectoryOperations,
    private config: InterestingnessConfig
  );

  async promote(
    event: Event,
    score: InterestingnessScore,
    sourceDirectory: string
  ): Promise<void>;

  private shouldPromote(score: InterestingnessScore): boolean;
  private createLearnedEvent(
    event: Event,
    score: InterestingnessScore,
    sourceDirectory: string
  ): LearnedEvent;
  private async writeLearnedEvent(learnedEvent: LearnedEvent): Promise<void>;
}
Promotion Logic:

typescript
Copy
// Promote if:
// 1. score >= config.minScoreForPromotion (default: 0.7)
// 2. config.enableAutoPromotion === true
// 3. confidence >= 0.5

// Write to:
// learned/YYYY-MM-DD_HHmmss_INDICATOR_description.jsonl
// Where INDICATOR is the highest-weighted indicator
LearnedEvent Format:

json
Copy
{
  "originalEvent": {
    "timestamp": "2026-01-08T10:00:00.000Z",
    "type": "capture_all",
    "content": "Discovered new pattern: users prefer X over Y",
    "metadata": { ... }
  },
  "interestingnessScore": {
    "score": 0.9,
    "indicators": ["PATTERN", "BREAKTHROUGH"],
    "reasons": [
      "Detected pattern indicator (keyword: 'pattern')",
      "Detected breakthrough indicator (keyword: 'discovered')"
    ],
    "confidence": 0.85
  },
  "promotedAt": "2026-01-08T10:00:01.000Z",
  "learnedFrom": "history/execution/"
}
Part 4: Integration with Routing System
Update ContentRouter to include interestingness scoring:

Modify src/routing/content-router.ts:

typescript
Copy
export class ContentRouter {
  constructor(
    private classifier: ContentClassifier,
    private scorer: InterestingnessScorer,      // Add scorer
    private promoter: LearnedPromoter,          // Add promoter
    private fileOps: FileOperations,
    private dirOps: DirectoryOperations,
    private config: RoutingConfig
  );

  async route(event: Event): Promise<RoutingResult> {
    // 1. Classify event
    const classification = this.classifier.classify(event);

    // 2. Score event for interestingness
    const score = this.scorer.score(event);

    // 3. Determine destinations
    const destinations = this.determineDestinations(event, classification);

    // 4. Write to destinations
    for (const dest of destinations) {
      await this.writeToDestination(event, dest);
    }

    // 5. Promote if interesting
    if (this.promoter.shouldPromote(score)) {
      await this.promoter.promote(event, score, destinations[0].directory);
    }

    return { event, destinations, classification, score };
  }
}
Update RoutingResult:

typescript
Copy
export interface RoutingResult {
  event: Event;
  destinations: RoutingDestination[];
  classification: Classification;
  interestingnessScore?: InterestingnessScore;  // Add score
}
Part 5: Learning Index
Create src/learning/index.ts:

Export all learning components:

typescript
Copy
export * from './types';
export * from './interestingness-scorer';
export * from './learned-promoter';
Part 6: Tests
Create comprehensive tests for learning system:

Test Files:

tests/learning/interestingness-scorer.test.ts (40+ tests)
tests/learning/learned-promoter.test.ts (20+ tests)
tests/learning/integration/learning-system.integration.test.ts (15+ tests)
Test Coverage:

Indicator detection (all 10 indicators)
Score calculation (various combinations)
Confidence calculation
Promotion logic (threshold, auto-promotion)
LearnedEvent creation
File writing to learned/
Integration with routing
Edge cases (no indicators, multiple indicators, etc.)
Target: 75+ new tests, maintain >85% coverage

Part 7: Integration Test
Create tests/learning/integration/learning-system.integration.test.ts:

Test end-to-end learning:

Create events with various learning indicators
Score events
Verify scores and indicators
Promote high-score events
Verify files created in learned/
Verify LearnedEvent format
Test with different indicator combinations
Test threshold behavior
Test auto-promotion on/off
Execution
After creating all files:

Run TypeScript compilation:
bash
Copy
pnpm build
Run linting:
bash
Copy
pnpm lint
Run tests:
bash
Copy
pnpm test
Check coverage:
bash
Copy
pnpm test:coverage
Run all quality gates:
bash
Copy
pnpm check:all
Success Criteria
Code:

✅ src/learning/types.ts created (LearningIndicator, InterestingnessScore, LearnedEvent)
✅ src/learning/interestingness-scorer.ts created (InterestingnessScorer class)
✅ src/learning/learned-promoter.ts created (LearnedPromoter class)
✅ src/learning/index.ts created (exports all components)
✅ ContentRouter updated to include scoring and promotion
Tests:

✅ 75+ new tests created
✅ All tests passing (target: 770+ total tests)
✅ Coverage maintained >85% (target: >88%)
Integration:

✅ Events scored for interestingness
✅ High-score events promoted to learned/
✅ LearnedEvent format correct
✅ All 10 indicators detectable
Quality Gates:

✅ TypeScript compilation passes
✅ ESLint passes
✅ Prettier formatting passes
✅ All tests passing
✅ Coverage >85%
Documentation:

✅ Update docs/api/README.md with learning API
✅ Update docs/architecture/README.md with learning architecture
✅ Add JSDoc comments to all public APIs
Verification
Show me:

List of all files created with sizes
Test results (number of tests, coverage %)
Output of pnpm check:all
Example of a LearnedEvent (show JSON format)
Example of interestingness scoring (show score, indicators, reasons)
Any errors encountered and how they were resolved
Output Format
Provide:

Summary of files created
Test metrics (before/after)
Coverage metrics (before/after)
Learning verification (show example LearnedEvent)
Scoring example (show InterestingnessScore)
Any issues encountered
Confirmation of success criteria
Notes
Critical Aspects:

🟡 Indicator detection accuracy (important for learning)
🟡 Score calculation fairness (avoid bias)
🟡 Threshold tuning (balance signal vs noise)
Integration Points:

Uses Event, EventType from PROMPT 08
Uses ContentRouter from PROMPT 09
Uses FileOperations from Phase 1
Uses DirectoryOperations from Phase 1
Uses FileNamingConvention from Phase 1
Future Enhancements (not in this prompt):

Dynamic context loading (PROMPT 11)
Hydration strategies (PROMPT 12)
AI-driven scoring (Phase 4+)
User feedback loop (Phase 6)
```
