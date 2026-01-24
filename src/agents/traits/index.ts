/**
 * Trait Definition System Types
 *
 * TypeScript interfaces for the trait-based agent composition system.
 * These types define the structure of Traits.yaml and enable type-safe
 * trait manipulation throughout the codebase.
 */

/**
 * Base trait definition with common fields
 */
export interface TraitDefinition {
  /** Display name of the trait */
  name: string;
  /** Detailed description of what this trait represents */
  description: string;
  /** Optional text fragment injected into agent system prompts */
  prompt_fragment?: string;
}

/**
 * Expertise trait with keyword triggers for auto-detection
 */
export interface ExpertiseTrait extends TraitDefinition {
  /** Keywords that trigger automatic inference of this expertise */
  keywords: string[];
}

/**
 * Personality trait affecting agent interaction style
 */
export interface PersonalityTrait extends TraitDefinition {
  // Personality traits use the base definition
  // Additional fields can be added here if needed
}

/**
 * Approach trait defining problem-solving methodology
 */
export interface ApproachTrait extends TraitDefinition {
  // Approach traits use the base definition
  // Additional fields can be added here if needed
}

/**
 * Example composition showing how traits combine
 */
export interface TraitComposition {
  /** Display name of the composition */
  name: string;
  /** Description of the composed agent's purpose */
  description: string;
  /** Expertise trait keys to include */
  expertise: string[];
  /** Personality trait keys to include */
  personality: string[];
  /** Approach trait keys to include */
  approach: string[];
}

/**
 * Category of traits with string keys
 */
export type TraitCategory<T extends TraitDefinition> = Record<string, T>;

/**
 * Complete traits data structure matching Traits.yaml
 */
export interface TraitsData {
  /** Domain-specific knowledge areas */
  expertise: TraitCategory<ExpertiseTrait>;
  /** Behavioral characteristics */
  personality: TraitCategory<PersonalityTrait>;
  /** Problem-solving methodologies */
  approach: TraitCategory<ApproachTrait>;
  /** Example trait combinations */
  compositions: Record<string, TraitComposition>;
}

/**
 * Union type for any trait definition
 */
export type AnyTrait = ExpertiseTrait | PersonalityTrait | ApproachTrait;

/**
 * Trait type discriminator
 */
export type TraitType = 'expertise' | 'personality' | 'approach';

/**
 * Reference to a specific trait by type and key
 */
export interface TraitReference {
  type: TraitType;
  key: string;
}

/**
 * Resolved trait with its full definition
 */
export interface ResolvedTrait {
  type: TraitType;
  key: string;
  definition: TraitDefinition;
}

/**
 * Type guard to check if a trait is an ExpertiseTrait
 */
export function isExpertiseTrait(trait: TraitDefinition): trait is ExpertiseTrait {
  return 'keywords' in trait && Array.isArray((trait as ExpertiseTrait).keywords);
}

/**
 * Utility type for trait selection during agent composition
 */
export interface TraitSelection {
  expertise: string[];
  personality: string[];
  approach: string[];
}
