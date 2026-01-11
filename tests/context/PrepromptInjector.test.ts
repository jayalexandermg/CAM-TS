import { PrepromptInjector } from '../../src/context/PrepromptInjector';

describe('PrepromptInjector', () => {
  let injector: PrepromptInjector;

  beforeEach(() => {
    injector = new PrepromptInjector();
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create injector with default options', () => {
      const inj = new PrepromptInjector();
      expect(inj.getBaseSystemPrompt()).toBe('');
      expect(inj.getLayerCount()).toBe(0);
    });

    it('should accept custom base system prompt', () => {
      const inj = new PrepromptInjector({ baseSystemPrompt: 'You are a helpful assistant.' });
      expect(inj.getBaseSystemPrompt()).toBe('You are a helpful assistant.');
    });

    it('should accept custom context markers', () => {
      const inj = new PrepromptInjector({
        contextStartMarker: '=== START ===',
        contextEndMarker: '=== END ===',
      });
      expect(inj.getContextStartMarker()).toBe('=== START ===');
      expect(inj.getContextEndMarker()).toBe('=== END ===');
    });
  });

  // =========================================================================
  // Context Injection Tests
  // =========================================================================

  describe('injectContext', () => {
    it('should inject context into a layer', () => {
      injector.injectContext('core', '# User Identity\nJohn Doe');
      expect(injector.hasLayer('core')).toBe(true);
      expect(injector.getLayerContext('core')).toBe('# User Identity\nJohn Doe');
    });

    it('should use default priority of 50', () => {
      injector.injectContext('core', 'Content');
      expect(injector.getLayerPriority('core')).toBe(50);
    });

    it('should accept custom priority', () => {
      injector.injectContext('core', 'Content', 0);
      expect(injector.getLayerPriority('core')).toBe(0);
    });

    it('should overwrite existing layer content', () => {
      injector.injectContext('core', 'Original');
      injector.injectContext('core', 'Updated', 10);
      expect(injector.getLayerContext('core')).toBe('Updated');
      expect(injector.getLayerPriority('core')).toBe(10);
    });

    it('should maintain multiple layers', () => {
      injector.injectContext('core', 'Core content', 0);
      injector.injectContext('project', 'Project content', 10);
      injector.injectContext('session', 'Session content', 20);

      expect(injector.getLayerCount()).toBe(3);
      expect(injector.getLayers()).toEqual(['core', 'project', 'session']);
    });
  });

  // =========================================================================
  // System Prompt Composition Tests
  // =========================================================================

  describe('getSystemPrompt', () => {
    it('should return empty string when no context and no base prompt', () => {
      expect(injector.getSystemPrompt()).toBe('');
    });

    it('should return base prompt when no context injected', () => {
      const inj = new PrepromptInjector({ baseSystemPrompt: 'Base prompt' });
      expect(inj.getSystemPrompt()).toBe('Base prompt');
    });

    it('should return only context when no base prompt', () => {
      injector.injectContext('core', '# User\nJohn');
      const prompt = injector.getSystemPrompt();
      expect(prompt).toContain('# User\nJohn');
      expect(prompt).toContain('--- CONTEXT');
    });

    it('should compose base prompt with context', () => {
      const inj = new PrepromptInjector({ baseSystemPrompt: 'You are helpful.' });
      inj.injectContext('core', '# User\nJohn');

      const prompt = inj.getSystemPrompt();
      expect(prompt).toContain('You are helpful.');
      expect(prompt).toContain('# User\nJohn');
      expect(prompt).toContain('--- CONTEXT');
      expect(prompt).toContain('--- END CONTEXT');
    });

    it('should order layers by priority', () => {
      injector.injectContext('layer-c', 'LAYER_C_CONTENT', 20);
      injector.injectContext('layer-a', 'LAYER_A_CONTENT', 0);
      injector.injectContext('layer-b', 'LAYER_B_CONTENT', 10);

      const prompt = injector.getSystemPrompt();
      const layerAIndex = prompt.indexOf('LAYER_A_CONTENT');
      const layerBIndex = prompt.indexOf('LAYER_B_CONTENT');
      const layerCIndex = prompt.indexOf('LAYER_C_CONTENT');

      expect(layerAIndex).toBeLessThan(layerBIndex);
      expect(layerBIndex).toBeLessThan(layerCIndex);
    });

    it('should skip empty content layers', () => {
      injector.injectContext('core', 'Core content');
      injector.injectContext('empty', '   ');
      injector.injectContext('session', 'Session content');

      const prompt = injector.getSystemPrompt();
      expect(prompt).toContain('Core content');
      expect(prompt).toContain('Session content');
      expect(prompt).not.toContain('empty');
    });

    it('should return empty string when all layers are empty', () => {
      injector.injectContext('empty1', '');
      injector.injectContext('empty2', '   ');
      expect(injector.getSystemPrompt()).toBe('');
    });

    it('should use custom markers', () => {
      const inj = new PrepromptInjector({
        contextStartMarker: '<<START>>',
        contextEndMarker: '<<END>>',
      });
      inj.injectContext('core', 'Content');

      const prompt = inj.getSystemPrompt();
      expect(prompt).toContain('<<START>>');
      expect(prompt).toContain('<<END>>');
    });
  });

  // =========================================================================
  // Layer Management Tests
  // =========================================================================

  describe('clearLayer', () => {
    it('should clear specific layer', () => {
      injector.injectContext('core', 'Core');
      injector.injectContext('project', 'Project');

      const cleared = injector.clearLayer('core');

      expect(cleared).toBe(true);
      expect(injector.hasLayer('core')).toBe(false);
      expect(injector.hasLayer('project')).toBe(true);
    });

    it('should return false for non-existent layer', () => {
      const cleared = injector.clearLayer('nonexistent');
      expect(cleared).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear all layers', () => {
      injector.injectContext('core', 'Core');
      injector.injectContext('project', 'Project');
      injector.injectContext('session', 'Session');

      injector.clearAll();

      expect(injector.getLayerCount()).toBe(0);
      expect(injector.getLayers()).toEqual([]);
    });

    it('should work when no layers exist', () => {
      expect(() => injector.clearAll()).not.toThrow();
      expect(injector.getLayerCount()).toBe(0);
    });
  });

  describe('getLayerContext', () => {
    it('should return layer content', () => {
      injector.injectContext('core', 'Core content');
      expect(injector.getLayerContext('core')).toBe('Core content');
    });

    it('should return undefined for non-existent layer', () => {
      expect(injector.getLayerContext('nonexistent')).toBeUndefined();
    });
  });

  describe('getLayers', () => {
    it('should return empty array when no layers', () => {
      expect(injector.getLayers()).toEqual([]);
    });

    it('should return all layer names', () => {
      injector.injectContext('core', 'Core');
      injector.injectContext('project', 'Project');
      expect(injector.getLayers()).toContain('core');
      expect(injector.getLayers()).toContain('project');
    });
  });

  describe('hasLayer', () => {
    it('should return true for existing layer', () => {
      injector.injectContext('core', 'Content');
      expect(injector.hasLayer('core')).toBe(true);
    });

    it('should return false for non-existent layer', () => {
      expect(injector.hasLayer('nonexistent')).toBe(false);
    });
  });

  describe('getLayerCount', () => {
    it('should return 0 when no layers', () => {
      expect(injector.getLayerCount()).toBe(0);
    });

    it('should return correct count', () => {
      injector.injectContext('a', '1');
      injector.injectContext('b', '2');
      injector.injectContext('c', '3');
      expect(injector.getLayerCount()).toBe(3);
    });
  });

  // =========================================================================
  // Base System Prompt Tests
  // =========================================================================

  describe('setBaseSystemPrompt', () => {
    it('should update base system prompt', () => {
      injector.setBaseSystemPrompt('New base prompt');
      expect(injector.getBaseSystemPrompt()).toBe('New base prompt');
    });

    it('should affect getSystemPrompt output', () => {
      injector.injectContext('core', 'Core');
      injector.setBaseSystemPrompt('Base');

      const prompt = injector.getSystemPrompt();
      expect(prompt).toContain('Base');
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration', () => {
    it('should produce correct preprompt structure', () => {
      const inj = new PrepromptInjector({
        baseSystemPrompt: 'You are a helpful AI assistant.',
      });

      inj.injectContext(
        'core',
        `## User Identity
# User: John Doe
Role: Developer

## Preferences
Code style: Concise`,
        0
      );

      inj.injectContext(
        'project',
        `## Active Project
Name: MyApp`,
        10
      );

      const prompt = inj.getSystemPrompt();

      // Check structure
      expect(prompt).toContain('You are a helpful AI assistant.');
      expect(prompt).toContain('--- CONTEXT (Loaded on Session Start) ---');
      expect(prompt).toContain('## User Identity');
      expect(prompt).toContain('John Doe');
      expect(prompt).toContain('## Active Project');
      expect(prompt).toContain('--- END CONTEXT ---');

      // Check ordering
      const baseIndex = prompt.indexOf('You are a helpful');
      const contextStart = prompt.indexOf('--- CONTEXT');
      expect(baseIndex).toBeLessThan(contextStart);
    });
  });
});
