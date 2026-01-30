/**
 * Performance Benchmarks: Trait Inference Operations
 *
 * Benchmarks for trait inference, confidence calculation, and clarification generation.
 */

import { BenchmarkRunner } from '../../src/benchmarks/BenchmarkRunner';
import { TraitInference } from '../../src/agents/factory/TraitInference';
import { TraitsData } from '../../src/agents/traits/types';

describe('Performance: Trait Inference Benchmarks', () => {
  jest.setTimeout(60000);

  let runner: BenchmarkRunner;
  let inference: TraitInference;

  // Mock traits data for testing
  const mockTraitsData: TraitsData = {
    expertise: {
      security: {
        name: 'Security',
        description: 'Security analysis',
        keywords: ['vulnerability', 'threat', 'penetration', 'exploit', 'OWASP', 'security', 'authentication', 'authorization', 'encryption', 'CVE'],
        prompt_fragment: 'Focus on security',
      },
      technical: {
        name: 'Technical',
        description: 'Technical implementation',
        keywords: ['architecture', 'system', 'design', 'code', 'debug', 'technical', 'implementation', 'API', 'database', 'infrastructure'],
        prompt_fragment: 'Focus on technical details',
      },
      data: {
        name: 'Data',
        description: 'Data analysis',
        keywords: ['data', 'statistics', 'visualization', 'pattern', 'analytics', 'metrics', 'trends', 'correlation', 'dataset', 'insight'],
        prompt_fragment: 'Focus on data',
      },
      business: {
        name: 'Business',
        description: 'Business strategy',
        keywords: ['market', 'competitive', 'strategy', 'business', 'growth', 'positioning', 'opportunity', 'stakeholder', 'operations', 'scaling'],
        prompt_fragment: 'Focus on business',
      },
      research: {
        name: 'Research',
        description: 'Research methodology',
        keywords: ['research', 'study', 'academic', 'methodology', 'source', 'citation', 'literature', 'evidence', 'hypothesis', 'analysis'],
        prompt_fragment: 'Focus on research',
      },
      legal: {
        name: 'Legal',
        description: 'Legal analysis',
        keywords: ['contract', 'compliance', 'regulation', 'legal', 'liability', 'terms', 'agreement', 'policy', 'GDPR', 'privacy'],
        prompt_fragment: 'Focus on legal',
      },
      finance: {
        name: 'Finance',
        description: 'Financial analysis',
        keywords: ['valuation', 'risk', 'investment', 'ROI', 'budget', 'financial', 'cost', 'revenue', 'profit', 'pricing'],
        prompt_fragment: 'Focus on finance',
      },
      creative: {
        name: 'Creative',
        description: 'Creative work',
        keywords: ['creative', 'content', 'story', 'narrative', 'design', 'visual', 'artistic', 'innovative', 'original', 'concept'],
        prompt_fragment: 'Focus on creativity',
      },
      medical: {
        name: 'Medical',
        description: 'Medical knowledge',
        keywords: ['medical', 'health', 'treatment', 'diagnosis', 'clinical', 'patient', 'symptom', 'protocol', 'therapeutic', 'healthcare'],
        prompt_fragment: 'Focus on medical',
      },
      devops: {
        name: 'DevOps',
        description: 'DevOps practices',
        keywords: ['CI/CD', 'deployment', 'infrastructure', 'monitoring', 'DevOps', 'pipeline', 'automation', 'container', 'kubernetes', 'cloud'],
        prompt_fragment: 'Focus on DevOps',
      },
      ux: {
        name: 'UX',
        description: 'User experience',
        keywords: ['UX', 'usability', 'accessibility', 'user', 'interface', 'experience', 'design', 'interaction', 'journey', 'testing'],
        prompt_fragment: 'Focus on UX',
      },
      communications: {
        name: 'Communications',
        description: 'Communications strategy',
        keywords: ['communication', 'message', 'audience', 'media', 'PR', 'marketing', 'branding', 'outreach', 'stakeholder', 'engagement'],
        prompt_fragment: 'Focus on communications',
      },
    },
    personality: {
      skeptical: { name: 'Skeptical', description: 'Questions assumptions' },
      enthusiastic: { name: 'Enthusiastic', description: 'Positive framing' },
      cautious: { name: 'Cautious', description: 'Considers edge cases' },
      bold: { name: 'Bold', description: 'Willing to take risks' },
      analytical: { name: 'Analytical', description: 'Data-driven' },
      creative: { name: 'Creative', description: 'Lateral thinking' },
      empathetic: { name: 'Empathetic', description: 'User-centered' },
      contrarian: { name: 'Contrarian', description: 'Takes opposing view' },
      pragmatic: { name: 'Pragmatic', description: 'Focuses on what works' },
      meticulous: { name: 'Meticulous', description: 'Attention to detail' },
    },
    approach: {
      thorough: { name: 'Thorough', description: 'Exhaustive analysis' },
      rapid: { name: 'Rapid', description: 'Quick assessment' },
      systematic: { name: 'Systematic', description: 'Step-by-step' },
      exploratory: { name: 'Exploratory', description: 'Follow threads' },
      comparative: { name: 'Comparative', description: 'Trade-off analysis' },
      synthesizing: { name: 'Synthesizing', description: 'Combines sources' },
      adversarial: { name: 'Adversarial', description: 'Red team approach' },
      consultative: { name: 'Consultative', description: 'Advisory stance' },
    },
    examples: {
      security_audit: {
        description: 'Security review',
        traits: ['security', 'skeptical', 'thorough'],
      },
    },
  };

  // Test task descriptions
  const simpleTasks = [
    'Review this code for bugs',
    'Check security vulnerabilities',
    'Analyze the data',
    'Design the API',
    'Write documentation',
  ];

  const complexTasks = [
    'I need you to analyze the security vulnerabilities in our authentication system, focusing on potential exploits and OWASP compliance issues',
    'Please help me design a comprehensive technical architecture for our microservices infrastructure with proper monitoring and CI/CD pipelines',
    'We need to conduct thorough market research and competitive analysis for our new product positioning strategy',
    'Can you carefully review this contract for legal compliance, liability issues, and GDPR requirements?',
    'Help me create a detailed financial model with ROI projections, risk assessment, and investment analysis for the stakeholders',
  ];

  const ambiguousTasks = [
    'Help with this project',
    'Review something',
    'Analyze this',
    'Make it better',
    'Need assistance',
  ];

  beforeAll(() => {
    runner = new BenchmarkRunner();
    inference = new TraitInference(mockTraitsData);
  });

  describe('Simple Inference', () => {
    it('should infer traits from simple tasks quickly', () => {
      const result = runner.runSync(
        {
          name: 'Simple Task Inference',
          category: 'trait-inference',
          operation: 'Infer traits from short task descriptions',
          iterations: 100,
          warmup: 10,
          targetMs: 20,
          trackMemory: true,
        },
        () => {
          const task = simpleTasks[Math.floor(Math.random() * simpleTasks.length)];
          return inference.inferFromTask(task);
        }
      );

      console.log(`  Simple inference: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should process 1000 simple inferences efficiently', () => {
      const result = runner.runSync(
        {
          name: 'Batch Simple Inference',
          category: 'trait-inference',
          operation: 'Process 1000 simple task inferences',
          iterations: 10,
          warmup: 2,
          targetMs: 200,
        },
        () => {
          for (let i = 0; i < 1000; i++) {
            const task = simpleTasks[i % simpleTasks.length];
            inference.inferFromTask(task);
          }
        }
      );

      console.log(`  1000 simple inferences: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Complex Inference', () => {
    it('should infer traits from complex tasks', () => {
      const result = runner.runSync(
        {
          name: 'Complex Task Inference',
          category: 'trait-inference',
          operation: 'Infer traits from detailed task descriptions',
          iterations: 50,
          warmup: 5,
          targetMs: 50,
          trackMemory: true,
        },
        () => {
          const task = complexTasks[Math.floor(Math.random() * complexTasks.length)];
          return inference.inferFromTask(task);
        }
      );

      console.log(`  Complex inference: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should handle multi-domain task inference', () => {
      const multiDomainTask =
        'I need help with security analysis of our financial data processing system, ' +
        'ensuring GDPR compliance while optimizing the technical architecture for performance';

      const result = runner.runSync(
        {
          name: 'Multi-Domain Inference',
          category: 'trait-inference',
          operation: 'Infer traits from multi-domain task',
          iterations: 100,
          warmup: 5,
          targetMs: 30,
        },
        () => inference.inferFromTask(multiDomainTask)
      );

      console.log(`  Multi-domain inference: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Ambiguous Task Handling', () => {
    it('should handle ambiguous tasks with clarification generation', () => {
      const result = runner.runSync(
        {
          name: 'Ambiguous Task with Clarification',
          category: 'trait-inference',
          operation: 'Infer traits and generate clarification questions',
          iterations: 100,
          warmup: 5,
          targetMs: 30,
        },
        () => {
          const task = ambiguousTasks[Math.floor(Math.random() * ambiguousTasks.length)];
          return inference.inferFromTask(task);
        }
      );

      console.log(`  Ambiguous inference: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Keyword-Based Inference', () => {
    it('should infer from explicit keywords', () => {
      const keywordSets = [
        ['security', 'vulnerability', 'exploit'],
        ['data', 'analytics', 'visualization'],
        ['technical', 'architecture', 'API'],
        ['business', 'strategy', 'market'],
        ['legal', 'contract', 'compliance'],
      ];

      const result = runner.runSync(
        {
          name: 'Keyword-Based Inference',
          category: 'trait-inference',
          operation: 'Infer traits from keyword arrays',
          iterations: 100,
          warmup: 5,
          targetMs: 15,
        },
        () => {
          const keywords = keywordSets[Math.floor(Math.random() * keywordSets.length)];
          return inference.inferFromKeywords(keywords);
        }
      );

      console.log(`  Keyword inference: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence levels efficiently', () => {
      const tasksWithExpectedConfidence = [
        { task: 'security vulnerability analysis', expectedLevel: 'high' },
        { task: 'help with code', expectedLevel: 'medium' },
        { task: 'do something', expectedLevel: 'low' },
      ];

      const result = runner.runSync(
        {
          name: 'Confidence Calculation',
          category: 'trait-inference',
          operation: 'Calculate confidence with categorization',
          iterations: 100,
          warmup: 5,
          targetMs: 25,
        },
        () => {
          const item = tasksWithExpectedConfidence[
            Math.floor(Math.random() * tasksWithExpectedConfidence.length)
          ];
          const inferred = inference.inferFromTask(item.task);
          return {
            confidence: inferred.confidence,
            level: inferred.confidenceLevel,
          };
        }
      );

      console.log(`  Confidence calculation: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Enhanced Reasoning Generation', () => {
    it('should generate detailed reasoning efficiently', () => {
      const result = runner.runSync(
        {
          name: 'Reasoning Generation',
          category: 'trait-inference',
          operation: 'Generate enhanced reasoning explanation',
          iterations: 50,
          warmup: 3,
          targetMs: 40,
        },
        () => {
          const task = complexTasks[Math.floor(Math.random() * complexTasks.length)];
          const inferred = inference.inferFromTask(task);
          return inferred.reasoning;
        }
      );

      console.log(`  Reasoning generation: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Benchmark Report', () => {
    it('should generate JSON benchmark report', () => {
      const report = runner.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.summary.totalBenchmarks).toBeGreaterThan(0);
      expect(report.results.length).toBeGreaterThan(0);

      // Check trait inference specific results
      const traitResults = report.results.filter((r) => r.category === 'trait-inference');
      expect(traitResults.length).toBeGreaterThan(0);

      const json = runner.toJSON();
      console.log('\n  Trait Inference Benchmark Report (JSON):');
      console.log('  ' + json.split('\n').slice(0, 10).join('\n  ') + '\n  ...');
    });
  });
});
