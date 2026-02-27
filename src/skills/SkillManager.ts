/**
 * SkillManager - Manages skill directory structure and operations
 *
 * Skills are self-contained units with definitions (SKILL.md), workflows,
 * tools, and reference documentation. This class handles skill CRUD operations,
 * loading, validation, and directory management.
 */

import * as path from 'path';
import { PathValidator } from '../memory/path-validator';
import { FileOperations } from '../memory/file-operations';
import { DirectoryOperations } from '../memory/directory-operations';
import { MemoryError, ErrorCodes } from '../exceptions';
import {
  Skill,
  SkillDefinition,
  SkillValidationResult,
  CreateSkillOptions,
  SKILL_STRUCTURE,
  SKILLS_DIR,
} from './types';
import { SkillParser } from './SkillParser';

/** Template for example skill SKILL.md */
const EXAMPLE_SKILL_TEMPLATE = `# Example Skill

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
**Response:** Here's the example skill demonstrating the structure...
`;

/** Template for example workflow */
const EXAMPLE_WORKFLOW_TEMPLATE = `# Example Workflow

## Purpose
Demonstrates workflow structure and format.

## Steps
1. Step one description
2. Step two description
3. Step three description

## Inputs
- Input 1: Description
- Input 2: Description

## Outputs
- Output 1: Description
`;

/** Template for example tool */
const EXAMPLE_TOOL_TEMPLATE = `/**
 * Example Tool
 *
 * Demonstrates tool structure and format.
 */

export interface ExampleToolInput {
  /** Example input parameter */
  input: string;
}

export interface ExampleToolOutput {
  /** Example output result */
  result: string;
}

/**
 * Execute the example tool
 * @param input - Tool input parameters
 * @returns Tool output
 */
export async function exampleTool(input: ExampleToolInput): Promise<ExampleToolOutput> {
  return {
    result: \`Processed: \${input.input}\`,
  };
}
`;

/** Template for example reference */
const EXAMPLE_REFERENCE_TEMPLATE = `# Example Reference

## Overview
This is an example reference document demonstrating the reference format.

## Details
Reference documents provide additional context and documentation for skills.

## Related
- Link to related resources
- Link to additional documentation
`;

/**
 * Manages skill directory structure and operations
 */
export class SkillManager {
  private readonly basePath: string;
  private readonly pathValidator: PathValidator;
  private readonly fileOps: FileOperations;
  private readonly directoryOps: DirectoryOperations;
  private readonly skills: Map<string, Skill>;
  private initialized: boolean = false;

  /**
   * Create a new SkillManager instance
   * @param basePath - Base path to memory directory (e.g., ~/.infinite-aura-ts/memory/)
   */
  constructor(basePath: string) {
    this.pathValidator = new PathValidator(basePath);
    this.basePath = this.pathValidator.getBasePath();
    this.fileOps = new FileOperations(this.pathValidator);
    this.directoryOps = new DirectoryOperations(this.pathValidator);
    this.skills = new Map();
  }

  /**
   * Initialize SKILLS directory and create example skill
   * Creates SKILLS directory structure and loads existing skills
   */
  async initialize(): Promise<void> {
    try {
      // Ensure base path exists
      await this.pathValidator.ensureBasePathExists();

      // Create SKILLS directory
      await this.directoryOps.createDirectory(SKILLS_DIR);

      // Create example skill if it doesn't exist
      const exampleSkillPath = `${SKILLS_DIR}/example-skill`;
      const exampleSkillExists = await this.directoryOps.directoryExists(exampleSkillPath);

      if (!exampleSkillExists) {
        await this.createSkillDirectoryStructure('example-skill');
        await this.fileOps.writeFile(
          `${exampleSkillPath}/${SKILL_STRUCTURE.DEFINITION_FILE}`,
          EXAMPLE_SKILL_TEMPLATE
        );
        await this.fileOps.writeFile(
          `${exampleSkillPath}/${SKILL_STRUCTURE.WORKFLOWS_DIR}/example-workflow.md`,
          EXAMPLE_WORKFLOW_TEMPLATE
        );
        await this.fileOps.writeFile(
          `${exampleSkillPath}/${SKILL_STRUCTURE.TOOLS_DIR}/example-tool.ts`,
          EXAMPLE_TOOL_TEMPLATE
        );
        await this.fileOps.writeFile(
          `${exampleSkillPath}/${SKILL_STRUCTURE.REFERENCE_DIR}/example-ref.md`,
          EXAMPLE_REFERENCE_TEMPLATE
        );
      }

      // Load all skills
      await this.loadSkills();

      this.initialized = true;
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(
        `Failed to initialize SKILLS directory: ${err.message}`,
        ErrorCodes.MEMORY_INIT_ERROR,
        { basePath: this.basePath, error: err.message }
      );
    }
  }

