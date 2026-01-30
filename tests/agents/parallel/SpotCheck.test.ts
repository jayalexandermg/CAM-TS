import { describe, it, expect, beforeEach } from '@jest/globals';
import { SpotCheck } from '../../../src/agents/parallel/SpotCheck';
import { Agent } from '../../../src/agents/Agent';
import { AgentResult, AgentDefinition } from '../../../src/agents/types';
import { SpotCheckValidator } from '../../../src/agents/parallel/types';

describe('SpotCheck', () => {
  const testDefinition: AgentDefinition = {
    name: 'test-agent',
    description: 'Test agent for spot checking',
    expertise: ['testing'],
    personality: ['precise'],
    communicationStyle: 'formal',
    approach: 'systematic',
    availableSkills: ['validate'],
  };

  const createAgent = (): Agent => {
    return new Agent({
      definition: testDefinition,
      sessionId: 'session-123',
    });
  };

  const createSuccessResult = (): AgentResult => ({
    success: true,
    data: { message: 'Test passed' },
    metadata: { duration: 100, retries: 0, skillsUsed: [] },
  });

  const createFailedResult = (): AgentResult => ({
    success: false,
    error: new Error('Test failed'),
    metadata: { duration: 50, retries: 0, skillsUsed: [] },
  });

  describe('constructor', () => {
    it('should create SpotCheck with default values', () => {
      const spotCheck = new SpotCheck({ enabled: true });

      expect(spotCheck.isEnabled()).toBe(true);
      expect(spotCheck.getSampleRate()).toBe(1.0);
      expect(spotCheck.getFailOnError()).toBe(true);
      expect(spotCheck.getValidators()).toHaveLength(0);
    });

    it('should create SpotCheck with custom config', () => {
      const spotCheck = new SpotCheck({
        enabled: true,
        sampleRate: 0.5,
        failOnError: false,
      });

      expect(spotCheck.getSampleRate()).toBe(0.5);
      expect(spotCheck.getFailOnError()).toBe(false);
    });

    it('should create disabled SpotCheck', () => {
      const spotCheck = new SpotCheck({ enabled: false });

      expect(spotCheck.isEnabled()).toBe(false);
    });
  });

  describe('validator management', () => {
    let spotCheck: SpotCheck;

    beforeEach(() => {
      spotCheck = new SpotCheck({ enabled: true });
    });

    it('should add validator', () => {
      const validator = SpotCheck.createSuccessValidator();
      spotCheck.addValidator(validator);

      expect(spotCheck.getValidators()).toHaveLength(1);
      expect(spotCheck.getValidators()[0].name).toBe('success-check');
    });

    it('should add multiple validators', () => {
      spotCheck.addValidator(SpotCheck.createSuccessValidator());
      spotCheck.addValidator(SpotCheck.createDataPresentValidator());
      spotCheck.addValidator(SpotCheck.createNoErrorValidator());

      expect(spotCheck.getValidators()).toHaveLength(3);
    });

    it('should remove validator by name', () => {
      spotCheck.addValidator(SpotCheck.createSuccessValidator());
      spotCheck.addValidator(SpotCheck.createDataPresentValidator());

      const removed = spotCheck.removeValidator('success-check');

      expect(removed).toBe(true);
      expect(spotCheck.getValidators()).toHaveLength(1);
      expect(spotCheck.getValidators()[0].name).toBe('data-present');
    });

    it('should return false when removing non-existent validator', () => {
      const removed = spotCheck.removeValidator('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('shouldCheck', () => {
    it('should return false when disabled', () => {
      const spotCheck = new SpotCheck({ enabled: false });

      // Should always return false when disabled
      for (let i = 0; i < 10; i++) {
        expect(spotCheck.shouldCheck()).toBe(false);
      }
    });

    it('should return true with 100% sample rate', () => {
      const spotCheck = new SpotCheck({ enabled: true, sampleRate: 1.0 });

      // Should always return true with 100% sample rate
      for (let i = 0; i < 10; i++) {
        expect(spotCheck.shouldCheck()).toBe(true);
      }
    });

    it('should return false with 0% sample rate', () => {
      const spotCheck = new SpotCheck({ enabled: true, sampleRate: 0 });

      // Should always return false with 0% sample rate
      for (let i = 0; i < 10; i++) {
        expect(spotCheck.shouldCheck()).toBe(false);
      }
    });
  });

  describe('validate', () => {
    let spotCheck: SpotCheck;
    let agent: Agent;

    beforeEach(() => {
      spotCheck = new SpotCheck({ enabled: true });
      agent = createAgent();
    });

    it('should return empty array when disabled', () => {
      spotCheck = new SpotCheck({ enabled: false });
      spotCheck.addValidator(SpotCheck.createSuccessValidator());

      const results = spotCheck.validate(createSuccessResult(), agent);

      expect(results).toHaveLength(0);
    });

    it('should return empty array with no validators', () => {
      const results = spotCheck.validate(createSuccessResult(), agent);
      expect(results).toHaveLength(0);
    });

    it('should validate with success validator on successful result', () => {
      spotCheck.addValidator(SpotCheck.createSuccessValidator());

      const results = spotCheck.validate(createSuccessResult(), agent);

      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(true);
      expect(results[0].validatorName).toBe('success-check');
    });

    it('should validate with success validator on failed result', () => {
      spotCheck.addValidator(SpotCheck.createSuccessValidator());

      const results = spotCheck.validate(createFailedResult(), agent);

      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(false);
    });

    it('should validate with data-present validator', () => {
      spotCheck.addValidator(SpotCheck.createDataPresentValidator());

      const results = spotCheck.validate(createSuccessResult(), agent);

      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(true);
    });

    it('should fail data-present when data is undefined', () => {
      spotCheck.addValidator(SpotCheck.createDataPresentValidator());

      const result: AgentResult = { success: true };
      const results = spotCheck.validate(result, agent);

      expect(results[0].valid).toBe(false);
    });

    it('should validate with no-error validator', () => {
      spotCheck.addValidator(SpotCheck.createNoErrorValidator());

      const successResults = spotCheck.validate(createSuccessResult(), agent);
      expect(successResults[0].valid).toBe(true);

      const failedResults = spotCheck.validate(createFailedResult(), agent);
      expect(failedResults[0].valid).toBe(false);
    });

    it('should run multiple validators', () => {
      spotCheck.addValidator(SpotCheck.createSuccessValidator());
      spotCheck.addValidator(SpotCheck.createDataPresentValidator());
      spotCheck.addValidator(SpotCheck.createNoErrorValidator());

      const results = spotCheck.validate(createSuccessResult(), agent);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.valid)).toBe(true);
    });

    it('should handle validator errors gracefully', () => {
      const throwingValidator: SpotCheckValidator = {
        name: 'throwing-validator',
        validate: () => {
          throw new Error('Validator error');
        },
      };
      spotCheck.addValidator(throwingValidator);

      const results = spotCheck.validate(createSuccessResult(), agent);

      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(false);
      expect(results[0].message).toContain('Validator threw error');
    });
  });

  describe('custom validators', () => {
    it('should create custom validator', () => {
      const customValidator = SpotCheck.createCustomValidator(
        'duration-check',
        (result) => (result.metadata?.duration ?? 0) < 1000,
        'Duration exceeds limit'
      );

      const spotCheck = new SpotCheck({ enabled: true, validators: [customValidator] });
      const agent = createAgent();

      const results = spotCheck.validate(createSuccessResult(), agent);

      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(true);
      expect(results[0].validatorName).toBe('duration-check');
    });

    it('should fail custom validator when condition not met', () => {
      const customValidator = SpotCheck.createCustomValidator(
        'duration-check',
        (result) => (result.metadata?.duration ?? 0) < 50,
        'Duration exceeds limit'
      );

      const spotCheck = new SpotCheck({ enabled: true, validators: [customValidator] });
      const agent = createAgent();

      const results = spotCheck.validate(createSuccessResult(), agent);

      expect(results[0].valid).toBe(false);
      expect(results[0].message).toBe('Duration exceeds limit');
    });
  });

  describe('result helpers', () => {
    let spotCheck: SpotCheck;

    beforeEach(() => {
      spotCheck = new SpotCheck({ enabled: true });
    });

    it('should check if all results passed', () => {
      const allPassed = [
        { valid: true, validatorName: 'v1' },
        { valid: true, validatorName: 'v2' },
      ];

      expect(spotCheck.allPassed(allPassed)).toBe(true);
    });

    it('should return false if any result failed', () => {
      const someFailed = [
        { valid: true, validatorName: 'v1' },
        { valid: false, validatorName: 'v2' },
      ];

      expect(spotCheck.allPassed(someFailed)).toBe(false);
    });

    it('should get failed results', () => {
      const mixed = [
        { valid: true, validatorName: 'v1' },
        { valid: false, validatorName: 'v2' },
        { valid: false, validatorName: 'v3' },
      ];

      const failed = spotCheck.getFailedResults(mixed);

      expect(failed).toHaveLength(2);
      expect(failed[0].validatorName).toBe('v2');
      expect(failed[1].validatorName).toBe('v3');
    });
  });
});
