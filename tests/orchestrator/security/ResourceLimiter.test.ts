import { ResourceLimiter } from '../../../src/orchestrator/security/ResourceLimiter';
import { SecurityConfig } from '../../../src/orchestrator/security/types';

describe('ResourceLimiter', () => {
  const createConfig = (overrides?: Partial<SecurityConfig>): SecurityConfig => ({
    maxInputLength: 1000,
    maxOutputLength: 5000,
    maxAgentsPerSession: 3,
    maxConcurrentAgents: 2,
    maxTaskDuration: 300000,
    allowedFileExtensions: ['.txt', '.md', '.json'],
    blockedPatterns: [],
    ...overrides,
  });

  let limiter: ResourceLimiter;

  beforeEach(() => {
    limiter = new ResourceLimiter(createConfig());
  });

  describe('canCreateAgent', () => {
    it('should allow agent creation when under limits', () => {
      expect(limiter.canCreateAgent('session-1')).toBe(true);
    });

    it('should deny agent creation when max agents reached', () => {
      limiter.incrementAgentCount();
      limiter.incrementAgentCount();
      limiter.incrementAgentCount();
      expect(limiter.canCreateAgent('session-1')).toBe(false);
    });

    it('should deny agent creation when max concurrent agents reached', () => {
      limiter.incrementAgentCount();
      limiter.incrementAgentCount();
      expect(limiter.canCreateAgent('session-1')).toBe(false);
    });

    it('should allow creation after decrementing active agents', () => {
      limiter.incrementAgentCount();
      limiter.incrementAgentCount();
      expect(limiter.canCreateAgent('session-1')).toBe(false);
      limiter.decrementActiveAgents();
      expect(limiter.canCreateAgent('session-1')).toBe(true);
    });
  });

  describe('incrementAgentCount', () => {
    it('should increment both agent count and active agents', () => {
      limiter.incrementAgentCount();
      const usage = limiter.getUsage();
      expect(usage.agentCount).toBe(1);
      expect(usage.activeAgents).toBe(1);
    });
  });

  describe('decrementActiveAgents', () => {
    it('should decrement active agents', () => {
      limiter.incrementAgentCount();
      limiter.decrementActiveAgents();
      const usage = limiter.getUsage();
      expect(usage.activeAgents).toBe(0);
      expect(usage.agentCount).toBe(1); // Total count unchanged
    });

    it('should not go below zero', () => {
      limiter.decrementActiveAgents();
      const usage = limiter.getUsage();
      expect(usage.activeAgents).toBe(0);
    });
  });

  describe('session tracking', () => {
    it('should increment session count', () => {
      limiter.incrementSessionCount();
      expect(limiter.getUsage().sessionCount).toBe(1);
    });

    it('should decrement session count', () => {
      limiter.incrementSessionCount();
      limiter.incrementSessionCount();
      limiter.decrementSessionCount();
      expect(limiter.getUsage().sessionCount).toBe(1);
    });

    it('should not go below zero on decrement', () => {
      limiter.decrementSessionCount();
      expect(limiter.getUsage().sessionCount).toBe(0);
    });
  });

  describe('getUsage', () => {
    it('should return a copy of usage', () => {
      const usage1 = limiter.getUsage();
      const usage2 = limiter.getUsage();
      expect(usage1).not.toBe(usage2);
      expect(usage1).toEqual(usage2);
    });

    it('should return initial state', () => {
      const usage = limiter.getUsage();
      expect(usage).toEqual({
        agentCount: 0,
        activeAgents: 0,
        sessionCount: 0,
      });
    });
  });

  describe('reset', () => {
    it('should reset all counts to zero', () => {
      limiter.incrementAgentCount();
      limiter.incrementAgentCount();
      limiter.incrementSessionCount();
      limiter.reset();
      const usage = limiter.getUsage();
      expect(usage.agentCount).toBe(0);
      expect(usage.activeAgents).toBe(0);
      expect(usage.sessionCount).toBe(0);
    });
  });

  describe('isWithinLimits', () => {
    it('should return true when under all limits', () => {
      expect(limiter.isWithinLimits()).toBe(true);
    });

    it('should return true at exactly the limits', () => {
      limiter.incrementAgentCount();
      limiter.incrementAgentCount();
      limiter.incrementAgentCount();
      limiter.decrementActiveAgents(); // 3 agents, 2 active
      expect(limiter.isWithinLimits()).toBe(true);
    });

    it('should return false when over agent limit', () => {
      const smallLimiter = new ResourceLimiter(
        createConfig({ maxAgentsPerSession: 1, maxConcurrentAgents: 5 })
      );
      smallLimiter.incrementAgentCount();
      smallLimiter.incrementAgentCount();
      expect(smallLimiter.isWithinLimits()).toBe(false);
    });

    it('should return false when over concurrent agent limit', () => {
      const smallLimiter = new ResourceLimiter(
        createConfig({ maxAgentsPerSession: 10, maxConcurrentAgents: 1 })
      );
      smallLimiter.incrementAgentCount();
      smallLimiter.incrementAgentCount();
      expect(smallLimiter.isWithinLimits()).toBe(false);
    });
  });
});
