import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PersonaManager } from '../../src/persona/PersonaManager';
import { PersonaDefinition } from '../../src/persona/Persona';

describe('PersonaManager', () => {
  const testDir = path.join(os.tmpdir(), 'infinite-aura-test-persona-manager');
  let manager: PersonaManager;

  const testPersona: PersonaDefinition = {
    name: 'test-persona',
    description: 'A test persona',
    personality: ['Helpful', 'Precise'],
    communicationStyle: 'Direct',
    expertise: ['Testing'],
    approach: 'Systematic',
  };

  beforeAll(async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up personas directory before each test
    await fs.promises.rm(testDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(testDir, { recursive: true });
    manager = new PersonaManager(testDir);
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create manager with custom personas directory', () => {
      const customManager = new PersonaManager('/custom/path');
      expect(customManager.getPersonasDir()).toBe('/custom/path');
    });

    it('should use default directory when not specified', () => {
      const defaultManager = new PersonaManager();
      expect(defaultManager.getPersonasDir()).toContain('.infinite-aura-ts');
      expect(defaultManager.getPersonasDir()).toContain('personas');
    });

    it('should start with empty personas list', () => {
      expect(manager.listPersonas()).toHaveLength(0);
      expect(manager.getPersonaCount()).toBe(0);
    });
  });

  // =========================================================================
  // Load Personas Tests
  // =========================================================================

  describe('loadPersonas', () => {
    it('should load personas from directory', async () => {
      // Create a persona file
      await fs.promises.writeFile(
        path.join(testDir, 'test.json'),
        JSON.stringify(testPersona, null, 2)
      );

      await manager.loadPersonas();
      expect(manager.listPersonas()).toContain('test-persona');
    });

    it('should create directory if it does not exist', async () => {
      const newDir = path.join(testDir, 'new-dir');
      const newManager = new PersonaManager(newDir);

      await newManager.loadPersonas();

      const exists = await fs.promises
        .stat(newDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should skip non-JSON files', async () => {
      await fs.promises.writeFile(path.join(testDir, 'readme.txt'), 'Not a persona');
      await fs.promises.writeFile(
        path.join(testDir, 'valid.json'),
        JSON.stringify(testPersona, null, 2)
      );

      await manager.loadPersonas();
      expect(manager.listPersonas()).toHaveLength(1);
    });

    it('should skip invalid persona files', async () => {
      await fs.promises.writeFile(
        path.join(testDir, 'invalid.json'),
        JSON.stringify({ name: 'incomplete' })
      );
      await fs.promises.writeFile(
        path.join(testDir, 'valid.json'),
        JSON.stringify(testPersona, null, 2)
      );

      await manager.loadPersonas();
      expect(manager.listPersonas()).toHaveLength(1);
      expect(manager.hasPersona('test-persona')).toBe(true);
    });

    it('should load multiple personas', async () => {
      const persona1 = { ...testPersona, name: 'persona-one' };
      const persona2 = { ...testPersona, name: 'persona-two' };

      await fs.promises.writeFile(path.join(testDir, 'one.json'), JSON.stringify(persona1));
      await fs.promises.writeFile(path.join(testDir, 'two.json'), JSON.stringify(persona2));

      await manager.loadPersonas();
      expect(manager.listPersonas()).toHaveLength(2);
      expect(manager.hasPersona('persona-one')).toBe(true);
      expect(manager.hasPersona('persona-two')).toBe(true);
    });
  });

  // =========================================================================
  // Get Persona Tests
  // =========================================================================

  describe('getPersona', () => {
    beforeEach(async () => {
      await fs.promises.writeFile(
        path.join(testDir, 'test.json'),
        JSON.stringify(testPersona, null, 2)
      );
      await manager.loadPersonas();
    });

    it('should return persona by name', () => {
      const persona = manager.getPersona('test-persona');
      expect(persona).toBeDefined();
      expect(persona!.getName()).toBe('test-persona');
    });

    it('should return undefined for non-existent persona', () => {
      const persona = manager.getPersona('non-existent');
      expect(persona).toBeUndefined();
    });
  });

  // =========================================================================
  // Has Persona Tests
  // =========================================================================

  describe('hasPersona', () => {
    beforeEach(async () => {
      await fs.promises.writeFile(
        path.join(testDir, 'test.json'),
        JSON.stringify(testPersona, null, 2)
      );
      await manager.loadPersonas();
    });

    it('should return true for existing persona', () => {
      expect(manager.hasPersona('test-persona')).toBe(true);
    });

    it('should return false for non-existent persona', () => {
      expect(manager.hasPersona('non-existent')).toBe(false);
    });
  });

  // =========================================================================
  // Switch Persona Tests
  // =========================================================================

  describe('switchPersona', () => {
    beforeEach(async () => {
      await fs.promises.writeFile(
        path.join(testDir, 'test.json'),
        JSON.stringify(testPersona, null, 2)
      );
      await manager.loadPersonas();
    });

    it('should switch to existing persona', async () => {
      await manager.switchPersona('test-persona');
      expect(manager.getCurrentPersona()).toBeDefined();
      expect(manager.getCurrentPersona()!.getName()).toBe('test-persona');
    });

    it('should throw error for non-existent persona', async () => {
      await expect(manager.switchPersona('non-existent')).rejects.toThrow(
        'Persona not found: non-existent'
      );
    });
  });

  // =========================================================================
  // Current Persona Tests
  // =========================================================================

  describe('getCurrentPersona', () => {
    it('should return undefined when no persona selected', () => {
      expect(manager.getCurrentPersona()).toBeUndefined();
    });

    it('should return current persona after switch', async () => {
      await fs.promises.writeFile(
        path.join(testDir, 'test.json'),
        JSON.stringify(testPersona, null, 2)
      );
      await manager.loadPersonas();
      await manager.switchPersona('test-persona');

      const current = manager.getCurrentPersona();
      expect(current).toBeDefined();
      expect(current!.getName()).toBe('test-persona');
    });
  });

  // =========================================================================
  // Clear Current Persona Tests
  // =========================================================================

  describe('clearCurrentPersona', () => {
    it('should clear the current persona', async () => {
      await fs.promises.writeFile(
        path.join(testDir, 'test.json'),
        JSON.stringify(testPersona, null, 2)
      );
      await manager.loadPersonas();
      await manager.switchPersona('test-persona');

      expect(manager.getCurrentPersona()).toBeDefined();

      manager.clearCurrentPersona();
      expect(manager.getCurrentPersona()).toBeUndefined();
    });
  });

  // =========================================================================
  // Create Default Personas Tests
  // =========================================================================

  describe('createDefaultPersonas', () => {
    it('should create default persona files', async () => {
      await manager.createDefaultPersonas();

      const defaultExists = await fs.promises
        .stat(path.join(testDir, 'default.json'))
        .then(() => true)
        .catch(() => false);
      const researcherExists = await fs.promises
        .stat(path.join(testDir, 'researcher.json'))
        .then(() => true)
        .catch(() => false);
      const coderExists = await fs.promises
        .stat(path.join(testDir, 'coder.json'))
        .then(() => true)
        .catch(() => false);

      expect(defaultExists).toBe(true);
      expect(researcherExists).toBe(true);
      expect(coderExists).toBe(true);
    });

    it('should create valid persona definitions', async () => {
      await manager.createDefaultPersonas();

      const defaultContent = await fs.promises.readFile(
        path.join(testDir, 'default.json'),
        'utf-8'
      );
      const defaultDef = JSON.parse(defaultContent);

      expect(defaultDef.name).toBe('default');
      expect(defaultDef.description).toBeDefined();
      expect(defaultDef.personality).toBeDefined();
      expect(defaultDef.personality.length).toBeGreaterThan(0);
    });

    it('should be loadable after creation', async () => {
      await manager.createDefaultPersonas();
      await manager.loadPersonas();

      expect(manager.hasPersona('default')).toBe(true);
      expect(manager.hasPersona('researcher')).toBe(true);
      expect(manager.hasPersona('coder')).toBe(true);
      expect(manager.getPersonaCount()).toBe(3);
    });

    it('should create researcher with correct expertise', async () => {
      await manager.createDefaultPersonas();

      const researcherContent = await fs.promises.readFile(
        path.join(testDir, 'researcher.json'),
        'utf-8'
      );
      const researcherDef = JSON.parse(researcherContent);

      expect(researcherDef.expertise).toContain('Research methodology');
      expect(researcherDef.expertise).toContain('Data analysis');
    });

    it('should create coder with correct expertise', async () => {
      await manager.createDefaultPersonas();

      const coderContent = await fs.promises.readFile(path.join(testDir, 'coder.json'), 'utf-8');
      const coderDef = JSON.parse(coderContent);

      expect(coderDef.expertise).toContain('Software development');
      expect(coderDef.expertise).toContain('Testing');
    });
  });

  // =========================================================================
  // Utility Tests
  // =========================================================================

  describe('utility methods', () => {
    it('should return correct personas directory', () => {
      expect(manager.getPersonasDir()).toBe(testDir);
    });

    it('should return correct persona count', async () => {
      const persona1 = { ...testPersona, name: 'one' };
      const persona2 = { ...testPersona, name: 'two' };

      await fs.promises.writeFile(path.join(testDir, 'one.json'), JSON.stringify(persona1));
      await fs.promises.writeFile(path.join(testDir, 'two.json'), JSON.stringify(persona2));

      await manager.loadPersonas();
      expect(manager.getPersonaCount()).toBe(2);
    });

    it('should list all persona names', async () => {
      const persona1 = { ...testPersona, name: 'alpha' };
      const persona2 = { ...testPersona, name: 'beta' };

      await fs.promises.writeFile(path.join(testDir, 'alpha.json'), JSON.stringify(persona1));
      await fs.promises.writeFile(path.join(testDir, 'beta.json'), JSON.stringify(persona2));

      await manager.loadPersonas();
      const names = manager.listPersonas();

      expect(names).toContain('alpha');
      expect(names).toContain('beta');
    });
  });
});
