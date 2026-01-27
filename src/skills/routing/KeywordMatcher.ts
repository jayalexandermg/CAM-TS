/**
 * KeywordMatcher - Keyword matching with scoring
 *
 * Matches keywords against text and calculates relevance scores
 * for intent-based skill routing.
 */

export interface KeywordMatch {
  keyword: string;
  position: number;
  score: number;
}

export class KeywordMatcher {
  /**
   * Match keywords against text with scoring
   */
  match(text: string, keywords: string[]): KeywordMatch[] {
    const normalizedText = text.toLowerCase();
    const matches: KeywordMatch[] = [];

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      const position = normalizedText.indexOf(normalizedKeyword);

      if (position !== -1) {
        // Score based on: exact match bonus, position (earlier = better), length
        let score = 0.5; // Base score for match

        // Exact word match bonus
        const wordBoundary = new RegExp(`\\b${this.escapeRegex(normalizedKeyword)}\\b`);
        if (wordBoundary.test(normalizedText)) {
          score += 0.3;
        }

        // Position bonus (earlier in text = higher score)
        score += (1 - position / normalizedText.length) * 0.2;

        matches.push({ keyword, position, score: Math.min(score, 1) });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate aggregate match score
   */
  aggregateScore(matches: KeywordMatch[], totalKeywords: number): number {
    if (matches.length === 0 || totalKeywords === 0) return 0;

    const coverage = matches.length / totalKeywords;
    const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;

    return coverage * 0.4 + avgScore * 0.6;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
