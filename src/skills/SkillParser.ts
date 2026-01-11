/**
 * SkillParser - Parse and generate SKILL.md files
 *
 * Handles parsing of skill definition markdown files and generation of
 * properly formatted SKILL.md content from SkillDefinition objects.
 */

import {
  SkillDefinition,
  SkillWorkflow,
  SkillTool,
  SkillExample,
  SkillValidationResult,
} from './types';

/**
 * Parser for SKILL.md files
 */
export class SkillParser {
  /**
   * Parse SKILL.md file content into a SkillDefinition
   * @param content - Raw markdown content of SKILL.md
   * @returns Parsed SkillDefinition
   * @throws Error if content cannot be parsed
   */
  static parseSkillFile(content: string): SkillDefinition {
    const lines = content.split('\n');
    let currentSection = '';
    let currentExample: Partial<SkillExample> | null = null;

    const definition: SkillDefinition = {
      name: '',
      description: '',
      useWhen: [],
      capabilities: [],
      workflows: [],
      tools: [],
      context: undefined,
      examples: [],
    };

    // Track multi-line content
    let descriptionLines: string[] = [];
    let contextLines: string[] = [];
    let isInDescriptionSection = false;
    let isInContextSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Parse skill name from H1 header
      if (trimmedLine.startsWith('# ') && !definition.name) {
        definition.name = trimmedLine.substring(2).trim();
        continue;
      }

      // Check for section headers (H2)
      if (trimmedLine.startsWith('## ')) {
        // Save any accumulated content from previous section
        if (isInDescriptionSection && descriptionLines.length > 0) {
          definition.description = descriptionLines.join('\n').trim();
          descriptionLines = [];
          isInDescriptionSection = false;
        }
        if (isInContextSection && contextLines.length > 0) {
          definition.context = contextLines.join('\n').trim();
          contextLines = [];
          isInContextSection = false;
        }

        currentSection = trimmedLine.substring(3).trim().toLowerCase();

        if (currentSection === 'description') {
          isInDescriptionSection = true;
        } else if (currentSection === 'context') {
          isInContextSection = true;
        }

        currentExample = null;
        continue;
      }

      // Check for example headers (H3)
      if (trimmedLine.startsWith('### ') && currentSection === 'examples') {
        // Save previous example if exists
        if (currentExample && currentExample.user && currentExample.response) {
          definition.examples!.push(currentExample as SkillExample);
        }
        currentExample = {};
        continue;
      }

      // Parse content based on current section
      switch (currentSection) {
        case 'description':
          if (isInDescriptionSection && trimmedLine) {
            descriptionLines.push(trimmedLine);
          }
          break;

        case 'use when':
          if (trimmedLine.startsWith('-')) {
            const condition = trimmedLine.substring(1).trim();
            if (condition) {
              definition.useWhen.push(condition);
            }
          }
          break;

        case 'capabilities':
          if (trimmedLine.startsWith('-')) {
            const capability = trimmedLine.substring(1).trim();
            if (capability) {
              definition.capabilities.push(capability);
            }
          }
          break;

        case 'workflows':
          if (trimmedLine.startsWith('-')) {
            const workflow = SkillParser.parseWorkflowOrTool(trimmedLine);
            if (workflow) {
              definition.workflows.push(workflow);
            }
          }
          break;

        case 'tools':
          if (trimmedLine.startsWith('-')) {
            const tool = SkillParser.parseWorkflowOrTool(trimmedLine);
            if (tool) {
              definition.tools.push(tool);
            }
          }
          break;

        case 'context':
          if (isInContextSection) {
            contextLines.push(line);
          }
          break;

        case 'examples':
          if (currentExample) {
            if (trimmedLine.startsWith('**User:**')) {
              currentExample.user = trimmedLine.substring(9).trim();
            } else if (trimmedLine.startsWith('**Response:**')) {
              currentExample.response = trimmedLine.substring(13).trim();
            }
          }
          break;
      }
    }

    // Save any remaining accumulated content
    if (isInDescriptionSection && descriptionLines.length > 0) {
      definition.description = descriptionLines.join('\n').trim();
    }
    if (isInContextSection && contextLines.length > 0) {
      definition.context = contextLines.join('\n').trim();
    }

    // Save last example if exists
    if (currentExample && currentExample.user && currentExample.response) {
      definition.examples!.push(currentExample as SkillExample);
    }

