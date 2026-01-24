import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { SkillGenerator, SkillConfig } from '../../../src/skills/CreateSkill';

describe('SkillGenerator', () => {
  const testBasePath = path.join(os.tmpdir(), 'infinite-aura-test-skill-generator');
  let generator: SkillGenerator;

  beforeAll(async () => {
    await fs.promises.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testBasePath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.promises.rm(testBasePath, { recursive: true, force: true }).catch(() => {});
    await fs.promises.mkdir(testBasePath, { recursive: true });
    generator = new SkillGenerator(testBasePath);
  });

  // =========================================================================
  // Valid Config Tests
  // =========================================================================

  describe('generate() with valid config', () => {
    const validConfig: SkillConfig = {
      name: 'TestSkill',
      description: 'A test skill for unit testing',
      category: 'testing',
      author: 'Test Author',
      version: '2.0.0',
      permissions: ['file_read', 'file_write'],
      use_when: ['use testskill', 'run test skill'],
    };

    it('should create all required files', () => {
      const result = generator.generate(validConfig);

      expect(result.success).toBe(true);
      expect(result.files).toContain('SKILL.md');
      expect(result.files).toContain('Workflows/Default.md');
      expect(result.files).toContain('Tools/index.ts');
      expect(result.files).toContain('index.ts');
      expect(result.files).toHaveLength(4);
    });

    it('should create all required directories', () => {
      const result = generator.generate(validConfig);

      expect(result.success).toBe(true);

      const skillPath = path.join(testBasePath, validConfig.name);
      const skillExists = fs.existsSync(skillPath);
      const workflowsExists = fs.existsSync(path.join(skillPath, 'Workflows'));
      const toolsExists = fs.existsSync(path.join(skillPath, 'Tools'));

      expect(skillExists).toBe(true);
      expect(workflowsExists).toBe(true);
      expect(toolsExists).toBe(true);
    });

    it('should return correct path in result', () => {
      const result = generator.generate(validConfig);

      expect(result.success).toBe(true);
      expect(result.path).toBe(path.join(testBasePath, validConfig.name));
    });

    it('should return empty errors array on success', () => {
      const result = generator.generate(validConfig);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // SKILL.md Content Tests
  // =========================================================================

  describe('SKILL.md generation', () => {
    const config: SkillConfig = {
      name: 'DataAnalyzer',
      description: 'Analyze data with various algorithms',
      category: 'analytics',
      author: 'Data Team',
      version: '1.5.0',
      permissions: ['file_read', 'network'],
      use_when: ['analyze data', 'run analytics'],
    };

    it('should have correct YAML frontmatter', () => {
      const result = generator.generate(config);
      expect(result.success).toBe(true);

      const skillMdPath = path.join(testBasePath, config.name, 'SKILL.md');
      const content = fs.readFileSync(skillMdPath, 'utf-8');

      expect(content).toMatch(/^---/);
      expect(content).toContain('name: DataAnalyzer');
      expect(content).toContain('description: Analyze data with various algorithms');
      expect(content).toContain("version: '1.5.0'");
      expect(content).toContain('author: Data Team');
      expect(content).toContain('category: analytics');
      expect(content).toContain('permissions:');
      expect(content).toContain('  - file_read');
      expect(content).toContain('  - network');
      expect(content).toContain('use_when:');
      expect(content).toContain('  - analyze data');
      expect(content).toContain('  - run analytics');
      expect(content).toMatch(/---[\s\S]*---/);
    });

    it('should have markdown body after frontmatter', () => {
      const result = generator.generate(config);
      expect(result.success).toBe(true);

      const skillMdPath = path.join(testBasePath, config.name, 'SKILL.md');
      const content = fs.readFileSync(skillMdPath, 'utf-8');

      // Check for markdown sections after frontmatter
      expect(content).toContain('# DataAnalyzer');
      expect(content).toContain('## Description');
      expect(content).toContain('## USE WHEN');
      expect(content).toContain('## Capabilities');
      expect(content).toContain('## Workflows');
      expect(content).toContain('## Tools');
      expect(content).toContain('## Context');
    });
  });

  // =========================================================================
  // Workflow File Tests
  // =========================================================================

  describe('Workflows/Default.md generation', () => {
    const config: SkillConfig = {
      name: 'FileProcessor',
      description: 'Process files efficiently',
    };

    it('should create Default workflow with correct format', () => {
      const result = generator.generate(config);
      expect(result.success).toBe(true);

      const workflowPath = path.join(testBasePath, config.name, 'Workflows', 'Default.md');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('# Default Workflow');
      expect(content).toContain('## Purpose');
      expect(content).toContain('## Steps');
      expect(content).toContain('## Parameters');
      expect(content).toContain('## Output Format');
      expect(content).toContain('| Parameter | Type | Required | Default | Description |');
      expect(content).toContain('FileProcessor');
    });
  });

  // =========================================================================
  // Tools/index.ts Tests
  // =========================================================================

  describe('Tools/index.ts generation', () => {
    const config: SkillConfig = {
      name: 'ImageResizer',
      description: 'Resize images to various dimensions',
    };

    it('should have TypeScript interfaces', () => {
      const result = generator.generate(config);
      expect(result.success).toBe(true);

      const toolsPath = path.join(testBasePath, config.name, 'Tools', 'index.ts');
      const content = fs.readFileSync(toolsPath, 'utf-8');

      expect(content).toContain('export interface ImageResizerOptions');
      expect(content).toContain('export interface ImageResizerResult');
      expect(content).toContain('input: string');
      expect(content).toContain('success: boolean');
    });

    it('should have execute function stub', () => {
      const result = generator.generate(config);
      expect(result.success).toBe(true);

      const toolsPath = path.join(testBasePath, config.name, 'Tools', 'index.ts');
      const content = fs.readFileSync(toolsPath, 'utf-8');

      expect(content).toContain('export async function execute');
      expect(content).toContain('ImageResizerOptions');
      expect(content).toContain('Promise<ImageResizerResult>');
      expect(content).toContain('return {');
      expect(content).toContain('success: true');
    });
  });

  // =========================================================================
  // index.ts Tests
  // =========================================================================

  describe('index.ts generation', () => {
    const config: SkillConfig = {
      name: 'CodeFormatter',
      description: 'Format code in various languages',
    };

    it('should export from Tools', () => {
      const result = generator.generate(config);
      expect(result.success).toBe(true);

      const indexPath = path.join(testBasePath, config.name, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      expect(content).toContain("export * from './Tools'");
      expect(content).toContain('CodeFormatter Skill');
    });
  });

  // =========================================================================
  // Name Validation Tests
  // =========================================================================

  describe('name validation', () => {
    it('should reject lowercase name', () => {
      const config: SkillConfig = {
        name: 'myskill',
        description: 'A lowercase skill name',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('myskill');
      expect(result.errors[0]).toContain('TitleCase');
      expect(result.errors[0]).toContain('lowercase');
    });

    it('should reject UPPERCASE name', () => {
      const config: SkillConfig = {
        name: 'MYSKILL',
        description: 'An uppercase skill name',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('MYSKILL');
      expect(result.errors[0]).toContain('TitleCase');
      expect(result.errors[0]).toContain('UPPERCASE');
    });

    it('should reject name with spaces', () => {
      const config: SkillConfig = {
        name: 'My Skill',
        description: 'A skill name with spaces',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('My Skill');
      expect(result.errors[0]).toContain('TitleCase');
      expect(result.errors[0]).toContain('spaces');
    });

    it('should reject name starting with lowercase', () => {
      const config: SkillConfig = {
        name: 'mySkill',
        description: 'A skill name starting with lowercase',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('mySkill');
      expect(result.errors[0]).toContain('TitleCase');
    });

    it('should accept valid TitleCase names', () => {
      const validNames = ['MySkill', 'DataAnalyzer', 'A', 'Test1', 'Abc123'];

      for (const name of validNames) {
        // Reset generator for each test
        const freshGenerator = new SkillGenerator(
          path.join(testBasePath, `valid-${name}`)
        );
        fs.mkdirSync(path.join(testBasePath, `valid-${name}`), { recursive: true });

        const result = freshGenerator.generate({
          name,
          description: `Test skill ${name}`,
        });

        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });
  });

  // =========================================================================
  // Duplicate Detection Tests
  // =========================================================================

  describe('duplicate detection', () => {
    it('should reject existing skill (duplicate)', () => {
      const config: SkillConfig = {
        name: 'DuplicateSkill',
        description: 'First creation',
      };

      // Create skill first time
      const result1 = generator.generate(config);
      expect(result1.success).toBe(true);

      // Try to create again
      const result2 = generator.generate(config);
      expect(result2.success).toBe(false);
      expect(result2.errors).toHaveLength(1);
      expect(result2.errors[0]).toContain('DuplicateSkill');
      expect(result2.errors[0]).toContain('already exists');
    });
  });

  // =========================================================================
  // Default Values Tests
  // =========================================================================

  describe('default values', () => {
    const minimalConfig: SkillConfig = {
      name: 'MinimalSkill',
      description: 'A skill with minimal config',
    };

    it('should apply default permissions when not provided', () => {
      const result = generator.generate(minimalConfig);
      expect(result.success).toBe(true);

      const skillMdPath = path.join(testBasePath, minimalConfig.name, 'SKILL.md');
      const content = fs.readFileSync(skillMdPath, 'utf-8');

      expect(content).toContain('permissions:');
      expect(content).toContain('  - file_read');
    });

    it('should apply default use_when when not provided', () => {
      const result = generator.generate(minimalConfig);
      expect(result.success).toBe(true);

      const skillMdPath = path.join(testBasePath, minimalConfig.name, 'SKILL.md');
      const content = fs.readFileSync(skillMdPath, 'utf-8');

      expect(content).toContain('use_when:');
      expect(content).toContain('  - use minimalskill');
    });

    it('should apply default version when not provided', () => {
      const result = generator.generate(minimalConfig);
      expect(result.success).toBe(true);

      const skillMdPath = path.join(testBasePath, minimalConfig.name, 'SKILL.md');
      const content = fs.readFileSync(skillMdPath, 'utf-8');

      expect(content).toContain("version: '1.0.0'");
    });

    it('should apply default author when not provided', () => {
      const result = generator.generate(minimalConfig);
      expect(result.success).toBe(true);

      const skillMdPath = path.join(testBasePath, minimalConfig.name, 'SKILL.md');
      const content = fs.readFileSync(skillMdPath, 'utf-8');

      expect(content).toContain('author: CAM User');
    });

    it('should apply default category when not provided', () => {
      const result = generator.generate(minimalConfig);
      expect(result.success).toBe(true);

      const skillMdPath = path.join(testBasePath, minimalConfig.name, 'SKILL.md');
      const content = fs.readFileSync(skillMdPath, 'utf-8');

      expect(content).toContain('category: general');
    });
  });

  // =========================================================================
  // Success Result Tests
  // =========================================================================

  describe('success result', () => {
    it('should include path in result', () => {
      const config: SkillConfig = {
        name: 'PathTestSkill',
        description: 'Test path in result',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(true);
      expect(result.path).toBe(path.join(testBasePath, 'PathTestSkill'));
      expect(result.path).toBeTruthy();
    });

    it('should include files list in result', () => {
      const config: SkillConfig = {
        name: 'FilesListSkill',
        description: 'Test files list in result',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(true);
      expect(result.files).toBeInstanceOf(Array);
      expect(result.files.length).toBe(4);
      expect(result.files).toEqual(
        expect.arrayContaining([
          'SKILL.md',
          'Workflows/Default.md',
          'Tools/index.ts',
          'index.ts',
        ])
      );
    });
  });

  // =========================================================================
  // Required Field Validation Tests
  // =========================================================================

  describe('required field validation', () => {
    it('should reject empty name', () => {
      const config: SkillConfig = {
        name: '',
        description: 'A skill with empty name',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('name is required');
    });

    it('should reject empty description', () => {
      const config: SkillConfig = {
        name: 'NoDescription',
        description: '',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('description is required');
    });

    it('should reject whitespace-only name', () => {
      const config: SkillConfig = {
        name: '   ',
        description: 'A skill with whitespace name',
      };

      const result = generator.generate(config);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('name is required');
    });
  });
});
