/**
 * Infinite Aura - Validation Pipeline
 *
 * 3-layer validation hierarchy:
 *   Layer 1: Agent self-validation (schema + hard rules)
 *   Layer 2: E2E cross-agent consistency
 *   Layer 3: CAM approval (Constitution final gate)
 *
 * Each layer can short-circuit: if Layer 1 fails, Layer 2/3 don't run.
 */

import { Constitution, ConstitutionAction } from './Constitution';

// ============================================================================
// Types
// ============================================================================

export interface LayerResult {
  layer: 1 | 2 | 3;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  passed: boolean;
  layers: LayerResult[];
  shortCircuited: boolean;
  failedAtLayer: 1 | 2 | 3 | null;
}

export interface AgentOutput {
  agentId: string;
  data: Record<string, unknown>;
  schema?: Record<string, unknown>;
  action?: ConstitutionAction;
}

// ============================================================================
// Validation Pipeline
// ============================================================================

export class ValidationPipeline {
  private readonly constitution: Constitution;

  constructor(constitution: Constitution) {
    this.constitution = constitution;
  }

  /**
   * Run the full 3-layer validation pipeline.
   * Short-circuits on first layer failure.
   */
  validate(outputs: AgentOutput[]): ValidationResult {
    const layers: LayerResult[] = [];

    // Layer 1: Agent self-validation
    const layer1 = this.validateAgentOutputs(outputs);
    layers.push(layer1);
    if (!layer1.passed) {
      return {
        passed: false,
        layers,
        shortCircuited: true,
        failedAtLayer: 1,
      };
    }

    // Layer 2: E2E cross-agent consistency
    const layer2 = this.validateEndToEnd(outputs);
    layers.push(layer2);
    if (!layer2.passed) {
      return {
        passed: false,
        layers,
        shortCircuited: true,
        failedAtLayer: 2,
      };
    }

    // Layer 3: CAM approval (Constitution)
    const layer3 = this.validateFinal(outputs);
    layers.push(layer3);

    return {
      passed: layer3.passed,
      layers,
      shortCircuited: false,
      failedAtLayer: layer3.passed ? null : 3,
    };
  }

  /**
   * Layer 1: Agent self-validation.
   * Checks each output matches expected schema and hard rules are satisfied.
   */
  validateAgentOutputs(outputs: AgentOutput[]): LayerResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const output of outputs) {
      // Check required fields exist
      if (!output.agentId) {
        errors.push('Agent output missing agentId');
      }
      if (!output.data || typeof output.data !== 'object') {
        errors.push(`Agent '${output.agentId}': output data must be a non-null object`);
        continue;
      }

      // Schema validation: if schema is provided, check data matches
      if (output.schema) {
        const schemaErrors = this.validateSchema(output.data, output.schema, output.agentId);
        errors.push(...schemaErrors);
      }

      // Hard rules: data must not contain executable content
      const dataStr = JSON.stringify(output.data);
      if (dataStr.includes('<script') || dataStr.includes('javascript:')) {
        errors.push(`Agent '${output.agentId}': output contains potentially executable content`);
      }
    }

    return {
      layer: 1,
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Layer 2: E2E cross-agent consistency.
   * Checks for contradictions and verifies dependencies between agent outputs.
   */
  validateEndToEnd(outputs: AgentOutput[]): LayerResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (outputs.length <= 1) {
      return { layer: 2, passed: true, errors, warnings };
    }

    // Check for duplicate agent IDs (indicates a conflict)
    const agentIds = outputs.map((o) => o.agentId);
    const uniqueIds = new Set(agentIds);
    if (uniqueIds.size !== agentIds.length) {
      const duplicates = agentIds.filter((id, i) => agentIds.indexOf(id) !== i);
      errors.push(`Duplicate agent outputs detected: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Check cross-agent dependencies
    for (const output of outputs) {
      const deps = output.data.dependsOn as string[] | undefined;
      if (deps) {
        for (const dep of deps) {
          if (!agentIds.includes(dep)) {
            errors.push(
              `Agent '${output.agentId}' depends on '${dep}' which is not in the output set`
            );
          }
        }
      }
    }

    // Check for conflicting writes to the same target
    const targets = new Map<string, string>();
    for (const output of outputs) {
      const target = output.action?.target;
      if (target && output.action?.type === 'file_write') {
        const existing = targets.get(target);
        if (existing) {
          errors.push(
            `Conflicting writes: agents '${existing}' and '${output.agentId}' both target '${target}'`
          );
        } else {
          targets.set(target, output.agentId);
        }
      }
    }

    return {
      layer: 2,
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Layer 3: CAM approval via Constitution.
   * Runs Constitution.evaluate() on each action as the final gate.
   */
  validateFinal(outputs: AgentOutput[]): LayerResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const output of outputs) {
      if (!output.action) continue;

      const verdicts = this.constitution.evaluate(output.action);
      for (const verdict of verdicts) {
        if (!verdict.allowed) {
          errors.push(
            `Constitution rule '${verdict.rule}' blocked agent '${output.agentId}': ${verdict.reason}`
          );
        }
      }
    }

    return {
      layer: 3,
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Basic schema validation: checks that required keys from schema exist in data.
   */
  private validateSchema(
    data: Record<string, unknown>,
    schema: Record<string, unknown>,
    agentId: string
  ): string[] {
    const errors: string[] = [];

    const requiredFields = schema.required as string[] | undefined;
    if (requiredFields) {
      for (const field of requiredFields) {
        if (!(field in data)) {
          errors.push(`Agent '${agentId}': missing required field '${field}'`);
        }
      }
    }

    const properties = schema.properties as Record<string, { type?: string }> | undefined;
    if (properties) {
      for (const [key, spec] of Object.entries(properties)) {
        if (key in data && spec.type) {
          const actual = typeof data[key];
          if (spec.type === 'array') {
            if (!Array.isArray(data[key])) {
              errors.push(
                `Agent '${agentId}': field '${key}' should be array but got ${actual}`
              );
            }
          } else if (actual !== spec.type) {
            errors.push(
              `Agent '${agentId}': field '${key}' should be ${spec.type} but got ${actual}`
            );
          }
        }
      }
    }

    return errors;
  }
}
