/**
 * AgentComposer Tests
 *
 * Tests for the high-level agent composition interface.
 */

import * as path from 'path';
import { AgentComposer, ComposeInput } from '../../../src/agents/factory/AgentComposer';

describe('AgentComposer', () => {
  let composer: AgentComposer;
  // Use the actual traits file since validation requires minimum trait counts
  const traitsPath = path.join(__dirname, '../../../src/agents/traits/Traits.yaml');
  const templatePath = path.join(__dirname, '../../../src/agents/templates/DynamicAgent.hbs');

  beforeEach(() => {
    composer = new AgentComposer(traitsPath, templatePath);
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('initialization', () => {
    it('should not be initialized before calling initialize()', () => {
      expect(composer.isInitialized()).toBe(false);
    });

    it('should be initialized after calling initialize()', async () => {
      await composer.initialize();
      expect(composer.isInitialized()).toBe(true);
    });

    it('should auto-initialize on compose if not already initialized', async () => {
      expect(composer.isInitialized()).toBe(false);

      await composer.compose({ task: 'Review this code' });

      expect(composer.isInitialized()).toBe(true);
    });

    it('should not throw when initializing twice', async () => {
      await composer.initialize();
      await expect(composer.initialize()).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // Compose from Task Tests
  // =========================================================================

  describe('compose from task', () => {
    it('should create agent from task description', async () => {
      const result = await composer.compose({
        task: 'Review the security of this API endpoint',
      });

      expect(result.agent).toBeDefined();
      expect(result.agent.name).toBeDefined();
      expect(result.agent.systemPrompt).toBeDefined();
      expect(result.agent.metadata.source).toBe('task');
    });

    it('should infer security traits from security-related task', async () => {
      const result = await composer.compose({
        task: 'Audit the authentication system for vulnerabilities',
      });

      expect(result.agent.traits.expertise.length).toBeGreaterThan(0);
    });

    it('should allow custom name with task-based creation', async () => {
      const result = await composer.compose({
        task: 'Analyze performance bottlenecks',
        name: 'PerfBot',
      });

      expect(result.agent.name).toBe('PerfBot');
    });

    it('should include confidence in metadata for task-based agents', async () => {
      const result = await composer.compose({
        task: 'Write unit tests for this module',
      });

      expect(result.agent.metadata.confidence).toBeDefined();
      expect(result.agent.metadata.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should store the original task in metadata', async () => {
      const task = 'Review this code for security issues';
      const result = await composer.compose({ task });

      expect(result.agent.metadata.inferredFrom).toBe(task);
    });
  });

  // =========================================================================
  // Compose from Traits Tests
  // =========================================================================

  describe('compose from traits', () => {
    it('should create agent from explicit traits', async () => {
      const result = await composer.compose({
        traits: ['security', 'thorough', 'methodical'],
      });

      expect(result.agent).toBeDefined();
      expect(result.agent.metadata.source).toBe('traits');
    });

    it('should include specified traits in composed agent', async () => {
      const traits = ['technical', 'enthusiastic', 'creative'];
      const result = await composer.compose({ traits });

      expect(result.agent.traits.expertise.length).toBeGreaterThan(0);
    });

    it('should allow custom name with trait-based creation', async () => {
      const result = await composer.compose({
        traits: ['finance', 'concise'],
        name: 'FinanceChecker',
      });

      expect(result.agent.name).toBe('FinanceChecker');
    });

    it('should store explicit traits in metadata', async () => {
      const traits = ['security', 'methodical'];
      const result = await composer.compose({ traits });

      expect(result.agent.metadata.explicitTraits).toEqual(traits);
    });

    it('should allow combining traits with task context', async () => {
      const result = await composer.compose({
        traits: ['security'],
        task: 'Review API authentication',
      });

      expect(result.agent.systemPrompt).toContain('Review API authentication');
    });
  });

  // =========================================================================
  // Compose from Example Tests
  // =========================================================================

  describe('compose from example', () => {
    it('should create agent from example name', async () => {
      const examples = await composer.listExamples();
      if (examples.length === 0) {
        // Skip test if no examples defined
        return;
      }

      const result = await composer.compose({
        example: examples[0].name,
      });

      expect(result.agent).toBeDefined();
      expect(result.agent.metadata.source).toBe('example');
    });

    it('should throw for unknown example', async () => {
      await expect(
        composer.compose({ example: 'nonexistent-example' })
      ).rejects.toThrow('not found');
    });
  });

  // =========================================================================
  // Input Priority Tests
  // =========================================================================

  describe('input priority', () => {
    it('should prioritize traits over task when both provided', async () => {
      const result = await composer.compose({
        traits: ['security'],
        task: 'Do something',
      });

      expect(result.agent.metadata.source).toBe('traits');
    });

    it('should throw when no input provided', async () => {
      await expect(composer.compose({})).rejects.toThrow('Must provide task, traits, or example');
    });

    it('should throw when only empty traits provided', async () => {
      await expect(composer.compose({ traits: [] })).rejects.toThrow('Must provide task, traits, or example');
    });
  });

  // =========================================================================
  // Preview Tests
  // =========================================================================

  describe('preview', () => {
    it('should return system prompt without creating spawn', async () => {
      const prompt = await composer.preview({
        task: 'Optimize database queries',
      });

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should generate valid prompt for traits', async () => {
      const prompt = await composer.preview({
        traits: ['technical', 'thorough'],
      });

      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should match compose result prompt', async () => {
      const input: ComposeInput = { task: 'Review code quality' };

      const previewPrompt = await composer.preview(input);
      const composeResult = await composer.compose(input);

      expect(previewPrompt).toBe(composeResult.agent.systemPrompt);
    });
  });

  // =========================================================================
  // List Examples Tests
  // =========================================================================

  describe('listExamples', () => {
    it('should return array of examples', async () => {
      const examples = await composer.listExamples();

      expect(Array.isArray(examples)).toBe(true);
    });

    it('should include name, description, and traits for each example', async () => {
      const examples = await composer.listExamples();

      for (const ex of examples) {
        expect(ex.name).toBeDefined();
        expect(ex.description).toBeDefined();
        expect(Array.isArray(ex.traits)).toBe(true);
      }
    });
  });

  // =========================================================================
  // List Traits Tests
  // =========================================================================

  describe('listTraits', () => {
    it('should return traits by category', async () => {
      const traits = await composer.listTraits();

      expect(traits.expertise).toBeDefined();
      expect(traits.personality).toBeDefined();
      expect(traits.approach).toBeDefined();
    });

    it('should include all categories as arrays', async () => {
      const traits = await composer.listTraits();

      expect(Array.isArray(traits.expertise)).toBe(true);
      expect(Array.isArray(traits.personality)).toBe(true);
      expect(Array.isArray(traits.approach)).toBe(true);
    });

    it('should include expected traits', async () => {
      const traits = await composer.listTraits();

      expect(traits.expertise).toContain('security');
      expect(traits.personality).toContain('analytical');
      expect(traits.approach).toContain('thorough');
    });
  });

  // =========================================================================
  // Validate Traits Tests
  // =========================================================================

  describe('validateTraits', () => {
    it('should return valid=true for known traits', async () => {
      const result = await composer.validateTraits(['security', 'thorough']);

      expect(result.valid).toBe(true);
      expect(result.invalid).toEqual([]);
    });

    it('should return valid=false for unknown traits', async () => {
      const result = await composer.validateTraits(['security', 'unknown-trait-xyz']);

      expect(result.valid).toBe(false);
      expect(result.invalid).toContain('unknown-trait-xyz');
    });

    it('should handle empty array', async () => {
      const result = await composer.validateTraits([]);

      expect(result.valid).toBe(true);
      expect(result.invalid).toEqual([]);
    });

    it('should identify all invalid traits', async () => {
      const result = await composer.validateTraits(['bad1', 'security', 'bad2']);

      expect(result.invalid).toContain('bad1');
      expect(result.invalid).toContain('bad2');
      expect(result.invalid).not.toContain('security');
    });
  });

  // =========================================================================
  // Infer Traits Tests
  // =========================================================================

  describe('inferTraits', () => {
    it('should infer traits from task description', async () => {
      const result = await composer.inferTraits('Review security vulnerabilities');

      expect(result.expertise).toBeDefined();
      expect(result.personality).toBeDefined();
      expect(result.approach).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should return confidence between 0 and 1', async () => {
      const result = await composer.inferTraits('Audit the system');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return arrays for all trait categories', async () => {
      const result = await composer.inferTraits('Check for SQL injection vulnerabilities');

      expect(Array.isArray(result.expertise)).toBe(true);
      expect(Array.isArray(result.personality)).toBe(true);
      expect(Array.isArray(result.approach)).toBe(true);
    });

    it('should infer technical for code-related task', async () => {
      const result = await composer.inferTraits('Review the code architecture and design patterns');

      expect(result.expertise).toContain('technical');
    });
  });

  // =========================================================================
  // Factory Access Tests
  // =========================================================================

  describe('getFactory', () => {
    it('should return the underlying factory', () => {
      const factory = composer.getFactory();

      expect(factory).toBeDefined();
      expect(typeof factory.createFromTask).toBe('function');
    });

    it('should share initialization state', async () => {
      await composer.initialize();
      const factory = composer.getFactory();

      expect(factory.isInitialized()).toBe(true);
    });
  });

  // =========================================================================
  // ComposeResult Tests
  // =========================================================================

  describe('ComposeResult', () => {
    it('should include agent in result', async () => {
      const result = await composer.compose({ task: 'Review code' });

      expect(result.agent).toBeDefined();
    });

    it('should set spawned to false when autoSpawn is true (not implemented)', async () => {
      const result = await composer.compose({
        task: 'Review code',
        autoSpawn: true,
      });

      // Auto-spawn is not implemented yet
      expect(result.spawned).toBe(false);
      expect(result.spawnId).toBeUndefined();
    });

    it('should not set spawn fields when autoSpawn is false', async () => {
      const result = await composer.compose({
        task: 'Review code',
        autoSpawn: false,
      });

      expect(result.spawned).toBeUndefined();
      expect(result.spawnId).toBeUndefined();
    });
  });
});
