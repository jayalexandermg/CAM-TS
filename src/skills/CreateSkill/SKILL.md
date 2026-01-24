---
name: CreateSkill
description: Generate new skill scaffolding with complete directory structure, SKILL.md definition, workflows, and TypeScript tools
version: '1.0.0'
author: CAM System
category: development
permissions:
  - file_read
  - file_write
use_when:
  - use createskill
  - create a new skill
  - scaffold a skill
  - generate skill template
---

# CreateSkill

A meta-skill for generating new CAM skills with proper structure and conventions.

## Description

CreateSkill automates the creation of new skills by generating the complete directory structure, SKILL.md definition file, workflow documentation, and TypeScript tool stubs. This ensures consistency across all skills and reduces manual setup errors.

## USE WHEN

- User wants to create a new skill
- User needs to scaffold skill structure
- User wants to generate skill template
- User types "use createskill"

## Capabilities

- Validate skill names follow TitleCase convention
- Generate complete skill directory structure
- Create SKILL.md with YAML frontmatter
- Generate workflow documentation templates
- Create TypeScript tool interfaces and stubs
- Apply sensible defaults for optional fields
- Detect and prevent duplicate skill creation

## Workflows

- **Create**: Generate a new skill from configuration

## Tools

- **SkillGenerator**: Main generator class for creating skill scaffolding

## Context

The SkillGenerator creates skills in the src/skills/ directory with the following structure:

```
src/skills/{SkillName}/
├── SKILL.md           # Skill definition with YAML frontmatter
├── Workflows/
│   └── Default.md     # Default workflow documentation
├── Tools/
│   └── index.ts       # TypeScript interfaces and stubs
└── index.ts           # Skill exports
```

## Examples

### Example 1
**User:** Create a skill called DataAnalyzer for analyzing datasets
**Response:** Generated DataAnalyzer skill at src/skills/DataAnalyzer/ with SKILL.md, Workflows/Default.md, Tools/index.ts, and index.ts

### Example 2
**User:** use createskill to make a FileProcessor skill
**Response:** Generated FileProcessor skill at src/skills/FileProcessor/
