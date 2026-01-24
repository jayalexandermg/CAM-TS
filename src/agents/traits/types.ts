export interface TraitDefinition {
  name: string;
  description: string;
  keywords?: string[];
  prompt_fragment?: string;
}

export interface TraitsData {
  expertise: Record<string, TraitDefinition>;
  personality: Record<string, TraitDefinition>;
  approach: Record<string, TraitDefinition>;
  examples: Record<string, {
    description: string;
    traits: string[];
  }>;
}

export type TraitCategory = 'expertise' | 'personality' | 'approach';

export interface ComposedTraits {
  expertise: TraitDefinition[];
  personality: TraitDefinition[];
  approach: TraitDefinition[];
}

export interface TraitMatch {
  trait: string;
  category: TraitCategory;
  confidence: number;
  matchedKeywords: string[];
}
