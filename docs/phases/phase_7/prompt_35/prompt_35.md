 Prompt_35

```
PROMPT 35: Sentiment Capture Hooks

[CONTEXT]
CAM Enhancement - Phase 10: Observability
Repository: /home/ubuntu/github_repos/CAM-TS
Depends on: Prompt 34 (Enhanced Audit Logger)

Implement hooks for capturing explicit and implicit user sentiment.

[TASK]
Create sentiment capture hooks that detect ratings and feedback.

## Part 1: Create src/hooks/sentiment/types.ts
```typescript
export interface ExplicitRating {
  value: number;          // 1-10
  original: string;       // Original text that contained rating
  targetType: 'response' | 'agent' | 'skill' | 'session';
  targetId?: string;
  comment?: string;
  timestamp: Date;
}

export interface ImplicitSentiment {
  score: number;          // -1 to 1 (negative to positive)
  confidence: number;     // 0 to 1
  indicators: string[];   // Words/phrases that indicated sentiment
  text: string;           // Original text analyzed
  timestamp: Date;
}

export interface SentimentData {
  explicit: ExplicitRating[];
  implicit: ImplicitSentiment[];
  averageExplicit: number;
  averageImplicit: number;
  totalRatings: number;
}
```

## Part 2: Create src/hooks/sentiment/ExplicitRatingCapture.hook.ts
```typescript
import * as fs from 'fs/promises';
import { ExplicitRating } from './types';

export class ExplicitRatingCapture {
  private patterns = [
    /(\d+)\s*\/\s*10/,                    // X/10
    /(\d+)\s+out\s+of\s+10/i,             // X out of 10
    /rate\s+(?:this\s+)?(\d+)/i,          // rate this X
    /(\d+)\s*stars?/i,                    // X stars
    /score[:\s]+(\d+)/i,                  // score: X
    /rating[:\s]+(\d+)/i,                 // rating: X
  ];

  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || './data/ratings.jsonl';
  }

  /**
   * Attempt to capture explicit rating from user input
   */
  capture(userInput: string): ExplicitRating | null {
    for (const pattern of this.patterns) {
      const match = userInput.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        if (value >= 1 && value <= 10) {
          return {
            value,
            original: userInput,
            targetType: this.inferTargetType(userInput),
            timestamp: new Date()
          };
        }
      }
    }
    return null;
  }

  /**
   * Store captured rating
   */
  async store(rating: ExplicitRating): Promise<void> {
    const dir = this.storagePath.substring(0, this.storagePath.lastIndexOf('/'));
    await fs.mkdir(dir, { recursive: true });

    const line = JSON.stringify(rating) + '\n';
    await fs.appendFile(this.storagePath, line);
  }

  /**
   * Get all stored ratings
   */
  async getAll(): Promise<ExplicitRating[]> {
    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      return content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  /**
   * Get average rating
   */
  async getAverage(): Promise<number> {
    const ratings = await this.getAll();
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;
  }

  private inferTargetType(text: string): ExplicitRating['targetType'] {
    const lower = text.toLowerCase();
    if (lower.includes('session')) return 'session';
    if (lower.includes('agent')) return 'agent';
    if (lower.includes('skill')) return 'skill';
    return 'response';
  }
}
```

## Part 3: Create src/hooks/sentiment/ImplicitSentimentCapture.hook.ts
```typescript
import { ImplicitSentiment } from './types';

export class ImplicitSentimentCapture {
  private positiveIndicators = [
    'great', 'awesome', 'perfect', 'excellent', 'amazing',
    'love', 'fantastic', 'wonderful', 'brilliant', 'superb',
    'thank you', 'thanks', 'helpful', 'useful', 'exactly',
    'well done', 'nice', 'good job', '👍', '❤️', '🎉'
  ];

  private negativeIndicators = [
    'wrong', 'bad', 'terrible', 'awful', 'horrible',
    'useless', 'broken', 'fix', 'error', 'mistake',
    'doesn\'t work', 'not working', 'failed', 'incorrect',
    'disappointing', 'frustrated', 'annoyed', '👎', '😡'
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

    const positiveMatches = this.positiveIndicators.filter(ind =>
      lower.includes(ind.toLowerCase())
    );
    const negativeMatches = this.negativeIndicators.filter(ind =>
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
      indicators: [...positiveMatches, ...negativeMatches.map(n => `[-]${n}`)],
      text,
      timestamp: new Date()
    };
  }

  /**
   * Store sentiment analysis
   */
  async store(sentiment: ImplicitSentiment): Promise<void> {
    if (sentiment.confidence < 0.2) return; // Don't store low-confidence

    const fs = await import('fs/promises');
    const dir = this.storagePath.substring(0, this.storagePath.lastIndexOf('/'));
    await fs.mkdir(dir, { recursive: true });

    const line = JSON.stringify(sentiment) + '\n';
    await fs.appendFile(this.storagePath, line);
  }

  /**
   * Get sentiment trend
   */
  async getTrend(limit: number = 100): Promise<{ average: number; trend: 'improving' | 'declining' | 'stable' }> {
    const fs = await import('fs/promises');

    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      const sentiments = content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as ImplicitSentiment)
        .slice(-limit);

      if (sentiments.length < 2) {
        return { average: 0, trend: 'stable' };
      }

      const average = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

      // Compare first half to second half
      const midpoint = Math.floor(sentiments.length / 2);
      const firstHalf = sentiments.slice(0, midpoint);
      const secondHalf = sentiments.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (secondAvg - firstAvg > 0.1) trend = 'improving';
      else if (firstAvg - secondAvg > 0.1) trend = 'declining';

      return { average, trend };
    } catch {
      return { average: 0, trend: 'stable' };
    }
  }
}
```

## Part 4: Create src/hooks/sentiment/index.ts
```typescript
export * from './types';
export { ExplicitRatingCapture } from './ExplicitRatingCapture.hook';
export { ImplicitSentimentCapture } from './ImplicitSentimentCapture.hook';
```

## Part 5: Create tests/hooks/sentiment/SentimentCapture.test.ts
Write 20+ tests covering all patterns and edge cases.

[VERIFICATION]
Show me:
1. ExplicitRatingCapture.hook.ts content
2. ImplicitSentimentCapture.hook.ts content
3. Test output

[SUCCESS CRITERIA]
✅ Explicit rating patterns detected (X/10, X stars, etc.)
✅ Implicit sentiment analyzed with confidence scores
✅ Ratings stored in ratings.jsonl
✅ Sentiment stored in sentiment.jsonl
✅ Trend calculation working
✅ 20+ tests passing
```

end of Prompt_35
