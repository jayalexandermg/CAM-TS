import * as fs from 'fs/promises';
import { ExplicitRating } from './types';

export class ExplicitRatingCapture {
  private patterns = [
    /(\d+)\s*\/\s*10/, // X/10
    /(\d+)\s+out\s+of\s+10/i, // X out of 10
    /rate\s+(?:this\s+)?(\d+)/i, // rate this X
    /(\d+)\s*stars?/i, // X stars
    /score[:\s]+(\d+)/i, // score: X
    /rating[:\s]+(\d+)/i, // rating: X
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
            timestamp: new Date(),
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
      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
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
