import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PrepromptHydrator } from '../../src/context/PrepromptHydrator';
import { PrepromptInjector } from '../../src/context/PrepromptInjector';
import { CoreManager } from '../../src/memory/core';
import { SkillManager } from '../../src/skills';
import {
  LAYER_1_MARKERS,
  LAYER_2_MARKERS,
  LAYER_NAMES,
  DEFAULT_PREPROMPT_HYDRATOR_CONFIG,
} from '../../src/context/preprompt-hydrator-types';

describe('PrepromptHydrator', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-hydrator-' + Date.now());
  let coreManager: CoreManager;
  let skillManager: SkillManager;
  let prepromptInjector: PrepromptInjector;
  let hydrator: PrepromptHydrator;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up directories
    const corePath = path.join(testBasePath, 'CORE');
    const skillsPath = path.join(testBasePath, 'SKILLS');
    await fs.promises.rm(corePath, { recursive: true, force: true }).catch(() => {});
    await fs.promises.rm(skillsPath, { recursive: true, force: true }).catch(() => {});

    coreManager = new CoreManager(testBasePath);
    skillManager = new SkillManager(testBasePath);
    prepromptInjector = new PrepromptInjector();
    hydrator = new PrepromptHydrator(coreManager, skillManager, prepromptInjector);

    // Initialize managers
    await coreManager.initialize();
    await skillManager.initialize();
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create hydrator with default config', () => {
      const h = new PrepromptHydrator(coreManager, skillManager, prepromptInjector);
      const config = h.getConfig();
      expect(config.maxLayer1Tokens).toBe(DEFAULT_PREPROMPT_HYDRATOR_CONFIG.maxLayer1Tokens);
      expect(config.maxLayer2Tokens).toBe(DEFAULT_PREPROMPT_HYDRATOR_CONFIG.maxLayer2Tokens);
    });

    it('should accept custom config', () => {
      const h = new PrepromptHydrator(coreManager, skillManager, prepromptInjector, {
        maxLayer1Tokens: 1000,
        maxLayer2Tokens: 500,
      });
      const config = h.getConfig();
      expect(config.maxLayer1Tokens).toBe(1000);
      expect(config.maxLayer2Tokens).toBe(500);
    });

    it('should initialize with empty caches', () => {
      expect(hydrator.hasLayer1()).toBe(false);
      expect(hydrator.hasLayer2()).toBe(false);
    });
  });

  // =========================================================================
  // Layer 1 Tests
  // =========================================================================

  describe('loadLayer1', () => {
    it('should load CORE context from CoreManager', async () => {
      const content = await hydrator.loadLayer1();
      expect(content).toBeTruthy();
      expect(content).toContain(LAYER_1_MARKERS.START);
      expect(content).toContain(LAYER_1_MARKERS.END);
    });

    it('should format Layer 1 with correct sections', async () => {
      // Write custom CORE content
      await coreManager.updateUser('John Doe');
      await coreManager.updatePreferences('Prefer TypeScript');
      await coreManager.updateActiveProjects('Project Alpha');

      const content = await hydrator.loadLayer1();
      expect(content).toContain('## User Identity');
      expect(content).toContain('John Doe');
      expect(content).toContain('## User Preferences');
      expect(content).toContain('Prefer TypeScript');
      expect(content).toContain('## Active Projects');
      expect(content).toContain('Project Alpha');
    });

    it('should cache Layer 1 content', async () => {
      await hydrator.loadLayer1();
      expect(hydrator.hasLayer1()).toBe(true);
    });

    it('should return cached content if valid', async () => {
      const content1 = await hydrator.loadLayer1();
      const content2 = await hydrator.loadLayer1();
      expect(content1).toBe(content2);
    });

    it('should inject Layer 1 into preprompt injector', async () => {
      await coreManager.updateUser('Test User');
      await hydrator.loadLayer1();

      expect(prepromptInjector.hasLayer(LAYER_NAMES.LAYER1_USER)).toBe(true);
      expect(prepromptInjector.getLayerContext(LAYER_NAMES.LAYER1_USER)).toContain('Test User');
    });

    it('should initialize CORE if not valid', async () => {
      // Delete CORE to make it invalid
      const corePath = path.join(testBasePath, 'CORE');
      await fs.promises.rm(corePath, { recursive: true, force: true });

      // loadLayer1 should initialize CORE
      const content = await hydrator.loadLayer1();
      expect(content).toBeTruthy();
      expect(hydrator.hasLayer1()).toBe(true);
    });
  });

  describe('hasLayer1', () => {
    it('should return false before loading', () => {
      expect(hydrator.hasLayer1()).toBe(false);
    });

    it('should return true after loading', async () => {
      await hydrator.loadLayer1();
      expect(hydrator.hasLayer1()).toBe(true);
    });
  });

  describe('getLayer1Content', () => {
    it('should return null before loading', () => {
      expect(hydrator.getLayer1Content()).toBeNull();
    });

    it('should return content after loading', async () => {
      await hydrator.loadLayer1();
      const content = hydrator.getLayer1Content();
      expect(content).toBeTruthy();
      expect(content).toContain(LAYER_1_MARKERS.START);
    });
  });

  describe('clearLayer1Cache', () => {
    it('should clear Layer 1 cache', async () => {
      await hydrator.loadLayer1();
      expect(hydrator.hasLayer1()).toBe(true);

      hydrator.clearLayer1Cache();
      expect(hydrator.hasLayer1()).toBe(false);
    });

    it('should clear Layer 1 from preprompt injector', async () => {
      await coreManager.updateUser('User');
      await hydrator.loadLayer1();
      expect(prepromptInjector.hasLayer(LAYER_NAMES.LAYER1_USER)).toBe(true);

      hydrator.clearLayer1Cache();
      expect(prepromptInjector.hasLayer(LAYER_NAMES.LAYER1_USER)).toBe(false);
    });
  });

  // =========================================================================
  // Layer 2 Tests
  // =========================================================================

  describe('loadLayer2', () => {
    it('should load skill context', async () => {
      const content = await hydrator.loadLayer2('example-skill');
      expect(content).toBeTruthy();
      expect(content).toContain(LAYER_2_MARKERS.START);
      expect(content).toContain(LAYER_2_MARKERS.END);
    });

    it('should format Layer 2 with skill info', async () => {
      const content = await hydrator.loadLayer2('example-skill');
      expect(content).toContain('## Active Skill');
      expect(content).toContain('Example Skill');
    });

    it('should include agent personality if provided', async () => {
      const content = await hydrator.loadLayer2('example-skill', {
        skillName: 'example-skill',
        agentPersonality: 'Friendly and helpful',
      });
      expect(content).toContain('## Agent Personality');
      expect(content).toContain('Friendly and helpful');
    });

    it('should include task context if provided', async () => {
      const content = await hydrator.loadLayer2('example-skill', {
        skillName: 'example-skill',
        taskContext: 'Building a web application',
      });
      expect(content).toContain('## Task Context');
      expect(content).toContain('Building a web application');
    });

    it('should include relevant memory if provided', async () => {
      const content = await hydrator.loadLayer2('example-skill', {
        skillName: 'example-skill',
        relevantMemory: ['Previous project notes', 'User feedback from last session'],
      });
      expect(content).toContain('## Relevant Memory');
      expect(content).toContain('Previous project notes');
    });

    it('should inject Layer 2 into preprompt injector', async () => {
      await hydrator.loadLayer2('example-skill');
      expect(prepromptInjector.hasLayer(LAYER_NAMES.LAYER2_SKILL)).toBe(true);
    });

    it('should cache Layer 2 per skill', async () => {
      await hydrator.loadLayer2('example-skill');
      expect(hydrator.hasLayer2()).toBe(true);
      expect(hydrator.getActiveSkillName()).toBe('example-skill');
    });

    it('should handle non-existent skill gracefully', async () => {
      const content = await hydrator.loadLayer2('non-existent-skill', {
        skillName: 'non-existent-skill',
      });
      expect(content).toBeTruthy();
      expect(content).toContain('## Active Skill');
      expect(content).toContain('non-existent-skill');
    });
  });

  describe('hasLayer2', () => {
    it('should return false before loading', () => {
      expect(hydrator.hasLayer2()).toBe(false);
    });

    it('should return true after loading', async () => {
      await hydrator.loadLayer2('example-skill');
      expect(hydrator.hasLayer2()).toBe(true);
    });
  });

  describe('clearLayer2', () => {
    it('should clear Layer 2 cache', async () => {
      await hydrator.loadLayer2('example-skill');
      expect(hydrator.hasLayer2()).toBe(true);

      hydrator.clearLayer2();
      expect(hydrator.hasLayer2()).toBe(false);
    });

    it('should keep Layer 1 intact', async () => {
      await hydrator.loadLayer1();
      await hydrator.loadLayer2('example-skill');

      hydrator.clearLayer2();

      expect(hydrator.hasLayer1()).toBe(true);
      expect(hydrator.hasLayer2()).toBe(false);
    });

    it('should clear active skill name', async () => {
      await hydrator.loadLayer2('example-skill');
      expect(hydrator.getActiveSkillName()).toBe('example-skill');

      hydrator.clearLayer2();
      expect(hydrator.getActiveSkillName()).toBeNull();
    });
  });

  // =========================================================================
  // Combined Context Tests
  // =========================================================================

  describe('getHydratedContext', () => {
    it('should return empty string when no layers loaded', () => {
      expect(hydrator.getHydratedContext()).toBe('');
    });

    it('should return Layer 1 only if Layer 2 not loaded', async () => {
      await hydrator.loadLayer1();
      const context = hydrator.getHydratedContext();
      expect(context).toContain(LAYER_1_MARKERS.START);
      expect(context).not.toContain(LAYER_2_MARKERS.START);
    });

    it('should return combined Layer 1 + Layer 2', async () => {
      await hydrator.loadLayer1();
      await hydrator.loadLayer2('example-skill');

      const context = hydrator.getHydratedContext();
      expect(context).toContain(LAYER_1_MARKERS.START);
      expect(context).toContain(LAYER_2_MARKERS.START);
    });

    it('should return Layer 2 only if Layer 1 cleared', async () => {
      await hydrator.loadLayer1();
      await hydrator.loadLayer2('example-skill');
      hydrator.clearLayer1Cache();

      const context = hydrator.getHydratedContext();
      expect(context).not.toContain(LAYER_1_MARKERS.START);
      expect(context).toContain(LAYER_2_MARKERS.START);
    });
  });

  // =========================================================================
  // Token Management Tests
  // =========================================================================

  describe('getEstimatedTokens', () => {
    it('should return 0 when no context loaded', () => {
      expect(hydrator.getEstimatedTokens()).toBe(0);
    });

    it('should return token count for loaded context', async () => {
      await hydrator.loadLayer1();
      expect(hydrator.getEstimatedTokens()).toBeGreaterThan(0);
    });
  });

  describe('isWithinTokenLimits', () => {
    it('should return true when no context loaded', () => {
      expect(hydrator.isWithinTokenLimits()).toBe(true);
    });

    it('should return true when within limits', async () => {
      await hydrator.loadLayer1();
      expect(hydrator.isWithinTokenLimits()).toBe(true);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration', () => {
    it('should produce correct system prompt structure', async () => {
      await coreManager.updateUser('Jane Doe');
      await hydrator.loadLayer1();
      await hydrator.loadLayer2('example-skill', {
        skillName: 'example-skill',
        taskContext: 'Working on tests',
      });

      const systemPrompt = prepromptInjector.getSystemPrompt();
      expect(systemPrompt).toContain('Jane Doe');
      expect(systemPrompt).toContain('Example Skill');
      expect(systemPrompt).toContain('Working on tests');
    });

    it('should handle skill activation/deactivation cycle', async () => {
      await hydrator.loadLayer1();

      // Activate first skill
      await hydrator.loadLayer2('example-skill');
      expect(hydrator.getActiveSkillName()).toBe('example-skill');

      // Deactivate skill
      hydrator.clearLayer2();
      expect(hydrator.getActiveSkillName()).toBeNull();
      expect(hydrator.hasLayer1()).toBe(true);

      // Activate different skill (using same example-skill since only one exists)
      await hydrator.loadLayer2('example-skill', {
        skillName: 'example-skill',
        taskContext: 'Different task',
      });
      expect(hydrator.getActiveSkillName()).toBe('example-skill');
      expect(hydrator.getLayer2Content()).toContain('Different task');
    });
  });

  // =========================================================================
  // Getter Tests
  // =========================================================================

  describe('getters', () => {
    it('should return CoreManager', () => {
      expect(hydrator.getCoreManager()).toBe(coreManager);
    });

    it('should return SkillManager', () => {
      expect(hydrator.getSkillManager()).toBe(skillManager);
    });

    it('should return PrepromptInjector', () => {
      expect(hydrator.getPrepromptInjector()).toBe(prepromptInjector);
    });

    it('should return read-only copy of config', () => {
      const config1 = hydrator.getConfig();
      const config2 = hydrator.getConfig();
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });
});
