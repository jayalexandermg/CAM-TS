import { Agent } from '../Agent';
import { AgentResult } from '../types';
import {
  SpotCheckConfig,
  SpotCheckValidator,
  SpotCheckResult,
  AgentExecutionResult,
} from './types';

export class SpotCheck {
  private config: SpotCheckConfig;
  private validators: SpotCheckValidator[];

  constructor(config: SpotCheckConfig) {
    this.config = {
      enabled: config.enabled,
      sampleRate: config.sampleRate ?? 1.0,
      validators: config.validators ?? [],
      failOnError: config.failOnError ?? true,
    };
    this.validators = this.config.validators ?? [];
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getSampleRate(): number {
    return this.config.sampleRate ?? 1.0;
  }

  getFailOnError(): boolean {
    return this.config.failOnError ?? true;
  }

  addValidator(validator: SpotCheckValidator): void {
    this.validators.push(validator);
  }

  removeValidator(name: string): boolean {
    const index = this.validators.findIndex((v) => v.name === name);
    if (index === -1) {
      return false;
    }
    this.validators.splice(index, 1);
    return true;
  }

  getValidators(): SpotCheckValidator[] {
    return [...this.validators];
  }

  shouldCheck(): boolean {
    if (!this.config.enabled) {
      return false;
    }
    return Math.random() < (this.config.sampleRate ?? 1.0);
  }

  validate(result: AgentResult, agent: Agent): SpotCheckResult[] {
    if (!this.config.enabled || this.validators.length === 0) {
      return [];
    }

    const results: SpotCheckResult[] = [];

    for (const validator of this.validators) {
      try {
        const checkResult = validator.validate(result, agent);
        results.push(checkResult);
      } catch (error) {
        results.push({
          valid: false,
          validatorName: validator.name,
          message: `Validator threw error: ${(error as Error).message}`,
          details: { error: (error as Error).message },
        });
      }
    }

    return results;
  }

  validateAll(
    executionResults: AgentExecutionResult[],
    agents: Map<string, Agent>
  ): Map<string, SpotCheckResult[]> {
    const checkResults = new Map<string, SpotCheckResult[]>();

    for (const execResult of executionResults) {
      if (!this.shouldCheck()) {
        continue;
      }

      const agent = agents.get(execResult.agentId);
      if (!agent) {
        checkResults.set(execResult.agentId, [
          {
            valid: false,
            validatorName: 'system',
            message: 'Agent not found for validation',
          },
        ]);
        continue;
      }

      const results = this.validate(execResult.result, agent);
      if (results.length > 0) {
        checkResults.set(execResult.agentId, results);
      }
    }

    return checkResults;
  }

  allPassed(results: SpotCheckResult[]): boolean {
    return results.every((r) => r.valid);
  }

  getFailedResults(results: SpotCheckResult[]): SpotCheckResult[] {
    return results.filter((r) => !r.valid);
  }

  static createSuccessValidator(): SpotCheckValidator {
    return {
      name: 'success-check',
      validate: (result: AgentResult): SpotCheckResult => ({
        valid: result.success,
        validatorName: 'success-check',
        message: result.success ? 'Result is successful' : 'Result failed',
      }),
    };
  }

  static createDataPresentValidator(): SpotCheckValidator {
    return {
      name: 'data-present',
      validate: (result: AgentResult): SpotCheckResult => ({
        valid: result.data !== undefined && result.data !== null,
        validatorName: 'data-present',
        message:
          result.data !== undefined && result.data !== null
            ? 'Data is present'
            : 'Data is missing',
      }),
    };
  }

  static createNoErrorValidator(): SpotCheckValidator {
    return {
      name: 'no-error',
      validate: (result: AgentResult): SpotCheckResult => ({
        valid: result.error === undefined,
        validatorName: 'no-error',
        message:
          result.error === undefined
            ? 'No error present'
            : `Error found: ${result.error.message}`,
      }),
    };
  }

  static createCustomValidator(
    name: string,
    validationFn: (result: AgentResult, agent: Agent) => boolean,
    messageOnFail?: string
  ): SpotCheckValidator {
    return {
      name,
      validate: (result: AgentResult, agent: Agent): SpotCheckResult => {
        const valid = validationFn(result, agent);
        return {
          valid,
          validatorName: name,
          message: valid ? 'Validation passed' : messageOnFail ?? 'Validation failed',
        };
      },
    };
  }
}
