import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TraitPerformance,
  EvolutionRecord,
  FeedbackEntry,
  TraitEvolutionData,
  SerializedEvolutionRecord,
  SerializedFeedbackEntry,
} from './types';

const MIN_SAMPLE_SIZE = 5;
const HIGH_SUCCESS_THRESHOLD = 0.8;
const LOW_SUCCESS_THRESHOLD = 0.4;
const WEIGHT_BOOST = 0.1;
const WEIGHT_PENALTY = 0.1;

export class TraitEvolution {
  private records: Map<string, EvolutionRecord> = new Map();
  private feedback: FeedbackEntry[] = [];
  private readonly dataPath: string;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  recordFeedback(entry: FeedbackEntry): void {
    this.feedback.push(entry);

    const comboKey = this.comboKey(entry.assignedTraits, entry.taskCategory);

    // Update or create performance record for each trait in the combo
    for (const trait of entry.assignedTraits) {
      let record = this.records.get(trait);
      if (!record) {
        record = {
          trait,
          performanceHistory: [],
          currentWeight: 1.0,
          adjustments: [],
        };
        this.records.set(trait, record);
      }

      // Find or create performance entry for this combo + category
      let perf = record.performanceHistory.find(
        (p) => this.comboKey(p.traitCombo, p.taskCategory) === comboKey
      );
      if (!perf) {
        perf = {
          traitCombo: [...entry.assignedTraits],
          taskCategory: entry.taskCategory,
          successRate: 0,
          avgTokenUsage: 0,
          avgExecutionTime: 0,
          sampleSize: 0,
        };
        record.performanceHistory.push(perf);
      }

      // Incrementally update stats
      const oldSize = perf.sampleSize;
      const newSize = oldSize + 1;
      const successValue = entry.outcome === 'success' ? 1 : entry.outcome === 'partial' ? 0.5 : 0;

      perf.successRate = (perf.successRate * oldSize + successValue) / newSize;
      perf.avgTokenUsage = (perf.avgTokenUsage * oldSize + entry.tokenUsage) / newSize;
      perf.avgExecutionTime = (perf.avgExecutionTime * oldSize + entry.executionTime) / newSize;
      perf.sampleSize = newSize;
    }
  }

  analyzePerformance(taskCategory: string): TraitPerformance[] {
    const results: TraitPerformance[] = [];

    for (const record of this.records.values()) {
      for (const perf of record.performanceHistory) {
        if (perf.taskCategory === taskCategory && perf.sampleSize >= MIN_SAMPLE_SIZE) {
          results.push({ ...perf });
        }
      }
    }

    // Sort by success rate descending
    results.sort((a, b) => b.successRate - a.successRate);

    // Deduplicate by trait combo key
    const seen = new Set<string>();
    return results.filter((p) => {
      const key = this.comboKey(p.traitCombo, p.taskCategory);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  adjustWeights(): void {
    for (const record of this.records.values()) {
      for (const perf of record.performanceHistory) {
        if (perf.sampleSize < MIN_SAMPLE_SIZE) continue;

        const oldWeight = record.currentWeight;
        let newWeight = oldWeight;
        let reason = '';

        if (perf.successRate >= HIGH_SUCCESS_THRESHOLD) {
          newWeight = Math.min(oldWeight + WEIGHT_BOOST, 2.0);
          reason = `High success rate (${(perf.successRate * 100).toFixed(0)}%) for ${perf.taskCategory}`;
        } else if (perf.successRate <= LOW_SUCCESS_THRESHOLD) {
          newWeight = Math.max(oldWeight - WEIGHT_PENALTY, 0.1);
          reason = `Low success rate (${(perf.successRate * 100).toFixed(0)}%) for ${perf.taskCategory}`;
        }

        if (newWeight !== oldWeight) {
          record.currentWeight = newWeight;
          record.adjustments.push({
            timestamp: new Date(),
            oldWeight,
            newWeight,
            reason,
          });
        }
      }
    }
  }

  getRecommendedTraits(taskCategory: string): string[] {
    const performances = this.analyzePerformance(taskCategory);
    if (performances.length === 0) return [];

    // Return traits from the best-performing combo
    return [...performances[0].traitCombo];
  }

  getEvolutionHistory(): EvolutionRecord[] {
    return Array.from(this.records.values()).map((r) => ({
      ...r,
      performanceHistory: r.performanceHistory.map((p) => ({ ...p })),
      adjustments: r.adjustments.map((a) => ({ ...a })),
    }));
  }

  async save(): Promise<void> {
    const dir = path.dirname(this.dataPath);
    await fs.mkdir(dir, { recursive: true });

    const data: TraitEvolutionData = {
      records: Array.from(this.records.values()).map((r) => this.serializeRecord(r)),
      feedback: this.feedback.map((f) => this.serializeFeedback(f)),
    };

    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.dataPath, 'utf-8');
      const data: TraitEvolutionData = JSON.parse(raw);

      this.records = new Map();
      for (const sr of data.records) {
        this.records.set(sr.trait, this.deserializeRecord(sr));
      }

      this.feedback = data.feedback.map((sf) => this.deserializeFeedback(sf));
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        // File doesn't exist yet — start fresh
        this.records = new Map();
        this.feedback = [];
        return;
      }
      throw error;
    }
  }

  private comboKey(traits: string[], category: string): string {
    return [...traits].sort().join('+') + ':' + category;
  }

  private serializeRecord(record: EvolutionRecord): SerializedEvolutionRecord {
    return {
      trait: record.trait,
      performanceHistory: record.performanceHistory,
      currentWeight: record.currentWeight,
      adjustments: record.adjustments.map((a) => ({
        timestamp: a.timestamp.toISOString(),
        oldWeight: a.oldWeight,
        newWeight: a.newWeight,
        reason: a.reason,
      })),
    };
  }

  private deserializeRecord(sr: SerializedEvolutionRecord): EvolutionRecord {
    return {
      trait: sr.trait,
      performanceHistory: sr.performanceHistory,
      currentWeight: sr.currentWeight,
      adjustments: sr.adjustments.map((a) => ({
        timestamp: new Date(a.timestamp),
        oldWeight: a.oldWeight,
        newWeight: a.newWeight,
        reason: a.reason,
      })),
    };
  }

  private serializeFeedback(entry: FeedbackEntry): SerializedFeedbackEntry {
    return {
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    };
  }

  private deserializeFeedback(sf: SerializedFeedbackEntry): FeedbackEntry {
    return {
      ...sf,
      timestamp: new Date(sf.timestamp),
    };
  }
}
