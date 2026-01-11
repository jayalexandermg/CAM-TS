PROMPT 12A: Skill Structure & Definition
Phase: 2 (Infrastructure)
Status: 🆕 NEW - Skill system foundation
Time Estimate: 6-8 hours
Priority: CRITICAL
Dependencies: PROMPT 4A (Memory structure)

⚠️ PACKAGE MANAGER: PNPM ONLY
This project uses pnpm exclusively. Do NOT use npm commands.
All commands: pnpm install, pnpm test, pnpm run build, etc.

📋 CONTEXT
Current State
Project: Infinite Aura TypeScript (CAM) - Context-Aware Memory system
Location: ~/.infinite-aura-ts/
Phase 1 Status: Complete (1,097 tests, 92.58% coverage)
Memory Structure: CORE directory + 3-tier pipeline exists
What's Missing
PAI has a skill system where:

Skills are self-contained units (like mini-agents)
Each skill has: definition (SKILL.md), workflows (.md), tools (.ts), reference docs
Skills activate based on "USE WHEN" conditions (intent matching)
Skills load their own context (skill-specific preprompt)
Skills route to workflows, which invoke tools
CAM currently has:

❌ No skill system
❌ No skill directory structure
❌ No skill definitions
❌ No skill management
Why This Matters
Skills are PAI's core routing mechanism:

User request → Intent matching → Skill activation → Workflow execution → Tool invocation
Without skills:

No intelligent routing
No context-aware responses
No workflow execution
No tool integration
🎯 OBJECTIVE
Create skill directory structure and SkillManager class to manage skill definitions, validation, and CRUD operations.

After this prompt:

✅ Skill directory structure at ~/.infinite-aura-ts/memory/SKILLS/
✅ Skill definition format (SKILL.md template)
✅ SkillManager class for skill operations
✅ Skill validation
✅ CRUD operations for skills
✅ 30-40 new tests added
✅ All existing tests still pass
📦 REQUIREMENTS

1. Skill Directory Structure
   Create skill directory at ~/.infinite-aura-ts/memory/SKILLS/:

~/.infinite-aura-ts/memory/SKILLS/
├── example-skill/ # Example skill (for reference)
│ ├── SKILL.md # Skill definition
│ ├── Workflows/ # Workflow procedures
│ │ └── example-workflow.md
│ ├── Tools/ # Executable tools
│ │ └── example-tool.ts
│ └── Reference/ # Reference documentation
│ └── example-ref.md
└── .gitkeep 2. Skill Definition Format (SKILL.md)
Template for SKILL.md:

markdown
Copy

# [Skill Name]

## Description

[Brief description of what this skill does]

## USE WHEN

[Natural language conditions for when to activate this skill]

Examples:

- User asks about [topic]
- User wants to [action]
- User mentions [keyword]

## Capabilities

- [Capability 1]
- [Capability 2]
- [Capability 3]

## Workflows

- **[Workflow Name]**: [Brief description]
- **[Workflow Name]**: [Brief description]

## Tools

- **[Tool Name]**: [Brief description]
- **[Tool Name]**: [Brief description]

## Context

[Additional context that should be loaded when this skill activates]

## Examples

### Example 1

**User:** [Example user request]
**Response:** [Example response using this skill]

### Example 2

**User:** [Example user request]
**Response:** [Example response using this skill] 3. Example Skill (For Reference)
Create ~/.infinite-aura-ts/memory/SKILLS/example-skill/SKILL.md:

markdown
Copy

# Example Skill

## Description

This is an example skill demonstrating the skill structure and format.

## USE WHEN

- User asks "show me an example skill"
- User wants to understand skill structure
- User mentions "example" or "demo"

## Capabilities

- Demonstrate skill structure
- Show workflow format
- Show tool format

## Workflows

- **example-workflow**: Demonstrates workflow structure

## Tools

- **example-tool**: Demonstrates tool structure

## Context

This is an example skill for reference purposes only.

## Examples

### Example 1

**User:** Show me an example skill
**Response:** Here's the example skill demonstrating the structure... 4. SkillManager Class
Create src/skills/SkillManager.ts:

Responsibilities:

Manage skill directory structure
Load skill definitions
Validate skill structure
CRUD operations for skills
List available skills
Get skill by name
Key Methods:

typescript
Copy
class SkillManager {
private skillsDir: string;
private skills: Map<string, Skill>;

constructor(baseDir: string);

// Initialize skills directory
async initialize(): Promise<void>;

// Load all skills
async loadSkills(): Promise<void>;

// Get skill by name
getSkill(name: string): Skill | undefined;

// List all skills
listSkills(): Skill[];

// Create new skill
async createSkill(name: string, definition: SkillDefinition): Promise<void>;

// Update skill
async updateSkill(name: string, definition: SkillDefinition): Promise<void>;

// Delete skill
async deleteSkill(name: string): Promise<void>;

// Validate skill structure
async validateSkill(name: string): Promise<ValidationResult>;

// Check if skill exists
skillExists(name: string): boolean;
}