    // Clean up empty examples array
    if (definition.examples?.length === 0) {
      definition.examples = undefined;
    }

    // Clean up empty context
    if (definition.context === '') {
      definition.context = undefined;
    }

    return definition;
  }

  /**
   * Generate SKILL.md content from a SkillDefinition
   * @param definition - Skill definition to convert to markdown
   * @returns Formatted SKILL.md content
   */
  static generateSkillFile(definition: SkillDefinition): string {
    const sections: string[] = [];

    // Header
    sections.push(`# ${definition.name}`);
    sections.push('');

    // Description
    sections.push('## Description');
    sections.push(definition.description);
    sections.push('');

    // USE WHEN
    sections.push('## USE WHEN');
    for (const condition of definition.useWhen) {
      sections.push(`- ${condition}`);
    }
    sections.push('');

    // Capabilities
    sections.push('## Capabilities');
    for (const capability of definition.capabilities) {
      sections.push(`- ${capability}`);
    }
    sections.push('');

    // Workflows
    sections.push('## Workflows');
    for (const workflow of definition.workflows) {
      sections.push(`- **${workflow.name}**: ${workflow.description}`);
    }
    sections.push('');

    // Tools
    sections.push('## Tools');
    for (const tool of definition.tools) {
      sections.push(`- **${tool.name}**: ${tool.description}`);
    }
    sections.push('');

    // Context (optional)
    if (definition.context) {
      sections.push('## Context');
      sections.push(definition.context);
      sections.push('');
    }

    // Examples (optional)
    if (definition.examples && definition.examples.length > 0) {
      sections.push('## Examples');
      for (let i = 0; i < definition.examples.length; i++) {
        const example = definition.examples[i];
        sections.push(`### Example ${i + 1}`);
        sections.push(`**User:** ${example.user}`);
        sections.push(`**Response:** ${example.response}`);
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Validate SKILL.md structure
   * @param content - Raw markdown content to validate
   * @returns Validation result with errors and warnings
   */
  static validateStructure(content: string): SkillValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('SKILL.md content is empty');
      return { valid: false, errors, warnings };
    }

    // Parse to check structure
    let definition: SkillDefinition;
    try {
      definition = SkillParser.parseSkillFile(content);
    } catch (error) {
      errors.push(`Failed to parse SKILL.md: ${(error as Error).message}`);
      return { valid: false, errors, warnings };
    }

    // Validate required fields
    if (!definition.name || definition.name.trim() === '') {
      errors.push('Missing skill name (# header)');
    }

    if (!definition.description || definition.description.trim() === '') {
      errors.push('Missing or empty Description section');
    }

    if (definition.useWhen.length === 0) {
      errors.push('Missing or empty USE WHEN section (at least one condition required)');
    }

    if (definition.capabilities.length === 0) {
      warnings.push('No capabilities defined');
    }

    if (definition.workflows.length === 0) {
      warnings.push('No workflows defined');
    }

    if (definition.tools.length === 0) {
      warnings.push('No tools defined');
    }

    // Check for section headers
    const contentLower = content.toLowerCase();
    const requiredSections = ['## description', '## use when', '## capabilities', '## workflows', '## tools'];
    for (const section of requiredSections) {
      if (!contentLower.includes(section)) {
        errors.push(`Missing required section: ${section.replace('## ', '').toUpperCase()}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Parse a workflow or tool line from markdown
   * Format: "- **Name**: Description"
   * @param line - Markdown line to parse
   * @returns Parsed workflow/tool or null if invalid
   */
  private static parseWorkflowOrTool(line: string): SkillWorkflow | SkillTool | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) {
      return null;
    }

    // Remove leading dash
    let content = trimmed.substring(1).trim();

    // Try to parse "**Name**: Description" format
    const boldMatch = content.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
    if (boldMatch) {
      return {
        name: boldMatch[1].trim(),
        description: boldMatch[2].trim(),
      };
    }

    // Fallback: just use the content as name with empty description
    // Try simple "Name: Description" format
    const colonMatch = content.match(/^([^:]+):\s*(.*)$/);
    if (colonMatch) {
      return {
        name: colonMatch[1].trim(),
        description: colonMatch[2].trim(),
      };
    }

    // Last fallback: just the name
    if (content) {
      return {
        name: content,
        description: '',
      };
    }

    return null;
  }
}
