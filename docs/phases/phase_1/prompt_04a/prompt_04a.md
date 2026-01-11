⚠️ CRITICAL: This project uses PNPM, not NPM.
All package manager commands must use pnpm.
Do NOT use npm commands.
PROMPT 4A: Add CORE Directory & 3-Tier Memory Pipeline
Phase: 1 (Memory Scaffold)
Status: 🆕 NEW - Addition to Phase 1
Time Estimate: 2-3 hours
Priority: CRITICAL
Dependencies: PROMPT 4 (Memory Operations - already complete)

📋 CONTEXT
Current State
Project: Infinite Aura TypeScript (CAM) - Context-Aware Memory system
Location: ~/.infinite-aura-ts/
Memory Location: ~/.infinite-aura-ts/memory/
Phase 1 Status: Complete (PROMPTS 1-7, 472 tests, 90.05% coverage)
Current Memory Structure: 18 UFC directories (flat structure)
What's Missing
We're building CAM to match PAI/KAI architecture. Currently missing:

CORE Directory: PAI has a CORE skill that auto-loads user identity, preferences, and active projects on every session. CAM doesn't have this.
3-Tier Memory Pipeline: PAI has a 3-tier memory system:
CAPTURE tier (memory/work/): Raw, unprocessed information
SYNTHESIS tier (memory/learning/): Processed insights and patterns
APPLICATION tier (memory/archive/): Refined, ready-to-use knowledge
CAM currently has a flat 18-directory structure without this pipeline.
Why This Matters
CORE: Enables SessionStart hook (Phase 2) to load user context proactively
3-Tier Pipeline: Enables memory to evolve from raw data → insights → knowledge
PAI Alignment: Closes critical gaps in Phase 1 foundation
🎯 OBJECTIVE
Add CORE directory for user identity and implement 3-tier memory pipeline to match PAI architecture.

After this prompt:

✅ CORE directory exists with user identity files
✅ 3-tier memory pipeline structure exists
✅ CoreManager class manages CORE operations
✅ MemoryPipeline class manages tier transitions
✅ All existing tests still pass
✅ 30-40 new tests added (~502-512 total tests)
✅ Phase 1 is 100% aligned with PAI
📦 REQUIREMENTS

1. CORE Directory Structure
   Create CORE directory at ~/.infinite-aura-ts/memory/CORE/ with these files:

~/.infinite-aura-ts/memory/CORE/
├── USER.md # User identity (name, role, expertise, goals)
├── PREFERENCES.md # User preferences (communication style, detail level, etc.)
└── ACTIVE_PROJECTS.md # Current projects and focus areas
File Templates:

USER.md:

markdown
Copy

# User Identity

## Name

