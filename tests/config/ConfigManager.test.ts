import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager, DEFAULT_CONFIG } from '../../src/config/ConfigManager';
import { CAMConfig } from '../../src/config/types';

describe('ConfigManager', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create a temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-config-test-'));
    configPath = path.join(testDir, 'config.json');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    // Clear environment variables
    delete process.env.CAM_MEMORY_BASE_DIR;
    delete process.env.CAM_ORCHESTRATOR_MAX_CONCURRENT;
    delete process.env.CAM_ORCHESTRATOR_TIMEOUT;
    delete process.env.CAM_LLM_PROVIDER;
    delete process.env.CAM_LLM_MODEL;
    delete process.env.CAM_LLM_API_KEY;
    delete process.env.CAM_LOG_LEVEL;
    delete process.env.CAM_LOG_FILE;
  });

  // =========================================================================
  // Constructor Tests
  // =========================================================================

  describe('constructor', () => {
    it('should create ConfigManager with default config path', () => {
      const manager = new ConfigManager();
      expect(manager.getConfigPath()).toContain('.infinite-aura-ts');
      expect(manager.getConfigPath()).toContain('config.json');
    });

    it('should create ConfigManager with custom config path', () => {
      const manager = new ConfigManager(configPath);
      expect(manager.getConfigPath()).toBe(configPath);
    });
  });

  // =========================================================================
  // Load Config Tests
  // =========================================================================

  describe('load', () => {
    it('should load default config when no file exists', () => {
      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load config from file', () => {
      const customConfig: CAMConfig = {
        ...DEFAULT_CONFIG,
        memory: { baseDir: '/custom/memory/path' },
        orchestrator: { maxConcurrentTasks: 10, defaultTimeout: 60000 },
        llm: { provider: 'openai', model: 'gpt-4' },
        logging: { level: 'debug' },
      };

      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.memory.baseDir).toBe('/custom/memory/path');
      expect(config.orchestrator.maxConcurrentTasks).toBe(10);
      expect(config.llm.provider).toBe('openai');
      expect(config.logging.level).toBe('debug');
    });

    it('should merge partial config with defaults', () => {
      const partialConfig = {
        memory: { baseDir: '/custom/path' },
      };

      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(partialConfig, null, 2));

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.memory.baseDir).toBe('/custom/path');
      expect(config.orchestrator).toEqual(DEFAULT_CONFIG.orchestrator);
      expect(config.llm).toEqual(DEFAULT_CONFIG.llm);
    });

    it('should apply environment variable overrides', () => {
      process.env.CAM_MEMORY_BASE_DIR = '/env/memory';
      process.env.CAM_ORCHESTRATOR_MAX_CONCURRENT = '20';
      process.env.CAM_LOG_LEVEL = 'error';

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.memory.baseDir).toBe('/env/memory');
      expect(config.orchestrator.maxConcurrentTasks).toBe(20);
      expect(config.logging.level).toBe('error');
    });

    it('should override file config with env vars', () => {
      const fileConfig = {
        memory: { baseDir: '/file/path' },
        orchestrator: { maxConcurrentTasks: 5, defaultTimeout: 30000 },
      };

      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(fileConfig, null, 2));

      process.env.CAM_MEMORY_BASE_DIR = '/env/path';

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.memory.baseDir).toBe('/env/path');
    });

    it('should handle invalid JSON gracefully', () => {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, 'invalid json content');

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  // =========================================================================
  // Save Config Tests
  // =========================================================================

  describe('save', () => {
    it('should save config to file', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      manager.save();

      expect(fs.existsSync(configPath)).toBe(true);
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(savedConfig).toEqual(DEFAULT_CONFIG);
    });

    it('should create directory if not exists', () => {
      const deepPath = path.join(testDir, 'deep', 'nested', 'config.json');
      const manager = new ConfigManager(deepPath);
      manager.load();
      manager.save();

      expect(fs.existsSync(deepPath)).toBe(true);
    });
  });

  // =========================================================================
  // Get/Set Config Tests
  // =========================================================================

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const manager = new ConfigManager(configPath);
      manager.load();

      const config1 = manager.getConfig();
      const config2 = manager.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('get', () => {
    it('should get nested config value', () => {
      const manager = new ConfigManager(configPath);
      manager.load();

      expect(manager.get<string>('memory.baseDir')).toBe(
        DEFAULT_CONFIG.memory.baseDir
      );
      expect(manager.get<number>('orchestrator.maxConcurrentTasks')).toBe(5);
    });

    it('should return undefined for non-existent path', () => {
      const manager = new ConfigManager(configPath);
      manager.load();

      expect(manager.get('nonexistent.path')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set nested config value', () => {
      const manager = new ConfigManager(configPath);
      manager.load();

      manager.set('memory.baseDir', '/new/path');

      expect(manager.get<string>('memory.baseDir')).toBe('/new/path');
    });

    it('should set deeply nested value', () => {
      const manager = new ConfigManager(configPath);
      manager.load();

      manager.set('orchestrator.maxConcurrentTasks', 15);

      expect(manager.get<number>('orchestrator.maxConcurrentTasks')).toBe(15);
    });
  });

  // =========================================================================
  // Update Config Tests
  // =========================================================================

  describe('update', () => {
    it('should update config with partial values', () => {
      const manager = new ConfigManager(configPath);
      manager.load();

      const updated = manager.update({
        memory: { baseDir: '/updated/path' },
        orchestrator: { maxConcurrentTasks: 8 },
      });

      expect(updated.memory.baseDir).toBe('/updated/path');
      expect(updated.orchestrator.maxConcurrentTasks).toBe(8);
      expect(updated.orchestrator.defaultTimeout).toBe(
        DEFAULT_CONFIG.orchestrator.defaultTimeout
      );
    });
  });

  // =========================================================================
  // Reset Config Tests
  // =========================================================================

  describe('reset', () => {
    it('should reset config to defaults', () => {
      const manager = new ConfigManager(configPath);
      manager.load();

      manager.set('memory.baseDir', '/custom/path');
      const reset = manager.reset();

      expect(reset).toEqual(DEFAULT_CONFIG);
    });
  });

  // =========================================================================
  // Config Exists Tests
  // =========================================================================

  describe('configExists', () => {
    it('should return false when config file does not exist', () => {
      const manager = new ConfigManager(configPath);
      expect(manager.configExists()).toBe(false);
    });

    it('should return true when config file exists', () => {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));

      const manager = new ConfigManager(configPath);
      expect(manager.configExists()).toBe(true);
    });
  });

  // =========================================================================
  // Environment Variable Tests
  // =========================================================================

  describe('environment variables', () => {
    it('should handle numeric env vars', () => {
      process.env.CAM_ORCHESTRATOR_TIMEOUT = '120000';

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.orchestrator.defaultTimeout).toBe(120000);
    });

    it('should ignore invalid numeric env vars', () => {
      process.env.CAM_ORCHESTRATOR_MAX_CONCURRENT = 'not-a-number';

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.orchestrator.maxConcurrentTasks).toBe(
        DEFAULT_CONFIG.orchestrator.maxConcurrentTasks
      );
    });

    it('should validate log level env var', () => {
      process.env.CAM_LOG_LEVEL = 'invalid';

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.logging.level).toBe(DEFAULT_CONFIG.logging.level);
    });

    it('should set API key from env var', () => {
      process.env.CAM_LLM_API_KEY = 'sk-test-key';

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.llm.apiKey).toBe('sk-test-key');
    });

    it('should set log file from env var', () => {
      process.env.CAM_LOG_FILE = '/var/log/cam.log';

      const manager = new ConfigManager(configPath);
      const config = manager.load();

      expect(config.logging.file).toBe('/var/log/cam.log');
    });
  });
});
