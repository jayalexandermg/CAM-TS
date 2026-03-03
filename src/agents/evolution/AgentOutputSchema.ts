import { AgentOutput } from './types';

const VALID_STATUSES = ['success', 'failure', 'partial', 'blocked'] as const;

export class AgentOutputSchema {
  validate(output: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (output === null || output === undefined || typeof output !== 'object') {
      return { valid: false, errors: ['Output must be a non-null object'] };
    }

    const obj = output as Record<string, unknown>;

    // Required string fields
    if (typeof obj.agentId !== 'string' || obj.agentId.length === 0) {
      errors.push('agentId is required and must be a non-empty string');
    }
    if (typeof obj.taskId !== 'string' || obj.taskId.length === 0) {
      errors.push('taskId is required and must be a non-empty string');
    }

    // Status enum
    if (!VALID_STATUSES.includes(obj.status as (typeof VALID_STATUSES)[number])) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    // Result object
    if (obj.result === null || obj.result === undefined || typeof obj.result !== 'object') {
      errors.push('result is required and must be an object');
    } else {
      const result = obj.result as Record<string, unknown>;
      if (typeof result.summary !== 'string') {
        errors.push('result.summary must be a string');
      }
      if (!Array.isArray(result.artifacts)) {
        errors.push('result.artifacts must be an array');
      }
      if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
        errors.push('result.confidence must be a number between 0 and 1');
      }
    }

    // Errors array
    if (!Array.isArray(obj.errors)) {
      errors.push('errors must be an array');
    } else {
      for (let i = 0; i < (obj.errors as unknown[]).length; i++) {
        const err = (obj.errors as Record<string, unknown>[])[i];
        if (typeof err !== 'object' || err === null) {
          errors.push(`errors[${i}] must be an object`);
          continue;
        }
        if (typeof err.code !== 'string') {
          errors.push(`errors[${i}].code must be a string`);
        }
        if (typeof err.message !== 'string') {
          errors.push(`errors[${i}].message must be a string`);
        }
        if (typeof err.recoverable !== 'boolean') {
          errors.push(`errors[${i}].recoverable must be a boolean`);
        }
      }
    }

    // Signals array
    if (!Array.isArray(obj.signals)) {
      errors.push('signals must be an array');
    }

    // Metadata
    if (obj.metadata === null || obj.metadata === undefined || typeof obj.metadata !== 'object') {
      errors.push('metadata must be an object');
    }

    return { valid: errors.length === 0, errors };
  }

  create(partial: Partial<AgentOutput>): AgentOutput {
    return {
      agentId: partial.agentId ?? '',
      taskId: partial.taskId ?? '',
      status: partial.status ?? 'success',
      result: {
        summary: partial.result?.summary ?? '',
        details: partial.result?.details ?? null,
        artifacts: partial.result?.artifacts ?? [],
        confidence: partial.result?.confidence ?? 0,
      },
      errors: partial.errors ?? [],
      signals: partial.signals ?? [],
      metadata: partial.metadata ?? {},
    };
  }

  summarize(output: AgentOutput): string {
    const errorCount = output.errors.length;
    const errorSuffix = errorCount > 0 ? ` (${errorCount} error${errorCount > 1 ? 's' : ''})` : '';
    return `[${output.agentId}] ${output.status}: ${output.result.summary}${errorSuffix}`;
  }
}