[User's name]

## Role

[User's primary role/profession]

## Expertise

- [Area 1]
- [Area 2]
- [Area 3]

## Goals

- [Goal 1]
- [Goal 2]
- [Goal 3]

## Background

[Brief background context]
PREFERENCES.md:

markdown
Copy

# User Preferences

## Communication Style

- Tone: [Direct/Friendly/Formal/etc.]
- Detail Level: [High/Medium/Low]
- Format: [Bullet points/Paragraphs/Mixed]

## Working Style

- Pace: [Fast/Moderate/Deliberate]
- Approach: [Hands-on/Guided/Independent]

## Technical Preferences

- Code Style: [Verbose/Concise/Balanced]
- Documentation: [Extensive/Minimal/Balanced]
  ACTIVE_PROJECTS.md:

markdown
Copy

# Active Projects

## Current Focus

[Primary project or focus area]

## Active Projects

1. **[Project Name]**
   - Status: [Active/Planning/On Hold]
   - Priority: [High/Medium/Low]
   - Context: [Brief description]

## Recent Context

[Recent work, decisions, or important context] 2. 3-Tier Memory Pipeline Structure
Organize existing memory directories into 3 tiers:

CAPTURE Tier (memory/work/):

Raw, unprocessed information
Directories: INBOX/, SCRATCHPAD/, OBSERVATIONS/
SYNTHESIS Tier (memory/learning/):

Processed insights and patterns
Directories: PATTERNS/, INSIGHTS/, LEARNINGS/, DECISIONS/
APPLICATION Tier (memory/archive/):

Refined, ready-to-use knowledge
Directories: KNOWLEDGE/, PROCEDURES/, REFERENCE/, ARCHIVE/
Other directories remain at root:

CORE/ (special - always loaded)
CONTEXT/ (active context)
PROJECTS/ (project-specific)
SKILLS/ (skill definitions - Phase 2)
WORKFLOWS/ (workflow definitions - Phase 4)
TOOLS/ (tool definitions - Phase 4)
AGENTS/ (agent definitions - Phase 4)
Final Structure:

~/.infinite-aura-ts/memory/
├── CORE/ # User identity (always loaded)
│ ├── USER.md
│ ├── PREFERENCES.md
│ └── ACTIVE_PROJECTS.md
├── CONTEXT/ # Active context
├── PROJECTS/ # Project-specific memory
├── SKILLS/ # Skill definitions (Phase 2)
├── WORKFLOWS/ # Workflow definitions (Phase 4)
├── TOOLS/ # Tool definitions (Phase 4)
├── AGENTS/ # Agent definitions (Phase 4)
├── work/ # CAPTURE tier
│ ├── INBOX/
│ ├── SCRATCHPAD/
│ └── OBSERVATIONS/
├── learning/ # SYNTHESIS tier
│ ├── PATTERNS/
│ ├── INSIGHTS/
│ ├── LEARNINGS/
│ └── DECISIONS/
└── archive/ # APPLICATION tier
├── KNOWLEDGE/
├── PROCEDURES/
├── REFERENCE/
└── ARCHIVE/ 3. CoreManager Class
Create src/memory/core/CoreManager.ts:

Responsibilities:

Initialize CORE directory and files
Read/write CORE files (USER.md, PREFERENCES.md, ACTIVE_PROJECTS.md)
Validate CORE file structure
Provide CORE context for hydration (Phase 2)
Key Methods:

typescript
Copy
class CoreManager {
// Initialize CORE directory with template files
async initialize(): Promise<void>

// Read all CORE files and return as object
async loadCore(): Promise<CoreContext>

// Update specific CORE file
async updateUser(content: string): Promise<void>
async updatePreferences(content: string): Promise<void>
async updateActiveProjects(content: string): Promise<void>

// Get CORE context for preprompt hydration
async getCoreContext(): Promise<string>

// Validate CORE structure
async validateCore(): Promise<boolean>
}

interface CoreContext {
user: string; // Contents of USER.md
preferences: string; // Contents of PREFERENCES.md
activeProjects: string; // Contents of ACTIVE_PROJECTS.md
} 4. MemoryPipeline Class
Create src/memory/pipeline/MemoryPipeline.ts:

Responsibilities:

Manage 3-tier memory structure
Move content between tiers (CAPTURE → SYNTHESIS → APPLICATION)
Track content lifecycle
Provide tier-specific operations
Key Methods:

typescript
Copy
class MemoryPipeline {
// Initialize 3-tier structure
async initialize(): Promise<void>

// Get tier for a directory
getTier(directory: string): MemoryTier

// Move content between tiers
async promote(from: string, to: string, content: string): Promise<void>

// Get all content in a tier
async getTierContent(tier: MemoryTier): Promise<string[]>

// Validate tier structure
async validateTiers(): Promise<boolean>
}

enum MemoryTier {
CAPTURE = 'work',
SYNTHESIS = 'learning',
APPLICATION = 'archive',
ROOT = 'root'
} 5. Update MemoryManager
Update src/memory/MemoryManager.ts to integrate CORE and pipeline:

Add:

coreManager: CoreManager property
memoryPipeline: MemoryPipeline property
Initialize CORE and pipeline in constructor
Add methods to access CORE and pipeline
Example:

typescript
Copy
class MemoryManager {
private coreManager: CoreManager;
private memoryPipeline: MemoryPipeline;

constructor(baseDir: string) {
// ... existing code ...
this.coreManager = new CoreManager(baseDir);
this.memoryPipeline = new MemoryPipeline(baseDir);
}

async initialize(): Promise<void> {
// ... existing initialization ...
await this.coreManager.initialize();
await this.memoryPipeline.initialize();
}

// Expose CORE manager
getCore(): CoreManager {
return this.coreManager;
}

// Expose pipeline
getPipeline(): MemoryPipeline {
return this.memoryPipeline;
}
}
📁 FILES TO CREATE/MODIFY
CREATE (New Files):
src/memory/core/CoreManager.ts
CoreManager class
CoreContext interface
CORE file operations
src/memory/core/index.ts
Export CoreManager and types
src/memory/pipeline/MemoryPipeline.ts
MemoryPipeline class
MemoryTier enum
Tier operations
src/memory/pipeline/index.ts
Export MemoryPipeline and types
tests/memory/core/CoreManager.test.ts
Test CORE initialization
Test CORE file operations
Test CORE context loading
Test CORE validation
tests/memory/pipeline/MemoryPipeline.test.ts
Test pipeline initialization
Test tier operations
Test content promotion
Test tier validation
MODIFY (Existing Files):
src/memory/MemoryManager.ts
Add coreManager property
Add memoryPipeline property
Initialize CORE and pipeline
Add getCore() method
Add getPipeline() method
src/memory/index.ts
Export CoreManager
Export MemoryPipeline
Export new types
tests/memory/MemoryManager.test.ts
Add tests for CORE integration
Add tests for pipeline integration
✅ TEST CRITERIA
CORE Tests (15-20 tests):
Initialization:
✅ CORE directory created on initialization
✅ USER.md created with template
✅ PREFERENCES.md created with template
✅ ACTIVE_PROJECTS.md created with template
Read Operations:
✅ Can read USER.md
✅ Can read PREFERENCES.md
✅ Can read ACTIVE_PROJECTS.md
✅ loadCore() returns all CORE files
✅ getCoreContext() returns formatted context
Write Operations:
✅ Can update USER.md
✅ Can update PREFERENCES.md
✅ Can update ACTIVE_PROJECTS.md
✅ Updates persist to disk
Validation:
✅ validateCore() passes with valid structure
✅ validateCore() fails with missing files
✅ Handles missing CORE directory gracefully
Pipeline Tests (15-20 tests):
Initialization:
✅ work/ directory created (CAPTURE tier)
✅ learning/ directory created (SYNTHESIS tier)
✅ archive/ directory created (APPLICATION tier)
✅ All tier subdirectories created
Tier Operations:
✅ getTier() returns correct tier for directory
✅ getTier() returns ROOT for non-tier directories
✅ getTierContent() returns content for tier
Content Promotion:
✅ Can promote from CAPTURE to SYNTHESIS
✅ Can promote from SYNTHESIS to APPLICATION
✅ Content moves correctly between tiers
Validation:
✅ validateTiers() passes with valid structure
✅ validateTiers() fails with missing tiers
✅ Handles missing tier directories gracefully
Integration Tests (5-10 tests):
MemoryManager Integration:
✅ MemoryManager initializes CORE
✅ MemoryManager initializes pipeline
✅ getCore() returns CoreManager
✅ getPipeline() returns MemoryPipeline
✅ All existing tests still pass
🎯 SUCCESS CRITERIA
Functional:
✅ CORE directory exists at ~/.infinite-aura-ts/memory/CORE/
✅ CORE files (USER.md, PREFERENCES.md, ACTIVE_PROJECTS.md) created
✅ 3-tier pipeline structure exists (work/, learning/, archive/)
✅ CoreManager class working (read/write CORE files)
✅ MemoryPipeline class working (tier operations)
✅ MemoryManager integrates CORE and pipeline
Testing:
✅ All existing tests pass (472 tests)
✅ 30-40 new tests added
✅ Total: ~502-512 tests
✅ Coverage maintained: 90%+
Quality:
✅ TypeScript types defined
✅ Error handling implemented
✅ Code follows existing patterns
✅ Documentation added (JSDoc comments)
🔗 INTEGRATION POINTS
Used By (Future):
SessionStart Hook (PROMPT 8A): Will load CORE context on session start
Preprompt Hydration (PROMPT 11A): Will inject CORE context into system prompt
Persona System (PROMPT 14): Will read/write USER.md and PREFERENCES.md
Uses (Existing):
MemoryManager (PROMPT 4): Extends existing memory operations
File Operations (PROMPT 3): Uses existing file read/write
📚 PAI REFERENCE
CORE Directory:
PAI Location: Packs/pai-core-install/src/skills/CORE/
PAI Files: SKILL.md, USER.md, PREFERENCES.md
PAI Behavior: Auto-loaded on every session via SessionStart hook
3-Tier Memory:
PAI Structure: $PAI_DIR/MEMORY/ with implicit tiers
PAI Tiers: Raw data → Processed insights → Active knowledge
PAI Behavior: Content evolves through tiers over time
🚀 EXECUTION NOTES
Implementation Order:
Create CoreManager class and tests
Create MemoryPipeline class and tests
Update MemoryManager to integrate both
Run all tests (existing + new)
Verify CORE directory created
Verify 3-tier structure created
Key Considerations:
Backward Compatibility: All existing tests must pass
Template Files: CORE files should have helpful templates
Error Handling: Handle missing directories gracefully
Type Safety: Use TypeScript types throughout
Documentation: Add JSDoc comments for public methods
Testing Strategy:
Unit tests for CoreManager
Unit tests for MemoryPipeline
Integration tests for MemoryManager
Verify all existing tests still pass
📊 EXPECTED OUTCOME
Before PROMPT 4A:

472 tests, 90.05% coverage
18 flat directories
No CORE directory
No 3-tier pipeline
Phase 1: 70% PAI aligned
After PROMPT 4A:

~502-512 tests, 90%+ coverage
CORE directory with user identity
3-tier memory pipeline (work/learning/archive)
CoreManager and MemoryPipeline classes
Phase 1: 100% PAI aligned ✅
