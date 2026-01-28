/**
 * AgentFactoryCommand Tests
 *
 * Tests for the agent factory CLI commands.
 */

import * as path from 'path';
import { AgentFactoryCommand } from '../../src/cli/commands/AgentFactoryCommand';
import { Command } from '../../src/cli/types';

describe('AgentFactoryCommand', () => {
  let command: AgentFactoryCommand;
  // Use actual traits file since validation requires minimum trait counts
  const traitsPath = path.join(__dirname, '../../src/agents/traits/Traits.yaml');
  const templatePath = path.join(__dirname, '../../src/agents/templates/DynamicAgent.hbs');

  beforeEach(() => {
    command = new AgentFactoryCommand(traitsPath, templatePath);
  });

  /**
   * Helper to create a Command object
   */
  function createCommand(
    subcommand?: string,
    options: Record<string, string> = {},
    positional: string[] = []
  ): Command {
    return {
      name: 'agent',
      subcommand,
      flags: new Map(),
      options: new Map(Object.entries(options)),
      positional,
    };
  }

  // =========================================================================
  // Help and Description Tests
  // =========================================================================

  describe('help and description', () => {
    it('should provide help text', () => {
      const help = command.getHelp();

      expect(help).toContain('agent');
      expect(help).toContain('create');
      expect(help).toContain('list-traits');
      expect(help).toContain('list-examples');
    });

    it('should provide description', () => {
      const desc = command.getDescription();

      expect(desc).toBeDefined();
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should include examples in help', () => {
      const help = command.getHelp();

      expect(help).toContain('--task');
      expect(help).toContain('--traits');
      expect(help).toContain('--example');
    });
  });

  // =========================================================================
  // Create Subcommand Tests
  // =========================================================================

  describe('agent:create', () => {
    it('should create agent from task', async () => {
      const cmd = createCommand('create', { task: 'Review security of API' });
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Generated Agent');
      expect(result.output).toContain('Source: task');
    });

    it('should create agent from traits', async () => {
      const cmd = createCommand('create', { traits: 'security,thorough' });
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Generated Agent');
      expect(result.output).toContain('Source: traits');
    });

    it('should support -t shorthand for task', async () => {
      const cmd = createCommand('create', { t: 'Test the login system' });
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Generated Agent');
    });

    it('should support custom name with -n', async () => {
      const cmd = createCommand('create', { task: 'Review code', n: 'MyBot' });
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Name: MyBot');
    });

    it('should fail when no input provided', async () => {
      const cmd = createCommand('create', {});
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Must provide');
    });

    it('should fail for unknown example', async () => {
      const cmd = createCommand('create', { example: 'nonexistent-example-xyz' });
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
    });
  });

  // =========================================================================
  // Output Format Tests
  // =========================================================================

  describe('output formats', () => {
    it('should output in prompt format by default', async () => {
      const cmd = createCommand('create', { task: 'Review code' });
      const result = await command.execute(cmd);

      expect(result.output).toContain('=== Generated Agent ===');
      expect(result.output).toContain('--- System Prompt ---');
    });

    it('should output in JSON format', async () => {
      const cmd = createCommand('create', { task: 'Review code', format: 'json' });
      const result = await command.execute(cmd);

      const parsed = JSON.parse(result.output!);
      expect(parsed.name).toBeDefined();
      expect(parsed.systemPrompt).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });

    it('should output in YAML format', async () => {
      const cmd = createCommand('create', { task: 'Review code', format: 'yaml' });
      const result = await command.execute(cmd);

      expect(result.output).toContain('name:');
      expect(result.output).toContain('systemPrompt:');
      expect(result.output).toContain('metadata:');
    });

    it('should support -f shorthand for format', async () => {
      const cmd = createCommand('create', { task: 'Review code', f: 'json' });
      const result = await command.execute(cmd);

      expect(() => JSON.parse(result.output!)).not.toThrow();
    });
  });

  // =========================================================================
  // List Traits Subcommand Tests
  // =========================================================================

  describe('agent:list-traits', () => {
    it('should list traits by category', async () => {
      const cmd = createCommand('list-traits');
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Available Traits');
      expect(result.output).toContain('Expertise:');
      expect(result.output).toContain('Personality:');
      expect(result.output).toContain('Approach:');
    });

    it('should include specific traits', async () => {
      const cmd = createCommand('list-traits');
      const result = await command.execute(cmd);

      expect(result.output).toContain('security');
      expect(result.output).toContain('analytical');
      expect(result.output).toContain('thorough');
    });
  });

  // =========================================================================
  // List Examples Subcommand Tests
  // =========================================================================

  describe('agent:list-examples', () => {
    it('should list example compositions', async () => {
      const cmd = createCommand('list-examples');
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      // May have examples or be empty
      expect(result.output).toBeDefined();
    });
  });

  // =========================================================================
  // Preview Subcommand Tests
  // =========================================================================

  describe('agent:preview', () => {
    it('should preview agent prompt from positional task', async () => {
      const cmd = createCommand('preview', {}, ['Optimize database queries']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Agent Preview');
    });

    it('should preview agent prompt from task option', async () => {
      const cmd = createCommand('preview', { task: 'Review authentication' });
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Agent Preview');
    });

    it('should fail without task', async () => {
      const cmd = createCommand('preview');
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Must provide a task');
    });
  });

  // =========================================================================
  // Validate Subcommand Tests
  // =========================================================================

  describe('agent:validate', () => {
    it('should validate known traits', async () => {
      const cmd = createCommand('validate', {}, ['security,thorough']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('valid');
    });

    it('should report invalid traits', async () => {
      const cmd = createCommand('validate', {}, ['security,unknown-trait-xyz']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('invalid');
      expect(result.error).toContain('unknown-trait-xyz');
    });

    it('should fail without traits to validate', async () => {
      const cmd = createCommand('validate');
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Must provide traits');
    });
  });

  // =========================================================================
  // Infer Subcommand Tests
  // =========================================================================

  describe('agent:infer', () => {
    it('should infer traits from task', async () => {
      const cmd = createCommand('infer', {}, ['Check for security vulnerabilities']);
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Inferred Traits');
      expect(result.output).toContain('Confidence');
    });

    it('should show expertise, personality, and approach', async () => {
      const cmd = createCommand('infer', { task: 'Audit the system' });
      const result = await command.execute(cmd);

      expect(result.output).toContain('Expertise:');
      expect(result.output).toContain('Personality:');
      expect(result.output).toContain('Approach:');
    });

    it('should fail without task', async () => {
      const cmd = createCommand('infer');
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Must provide a task');
    });
  });

  // =========================================================================
  // Unknown Subcommand Tests
  // =========================================================================

  describe('unknown subcommand', () => {
    it('should fail for unknown subcommand', async () => {
      const cmd = createCommand('unknown-cmd');
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Unknown subcommand');
    });
  });

  // =========================================================================
  // Default Subcommand Tests
  // =========================================================================

  describe('default subcommand', () => {
    it('should default to create subcommand', async () => {
      const cmd = createCommand(undefined, { task: 'Review code' });
      const result = await command.execute(cmd);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Generated Agent');
    });
  });
});
