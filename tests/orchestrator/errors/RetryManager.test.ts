import { RetryManager } from '../../../src/orchestrator/errors';

describe('RetryManager', () => {
  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const manager = new RetryManager();
      const config = manager.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.initialDelay).toBe(1000);
      expect(config.maxDelay).toBe(30000);
      expect(config.backoffMultiplier).toBe(2);
      expect(config.retryableErrors).toEqual(['network', 'timeout', 'unknown']);
    });

    it('should use custom config when provided', () => {
      const manager = new RetryManager({
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 10000,
        backoffMultiplier: 3,
        retryableErrors: ['network'],
      });
      const config = manager.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.initialDelay).toBe(500);
      expect(config.maxDelay).toBe(10000);
      expect(config.backoffMultiplier).toBe(3);
      expect(config.retryableErrors).toEqual(['network']);
    });

    it('should use default values for unspecified config options', () => {
      const manager = new RetryManager({
        maxRetries: 5,
      });
      const config = manager.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.initialDelay).toBe(1000);
      expect(config.maxDelay).toBe(30000);
    });
  });

  describe('retry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const manager = new RetryManager({ maxRetries: 3 });
      const fn = jest.fn().mockResolvedValue('success');

      const promise = manager.retry(fn);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const manager = new RetryManager({
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
      });
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const promise = manager.retry(fn);

      // Wait for first retry
      await jest.advanceTimersByTimeAsync(100);
      // Wait for second retry
      await jest.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const manager = new RetryManager({
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
      });
      const error = new Error('persistent failure');
      const fn = jest.fn().mockRejectedValue(error);

      const promise = manager.retry(fn);

      // Advance through all retries
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not return data on failure', async () => {
      const manager = new RetryManager({ maxRetries: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      const result = await manager.retry(fn);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const manager = new RetryManager({
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 30000,
      });

      expect(manager.calculateDelay(1)).toBe(1000);
      expect(manager.calculateDelay(2)).toBe(2000);
      expect(manager.calculateDelay(3)).toBe(4000);
      expect(manager.calculateDelay(4)).toBe(8000);
    });

    it('should respect maxDelay', () => {
      const manager = new RetryManager({
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 5000,
      });

      expect(manager.calculateDelay(1)).toBe(1000);
      expect(manager.calculateDelay(2)).toBe(2000);
      expect(manager.calculateDelay(3)).toBe(4000);
      expect(manager.calculateDelay(4)).toBe(5000);
      expect(manager.calculateDelay(10)).toBe(5000);
    });

    it('should handle custom backoff multiplier', () => {
      const manager = new RetryManager({
        initialDelay: 100,
        backoffMultiplier: 3,
        maxDelay: 30000,
      });

      expect(manager.calculateDelay(1)).toBe(100);
      expect(manager.calculateDelay(2)).toBe(300);
      expect(manager.calculateDelay(3)).toBe(900);
    });
  });

  describe('updateConfig', () => {
    it('should update config options', () => {
      const manager = new RetryManager();

      manager.updateConfig({ maxRetries: 10 });
      expect(manager.getConfig().maxRetries).toBe(10);
      expect(manager.getConfig().initialDelay).toBe(1000); // unchanged
    });

    it('should update multiple config options at once', () => {
      const manager = new RetryManager();

      manager.updateConfig({
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 15000,
      });

      const config = manager.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.initialDelay).toBe(500);
      expect(config.maxDelay).toBe(15000);
      expect(config.backoffMultiplier).toBe(2); // unchanged
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const manager = new RetryManager();
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});
