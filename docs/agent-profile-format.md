# Agent Profile Format

This document describes the standard format for defining agent profiles in Infinite Aura.

## Overview

Agent profiles are defined using Markdown files with YAML frontmatter. This format allows for both structured metadata (in the frontmatter) and rich, readable content (in the markdown body).

## File Structure

Agent profile files are stored in `src/agents/definitions/` with the naming convention `{AgentName}.md`.

## Format

### YAML Frontmatter

The frontmatter contains structured metadata about the agent:

```yaml
---
name: AgentName
description: Brief description of the agent's purpose
model: claude-3-5-sonnet  # Optional: LLM model to use
color: "#6366F1"          # Optional: UI color for the agent
voiceId: voice-id         # Optional: TTS voice identifier
permissions:
  - memory_read
  - memory_write
  - file_read
skills:
  - SkillName1
  - SkillName2
traits:                   # Optional: personality traits
  - Helpful
  - Precise
---
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique identifier for the agent |
| `description` | string | Brief description of the agent's purpose |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `model` | string | LLM model to use (default: inherits from system) |
| `color` | string | Hex color code for UI representation |
| `voiceId` | string | Text-to-speech voice identifier |
| `permissions` | string[] | List of permissions granted to the agent |
| `skills` | string[] | List of skill names the agent can use |
| `traits` | string[] | Personality traits for prompt engineering |

### Markdown Body

The markdown body contains the agent's system prompt and structured sections:

```markdown
# Agent Name

Introduction and context for the agent.

## Capabilities
1. First capability
2. Second capability
3. Third capability

## Constraints
- First constraint
- Second constraint
- Third constraint
```

## Permissions

Available permissions:

| Permission | Description |
|------------|-------------|
| `memory_read` | Read from memory system |
| `memory_write` | Write to memory system |
| `file_read` | Read files from filesystem |
| `file_write` | Write files to filesystem |
| `code_execute` | Execute code |
| `web_search` | Perform web searches |
| `agent_spawn` | Spawn sub-agents |

### Default Permissions by Agent Type

```typescript
{
  default: ['memory_read', 'memory_write'],
  engineer: ['file_read', 'file_write', 'code_execute', 'memory_read', 'memory_write'],
  researcher: ['web_search', 'memory_read', 'memory_write', 'file_read'],
  coordinator: ['agent_spawn', 'memory_read', 'memory_write'],
  security: ['file_read', 'code_execute', 'memory_read']
}
```

## Example Profile

```markdown
---
name: Researcher
description: Research specialist for information gathering and analysis
model: claude-3-5-sonnet
color: "#10B981"
permissions:
  - web_search
  - memory_read
  - memory_write
  - file_read
skills:
  - WebSearch
  - Analysis
  - Synthesis
traits:
  - Curious
  - Analytical
  - Detail-oriented
---

# Researcher Agent

You are a research specialist focused on gathering, analyzing, and synthesizing information from multiple sources.

## Capabilities
1. Search the web for relevant information
2. Analyze and evaluate source credibility
3. Synthesize findings into coherent summaries
4. Cross-reference multiple sources

## Constraints
- Always cite sources
- Acknowledge uncertainty when present
- Prioritize accuracy over speed
- Verify facts before presenting
```

## API Usage

### Loading Profiles

```typescript
import { ProfileLoader } from './src/agents/profiles';

const loader = new ProfileLoader('./src/agents/definitions');

// Load a single profile
const profile = await loader.load('./src/agents/definitions/Researcher.md');

// Load all profiles
const profiles = await loader.loadAll();

// Get cached profile
const cached = loader.get('Researcher');

// List available profiles
const names = await loader.listProfiles();
```

### Validating Profiles

```typescript
import { ProfileSchema } from './src/agents/profiles';

const schema = new ProfileSchema();

const validation = schema.validateFrontmatter({
  name: 'TestAgent',
  description: 'A test agent'
});

if (!validation.valid) {
  console.error(validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn(validation.warnings);
}
```

## Context Files

Each agent can have an associated context file named `{AgentName}Context.md`. This file is automatically referenced in the profile's `contextFile` field and contains additional runtime context for the agent.
