# Create Workflow

## Purpose

Generate a new skill with complete directory structure, SKILL.md definition, workflow documentation, and TypeScript tool stubs from a SkillConfig object.

## Steps

1. **Validate Configuration**
   - Verify skill name follows TitleCase convention (regex: `/^[A-Z][a-zA-Z0-9]*$/`)
   - Check required fields are present (name, description)
   - Reject invalid names (lowercase, UPPERCASE, spaces)

2. **Check for Duplicates**
   - Verify skill directory does not already exist
   - Return error if skill with same name exists

3. **Apply Defaults**
   - Set default version to '1.0.0' if not provided
   - Set default author to 'CAM User' if not provided
   - Set default permissions to ['file_read'] if not provided
   - Set default use_when to ['use {skillname}'] if not provided

4. **Create Directory Structure**
   - Create main skill directory: `src/skills/{SkillName}/`
   - Create Workflows subdirectory: `src/skills/{SkillName}/Workflows/`
   - Create Tools subdirectory: `src/skills/{SkillName}/Tools/`

5. **Generate SKILL.md**
   - Create YAML frontmatter with name, description, version, author, category, permissions, use_when
   - Add markdown body with description, capabilities, and workflows

6. **Generate Workflow Documentation**
   - Create `Workflows/Default.md` with purpose, steps, parameters, and output format

7. **Generate TypeScript Tools**
   - Create `Tools/index.ts` with {SkillName}Options interface
   - Add {SkillName}Result interface
   - Add execute() stub function

8. **Generate Skill Exports**
   - Create `index.ts` that exports from Tools

9. **Return Result**
   - Return GenerationResult with success status, path, and files created

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| name | string | Yes | - | Skill name in TitleCase (e.g., MySkill) |
| description | string | Yes | - | Brief description of skill purpose |
| category | string | No | 'general' | Skill category for organization |
| author | string | No | 'CAM User' | Skill author name |
| version | string | No | '1.0.0' | Semantic version string |
| permissions | string[] | No | ['file_read'] | Required permissions |
| use_when | string[] | No | ['use {name}'] | Activation conditions |

## Output Format

```typescript
interface GenerationResult {
  success: boolean;        // Whether generation succeeded
  path: string;           // Path to created skill directory
  files: string[];        // List of created files
  errors: string[];       // Any errors encountered
}
```

## Error Conditions

| Error | Cause | Resolution |
|-------|-------|------------|
| Invalid name format | Name not TitleCase | Use format like MySkill, DataAnalyzer |
| Skill already exists | Directory exists | Choose different name or delete existing |
| Missing required field | name or description empty | Provide all required fields |
