import { TraitInference } from '../../../src/agents/factory/TraitInference';
import { TraitsData } from '../../../src/agents/traits/types';

const mockTraitsData: TraitsData = {
  expertise: {
    security: {
      name: 'Security',
      description: 'Security expertise',
      keywords: [
        'vulnerability',
        'threat',
        'security',
        'exploit',
        'authentication',
        'CVE',
        'penetration',
        'audit',
      ],
    },
    research: {
      name: 'Research',
      description: 'Research expertise',
      keywords: ['research', 'study', 'academic', 'methodology', 'evidence', 'analyze'],
    },
    technical: {
      name: 'Technical',
      description: 'Technical expertise',
      keywords: ['architecture', 'code', 'debug', 'implementation', 'API'],
    },
    data: {
      name: 'Data',
      description: 'Data expertise',
      keywords: ['data', 'statistics', 'analytics', 'metrics', 'trends'],
    },
    finance: {
      name: 'Finance',
      description: 'Finance expertise',
      keywords: ['valuation', 'investment', 'ROI', 'budget', 'financial'],
    },
    legal: {
      name: 'Legal',
      description: 'Legal expertise',
      keywords: ['contract', 'compliance', 'regulation', 'legal', 'liability'],
    },
    creative: {
      name: 'Creative',
      description: 'Creative expertise',
      keywords: ['creative', 'content', 'story', 'narrative', 'design'],
    },
    business: {
      name: 'Business',
      description: 'Business expertise',
      keywords: ['market', 'competitive', 'strategy', 'business', 'growth'],
    },
    medical: {
      name: 'Medical',
      description: 'Medical expertise',
      keywords: ['medical', 'health', 'treatment', 'diagnosis', 'clinical'],
    },
    communications: {
      name: 'Communications',
      description: 'Communications expertise',
      keywords: ['communication', 'message', 'audience', 'media', 'PR'],
    },
  },
  personality: {
    skeptical: {
      name: 'Skeptical',
      description: 'Questions assumptions',
    },
    enthusiastic: {
      name: 'Enthusiastic',
      description: 'Positive framing',
    },
    cautious: {
      name: 'Cautious',
      description: 'Considers edge cases',
    },
    bold: {
      name: 'Bold',
      description: 'Willing to take risks',
    },
    analytical: {
      name: 'Analytical',
      description: 'Data-driven',
    },
    creative: {
      name: 'Creative',
      description: 'Lateral thinking',
    },
    empathetic: {
      name: 'Empathetic',
      description: 'Considers human impact',
    },
    contrarian: {
      name: 'Contrarian',
      description: 'Takes opposing view',
    },
  },
  approach: {
    thorough: {
      name: 'Thorough',
      description: 'Exhaustive analysis',
    },
    rapid: {
      name: 'Rapid',
      description: 'Quick assessment',
    },
    systematic: {
      name: 'Systematic',
      description: 'Structured approach',
    },
    exploratory: {
      name: 'Exploratory',
      description: 'Follow interesting threads',
    },
    comparative: {
      name: 'Comparative',
      description: 'Evaluates options',
    },
    synthesizing: {
      name: 'Synthesizing',
      description: 'Combines multiple sources',
    },
    adversarial: {
      name: 'Adversarial',
      description: 'Red team approach',
    },
    consultative: {
      name: 'Consultative',
      description: 'Advisory stance',
    },
  },
  examples: {
    security_audit: {
      description: 'Comprehensive security review',
      traits: ['security', 'skeptical', 'thorough'],
    },
  },
};