  /**
   * Load all skills from the SKILLS directory
   * Scans SKILLS directory and loads each skill definition
   */
  async loadSkills(): Promise<void> {
    try {
      this.skills.clear();

      // Check if SKILLS directory exists
      const skillsExists = await this.directoryOps.directoryExists(SKILLS_DIR);
      if (!skillsExists) {
        return;
      }

      // List skill directories
      const skillDirs = await this.directoryOps.listDirectories(SKILLS_DIR);

      // Load each skill
      for (const skillDir of skillDirs) {
        try {
          const skill = await this.loadSkill(skillDir);
          if (skill) {
            this.skills.set(skill.name, skill);
          }
        } catch {
          // Skip invalid skills during bulk load
          continue;
        }
      }
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(`Failed to load skills: ${err.message}`, ErrorCodes.MEMORY_LOAD_ERROR, {
        error: err.message,
      });
    }
  }

  /**
   * Load a single skill by name
   * @param name - Skill directory name
   * @returns Loaded Skill or null if invalid
   */
  private async loadSkill(name: string): Promise<Skill | null> {
    const skillPath = `${SKILLS_DIR}/${name}`;
    const definitionPath = `${skillPath}/${SKILL_STRUCTURE.DEFINITION_FILE}`;

    // Check if SKILL.md exists
    const definitionExists = await this.fileOps.fileExists(definitionPath);
    if (!definitionExists) {
      return null;
    }

    // Read and parse SKILL.md
    const content = await this.fileOps.readFile(definitionPath);
    const definition = SkillParser.parseSkillFile(content);

    // Get workflow files
    const workflowsPath = `${skillPath}/${SKILL_STRUCTURE.WORKFLOWS_DIR}`;
    let workflows: string[] = [];
    if (await this.directoryOps.directoryExists(workflowsPath)) {
      workflows = await this.directoryOps.listFiles(workflowsPath);
    }

    // Get tool files
    const toolsPath = `${skillPath}/${SKILL_STRUCTURE.TOOLS_DIR}`;
    let tools: string[] = [];
    if (await this.directoryOps.directoryExists(toolsPath)) {
      tools = await this.directoryOps.listFiles(toolsPath);
    }

    // Get reference files
    const referencePath = `${skillPath}/${SKILL_STRUCTURE.REFERENCE_DIR}`;
    let reference: string[] = [];
    if (await this.directoryOps.directoryExists(referencePath)) {
      reference = await this.directoryOps.listFiles(referencePath);
    }

    return {
      name,
      path: path.join(this.basePath, skillPath),
      definition,
      workflows,
      tools,
      reference,
    };
  }

