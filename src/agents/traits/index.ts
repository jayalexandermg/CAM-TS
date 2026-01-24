export * from './types';

import { TraitsData } from './types';

// Stub for TraitLoader (will be implemented in Prompt 22)
export async function loadTraits(): Promise<TraitsData> {
  throw new Error('TraitLoader not yet implemented - see Prompt 22');
}