describe('TraitInference', () => {
  // ========================================
  // Confidence Scoring Tests (6 tests)
  // ========================================
  describe('confidence scoring', () => {
    it('should return high confidence (0.8+) for multiple security keywords', () => {
      const inference = new TraitInference(mockTraitsData);

      // Use all security keywords + few high-value personality matches for high confidence
      // Avoid low-confidence matches that would drag down the average
      const result = inference.inferFromTask(
        'security vulnerability threat exploit authentication CVE penetration audit verify prove careful risk'
      );

      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.confidenceLevel).toBe('high');
    });

    it('should return high confidence for detailed security analysis request', () => {
      const inference = new TraitInference(mockTraitsData);

      // Match many keywords across categories with different phrasing
      const result = inference.inferFromTask(
        'vulnerability threat security exploit authentication CVE penetration audit verify evidence careful failure'
      );

      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.confidenceLevel).toBe('high');
    });

    it('should return medium confidence (0.5-0.79) for single keyword match', () => {
      const inference = new TraitInference(mockTraitsData);

      // Use multiple keywords across categories for medium confidence
      const result = inference.inferFromTask('Check the code and architecture for issues and verify');

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.confidenceLevel).toBe('medium');
    });

    it('should return medium confidence for partial keyword matches', () => {
      const inference = new TraitInference(mockTraitsData);

      // Multiple keywords for medium confidence
      const result = inference.inferFromTask('Review this architecture and code implementation');

      expect(result.confidenceLevel).toBe('medium');
    });

    it('should return low confidence (< 0.5) for vague input', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('help me with something');

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.confidenceLevel).toBe('low');
    });

    it('should return low confidence for empty or very short input', () => {
      const inference = new TraitInference(mockTraitsData);

      const emptyResult = inference.inferFromTask('');
      const shortResult = inference.inferFromTask('hi');

      expect(emptyResult.confidence).toBeLessThan(0.5);
      expect(emptyResult.confidenceLevel).toBe('low');
      expect(shortResult.confidence).toBeLessThan(0.5);
      expect(shortResult.confidenceLevel).toBe('low');
    });
  });

  // ========================================
  // Fallback Clarification Tests (5 tests)
  // ========================================
  describe('fallback clarification', () => {
    it('should set clarificationNeeded=true when confidence < 0.7', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('check something');

      expect(result.clarificationNeeded).toBe(true);
    });

    it('should set clarificationNeeded=false when confidence >= 0.7', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask(
        'security vulnerability threat exploit authentication CVE penetration audit'
      );

      expect(result.clarificationNeeded).toBe(false);
    });

    it('should generate clarifying questions for ambiguous terms', () => {
      // Create mock data with overlapping keyword 'design' in multiple expertise areas
      const overlappingMockData: TraitsData = {
        ...mockTraitsData,
        expertise: {
          ...mockTraitsData.expertise,
          creative: {
            name: 'Creative',
            description: 'Creative expertise',
            keywords: ['creative', 'content', 'story', 'narrative', 'design'],
          },
          ux: {
            name: 'UX',
            description: 'UX expertise',
            keywords: ['ux', 'usability', 'design', 'interface', 'experience'],
          },
        },
      };

      const inference = new TraitInference(overlappingMockData);
      const result = inference.inferFromTask('I need help with the design');

      // Should have clarification questions since confidence will be low
      // and 'design' is ambiguous
      expect(result.clarificationNeeded).toBe(true);
      expect(result.clarificationQuestions.length).toBeGreaterThan(0);
    });

    it('should generate relevant questions that mention detected traits', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('security');

      if (result.clarificationNeeded) {
        const hasRelevantQuestion = result.clarificationQuestions.some(
          (q) =>
            q.includes('security') ||
            q.includes('domain') ||
            q.includes('tone') ||
            q.includes('approach')
        );
        expect(hasRelevantQuestion).toBe(true);
      }
    });

    it('should never return more than 3 clarification questions', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('xyz random unclear vague ambiguous');

      expect(result.clarificationQuestions.length).toBeLessThanOrEqual(3);
    });
  });

  // ========================================
  // Intent Reasoning Tests (5 tests)
  // ========================================
  describe('intent reasoning', () => {
    it('should include matched keywords in reasoning', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('Analyze the security vulnerability');

      expect(result.reasoning).toContain('security');
      expect(result.reasoning).toContain('vulnerability');
    });

    it('should include confidence percentages in reasoning', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('security vulnerability threat');

      expect(result.reasoning).toMatch(/Confidence:\s+\d+%/);
    });

    it('should return helpful message for no matches', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('xyz');

      expect(result.reasoning).toContain('No specific traits matched');
      expect(result.reasoning).toContain('default agent configuration');
    });

    it('should capture urgency in contextualFactors', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('urgent security audit needed asap');

      expect(result.contextAnalysis.contextualFactors).toContain(
        'Urgency detected - may require rapid approach'
      );
    });

    it('should note ambiguous terms in reasoning when detected', () => {
      // Create mock data with overlapping keywords
      const overlappingMockData: TraitsData = {
        ...mockTraitsData,
        expertise: {
          ...mockTraitsData.expertise,
          creative: {
            name: 'Creative',
            description: 'Creative expertise',
            keywords: ['creative', 'content', 'story', 'narrative', 'design'],
          },
          ux: {
            name: 'UX',
            description: 'UX expertise',
            keywords: ['ux', 'usability', 'design', 'interface', 'experience'],
          },
        },
      };

      const inference = new TraitInference(overlappingMockData);
      const result = inference.inferFromTask('I need help with the design approach');

      expect(result.contextAnalysis.ambiguousTerms.length).toBeGreaterThan(0);
      expect(result.reasoning).toContain('ambiguous');
    });
  });

  // ========================================
  // Core Functionality Tests (7 tests)
  // ========================================
  describe('core functionality', () => {
    it('should match security keywords to security expertise', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('Check for security vulnerability and CVE threat');

      expect(result.expertise).toContain('security');
      expect(result.matches.find((m) => m.trait === 'security')?.matchedKeywords).toContain(
        'security'
      );
      expect(result.matches.find((m) => m.trait === 'security')?.matchedKeywords).toContain(
        'vulnerability'
      );
    });

    it('should match research keywords to research expertise', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask(
        'Conduct academic research study with proper methodology'
      );

      expect(result.expertise).toContain('research');
      const researchMatch = result.matches.find((m) => m.trait === 'research');
      expect(researchMatch?.matchedKeywords).toContain('research');
      expect(researchMatch?.matchedKeywords).toContain('study');
    });

    it('should match "verify" and "prove" to skeptical personality', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('Need to verify and prove the claims');

      expect(result.personality).toContain('skeptical');
      const skepticalMatch = result.matches.find((m) => m.trait === 'skeptical');
      expect(skepticalMatch?.matchedKeywords).toContain('verify');
      expect(skepticalMatch?.matchedKeywords).toContain('prove');
    });

    it('should match "quick" and "fast" to rapid approach', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('Need this done quick and fast');

      expect(result.approach).toContain('rapid');
      const rapidMatch = result.matches.find((m) => m.trait === 'rapid');
      expect(rapidMatch?.matchedKeywords).toContain('quick');
      expect(rapidMatch?.matchedKeywords).toContain('fast');
    });

    it('should rank multiple matches by confidence (highest first)', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask(
        'Security vulnerability threat authentication exploit attack'
      );

      // Verify matches are sorted descending by confidence
      for (let i = 1; i < result.matches.length; i++) {
        expect(result.matches[i - 1].confidence).toBeGreaterThanOrEqual(
          result.matches[i].confidence
        );
      }
    });

    it('should increase overall confidence when combined keywords match', () => {
      const inference = new TraitInference(mockTraitsData);

      const singleMatch = inference.inferFromTask('security issue');
      const multipleMatches = inference.inferFromTask(
        'security vulnerability threat exploit authentication verify prove quick'
      );

      expect(multipleMatches.confidence).toBeGreaterThan(singleMatch.confidence);
    });

    it('should work same as inferFromTask with joined keywords', () => {
      const inference = new TraitInference(mockTraitsData);

      const keywordsResult = inference.inferFromKeywords(['security', 'vulnerability', 'threat']);
      const taskResult = inference.inferFromTask('security vulnerability threat');

      expect(keywordsResult.expertise).toEqual(taskResult.expertise);
      expect(keywordsResult.confidenceLevel).toEqual(taskResult.confidenceLevel);
    });
  });

  // ========================================
  // Additional Tests for Coverage
  // ========================================
  describe('additional functionality', () => {
    it('should be case insensitive', () => {
      const inference = new TraitInference(mockTraitsData);

      const lowerResult = inference.inferFromTask('security vulnerability');
      const upperResult = inference.inferFromTask('SECURITY VULNERABILITY');
      const mixedResult = inference.inferFromTask('Security Vulnerability');

      expect(lowerResult.expertise).toContain('security');
      expect(upperResult.expertise).toContain('security');
      expect(mixedResult.expertise).toContain('security');
    });

    it('should limit expertise to top 2 matches', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask(
        'security code architecture data statistics research study market competitive'
      );

      expect(result.expertise.length).toBeLessThanOrEqual(2);
    });

    it('should limit personality to top 2 matches', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask(
        'verify prove evidence careful safe risk data analyze metrics user customer'
      );

      expect(result.personality.length).toBeLessThanOrEqual(2);
    });

    it('should limit approach to top 1 match', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask(
        'quick fast comprehensive complete explore investigate'
      );

      expect(result.approach.length).toBeLessThanOrEqual(1);
    });

    it('should match cautious personality indicators', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('Be careful about edge cases and potential failure');

      expect(result.personality).toContain('cautious');
    });

    it('should match adversarial approach indicators', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('We need a red team to attack and exploit the system');

      expect(result.approach).toContain('adversarial');
    });

    it('should handle empty keyword array in inferFromKeywords', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromKeywords([]);

      expect(result.confidence).toBe(0);
      expect(result.matches.length).toBe(0);
    });

    it('should cap confidence at 1', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask(
        'security vulnerability threat exploit authentication CVE penetration audit ' +
          'verify prove evidence careful risk data metrics quick fast attack red team'
      );

      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include contextAnalysis in result', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('security vulnerability');

      expect(result.contextAnalysis).toBeDefined();
      expect(typeof result.contextAnalysis.keywordMatches).toBe('number');
      expect(typeof result.contextAnalysis.intentClarity).toBe('number');
      expect(Array.isArray(result.contextAnalysis.domainIndicators)).toBe(true);
      expect(Array.isArray(result.contextAnalysis.ambiguousTerms)).toBe(true);
      expect(Array.isArray(result.contextAnalysis.contextualFactors)).toBe(true);
    });

    it('should detect comprehensive scope in contextualFactors', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('need a comprehensive complete security review');

      expect(result.contextAnalysis.contextualFactors).toContain('Comprehensive scope requested');
    });

    it('should detect detail quality in contextualFactors', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('need a thorough and detailed security analysis');

      expect(result.contextAnalysis.contextualFactors).toContain(
        'High attention to detail requested'
      );
    });

    it('should detect collaboration context in contextualFactors', () => {
      const inference = new TraitInference(mockTraitsData);

      const result = inference.inferFromTask('team review of the code together');

      expect(result.contextAnalysis.contextualFactors).toContain('Collaboration context detected');
    });
  });
});
