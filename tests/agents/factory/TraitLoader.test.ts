import * as fs from 'fs/promises';
import { TraitLoader } from '../../../src/agents/factory/TraitLoader';

jest.mock('fs/promises');

const mockTraitsYaml = `
expertise:
  security:
    name: Security
    description: Security expertise
    keywords: [vulnerability, threat, security]
  legal:
    name: Legal
    description: Legal expertise
    keywords: [contract, compliance]
  finance:
    name: Finance
    description: Finance expertise
    keywords: [valuation, investment]
  technical:
    name: Technical
    description: Technical expertise
    keywords: [architecture, code]
  research:
    name: Research
    description: Research expertise
    keywords: [research, study]
  creative:
    name: Creative
    description: Creative expertise
    keywords: [creative, content]
  business:
    name: Business
    description: Business expertise
    keywords: [market, strategy]
  data:
    name: Data
    description: Data expertise
    keywords: [data, statistics]
  medical:
    name: Medical
    description: Medical expertise
    keywords: [medical, health]
  communications:
    name: Communications
    description: Communications expertise
    keywords: [communication, message]
personality:
  skeptical:
    name: Skeptical
    description: Questions assumptions
  enthusiastic:
    name: Enthusiastic
    description: Positive framing
  cautious:
    name: Cautious
    description: Considers edge cases
  bold:
    name: Bold
    description: Willing to take risks
  analytical:
    name: Analytical
    description: Data-driven
  creative:
    name: Creative
    description: Lateral thinking
  empathetic:
    name: Empathetic
    description: Considers human impact
  contrarian:
    name: Contrarian
    description: Takes opposing view
approach:
  thorough:
    name: Thorough
    description: Exhaustive analysis
  rapid:
    name: Rapid
    description: Quick assessment
  systematic:
    name: Systematic
    description: Structured approach
  exploratory:
    name: Exploratory
    description: Follow interesting threads
  comparative:
    name: Comparative
    description: Evaluates options
  synthesizing:
    name: Synthesizing
    description: Combines multiple sources
examples:
  security_audit:
    description: Comprehensive security review
    traits: [security, skeptical, thorough]
  code_review:
    description: Technical code quality assessment
    traits: [technical, meticulous, systematic]
`;

