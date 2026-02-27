/**
 * Skill Routing Module
 *
 * Provides intent-based routing to match user input to appropriate skills.
 */

export {
  IntentRouter,
  RouteResult,
  RouteAlternative,
  SkillRegistryInterface,
} from './IntentRouter';
export { KeywordMatcher, KeywordMatch } from './KeywordMatcher';
export { SkillRegistry, SkillDefinition } from './SkillRegistry';
