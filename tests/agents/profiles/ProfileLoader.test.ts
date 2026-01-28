import * as fs from 'fs/promises';
import * as path from 'path';
import { ProfileLoader } from '../../../src/agents/profiles/ProfileLoader';
import { ProfileSchema, ProfileFrontmatter } from '../../../src/agents/profiles/ProfileSchema';

describe('ProfileSchema', () => {
  let schema: ProfileSchema;

  beforeEach(() => {
    schema = new ProfileSchema();
  });

  describe('validateFrontmatter', () => {
    it('should validate a complete frontmatter', () => {
      const frontmatter: ProfileFrontmatter = {
        name: 'TestAgent',
        description: 'A test agent',
        permissions: ['memory_read'],
        skills: ['TestSkill'],
      };

      const result = schema.validateFrontmatter(frontmatter);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return error when name is missing', () => {
      const frontmatter: ProfileFrontmatter = {
        name: '',
        description: 'A test agent',
      };

      const result = schema.validateFrontmatter(frontmatter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Profile must have a name');
    });

    it('should return error when description is missing', () => {
      const frontmatter: ProfileFrontmatter = {
        name: 'TestAgent',
        description: '',
      };

      const result = schema.validateFrontmatter(frontmatter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Profile must have a description');
    });

    it('should return warning when permissions are empty', () => {
      const frontmatter: ProfileFrontmatter = {
        name: 'TestAgent',
        description: 'A test agent',
        permissions: [],
        skills: ['TestSkill'],
      };

      const result = schema.validateFrontmatter(frontmatter);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Profile has no permissions defined');
    });

    it('should return warning when skills are empty', () => {
      const frontmatter: ProfileFrontmatter = {
        name: 'TestAgent',
        description: 'A test agent',
        permissions: ['memory_read'],
        skills: [],
      };

      const result = schema.validateFrontmatter(frontmatter);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Profile has no skills linked');
    });

    it('should return multiple errors for multiple issues', () => {
      const frontmatter: ProfileFrontmatter = {
        name: '',
        description: '',
      };

      const result = schema.validateFrontmatter(frontmatter);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('getDefaultPermissions', () => {
    it('should return default permissions for unknown type', () => {
      const permissions = schema.getDefaultPermissions('unknown');
      expect(permissions).toEqual(['memory_read', 'memory_write']);
    });

    it('should return engineer permissions', () => {
      const permissions = schema.getDefaultPermissions('engineer');
      expect(permissions).toContain('file_read');
      expect(permissions).toContain('file_write');
      expect(permissions).toContain('code_execute');
    });

    it('should return researcher permissions', () => {
      const permissions = schema.getDefaultPermissions('researcher');
      expect(permissions).toContain('web_search');
      expect(permissions).toContain('file_read');
    });

    it('should return coordinator permissions', () => {
      const permissions = schema.getDefaultPermissions('coordinator');
      expect(permissions).toContain('agent_spawn');
    });

    it('should be case insensitive', () => {
      const lower = schema.getDefaultPermissions('engineer');
      const upper = schema.getDefaultPermissions('ENGINEER');
      expect(lower).toEqual(upper);
    });
  });
});

describe('ProfileLoader', () => {
  let loader: ProfileLoader;
  const testProfilesDir = path.join('/tmp', 'infinite-aura-test-profiles');

  beforeAll(async () => {
    await fs.mkdir(testProfilesDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testProfilesDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    loader = new ProfileLoader(testProfilesDir);
  });

  describe('parse', () => {
    it('should parse valid profile content', () => {
      const content = `---
name: TestAgent
description: A test agent
permissions:
  - memory_read
skills:
  - TestSkill
---

# Test Agent

You are a test agent.

## Capabilities
1. First capability
2. Second capability

## Constraints
- First constraint
- Second constraint
`;

      const profile = loader.parse(content);

      expect(profile.name).toBe('TestAgent');
      expect(profile.description).toBe('A test agent');
      expect(profile.permissions).toContain('memory_read');
      expect(profile.skills).toContain('TestSkill');
      expect(profile.capabilities).toHaveLength(2);
      expect(profile.constraints).toHaveLength(2);
      expect(profile.contextFile).toBe('TestAgentContext.md');
    });

    it('should throw error for missing frontmatter', () => {
      const content = `# No Frontmatter

Just some markdown content.
`;

      expect(() => loader.parse(content)).toThrow('Invalid profile format: missing YAML frontmatter');
    });

    it('should throw error for invalid frontmatter', () => {
      const content = `---
name: ""
description: A test agent
---

# Test Agent
`;

      expect(() => loader.parse(content)).toThrow('Invalid profile');
    });

    it('should parse optional fields correctly', () => {
      const content = `---
name: TestAgent
description: A test agent
model: claude-3-5-sonnet
color: "#6366F1"
voiceId: voice-123
permissions:
  - memory_read
skills:
  - TestSkill
traits:
  - Helpful
  - Precise
---

# Test Agent
`;

      const profile = loader.parse(content);

      expect(profile.model).toBe('claude-3-5-sonnet');
      expect(profile.color).toBe('#6366F1');
      expect(profile.voiceId).toBe('voice-123');
      expect(profile.traits).toEqual(['Helpful', 'Precise']);
    });

    it('should handle empty capabilities and constraints', () => {
      const content = `---
name: TestAgent
description: A test agent
permissions:
  - memory_read
skills:
  - TestSkill
---

# Test Agent

No capabilities or constraints sections.
`;

      const profile = loader.parse(content);

      expect(profile.capabilities).toHaveLength(0);
      expect(profile.constraints).toHaveLength(0);
    });

    it('should parse bulleted list items', () => {
      const content = `---
name: TestAgent
description: A test agent
permissions:
  - memory_read
skills:
  - TestSkill
---

# Test Agent

## Capabilities
- First capability
- Second capability
* Third capability
`;

      const profile = loader.parse(content);

      expect(profile.capabilities).toHaveLength(3);
    });
  });

  describe('load', () => {
    it('should load profile from file', async () => {
      const profilePath = path.join(testProfilesDir, 'LoadTest.md');
      const content = `---
name: LoadTest
description: A load test agent
permissions:
  - memory_read
skills:
  - TestSkill
---

# Load Test Agent
`;
      await fs.writeFile(profilePath, content);

      const profile = await loader.load(profilePath);

      expect(profile.name).toBe('LoadTest');
    });

    it('should throw error for non-existent file', async () => {
      const profilePath = path.join(testProfilesDir, 'NonExistent.md');

      await expect(loader.load(profilePath)).rejects.toThrow();
    });
  });

  describe('loadAll', () => {
    it('should load all profiles from directory', async () => {
      const profile1 = `---
name: Agent1
description: First agent
permissions:
  - memory_read
skills:
  - Skill1
---

# Agent 1
`;
      const profile2 = `---
name: Agent2
description: Second agent
permissions:
  - memory_write
skills:
  - Skill2
---

# Agent 2
`;
      await fs.writeFile(path.join(testProfilesDir, 'Agent1.md'), profile1);
      await fs.writeFile(path.join(testProfilesDir, 'Agent2.md'), profile2);

      const profiles = await loader.loadAll();

      expect(profiles.size).toBeGreaterThanOrEqual(2);
      expect(profiles.has('Agent1')).toBe(true);
      expect(profiles.has('Agent2')).toBe(true);
    });

    it('should skip Context files', async () => {
      const contextFile = `---
name: SomeContext
description: Context file
---

# Context
`;
      await fs.writeFile(path.join(testProfilesDir, 'AgentContext.md'), contextFile);

      const profiles = await loader.loadAll();

      expect(profiles.has('SomeContext')).toBe(false);
    });

    it('should cache loaded profiles', async () => {
      await loader.loadAll();

      expect(loader.isCached('Agent1')).toBe(true);
      expect(loader.isCached('Agent2')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return cached profile', async () => {
      await loader.loadAll();

      const profile = loader.get('Agent1');

      expect(profile).toBeDefined();
      expect(profile?.name).toBe('Agent1');
    });

    it('should return undefined for non-cached profile', () => {
      const profile = loader.get('NonExistent');

      expect(profile).toBeUndefined();
    });
  });

  describe('listProfiles', () => {
    it('should list profile names', async () => {
      const names = await loader.listProfiles();

      expect(names).toContain('Agent1');
      expect(names).toContain('Agent2');
    });

    it('should exclude Context files from listing', async () => {
      const names = await loader.listProfiles();

      expect(names.some((n) => n.includes('Context'))).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached profiles', async () => {
      await loader.loadAll();
      expect(loader.isCached('Agent1')).toBe(true);

      loader.clearCache();

      expect(loader.isCached('Agent1')).toBe(false);
    });
  });
});

describe('ProfileLoader with real profiles', () => {
  const realProfilesDir = path.join(__dirname, '../../../src/agents/definitions');

  it('should load Default.md profile', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profile = await loader.load(path.join(realProfilesDir, 'Default.md'));

    expect(profile.name).toBe('Default');
    expect(profile.description).toBeTruthy();
    expect(profile.permissions.length).toBeGreaterThan(0);
  });

  it('should load Researcher.md profile', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profile = await loader.load(path.join(realProfilesDir, 'Researcher.md'));

    expect(profile.name).toBe('Researcher');
    expect(profile.permissions).toContain('web_search');
  });

  it('should load Coder.md profile', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profile = await loader.load(path.join(realProfilesDir, 'Coder.md'));

    expect(profile.name).toBe('Coder');
    expect(profile.permissions).toContain('code_execute');
  });

  it('should load Coordinator.md profile', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profile = await loader.load(path.join(realProfilesDir, 'Coordinator.md'));

    expect(profile.name).toBe('Coordinator');
    expect(profile.permissions).toContain('agent_spawn');
  });

  it('should load Engineer.md profile', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profile = await loader.load(path.join(realProfilesDir, 'Engineer.md'));

    expect(profile.name).toBe('Engineer');
    expect(profile.description).toBe(
      'Senior software engineer specializing in code development, debugging, and system implementation'
    );
    expect(profile.permissions).toContain('file_read');
    expect(profile.permissions).toContain('file_write');
    expect(profile.permissions).toContain('code_execute');
    expect(profile.permissions).toContain('shell_execute');
    expect(profile.skills).toContain('CodeGeneration');
    expect(profile.skills).toContain('Debugging');
    expect(profile.skills).toContain('Testing');
    expect(profile.traits).toContain('technical');
    expect(profile.traits).toContain('meticulous');
    expect(profile.color).toBe('#10B981');
    expect(profile.contextFile).toBe('EngineerContext.md');
  });

  it('should load Architect.md profile', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profile = await loader.load(path.join(realProfilesDir, 'Architect.md'));

    expect(profile.name).toBe('Architect');
    expect(profile.description).toBe(
      'System architect specializing in software design, patterns, and technical decision-making'
    );
    expect(profile.permissions).toContain('file_read');
    expect(profile.permissions).toContain('memory_read');
    expect(profile.permissions).toContain('agent_spawn');
    expect(profile.skills).toContain('SystemDesign');
    expect(profile.skills).toContain('PatternSelection');
    expect(profile.skills).toContain('ADRWriting');
    expect(profile.traits).toContain('strategic');
    expect(profile.traits).toContain('holistic');
    expect(profile.color).toBe('#8B5CF6');
    expect(profile.contextFile).toBe('ArchitectContext.md');
  });

  it('should load Security.md profile', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profile = await loader.load(path.join(realProfilesDir, 'Security.md'));

    expect(profile.name).toBe('Security');
    expect(profile.description).toBe(
      'Security specialist for vulnerability assessment, threat modeling, and security auditing'
    );
    expect(profile.permissions).toContain('file_read');
    expect(profile.permissions).toContain('code_execute');
    expect(profile.permissions).toContain('web_search');
    expect(profile.skills).toContain('VulnerabilityAssessment');
    expect(profile.skills).toContain('ThreatModeling');
    expect(profile.traits).toContain('security');
    expect(profile.traits).toContain('skeptical');
    expect(profile.color).toBe('#EF4444');
    expect(profile.contextFile).toBe('SecurityContext.md');
  });

  it('should load Designer.md profile', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profile = await loader.load(path.join(realProfilesDir, 'Designer.md'));

    expect(profile.name).toBe('Designer');
    expect(profile.description).toBe(
      'UX/UI designer specializing in user research, interface design, and accessibility'
    );
    expect(profile.permissions).toContain('file_read');
    expect(profile.permissions).toContain('file_write');
    expect(profile.skills).toContain('UserResearch');
    expect(profile.skills).toContain('AccessibilityAudit');
    expect(profile.traits).toContain('ux');
    expect(profile.traits).toContain('empathetic');
    expect(profile.color).toBe('#EC4899');
    expect(profile.contextFile).toBe('DesignerContext.md');
  });

  it('should load all real profiles', async () => {
    const loader = new ProfileLoader(realProfilesDir);
    const profiles = await loader.loadAll();

    expect(profiles.size).toBeGreaterThanOrEqual(8);
    expect(profiles.has('Default')).toBe(true);
    expect(profiles.has('Researcher')).toBe(true);
    expect(profiles.has('Coder')).toBe(true);
    expect(profiles.has('Coordinator')).toBe(true);
    expect(profiles.has('Engineer')).toBe(true);
    expect(profiles.has('Architect')).toBe(true);
    expect(profiles.has('Security')).toBe(true);
    expect(profiles.has('Designer')).toBe(true);
  });
});