describe('TraitLoader', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (fs.readFile as jest.Mock).mockResolvedValue(mockTraitsYaml);
  });

  describe('load()', () => {
    it('should load and return valid TraitsData', async () => {
      const loader = new TraitLoader();
      const data = await loader.load();

      expect(data).toBeDefined();
      expect(data.expertise).toBeDefined();
      expect(data.personality).toBeDefined();
      expect(data.approach).toBeDefined();
    });

    it('should cache loaded data on subsequent calls', async () => {
      const loader = new TraitLoader();

      await loader.load();
      await loader.load();
      await loader.load();

      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent load calls', async () => {
      const loader = new TraitLoader();

      const [result1, result2, result3] = await Promise.all([
        loader.load(),
        loader.load(),
        loader.load(),
      ]);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should use custom path when provided', async () => {
      const customPath = '/custom/path/Traits.yaml';
      const loader = new TraitLoader(customPath);

      await loader.load();

      expect(fs.readFile).toHaveBeenCalledWith(customPath, 'utf-8');
    });

    it('should throw error for invalid path', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file'));
      const loader = new TraitLoader('/nonexistent/path.yaml');

      await expect(loader.load()).rejects.toThrow('ENOENT');
    });

    it('should throw error if expertise has fewer than 10 areas', async () => {
      const invalidYaml = `
expertise:
  security:
    name: Security
    description: Security
personality:
  skeptical:
    name: Skeptical
    description: Skeptical
  enthusiastic:
    name: Enthusiastic
    description: Enthusiastic
  cautious:
    name: Cautious
    description: Cautious
  bold:
    name: Bold
    description: Bold
  analytical:
    name: Analytical
    description: Analytical
  creative:
    name: Creative
    description: Creative
  empathetic:
    name: Empathetic
    description: Empathetic
  contrarian:
    name: Contrarian
    description: Contrarian
approach:
  thorough:
    name: Thorough
    description: Thorough
  rapid:
    name: Rapid
    description: Rapid
  systematic:
    name: Systematic
    description: Systematic
  exploratory:
    name: Exploratory
    description: Exploratory
  comparative:
    name: Comparative
    description: Comparative
  synthesizing:
    name: Synthesizing
    description: Synthesizing
`;
      (fs.readFile as jest.Mock).mockResolvedValue(invalidYaml);
      const loader = new TraitLoader();

      await expect(loader.load()).rejects.toThrow('at least 10 expertise areas');
    });

    it('should throw error if expertise trait missing required fields', async () => {
      const invalidYaml = `
expertise:
  security: {}
  legal:
    name: Legal
    description: Legal
  finance:
    name: Finance
    description: Finance
  technical:
    name: Technical
    description: Technical
  research:
    name: Research
    description: Research
  creative:
    name: Creative
    description: Creative
  business:
    name: Business
    description: Business
  data:
    name: Data
    description: Data
  medical:
    name: Medical
    description: Medical
  communications:
    name: Communications
    description: Communications
personality:
  skeptical:
    name: Skeptical
    description: Skeptical
  enthusiastic:
    name: Enthusiastic
    description: Enthusiastic
  cautious:
    name: Cautious
    description: Cautious
  bold:
    name: Bold
    description: Bold
  analytical:
    name: Analytical
    description: Analytical
  creative:
    name: Creative
    description: Creative
  empathetic:
    name: Empathetic
    description: Empathetic
  contrarian:
    name: Contrarian
    description: Contrarian
approach:
  thorough:
    name: Thorough
    description: Thorough
  rapid:
    name: Rapid
    description: Rapid
  systematic:
    name: Systematic
    description: Systematic
  exploratory:
    name: Exploratory
    description: Exploratory
  comparative:
    name: Comparative
    description: Comparative
  synthesizing:
    name: Synthesizing
    description: Synthesizing
`;
      (fs.readFile as jest.Mock).mockResolvedValue(invalidYaml);
      const loader = new TraitLoader();

      await expect(loader.load()).rejects.toThrow('missing required fields');
    });
  });

  describe('getTrait()', () => {
    it('should return correct trait by category and name', async () => {
      const loader = new TraitLoader();
      await loader.load();

      const trait = loader.getTrait('expertise', 'security');

      expect(trait).toBeDefined();
      expect(trait?.name).toBe('Security');
      expect(trait?.description).toBe('Security expertise');
    });

    it('should return undefined for non-existent trait', async () => {
      const loader = new TraitLoader();
      await loader.load();

      const trait = loader.getTrait('expertise', 'nonexistent');

      expect(trait).toBeUndefined();
    });

    it('should throw error if called before load()', () => {
      const loader = new TraitLoader();

      expect(() => loader.getTrait('expertise', 'security')).toThrow('Traits not loaded');
    });
  });

  describe('getAllTraits()', () => {
    it('should return all traits in a category', async () => {
      const loader = new TraitLoader();
      await loader.load();

      const expertise = loader.getAllTraits('expertise');

      expect(Object.keys(expertise).length).toBeGreaterThanOrEqual(10);
      expect(expertise.security).toBeDefined();
    });

    it('should return empty object for non-existent category', async () => {
      const loader = new TraitLoader();
      await loader.load();

      const traits = loader.getAllTraits('nonexistent' as any);

      expect(traits).toEqual({});
    });
  });

  describe('getTraitNames()', () => {
    it('should return all trait names in a category', async () => {
      const loader = new TraitLoader();
      await loader.load();

      const names = loader.getTraitNames('personality');

      expect(names).toContain('skeptical');
      expect(names).toContain('enthusiastic');
      expect(names.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('getExample()', () => {
    it('should return example composition', async () => {
      const loader = new TraitLoader();
      await loader.load();

      const example = loader.getExample('security_audit');

      expect(example).toBeDefined();
      expect(example?.description).toBe('Comprehensive security review');
      expect(example?.traits).toContain('security');
    });

    it('should return undefined for non-existent example', async () => {
      const loader = new TraitLoader();
      await loader.load();

      const example = loader.getExample('nonexistent');

      expect(example).toBeUndefined();
    });
  });

  describe('getExampleNames()', () => {
    it('should return all example names', async () => {
      const loader = new TraitLoader();
      await loader.load();

      const names = loader.getExampleNames();

      expect(names).toContain('security_audit');
      expect(names).toContain('code_review');
    });
  });

  describe('hasTrait()', () => {
    it('should return true for existing trait', async () => {
      const loader = new TraitLoader();
      await loader.load();

      expect(loader.hasTrait('expertise', 'security')).toBe(true);
    });

    it('should return false for non-existent trait', async () => {
      const loader = new TraitLoader();
      await loader.load();

      expect(loader.hasTrait('expertise', 'nonexistent')).toBe(false);
    });

    it('should return false if not loaded', () => {
      const loader = new TraitLoader();

      expect(loader.hasTrait('expertise', 'security')).toBe(false);
    });
  });

  describe('reload()', () => {
    it('should clear cache and reload from file', async () => {
      const loader = new TraitLoader();

      await loader.load();
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      await loader.reload();
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should return fresh data after reload', async () => {
      const loader = new TraitLoader();

      const data1 = await loader.load();

      // Modify the mock to return different data
      const modifiedYaml = mockTraitsYaml.replace('Security expertise', 'Modified Security');
      (fs.readFile as jest.Mock).mockResolvedValue(modifiedYaml);

      const data2 = await loader.reload();

      expect(data2.expertise.security.description).toBe('Modified Security');
    });
  });
});
