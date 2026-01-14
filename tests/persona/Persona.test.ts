import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Persona, PersonaDefinition } from '../../src/persona/Persona';

describe('Persona', () => {
  const testDir = path.join(os.tmpdir(), 'infinite-aura-test-persona');

  const validDefinition: PersonaDefinition = {
    name: 'test-persona',
    description: 'A test persona for unit testing',
    personality: ['Helpful', 'Precise', 'Thorough'],
    communicationStyle: 'Direct and technical',
    expertise: ['Testing', 'Development'],
    approach: 'Methodical and systematic',
  };

  beforeAll(async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  // =========================================================================
  // Constructor and Validation Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create a valid persona', () => {
      const persona = new Persona(validDefinition);
      expect(persona.getName()).toBe('test-persona');
    });

    it('should throw error for missing name', () => {
      const invalid = { ...validDefinition } as PersonaDefinition;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (invalid as any).name;
      expect(() => new Persona(invalid)).toThrow('Persona definition missing required field: name');
    });

    it('should throw error for missing description', () => {
      const invalid = { ...validDefinition } as PersonaDefinition;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (invalid as any).description;
      expect(() => new Persona(invalid)).toThrow(
        'Persona definition missing required field: description'
      );
    });

    it('should throw error for missing personality', () => {
      const invalid = { ...validDefinition } as PersonaDefinition;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (invalid as any).personality;
      expect(() => new Persona(invalid)).toThrow(
        'Persona definition missing required field: personality'
      );
    });

    it('should throw error for empty personality array', () => {
      const invalid = { ...validDefinition, personality: [] };
      expect(() => new Persona(invalid)).toThrow(
        'Persona must have at least one personality trait'
      );
    });

    it('should throw error for missing expertise', () => {
      const invalid = { ...validDefinition } as PersonaDefinition;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (invalid as any).expertise;
      expect(() => new Persona(invalid)).toThrow(
        'Persona definition missing required field: expertise'
      );
    });

    it('should throw error for empty expertise array', () => {
      const invalid = { ...validDefinition, expertise: [] };
      expect(() => new Persona(invalid)).toThrow(
        'Persona must have at least one area of expertise'
      );
    });

    it('should throw error for missing communicationStyle', () => {
      const invalid = { ...validDefinition } as PersonaDefinition;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (invalid as any).communicationStyle;
      expect(() => new Persona(invalid)).toThrow(
        'Persona definition missing required field: communicationStyle'
      );
    });

    it('should throw error for missing approach', () => {
      const invalid = { ...validDefinition } as PersonaDefinition;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (invalid as any).approach;
      expect(() => new Persona(invalid)).toThrow(
        'Persona definition missing required field: approach'
      );
    });
  });

  // =========================================================================
  // Getter Tests
  // =========================================================================

  describe('getters', () => {
    it('should return correct name', () => {
      const persona = new Persona(validDefinition);
      expect(persona.getName()).toBe('test-persona');
    });

    it('should return correct description', () => {
      const persona = new Persona(validDefinition);
      expect(persona.getDescription()).toBe('A test persona for unit testing');
    });

    it('should return a copy of the definition', () => {
      const persona = new Persona(validDefinition);
      const definition = persona.getDefinition();
      expect(definition).toEqual(validDefinition);
      expect(definition).not.toBe(validDefinition);
    });
  });

  // =========================================================================
  // Context Generation Tests
  // =========================================================================

  describe('getContext', () => {
    it('should generate context with persona header', () => {
      const persona = new Persona(validDefinition);
      const context = persona.getContext();
      expect(context).toContain('# PERSONA: test-persona');
    });

    it('should include description', () => {
      const persona = new Persona(validDefinition);
      const context = persona.getContext();
      expect(context).toContain('A test persona for unit testing');
    });

    it('should include personality traits', () => {
      const persona = new Persona(validDefinition);
      const context = persona.getContext();
      expect(context).toContain('## Personality Traits');
      expect(context).toContain('- Helpful');
      expect(context).toContain('- Precise');
      expect(context).toContain('- Thorough');
    });

    it('should include communication style', () => {
      const persona = new Persona(validDefinition);
      const context = persona.getContext();
      expect(context).toContain('## Communication Style');
      expect(context).toContain('Direct and technical');
    });

    it('should include expertise', () => {
      const persona = new Persona(validDefinition);
      const context = persona.getContext();
      expect(context).toContain('## Expertise');
      expect(context).toContain('- Testing');
      expect(context).toContain('- Development');
    });

    it('should include approach', () => {
      const persona = new Persona(validDefinition);
      const context = persona.getContext();
      expect(context).toContain('## Approach');
      expect(context).toContain('Methodical and systematic');
    });

    it('should include constraints when present', () => {
      const definitionWithConstraints: PersonaDefinition = {
        ...validDefinition,
        constraints: ['Never skip tests', 'Always document'],
      };
      const persona = new Persona(definitionWithConstraints);
      const context = persona.getContext();
      expect(context).toContain('## Constraints');
      expect(context).toContain('- Never skip tests');
      expect(context).toContain('- Always document');
    });

    it('should not include constraints section when empty', () => {
      const persona = new Persona(validDefinition);
      const context = persona.getContext();
      expect(context).not.toContain('## Constraints');
    });
  });

  // =========================================================================
  // Load from File Tests
  // =========================================================================

  describe('load', () => {
    it('should load persona from JSON file', async () => {
      const filePath = path.join(testDir, 'test-load.json');
      await fs.promises.writeFile(filePath, JSON.stringify(validDefinition, null, 2));

      const persona = await Persona.load(filePath);
      expect(persona.getName()).toBe('test-persona');
      expect(persona.getDescription()).toBe('A test persona for unit testing');
    });

    it('should throw error for non-existent file', async () => {
      const filePath = path.join(testDir, 'non-existent.json');
      await expect(Persona.load(filePath)).rejects.toThrow();
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      await fs.promises.writeFile(filePath, 'not valid json');
      await expect(Persona.load(filePath)).rejects.toThrow();
    });

    it('should throw error for invalid persona definition', async () => {
      const filePath = path.join(testDir, 'invalid-def.json');
      await fs.promises.writeFile(filePath, JSON.stringify({ name: 'incomplete' }));
      await expect(Persona.load(filePath)).rejects.toThrow();
    });
  });
});
