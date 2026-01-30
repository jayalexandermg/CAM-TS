/**
 * RLM Context Manager Type Definitions
 *
 * Types for context management that enables:
 * - Token limit enforcement
 * - Relevance scoring for reasoning steps
 * - Context compression while preserving meaning
 */

/**
 * Priority level for context items
 */
export type ContextPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Type of context content
 */
export type ContextType =
  | 'problem'        // Problem description
  | 'solution'       // Previous solutions
  | 'reasoning'      // Reasoning steps
  | 'constraint'     // Constraints
  | 'knowledge'      // Background knowledge
  | 'history'        // Conversation history
  | 'metadata';      // Metadata

/**
 * A single context item
 */
export interface ContextItem {
  /** Unique identifier */
  id: string;
  /** Content of the context item */
  content: string;
  /** Type of context */
  type: ContextType;
  /** Priority level */
  priority: ContextPriority;
  /** Timestamp when added */
  timestamp: Date;
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** Token count estimate */
  tokenCount: number;
  /** Source of the context */
  source?: string;
  /** Related problem IDs */
  relatedProblemIds?: string[];
  /** Whether this item is compressed */
  isCompressed: boolean;
  /** Original content if compressed */
  originalContent?: string;
  /** Compression ratio if compressed */
  compressionRatio?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for context manager
 */
export interface ContextManagerConfig {
  /** Maximum total tokens (default: 8000) */
  maxTokens: number;
  /** Characters per token estimate (default: 4) */
  charsPerToken: number;
  /** Minimum relevance score to include (default: 0.2) */
  minRelevanceScore: number;
  /** Enable automatic compression (default: true) */
  enableCompression: boolean;
  /** Compression threshold ratio (default: 0.7) - compress when usage exceeds this */
  compressionThreshold: number;
  /** Target compression ratio (default: 0.5) */
  targetCompressionRatio: number;
  /** Reserved tokens for system use (default: 500) */
  reservedTokens: number;
  /** Enable relevance decay over time (default: true) */
  enableRelevanceDecay: boolean;
  /** Decay rate per hour (default: 0.05) */
  relevanceDecayRate: number;
  /** Maximum age for context items in hours (default: 24) */
  maxAgeHours: number;
}

/**
 * Configuration for relevance scoring
 */
export interface RelevanceScorerConfig {
  /** Weight for keyword matching (default: 0.4) */
  keywordWeight: number;
  /** Weight for semantic similarity (default: 0.3) */
  semanticWeight: number;
  /** Weight for recency (default: 0.2) */
  recencyWeight: number;
  /** Weight for priority (default: 0.1) */
  priorityWeight: number;
  /** Minimum keyword length (default: 3) */
  minKeywordLength: number;
  /** Stop words to exclude */
  stopWords: Set<string>;
}

/**
 * Configuration for context compression
 */
export interface CompressorConfig {
  /** Minimum content length to compress (default: 100) */
  minContentLength: number;
  /** Maximum sentence length in summary (default: 150) */
  maxSentenceLength: number;
  /** Number of key sentences to extract (default: 3) */
  keySentenceCount: number;
  /** Enable extractive summarization (default: true) */
  extractive: boolean;
  /** Preserve numerical data (default: true) */
  preserveNumbers: boolean;
  /** Preserve code blocks (default: true) */
  preserveCode: boolean;
  /** Preserve lists (default: true) */
  preserveLists: boolean;
}

/**
 * Result of compression operation
 */
export interface CompressionResult {
  /** Compressed content */
  compressed: string;
  /** Original content */
  original: string;
  /** Compression ratio (compressed/original) */
  ratio: number;
  /** Tokens saved */
  tokensSaved: number;
  /** Key information preserved */
  preservedElements: string[];
  /** Information potentially lost */
  lostElements?: string[];
}

/**
 * Result of relevance scoring
 */
export interface RelevanceResult {
  /** Overall relevance score (0-1) */
  score: number;
  /** Keyword match score */
  keywordScore: number;
  /** Semantic similarity score */
  semanticScore: number;
  /** Recency score */
  recencyScore: number;
  /** Priority score */
  priorityScore: number;
  /** Matched keywords */
  matchedKeywords: string[];
  /** Explanation of scoring */
  explanation: string;
}

/**
 * Context window state
 */
export interface ContextWindow {
  /** All context items */
  items: ContextItem[];
  /** Current total tokens */
  totalTokens: number;
  /** Available tokens */
  availableTokens: number;
  /** Usage ratio (0-1) */
  usageRatio: number;
  /** Whether compression is active */
  compressionActive: boolean;
  /** Current query/problem for relevance */
  currentQuery?: string;
}

/**
 * Result of fitting context within limits
 */
export interface FitResult {
  /** Items that fit */
  included: ContextItem[];
  /** Items excluded due to limits */
  excluded: ContextItem[];
  /** Total tokens used */
  tokensUsed: number;
  /** Whether compression was applied */
  compressionApplied: boolean;
  /** Number of items compressed */
  itemsCompressed: number;
}

/**
 * Events emitted by context manager
 */
export interface ContextManagerEvents {
  /** Context item added */
  itemAdded: { item: ContextItem };
  /** Context item removed */
  itemRemoved: { item: ContextItem; reason: string };
  /** Context compressed */
  compressed: { before: number; after: number; ratio: number };
  /** Token limit warning */
  tokenLimitWarning: { current: number; max: number };
  /** Context window cleared */
  cleared: { itemCount: number };
  /** Relevance scores updated */
  relevanceUpdated: { query: string; itemCount: number };
}

/**
 * Default context manager configuration
 */
export const DEFAULT_CONTEXT_MANAGER_CONFIG: ContextManagerConfig = {
  maxTokens: 8000,
  charsPerToken: 4,
  minRelevanceScore: 0.2,
  enableCompression: true,
  compressionThreshold: 0.7,
  targetCompressionRatio: 0.5,
  reservedTokens: 500,
  enableRelevanceDecay: true,
  relevanceDecayRate: 0.05,
  maxAgeHours: 24,
};

/**
 * Default relevance scorer configuration
 */
export const DEFAULT_RELEVANCE_SCORER_CONFIG: RelevanceScorerConfig = {
  keywordWeight: 0.4,
  semanticWeight: 0.3,
  recencyWeight: 0.2,
  priorityWeight: 0.1,
  minKeywordLength: 3,
  stopWords: new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
    'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these',
    'those', 'what', 'which', 'who', 'whom', 'it', 'its', 'itself',
  ]),
};

/**
 * Default compressor configuration
 */
export const DEFAULT_COMPRESSOR_CONFIG: CompressorConfig = {
  minContentLength: 100,
  maxSentenceLength: 150,
  keySentenceCount: 3,
  extractive: true,
  preserveNumbers: true,
  preserveCode: true,
  preserveLists: true,
};

/**
 * Priority weights for scoring
 */
export const PRIORITY_WEIGHTS: Record<ContextPriority, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.2,
};

/**
 * Type weights for base relevance
 */
export const TYPE_WEIGHTS: Record<ContextType, number> = {
  problem: 1.0,
  constraint: 0.9,
  solution: 0.8,
  reasoning: 0.7,
  knowledge: 0.6,
  history: 0.4,
  metadata: 0.2,
};
