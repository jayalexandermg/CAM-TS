import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentFactory } from '../../../src/agents/factory/AgentFactory';

describe('AgentFactory', () => {
  let factory: AgentFactory;
  const traitsPath = path.join(__dirname, '../../../src/agents/traits/Traits.yaml');
  const templatePath = path.join(__dirname, '../../../src/agents/templates/DynamicAgent.hbs');

  beforeEach(() => {
    factory = new AgentFactory(traitsPath, templatePath);
  });

  describe('initialization', () => {
    it('should not be initialized before calling initialize()', () => {
      expect(factory.isInitialized()).toBe(false);
    });

    it('should be initialized after calling initialize()', async () => {
      await factory.initialize();
      expect(factory.isInitialized()).toBe(true);
    });

    it('should only initialize once', async () => {
      await factory.initialize();
      await factory.initialize(); // Second call should be no-op
      expect(factory.isInitialized()).toBe(true);
    });

    it('should auto-initialize when creating from task', async () => {
      const agent = await factory.createFromTask('analyze security vulnerabilities');
      expect(factory.isInitialized()).toBe(true);
      expect(agent).toBeDefined();
    });
  });

  describe('createFromTask', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should create agent from security task', async () => {
      const agent = await factory.createFromTask('perform a security audit on the codebase');

      expect(agent.name).toContain('Agent');
      expect(agent.systemPrompt).toContain('specialized agent');
      expect(agent.metadata.source).toBe('task');
      expect(agent.metadata.inferredFrom).toBe('perform a security audit on the codebase');
    });

    it('should create agent from technical task', async () => {
      const agent = await factory.createFromTask('debug the API endpoint architecture');

      expect(agent).toBeDefined();
      expect(agent.systemPrompt).toBeTruthy();
      expect(agent.traits).toBeDefined();
    });

    it('should create agent from research task', async () => {
      const agent = await factory.createFromTask('research machine learning trends');

      expect(agent).toBeDefined();
      expect(agent.metadata.source).toBe('task');
    });

    it('should include task in system prompt', async () => {
      const task = 'analyze the database schema for performance issues';
      const agent = await factory.createFromTask(task);

      expect(agent.systemPrompt).toContain('Current Task');
      expect(agent.systemPrompt).toContain(task);
    });

    it('should use custom name when provided', async () => {
      const agent = await factory.createFromTask('review code', { name: 'Custom Reviewer' });

      expect(agent.name).toBe('Custom Reviewer');
    });

    it('should include confidence in metadata', async () => {
      const agent = await factory.createFromTask('analyze security vulnerabilities in the system');

      expect(agent.metadata.confidence).toBeDefined();
      expect(agent.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(agent.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should include generatedAt timestamp', async () => {
      const before = new Date();
      const agent = await factory.createFromTask('test task');
      const after = new Date();

      expect(agent.metadata.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(agent.metadata.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should select voice based on traits', async () => {
      const agent = await factory.createFromTask('security audit vulnerability assessment');

      expect(agent.voiceId).toBeDefined();
    });

    it('should not include voice section when voiceEnabled is false', async () => {
      const agent = await factory.createFromTask('test task', { voiceEnabled: false });

      expect(agent.systemPrompt).not.toContain('Your voice ID');
    });

    it('should include voice section when voiceEnabled is true', async () => {
      const agent = await factory.createFromTask('test task', { voiceEnabled: true });

      expect(agent.systemPrompt).toContain('Voice');
    });
  });

  describe('createFromTraits', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should create agent from explicit expertise trait', async () => {
      const agent = await factory.createFromTraits(['security']);

      expect(agent.traits.expertise.length).toBeGreaterThan(0);
      expect(agent.traits.expertise[0].name.toLowerCase()).toBe('security');
      expect(agent.metadata.source).toBe('traits');
    });

    it('should create agent from multiple traits', async () => {
      const agent = await factory.createFromTraits(['security', 'skeptical', 'thorough']);

      expect(agent.traits.expertise.length).toBeGreaterThan(0);
      expect(agent.traits.personality.length).toBeGreaterThan(0);
      expect(agent.traits.approach.length).toBeGreaterThan(0);
    });

    it('should include explicit traits in metadata', async () => {
      const traits = ['technical', 'analytical'];
      const agent = await factory.createFromTraits(traits);

      expect(agent.metadata.explicitTraits).toEqual(traits);
    });

    it('should generate name from traits', async () => {
      const agent = await factory.createFromTraits(['security', 'skeptical']);

      expect(agent.name).toContain('Security');
      expect(agent.name).toContain('Agent');
    });

    it('should use custom name when provided', async () => {
      const agent = await factory.createFromTraits(['security'], { name: 'My Security Bot' });

      expect(agent.name).toBe('My Security Bot');
    });

    it('should include task when provided in options', async () => {
      const task = 'Review the authentication module';
      const agent = await factory.createFromTraits(['security'], { task });

      expect(agent.systemPrompt).toContain(task);
    });

    it('should handle empty traits array', async () => {
      const agent = await factory.createFromTraits([]);

      expect(agent.name).toBe('Custom Agent');
      expect(agent.traits.expertise).toHaveLength(0);
      expect(agent.traits.personality).toHaveLength(0);
      expect(agent.traits.approach).toHaveLength(0);
    });

    it('should ignore invalid trait names', async () => {
      const agent = await factory.createFromTraits(['security', 'invalid_trait', 'skeptical']);

      expect(agent.traits.expertise.length).toBe(1);
      expect(agent.traits.personality.length).toBe(1);
    });
  });

  describe('createFromExample', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should create agent from security_audit example', async () => {
      const agent = await factory.createFromExample('security_audit');

      expect(agent.name).toBe('security_audit');
      expect(agent.metadata.source).toBe('example');
    });

    it('should create agent from code_review example', async () => {
      const agent = await factory.createFromExample('code_review');

      expect(agent.name).toBe('code_review');
      expect(agent.metadata.source).toBe('example');
    });

    it('should use custom name for example', async () => {
      const agent = await factory.createFromExample('security_audit', { name: 'SecBot' });

      expect(agent.name).toBe('SecBot');
    });

    it('should throw error for non-existent example', async () => {
      await expect(factory.createFromExample('non_existent_example')).rejects.toThrow(
        'Example "non_existent_example" not found'
      );
    });

    it('should include task from options', async () => {
      const task = 'Audit the payment service';
      const agent = await factory.createFromExample('security_audit', { task });

      expect(agent.systemPrompt).toContain(task);
    });
  });

  describe('listExamples', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should return list of examples', async () => {
      const examples = await factory.listExamples();

      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0]).toHaveProperty('name');
      expect(examples[0]).toHaveProperty('description');
      expect(examples[0]).toHaveProperty('traits');
    });

    it('should include security_audit example', async () => {
      const examples = await factory.listExamples();
      const securityAudit = examples.find((e) => e.name === 'security_audit');

      expect(securityAudit).toBeDefined();
      expect(securityAudit?.traits).toContain('security');
    });

    it('should include code_review example', async () => {
      const examples = await factory.listExamples();
      const codeReview = examples.find((e) => e.name === 'code_review');

      expect(codeReview).toBeDefined();
    });
  });

  describe('validateTraits', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should validate valid traits', async () => {
      const result = await factory.validateTraits(['security', 'skeptical', 'thorough']);

      expect(result.valid).toBe(true);
      expect(result.invalid).toHaveLength(0);
    });

    it('should detect invalid traits', async () => {
      const result = await factory.validateTraits(['security', 'not_a_real_trait']);

      expect(result.valid).toBe(false);
      expect(result.invalid).toContain('not_a_real_trait');
    });

    it('should return valid for empty array', async () => {
      const result = await factory.validateTraits([]);

      expect(result.valid).toBe(true);
      expect(result.invalid).toHaveLength(0);
    });

    it('should detect all invalid traits', async () => {
      const result = await factory.validateTraits(['fake1', 'fake2', 'fake3']);

      expect(result.valid).toBe(false);
      expect(result.invalid).toHaveLength(3);
    });
  });

  describe('inferTraits', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should infer traits from task', async () => {
      const inferred = await factory.inferTraits('security vulnerability assessment');

      expect(inferred.expertise).toBeDefined();
      expect(inferred.confidence).toBeDefined();
    });

    it('should return confidence level', async () => {
      const inferred = await factory.inferTraits('perform thorough security audit');

      expect(inferred.confidenceLevel).toMatch(/^(high|medium|low)$/);
    });

    it('should include reasoning', async () => {
      const inferred = await factory.inferTraits('analyze code for bugs');

      expect(inferred.reasoning).toBeDefined();
      expect(inferred.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableTraits', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should return expertise traits', async () => {
      const traits = await factory.getAvailableTraits();

      expect(traits.expertise).toBeDefined();
      expect(traits.expertise.length).toBeGreaterThan(0);
      expect(traits.expertise).toContain('security');
    });

    it('should return personality traits', async () => {
      const traits = await factory.getAvailableTraits();

      expect(traits.personality).toBeDefined();
      expect(traits.personality.length).toBeGreaterThan(0);
      expect(traits.personality).toContain('skeptical');
    });

    it('should return approach traits', async () => {
      const traits = await factory.getAvailableTraits();

      expect(traits.approach).toBeDefined();
      expect(traits.approach.length).toBeGreaterThan(0);
      expect(traits.approach).toContain('thorough');
    });
  });

  describe('template rendering', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should render expertise section', async () => {
      const agent = await factory.createFromTraits(['security']);

      expect(agent.systemPrompt).toContain('Expertise Areas');
      expect(agent.systemPrompt).toContain('security');
    });

    it('should render personality section', async () => {
      const agent = await factory.createFromTraits(['skeptical']);

      expect(agent.systemPrompt).toContain('Personality Traits');
    });

    it('should render approach section', async () => {
      const agent = await factory.createFromTraits(['thorough']);

      expect(agent.systemPrompt).toContain('Working Approach');
    });

    it('should render guidelines section', async () => {
      const agent = await factory.createFromTraits(['security']);

      expect(agent.systemPrompt).toContain('Guidelines');
      expect(agent.systemPrompt).toContain('Apply your expertise');
    });

    it('should render agent name', async () => {
      const agent = await factory.createFromTraits(['security'], { name: 'TestBot' });

      expect(agent.systemPrompt).toContain('# TestBot');
    });
  });

  describe('error handling', () => {
    it('should handle missing traits file gracefully', async () => {
      const badFactory = new AgentFactory('/non/existent/path.yaml', templatePath);

      await expect(badFactory.initialize()).rejects.toThrow();
    });

    it('should handle missing template file gracefully', async () => {
      const badFactory = new AgentFactory(traitsPath, '/non/existent/template.hbs');

      await expect(badFactory.initialize()).rejects.toThrow();
    });
  });
});

describe('AgentFactory template file', () => {
  it('should have DynamicAgent.hbs template', async () => {
    const templatePath = path.join(__dirname, '../../../src/agents/templates/DynamicAgent.hbs');
    const stats = await fs.stat(templatePath);
    expect(stats.isFile()).toBe(true);
  });

  it('should have valid handlebars syntax', async () => {
    const templatePath = path.join(__dirname, '../../../src/agents/templates/DynamicAgent.hbs');
    const content = await fs.readFile(templatePath, 'utf-8');

    // Check for required sections
    expect(content).toContain('{{name}}');
    expect(content).toContain('{{#if expertise}}');
    expect(content).toContain('{{#if personality}}');
    expect(content).toContain('{{#if approach}}');
    expect(content).toContain('{{#if task}}');
    expect(content).toContain('{{#if voiceEnabled}}');
  });
});
