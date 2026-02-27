import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  TraitDefinition,
  TraitsData,
  TraitCategory,
  ComposedTraits,
  TraitMatch,
  loadTraits,
} from '../../../src/agents/traits';

const TRAITS_YAML_PATH = path.join(__dirname, '../../../src/agents/traits/Traits.yaml');

describe('Traits System Foundation', () => {
  let traitsData: TraitsData;

  beforeAll(() => {
    const yamlContent = fs.readFileSync(TRAITS_YAML_PATH, 'utf-8');
    traitsData = yaml.parse(yamlContent) as TraitsData;
  });

  describe('YAML file validation', () => {
    it('should have Traits.yaml file exist', () => {
      expect(fs.existsSync(TRAITS_YAML_PATH)).toBe(true);
    });

    it('should parse as valid YAML', () => {
      const yamlContent = fs.readFileSync(TRAITS_YAML_PATH, 'utf-8');
      expect(() => yaml.parse(yamlContent)).not.toThrow();
    });

    it('should have all required top-level sections', () => {
      expect(traitsData).toHaveProperty('expertise');
      expect(traitsData).toHaveProperty('personality');
      expect(traitsData).toHaveProperty('approach');
      expect(traitsData).toHaveProperty('examples');
    });
  });

  describe('Expertise areas', () => {
    it('should have at least 12 expertise areas', () => {
      const expertiseCount = Object.keys(traitsData.expertise).length;
      expect(expertiseCount).toBeGreaterThanOrEqual(12);
    });

    it('should include all required expertise areas', () => {
      const requiredExpertise = [
        'security', 'legal', 'finance', 'technical', 'research',
        'creative', 'business', 'data', 'medical', 'communications',
        'devops', 'ux'
      ];
      requiredExpertise.forEach(exp => {
        expect(traitsData.expertise).toHaveProperty(exp);
      });
    });

    it('should have name and description for each expertise', () => {
      Object.entries(traitsData.expertise).forEach(([_key, trait]) => {
        expect(trait).toHaveProperty('name');
        expect(trait).toHaveProperty('description');
        expect(typeof trait.name).toBe('string');
        expect(typeof trait.description).toBe('string');
      });
    });

    it('should have keywords as arrays for each expertise', () => {
      Object.entries(traitsData.expertise).forEach(([_key, trait]) => {
        expect(trait).toHaveProperty('keywords');
        expect(Array.isArray(trait.keywords)).toBe(true);
        expect(trait.keywords!.length).toBeGreaterThan(0);
      });
    });

    it('should have prompt_fragment for each expertise', () => {
      Object.entries(traitsData.expertise).forEach(([_key, trait]) => {
        expect(trait).toHaveProperty('prompt_fragment');
        expect(typeof trait.prompt_fragment).toBe('string');
        expect(trait.prompt_fragment!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Personality dimensions', () => {
    it('should have at least 10 personality dimensions', () => {
      const personalityCount = Object.keys(traitsData.personality).length;
      expect(personalityCount).toBeGreaterThanOrEqual(10);
    });

    it('should include all required personality dimensions', () => {
      const requiredPersonality = [
        'skeptical', 'enthusiastic', 'cautious', 'bold', 'analytical',
        'creative', 'empathetic', 'contrarian', 'pragmatic', 'meticulous'
      ];
      requiredPersonality.forEach(pers => {
        expect(traitsData.personality).toHaveProperty(pers);
      });
    });

    it('should have name and description for each personality', () => {
      Object.entries(traitsData.personality).forEach(([_key, trait]) => {
        expect(trait).toHaveProperty('name');
        expect(trait).toHaveProperty('description');
        expect(typeof trait.name).toBe('string');
        expect(typeof trait.description).toBe('string');
      });
    });

    it('should have prompt_fragment for each personality', () => {
      Object.entries(traitsData.personality).forEach(([_key, trait]) => {
        expect(trait).toHaveProperty('prompt_fragment');
        expect(typeof trait.prompt_fragment).toBe('string');
        expect(trait.prompt_fragment!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Approach styles', () => {
    it('should have at least 8 approach styles', () => {
      const approachCount = Object.keys(traitsData.approach).length;
      expect(approachCount).toBeGreaterThanOrEqual(8);
    });

    it('should include all required approach styles', () => {
      const requiredApproach = [
        'thorough', 'rapid', 'systematic', 'exploratory',
        'comparative', 'synthesizing', 'adversarial', 'consultative'
      ];
      requiredApproach.forEach(app => {
        expect(traitsData.approach).toHaveProperty(app);
      });
    });

    it('should have name and description for each approach', () => {
      Object.entries(traitsData.approach).forEach(([_key, trait]) => {
        expect(trait).toHaveProperty('name');
        expect(trait).toHaveProperty('description');
        expect(typeof trait.name).toBe('string');
        expect(typeof trait.description).toBe('string');
      });
    });

    it('should have prompt_fragment for each approach', () => {
      Object.entries(traitsData.approach).forEach(([_key, trait]) => {
        expect(trait).toHaveProperty('prompt_fragment');
        expect(typeof trait.prompt_fragment).toBe('string');
        expect(trait.prompt_fragment!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Example compositions', () => {
    it('should have at least 8 example compositions', () => {
      const exampleCount = Object.keys(traitsData.examples).length;
      expect(exampleCount).toBeGreaterThanOrEqual(8);
    });

    it('should include all required example compositions', () => {
      const requiredExamples = [
        'security_audit', 'contract_review', 'market_analysis', 'code_review',
        'creative_brief', 'red_team', 'ux_research', 'devops_audit'
      ];
      requiredExamples.forEach(ex => {
        expect(traitsData.examples).toHaveProperty(ex);
      });
    });

    it('should have description and traits array for each example', () => {
      Object.entries(traitsData.examples).forEach(([_key, example]) => {
        expect(example).toHaveProperty('description');
        expect(example).toHaveProperty('traits');
        expect(typeof example.description).toBe('string');
        expect(Array.isArray(example.traits)).toBe(true);
        expect(example.traits.length).toBeGreaterThan(0);
      });
    });

    it('should reference only valid trait names in examples', () => {
      const allTraitNames = new Set([
        ...Object.keys(traitsData.expertise),
        ...Object.keys(traitsData.personality),
        ...Object.keys(traitsData.approach),
      ]);

      Object.entries(traitsData.examples).forEach(([_key, example]) => {
        example.traits.forEach(traitName => {
          expect(allTraitNames.has(traitName)).toBe(true);
        });
      });
    });
  });

  describe('TypeScript types', () => {
    it('should export TraitDefinition interface', () => {
      const trait: TraitDefinition = {
        name: 'Test',
        description: 'Test description',
        keywords: ['test'],
        prompt_fragment: 'Test fragment',
      };
      expect(trait.name).toBe('Test');
    });

    it('should export TraitsData interface', () => {
      const data: TraitsData = {
        expertise: {},
        personality: {},
        approach: {},
        examples: {},
      };
      expect(data).toHaveProperty('expertise');
    });

    it('should export TraitCategory type', () => {
      const category: TraitCategory = 'expertise';
      expect(['expertise', 'personality', 'approach']).toContain(category);
    });

    it('should export ComposedTraits interface', () => {
      const composed: ComposedTraits = {
        expertise: [],
        personality: [],
        approach: [],
      };
      expect(composed).toHaveProperty('expertise');
    });

    it('should export TraitMatch interface', () => {
      const match: TraitMatch = {
        trait: 'security',
        category: 'expertise',
        confidence: 0.9,
        matchedKeywords: ['vulnerability'],
      };
      expect(match.confidence).toBe(0.9);
    });
  });

  describe('loadTraits stub', () => {
    it('should throw error indicating not yet implemented', async () => {
      await expect(loadTraits()).rejects.toThrow('TraitLoader not yet implemented - see Prompt 22');
    });
  });
});