  /**
   * Get skill by name
   * @param name - Skill name
   * @returns Skill or undefined if not found
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * List all loaded skills
   * @returns Array of all skills
   */
  listSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Check if a skill exists
   * @param name - Skill name
   * @returns true if skill exists
   */
  skillExists(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * Create a new skill
   * @param name - Skill name (will be used as directory name)
   * @param definition - Skill definition
   * @param options - Creation options
   */
  async createSkill(
    name: string,
    definition: SkillDefinition,
    options: CreateSkillOptions = {}
  ): Promise<void> {
    // Validate skill name
    if (!name || name.trim() === '') {
      throw new MemoryError('Skill name cannot be empty', ErrorCodes.VALIDATION_FAILED, { name });
    }

    // Validate name format (lowercase, hyphens, no spaces)
    const validNamePattern = /^[a-z][a-z0-9-]*$/;
    if (!validNamePattern.test(name)) {
      throw new MemoryError(
        'Skill name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens',
        ErrorCodes.VALIDATION_FAILED,
        { name }
      );
    }

    // Check for duplicates
    if (this.skills.has(name)) {
      throw new MemoryError(`Skill '${name}' already exists`, ErrorCodes.FILE_EXISTS, { name });
    }

    try {
      // Create skill directory structure
      await this.createSkillDirectoryStructure(name);

      // Generate and write SKILL.md
      const content = SkillParser.generateSkillFile(definition);
      await this.fileOps.writeFile(
        `${SKILLS_DIR}/${name}/${SKILL_STRUCTURE.DEFINITION_FILE}`,
        content
      );

      // Create example files if requested
      if (options.createExampleWorkflow) {
        await this.fileOps.writeFile(
          `${SKILLS_DIR}/${name}/${SKILL_STRUCTURE.WORKFLOWS_DIR}/example-workflow.md`,
          EXAMPLE_WORKFLOW_TEMPLATE
        );
      }

      if (options.createExampleTool) {
        await this.fileOps.writeFile(
          `${SKILLS_DIR}/${name}/${SKILL_STRUCTURE.TOOLS_DIR}/example-tool.ts`,
          EXAMPLE_TOOL_TEMPLATE
        );
      }

      if (options.createExampleReference) {
        await this.fileOps.writeFile(
          `${SKILLS_DIR}/${name}/${SKILL_STRUCTURE.REFERENCE_DIR}/example-ref.md`,
          EXAMPLE_REFERENCE_TEMPLATE
        );
      }

      // Reload skills
      await this.loadSkills();
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(
        `Failed to create skill '${name}': ${err.message}`,
        ErrorCodes.MEMORY_SAVE_ERROR,
        { name, error: err.message }
      );
    }
  }

  /**
   * Update an existing skill's definition
   * @param name - Skill name
   * @param definition - New skill definition
   */
  async updateSkill(name: string, definition: SkillDefinition): Promise<void> {
    // Check if skill exists
    if (!this.skills.has(name)) {
      throw new MemoryError(`Skill '${name}' does not exist`, ErrorCodes.FILE_NOT_FOUND, { name });
    }

    try {
      // Generate and write updated SKILL.md
      const content = SkillParser.generateSkillFile(definition);
      await this.fileOps.writeFile(
        `${SKILLS_DIR}/${name}/${SKILL_STRUCTURE.DEFINITION_FILE}`,
        content
      );

      // Reload skills
      await this.loadSkills();
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(
        `Failed to update skill '${name}': ${err.message}`,
        ErrorCodes.MEMORY_SAVE_ERROR,
        { name, error: err.message }
      );
    }
  }

  /**
   * Delete a skill
   * @param name - Skill name
   */
  async deleteSkill(name: string): Promise<void> {
    // Check if skill exists
    if (!this.skills.has(name)) {
      throw new MemoryError(`Skill '${name}' does not exist`, ErrorCodes.FILE_NOT_FOUND, { name });
    }

    try {
      // Remove skill directory recursively
      await this.directoryOps.removeDirectory(`${SKILLS_DIR}/${name}`, true);

      // Remove from loaded skills
      this.skills.delete(name);
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      const err = error as Error;
      throw new MemoryError(
        `Failed to delete skill '${name}': ${err.message}`,
        ErrorCodes.MEMORY_SAVE_ERROR,
        { name, error: err.message }
      );
    }
  }

  /**
   * Validate a skill's structure
   * @param name - Skill name
   * @returns Validation result
   */
  async validateSkill(name: string): Promise<SkillValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const skillPath = `${SKILLS_DIR}/${name}`;

    // Check if skill directory exists
    const skillExists = await this.directoryOps.directoryExists(skillPath);
    if (!skillExists) {
      errors.push(`Skill directory '${name}' does not exist`);
      return { valid: false, errors, warnings };
    }

    // Check for SKILL.md
    const definitionPath = `${skillPath}/${SKILL_STRUCTURE.DEFINITION_FILE}`;
    const definitionExists = await this.fileOps.fileExists(definitionPath);
    if (!definitionExists) {
      errors.push(`Missing ${SKILL_STRUCTURE.DEFINITION_FILE}`);
      return { valid: false, errors, warnings };
    }

    // Validate SKILL.md content
    try {
      const content = await this.fileOps.readFile(definitionPath);
      const contentValidation = SkillParser.validateStructure(content);
      errors.push(...contentValidation.errors);
      warnings.push(...contentValidation.warnings);
    } catch (error) {
      errors.push(`Failed to read ${SKILL_STRUCTURE.DEFINITION_FILE}: ${(error as Error).message}`);
    }

    // Check for subdirectories
    const workflowsPath = `${skillPath}/${SKILL_STRUCTURE.WORKFLOWS_DIR}`;
    const workflowsExists = await this.directoryOps.directoryExists(workflowsPath);
    if (!workflowsExists) {
      warnings.push(`Missing ${SKILL_STRUCTURE.WORKFLOWS_DIR} directory`);
    }

    const toolsPath = `${skillPath}/${SKILL_STRUCTURE.TOOLS_DIR}`;
    const toolsExists = await this.directoryOps.directoryExists(toolsPath);
    if (!toolsExists) {
      warnings.push(`Missing ${SKILL_STRUCTURE.TOOLS_DIR} directory`);
    }

    const referencePath = `${skillPath}/${SKILL_STRUCTURE.REFERENCE_DIR}`;
    const referenceExists = await this.directoryOps.directoryExists(referencePath);
    if (!referenceExists) {
      warnings.push(`Missing ${SKILL_STRUCTURE.REFERENCE_DIR} directory`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get path to SKILLS directory
   * @returns Absolute path to SKILLS directory
   */
  getSkillsPath(): string {
    return path.join(this.basePath, SKILLS_DIR);
  }

  /**
   * Check if SkillManager has been initialized
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get skill count
   * @returns Number of loaded skills
   */
  getSkillCount(): number {
    return this.skills.size;
  }

  /**
   * Create skill directory structure
   * @param name - Skill name
   */
  private async createSkillDirectoryStructure(name: string): Promise<void> {
    const skillPath = `${SKILLS_DIR}/${name}`;
    await this.directoryOps.createDirectory(skillPath);
    await this.directoryOps.createDirectory(`${skillPath}/${SKILL_STRUCTURE.WORKFLOWS_DIR}`);
    await this.directoryOps.createDirectory(`${skillPath}/${SKILL_STRUCTURE.TOOLS_DIR}`);
    await this.directoryOps.createDirectory(`${skillPath}/${SKILL_STRUCTURE.REFERENCE_DIR}`);
  }
}
