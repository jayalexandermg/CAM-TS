/**
 * Performance Benchmarks: Skill Routing Operations
 *
 * Benchmarks for intent routing, skill registry, and keyword matching.
 */

import { BenchmarkRunner } from '../../src/benchmarks/BenchmarkRunner';
import { IntentRouter } from '../../src/skills/routing/IntentRouter';
import { SkillRegistry, SkillDefinition } from '../../src/skills/routing/SkillRegistry';

describe('Performance: Skill Routing Benchmarks', () => {
  jest.setTimeout(60000);

  let runner: BenchmarkRunner;
  let registry: SkillRegistry;
  let router: IntentRouter;

  // Generate test skills
  const generateTestSkills = (count: number): SkillDefinition[] => {
    const domains = [
      'code', 'test', 'debug', 'deploy', 'analyze',
      'document', 'review', 'refactor', 'optimize', 'monitor',
    ];
    const actions = [
      'create', 'update', 'delete', 'read', 'search',
      'validate', 'transform', 'export', 'import', 'sync',
    ];

    const skills: SkillDefinition[] = [];

    for (let i = 0; i < count; i++) {
      const domain = domains[i % domains.length];
      const action = actions[Math.floor(i / domains.length) % actions.length];
      const name = `${domain}-${action}-${i}`;

      skills.push({
        name,
        description: `Skill for ${action}ing ${domain} resources`,
        useWhen: [
          `User wants to ${action} ${domain}`,
          `User needs ${domain} ${action} functionality`,
          `Request involves ${domain} ${action}`,
        ],
        keywords: [
          domain,
          action,
          `${domain}-${action}`,
          `${action}-${domain}`,
          `perform ${action}`,
          `handle ${domain}`,
        ],
        capabilities: [
          `${action} ${domain} resources`,
          `Process ${domain} ${action} requests`,
          `Handle ${domain} ${action} workflows`,
        ],
        inputs: [
          {
            name: 'input',
            type: 'string' as const,
            required: true,
            description: 'Primary input',
          },
        ],
        outputs: [
          {
            name: 'result',
            type: 'object',
            description: 'Operation result',
          },
        ],
      });
    }

    return skills;
  };

  // Test user inputs
  const testInputs = [
    'I want to create some code',
    'Please help me debug this issue',
    'Can you analyze the test results?',
    'Need to deploy the application',
    'Review this code for security issues',
    'Refactor the database queries',
    'Monitor system performance',
    'Export the documentation',
    'Search for all references',
    'Validate the configuration',
  ];

  beforeAll(() => {
    runner = new BenchmarkRunner();
    registry = new SkillRegistry();
    router = new IntentRouter(registry);
  });

  describe('Skill Registry Operations', () => {
    it('should register skills efficiently', async () => {
      const skills = generateTestSkills(100);

      const result = await runner.run(
        {
          name: 'Register 100 Skills',
          category: 'skill-routing',
          operation: 'Register 100 skill definitions',
          iterations: 50,
          warmup: 3,
          targetMs: 50,
        },
        () => {
          const freshRegistry = new SkillRegistry();
          for (const skill of skills) {
            freshRegistry.register(skill);
          }
          return freshRegistry;
        }
      );

      console.log(`  Register 100 skills: ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should lookup skills by name efficiently', async () => {
      const skills = generateTestSkills(100);
      skills.forEach((s) => registry.register(s));

      const skillNames = skills.map((s) => s.name);

      const result = await runner.run(
        {
          name: 'Skill Lookup by Name',
          category: 'skill-routing',
          operation: 'Lookup 1000 skills by name',
          iterations: 100,
          warmup: 5,
          targetMs: 5,
        },
        () => {
          for (let i = 0; i < 1000; i++) {
            const name = skillNames[i % skillNames.length];
            registry.get(name);
          }
        }
      );

      console.log(`  1000 skill lookups: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should find skills by keyword efficiently', async () => {
      const skills = generateTestSkills(100);
      skills.forEach((s) => registry.register(s));

      const keywords = ['code', 'test', 'debug', 'deploy', 'analyze'];

      const result = await runner.run(
        {
          name: 'Find Skills by Keyword',
          category: 'skill-routing',
          operation: 'Find skills matching keywords',
          iterations: 100,
          warmup: 5,
          targetMs: 10,
        },
        () => {
          for (const keyword of keywords) {
            registry.findByKeyword(keyword);
          }
        }
      );

      console.log(`  Find by keyword: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should list all skills efficiently', async () => {
      const skills = generateTestSkills(500);
      skills.forEach((s) => registry.register(s));

      const result = await runner.run(
        {
          name: 'List All Skills (500)',
          category: 'skill-routing',
          operation: 'Get all 500 registered skills',
          iterations: 100,
          warmup: 5,
          targetMs: 5,
        },
        () => registry.getAll()
      );

      console.log(`  List 500 skills: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Intent Routing', () => {
    it('should route single intent with 50 skills', async () => {
      const skills = generateTestSkills(50);
      skills.forEach((s) => registry.register(s));

      const result = await runner.run(
        {
          name: 'Single Intent Route (50 skills)',
          category: 'skill-routing',
          operation: 'Route user input to best skill from 50',
          iterations: 100,
          warmup: 5,
          targetMs: 10,
        },
        async () => {
          const input = testInputs[Math.floor(Math.random() * testInputs.length)];
          return router.route(input);
        }
      );

      console.log(`  Single route (50 skills): ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should route single intent with 200 skills', async () => {
      const skills = generateTestSkills(200);
      skills.forEach((s) => registry.register(s));

      const result = await runner.run(
        {
          name: 'Single Intent Route (200 skills)',
          category: 'skill-routing',
          operation: 'Route user input to best skill from 200',
          iterations: 50,
          warmup: 3,
          targetMs: 30,
        },
        async () => {
          const input = testInputs[Math.floor(Math.random() * testInputs.length)];
          return router.route(input);
        }
      );

      console.log(`  Single route (200 skills): ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should route multiple intents efficiently', async () => {
      const skills = generateTestSkills(100);
      skills.forEach((s) => registry.register(s));

      const result = await runner.run(
        {
          name: 'Multi-Intent Route',
          category: 'skill-routing',
          operation: 'Get top 5 matching skills for input',
          iterations: 50,
          warmup: 3,
          targetMs: 50,
        },
        async () => {
          const input = testInputs[Math.floor(Math.random() * testInputs.length)];
          return router.routeMultiple(input, 5);
        }
      );

      console.log(`  Multi-route (top 5): ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should handle batch routing efficiently', async () => {
      const skills = generateTestSkills(100);
      skills.forEach((s) => registry.register(s));

      const result = await runner.run(
        {
          name: 'Batch Intent Routing',
          category: 'skill-routing',
          operation: 'Route 100 user inputs through 100 skills',
          iterations: 10,
          warmup: 2,
          targetMs: 500,
        },
        async () => {
          for (let i = 0; i < 100; i++) {
            const input = testInputs[i % testInputs.length];
            await router.route(input);
          }
        }
      );

      console.log(`  Batch route (100 inputs): ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Complex Routing Scenarios', () => {
    it('should handle long user input', async () => {
      const skills = generateTestSkills(50);
      skills.forEach((s) => registry.register(s));

      const longInput =
        'I need help with creating a comprehensive code review for our new feature. ' +
        'Please analyze the code for security vulnerabilities, performance issues, ' +
        'and ensure it follows our coding standards. Also check the test coverage ' +
        'and suggest improvements for the documentation. Finally, deploy the changes ' +
        'to the staging environment and monitor for any issues.';

      const result = await runner.run(
        {
          name: 'Long Input Routing',
          category: 'skill-routing',
          operation: 'Route long, complex user input',
          iterations: 50,
          warmup: 3,
          targetMs: 20,
        },
        async () => router.route(longInput)
      );

      console.log(`  Long input route: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should handle ambiguous input', async () => {
      const skills = generateTestSkills(100);
      skills.forEach((s) => registry.register(s));

      const ambiguousInputs = [
        'help',
        'do something',
        'process this',
        'handle it',
        'make it work',
      ];

      const result = await runner.run(
        {
          name: 'Ambiguous Input Routing',
          category: 'skill-routing',
          operation: 'Route ambiguous user inputs',
          iterations: 50,
          warmup: 3,
          targetMs: 15,
        },
        async () => {
          const input = ambiguousInputs[Math.floor(Math.random() * ambiguousInputs.length)];
          return router.route(input);
        }
      );

      console.log(`  Ambiguous input route: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });

    it('should handle no-match scenarios', async () => {
      const skills = generateTestSkills(50);
      skills.forEach((s) => registry.register(s));

      const noMatchInputs = [
        'play music',
        'weather forecast',
        'book a flight',
        'order pizza',
        'translate to French',
      ];

      const result = await runner.run(
        {
          name: 'No-Match Routing',
          category: 'skill-routing',
          operation: 'Route inputs with no skill match',
          iterations: 50,
          warmup: 3,
          targetMs: 15,
        },
        async () => {
          const input = noMatchInputs[Math.floor(Math.random() * noMatchInputs.length)];
          return router.route(input);
        }
      );

      console.log(`  No-match route: ${result.timing.avgMs.toFixed(3)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Scalability', () => {
    it('should scale with 500 skills', async () => {
      const skills = generateTestSkills(500);
      skills.forEach((s) => registry.register(s));

      const result = await runner.run(
        {
          name: 'Route with 500 Skills',
          category: 'skill-routing',
          operation: 'Route through 500 registered skills',
          iterations: 20,
          warmup: 2,
          targetMs: 100,
        },
        async () => {
          const input = testInputs[Math.floor(Math.random() * testInputs.length)];
          return router.route(input);
        }
      );

      console.log(`  Route (500 skills): ${result.timing.avgMs.toFixed(2)}ms avg`);
      expect(result.passed).toBe(true);
    });
  });

  describe('Benchmark Report', () => {
    it('should generate JSON benchmark report', () => {
      const report = runner.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.summary.totalBenchmarks).toBeGreaterThan(0);

      const routingResults = report.results.filter((r) => r.category === 'skill-routing');
      expect(routingResults.length).toBeGreaterThan(0);

      const json = runner.toJSON();
      console.log('\n  Skill Routing Benchmark Report (JSON):');
      console.log('  ' + json.split('\n').slice(0, 10).join('\n  ') + '\n  ...');
    });
  });
});
