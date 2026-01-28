export interface ExplicitRating {
  value: number; // 1-10
  original: string; // Original text that contained rating
  targetType: 'response' | 'agent' | 'skill' | 'session';
  targetId?: string;
  comment?: string;
  timestamp: Date;
}

export interface ImplicitSentiment {
  score: number; // -1 to 1 (negative to positive)
  confidence: number; // 0 to 1
  indicators: string[]; // Words/phrases that indicated sentiment
  text: string; // Original text analyzed
  timestamp: Date;
}

export interface SentimentData {
  explicit: ExplicitRating[];
  implicit: ImplicitSentiment[];
  averageExplicit: number;
  averageImplicit: number;
  totalRatings: number;
}