interface Skill {
name: string;
path: string;
definition: SkillDefinition;
workflows: string[]; // List of workflow files
tools: string[]; // List of tool files
reference: string[]; // List of reference files
}

interface SkillDefinition {
name: string;
description: string;
useWhen: string[]; // List of USE WHEN conditions
capabilities: string[];
workflows: { name: string; description: string }[];
tools: { name: string; description: string }[];
context?: string;
examples?: { user: string; response: string }[];
}

interface ValidationResult {
valid: boolean;
errors: string[];
warnings: string[];
} 5. Skill Parser
Create src/skills/SkillParser.ts:

Responsibilities:

Parse SKILL.md files
Extract skill definition
Validate markdown structure
Key Methods:

typescript
Copy
class SkillParser {
// Parse SKILL.md file
static parseSkillFile(content: string): SkillDefinition;

// Generate SKILL.md content from definition
static generateSkillFile(definition: SkillDefinition): string;

// Validate SKILL.md structure
static validateStructure(content: string): ValidationResult;
}
📁 FILES TO CREATE/MODIFY
CREATE (New Files):
src/skills/SkillManager.ts
SkillManager class
Skill CRUD operations
Skill validation
src/skills/SkillParser.ts
Parse SKILL.md files
Generate SKILL.md content
Validate structure
src/skills/types.ts
Skill interface
SkillDefinition interface
ValidationResult interface
src/skills/index.ts
Export SkillManager
Export types
tests/skills/SkillManager.test.ts
Test skill initialization
Test skill loading
Test CRUD operations
Test validation
tests/skills/SkillParser.test.ts
Test parsing SKILL.md
Test generating SKILL.md
Test validation
CREATE (Skill Files):
~/.infinite-aura-ts/memory/SKILLS/example-skill/SKILL.md
Example skill definition
~/.infinite-aura-ts/memory/SKILLS/example-skill/Workflows/example-workflow.md
Example workflow
~/.infinite-aura-ts/memory/SKILLS/example-skill/Tools/example-tool.ts
Example tool
~/.infinite-aura-ts/memory/SKILLS/example-skill/Reference/example-ref.md
Example reference doc
MODIFY (Existing Files):
src/index.ts
Export SkillManager
Export skill types
✅ TEST CRITERIA
SkillManager Tests (20-25 tests):
Initialization:
✅ SKILLS directory created on initialization
✅ Example skill created
✅ Skill structure validated
Loading:
✅ Can load all skills
✅ Can get skill by name
✅ Can list all skills
✅ Handles missing skills directory
CRUD Operations:
✅ Can create new skill
✅ Can update existing skill
✅ Can delete skill
✅ Validates skill name
✅ Prevents duplicate skills
Validation:
✅ Validates skill structure
✅ Detects missing SKILL.md
✅ Detects invalid SKILL.md format
✅ Returns validation errors
SkillParser Tests (10-15 tests):
Parsing:
✅ Parses valid SKILL.md
✅ Extracts all sections
✅ Handles missing sections
✅ Handles malformed markdown
Generation:
✅ Generates valid SKILL.md
✅ Includes all sections
✅ Formats correctly
Validation:
✅ Validates structure
✅ Returns errors for invalid structure
🎯 SUCCESS CRITERIA
Functional:
✅ SKILLS directory exists
✅ Example skill created
✅ SkillManager working
✅ SkillParser working
✅ Can create/read/update/delete skills
✅ Skill validation working
Testing:
✅ All existing tests pass (1,097 tests)
✅ 30-40 new tests added
✅ Total: ~1,127-1,137 tests
✅ Coverage maintained: 90%+
Quality:
✅ TypeScript types defined
✅ Error handling implemented
✅ Code follows existing patterns
✅ Documentation added
🔗 INTEGRATION POINTS
Uses (Existing):
Memory structure (PROMPT 4A): Skills stored in memory directory
Used By (Future):
Intent Matching (PROMPT 12B): Reads USE WHEN conditions
Skill Activation (PROMPT 12C): Loads skill context
Orchestrator (PROMPT 16): Routes to skills
📚 PAI REFERENCE
Skill Structure:
PAI Location: Packs/pai-core-install/src/skills/
PAI Format: Each skill has SKILL.md, Workflows/, Tools/, Reference/
PAI Example: CORE skill, code-review skill, security-audit skill
