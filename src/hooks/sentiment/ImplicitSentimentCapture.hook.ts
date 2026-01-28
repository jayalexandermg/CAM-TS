import * as fs from 'fs/promises';
import { ImplicitSentiment } from './types';

export class ImplicitSentimentCapture {
  private positiveIndicators = [
    'great',
    'awesome',
    'perfect',
    'excellent',
    'amazing',
    'love',
    'fantastic',
    'wonderful',
    'brilliant',
    'superb',
    'thank you',
    'thanks',
    'helpful',
    'useful',
    'exactly',
    'well done',
    'nice',
    'good job',
    '👍',
    '❤️',
    '🎉',
  ];

  private negativeIndicators = [
    'wrong',
    'bad',
    'terrible',
    'awful',
    'horrible',
    'useless',
    'broken',
    'fix',
    'error',
    'mistake',
    "doesn't work",
    'not working',
    'failed',
    'incorrect',
    'disappointing',
    'frustrated',
    'annoyed',
    '👎',
    '😡',
  ];

  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || './data/sentiment.jsonl';
  }

  /**
   * Analyze text for implicit sentiment
   */
  analyze(text: string): ImplicitSentiment {
    const lower = text.toLowerCase();

    const positiveMatches = this.positiveIndicators.filter((ind) =>
      lower.includes(ind.toLowerCase())
    );
    const negativeMatches = this.negativeIndicators.filter((ind) =>
      lower.includes(ind.toLowerCase())
    );

    const totalMatches = positiveMatches.length + negativeMatches.length;

    let score = 0;
    if (totalMatches > 0) {
      score = (positiveMatches.length - negativeMatches.length) / totalMatches;
    }

    // Confidence based on number of indicators found
    const confidence = Math.min(totalMatches * 0.2, 1);

    return {
      score,
      confidence,
      indicators: [
        ...positiveMatches,
        ...negativeMatches.map((n) => `[-]${n}`),
      ],
      text,
      timestamp: new Date(),
    };
  }

  /**
   * Store sentiment analysis
   */
  async store(sentiment: ImplicitSentiment): Promise<void> {
    if (sentiment.confidence < 0.2) return; // Don't store low-confidence

    const dir = this.storagePath.substring(
      0,
      this.storagePath.lastIndexOf('/')
    );
    await fs.mkdir(dir, { recursive: true });

    const line = JSON.stringify(sentiment) + '\n';
    await fs.appendFile(this.storagePath, line);
  }

  /**
   * Get sentiment trend
   */
  async getTrend(
    limit: number = 100
  ): Promise<{ average: number; trend: 'improving' | 'declining' | 'stable' }> {
    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      const sentiments = content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as ImplicitSentiment)
        .slice(-limit);

      if (sentiments.length < 2) {
        return { average: 0, trend: 'stable' };
      }

      const average =
        sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

      // Compare first half to second half
      const midpoint = Math.floor(sentiments.length / 2);
      const firstHalf = sentiments.slice(0, midpoint);
      const secondHalf = sentiments.slice(midpoint);

      const firstAvg =
        firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (secondAvg - firstAvg > 0.1) trend = 'improving';
      else if (firstAvg - secondAvg > 0.1) trend = 'declining';

      return { average, trend };
    } catch {
      return { average: 0, trend: 'stable' };
    }
  }
}
