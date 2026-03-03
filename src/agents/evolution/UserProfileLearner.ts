import * as fs from 'fs/promises';
import * as path from 'path';
import {
  UserCapabilityProfile,
  WorkflowPattern,
  UserProfileData,
  SerializedUserCapabilityProfile,
} from './types';

const MIN_PATTERN_LENGTH = 2;
const MIN_PATTERN_FREQUENCY = 2;

export class UserProfileLearner {
  private readonly profilePath: string;
  private profile: UserCapabilityProfile;
  private workflowSteps: Array<{ step: string; context: string; timestamp: Date }> = [];
  private strengthEvidence: Array<{ area: string; evidence: string; timestamp: Date }> = [];
  private weaknessEvidence: Array<{ area: string; evidence: string; timestamp: Date }> = [];
  private decisionLog: Array<{ decision: string; context: string; timestamp: Date }> = [];

  constructor(profilePath: string) {
    this.profilePath = profilePath;
    this.profile = this.emptyProfile();
  }

  recordWorkflowStep(step: string, context: string): void {
    this.workflowSteps.push({ step, context, timestamp: new Date() });
  }

  recordPreference(key: string, value: string): void {
    this.profile.codePreferences[key] = value;
    this.profile.lastUpdated = new Date();
  }

  recordStrength(area: string, evidence: string): void {
    this.strengthEvidence.push({ area, evidence, timestamp: new Date() });

    if (!this.profile.strengths.includes(area)) {
      this.profile.strengths.push(area);
      this.profile.lastUpdated = new Date();
    }
  }

  recordWeakness(area: string, evidence: string): void {
    this.weaknessEvidence.push({ area, evidence, timestamp: new Date() });

    if (!this.profile.weaknesses.includes(area)) {
      this.profile.weaknesses.push(area);
      this.profile.lastUpdated = new Date();
    }
  }

  recordDecisionPattern(decision: string, context: string): void {
    this.decisionLog.push({ decision, context, timestamp: new Date() });

    if (!this.profile.decisionPatterns.includes(decision)) {
      this.profile.decisionPatterns.push(decision);
      this.profile.lastUpdated = new Date();
    }
  }

  getProfile(): UserCapabilityProfile {
    return {
      ...this.profile,
      workflows: this.profile.workflows.map((w) => ({ ...w })),
      strengths: [...this.profile.strengths],
      weaknesses: [...this.profile.weaknesses],
      decisionPatterns: [...this.profile.decisionPatterns],
      codePreferences: { ...this.profile.codePreferences },
    };
  }

  suggestGapFilling(): string[] {
    const suggestions: string[] = [];

    for (const weakness of this.profile.weaknesses) {
      const isAlsoStrength = this.profile.strengths.includes(weakness);
      if (!isAlsoStrength) {
        suggestions.push(`Agent team could assist with: ${weakness}`);
      }
    }

    if (suggestions.length === 0 && this.profile.weaknesses.length === 0) {
      suggestions.push('Not enough data yet. Continue recording interactions to identify gaps.');
    }

    return suggestions;
  }

  detectWorkflowPatterns(): WorkflowPattern[] {
    if (this.workflowSteps.length < MIN_PATTERN_LENGTH) return [];

    const steps = this.workflowSteps.map((ws) => ws.step);
    const patternMap = new Map<string, { steps: string[]; count: number; lastIndex: number }>();

    // Sliding window to detect subsequences of length 2-4
    for (let windowSize = MIN_PATTERN_LENGTH; windowSize <= Math.min(4, steps.length); windowSize++) {
      for (let i = 0; i <= steps.length - windowSize; i++) {
        const subseq = steps.slice(i, i + windowSize);
        const key = subseq.join(' -> ');

        const existing = patternMap.get(key);
        if (existing) {
          existing.count++;
          existing.lastIndex = i;
        } else {
          patternMap.set(key, { steps: subseq, count: 1, lastIndex: i });
        }
      }
    }

    const patterns: WorkflowPattern[] = [];
    for (const [name, data] of patternMap) {
      if (data.count >= MIN_PATTERN_FREQUENCY) {
        // Use the timestamp of the last occurrence
        const lastTimestamp = this.workflowSteps[data.lastIndex]?.timestamp ?? new Date();
        patterns.push({
          name,
          steps: data.steps,
          frequency: data.count,
          lastSeen: lastTimestamp,
        });
      }
    }

    // Sort by frequency descending
    patterns.sort((a, b) => b.frequency - a.frequency);

    // Update profile with detected patterns
    this.profile.workflows = patterns;
    this.profile.lastUpdated = new Date();

    return patterns;
  }

  async save(): Promise<void> {
    const dir = path.dirname(this.profilePath);
    await fs.mkdir(dir, { recursive: true });

    const data: UserProfileData = {
      profile: this.serializeProfile(this.profile),
      workflowSteps: this.workflowSteps.map((ws) => ({
        step: ws.step,
        context: ws.context,
        timestamp: ws.timestamp.toISOString(),
      })),
      strengthEvidence: this.strengthEvidence.map((se) => ({
        area: se.area,
        evidence: se.evidence,
        timestamp: se.timestamp.toISOString(),
      })),
      weaknessEvidence: this.weaknessEvidence.map((we) => ({
        area: we.area,
        evidence: we.evidence,
        timestamp: we.timestamp.toISOString(),
      })),
      decisionLog: this.decisionLog.map((dl) => ({
        decision: dl.decision,
        context: dl.context,
        timestamp: dl.timestamp.toISOString(),
      })),
    };

    await fs.writeFile(this.profilePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.profilePath, 'utf-8');
      const data: UserProfileData = JSON.parse(raw);

      // Merge loaded data into current state (incremental, not overwrite)
      const loaded = this.deserializeProfile(data.profile);
      this.mergeProfile(loaded);

      // Merge evidence/logs — append any entries not already present
      const existingStepKeys = new Set(
        this.workflowSteps.map((ws) => `${ws.step}:${ws.timestamp.toISOString()}`)
      );
      for (const ws of data.workflowSteps) {
        const key = `${ws.step}:${ws.timestamp}`;
        if (!existingStepKeys.has(key)) {
          this.workflowSteps.push({
            step: ws.step,
            context: ws.context,
            timestamp: new Date(ws.timestamp),
          });
        }
      }

      const existingStrengthKeys = new Set(
        this.strengthEvidence.map((se) => `${se.area}:${se.timestamp.toISOString()}`)
      );
      for (const se of data.strengthEvidence) {
        const key = `${se.area}:${se.timestamp}`;
        if (!existingStrengthKeys.has(key)) {
          this.strengthEvidence.push({
            area: se.area,
            evidence: se.evidence,
            timestamp: new Date(se.timestamp),
          });
        }
      }

      const existingWeaknessKeys = new Set(
        this.weaknessEvidence.map((we) => `${we.area}:${we.timestamp.toISOString()}`)
      );
      for (const we of data.weaknessEvidence) {
        const key = `${we.area}:${we.timestamp}`;
        if (!existingWeaknessKeys.has(key)) {
          this.weaknessEvidence.push({
            area: we.area,
            evidence: we.evidence,
            timestamp: new Date(we.timestamp),
          });
        }
      }

      const existingDecisionKeys = new Set(
        this.decisionLog.map((dl) => `${dl.decision}:${dl.timestamp.toISOString()}`)
      );
      for (const dl of data.decisionLog) {
        const key = `${dl.decision}:${dl.timestamp}`;
        if (!existingDecisionKeys.has(key)) {
          this.decisionLog.push({
            decision: dl.decision,
            context: dl.context,
            timestamp: new Date(dl.timestamp),
          });
        }
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        // File doesn't exist — start with empty profile
        return;
      }
      throw error;
    }
  }

  private emptyProfile(): UserCapabilityProfile {
    return {
      strengths: [],
      weaknesses: [],
      workflows: [],
      communicationStyle: '',
      decisionPatterns: [],
      codePreferences: {},
      lastUpdated: new Date(),
    };
  }

  private mergeProfile(loaded: UserCapabilityProfile): void {
    // Merge arrays (union, no duplicates)
    for (const s of loaded.strengths) {
      if (!this.profile.strengths.includes(s)) this.profile.strengths.push(s);
    }
    for (const w of loaded.weaknesses) {
      if (!this.profile.weaknesses.includes(w)) this.profile.weaknesses.push(w);
    }
    for (const d of loaded.decisionPatterns) {
      if (!this.profile.decisionPatterns.includes(d)) this.profile.decisionPatterns.push(d);
    }

    // Merge code preferences (loaded values take priority for existing keys)
    this.profile.codePreferences = { ...loaded.codePreferences, ...this.profile.codePreferences };

    // Use loaded communication style if current is empty
    if (!this.profile.communicationStyle && loaded.communicationStyle) {
      this.profile.communicationStyle = loaded.communicationStyle;
    }

    // Merge workflows
    const existingNames = new Set(this.profile.workflows.map((w) => w.name));
    for (const wf of loaded.workflows) {
      if (!existingNames.has(wf.name)) {
        this.profile.workflows.push(wf);
      }
    }
  }

  private serializeProfile(profile: UserCapabilityProfile): SerializedUserCapabilityProfile {
    return {
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      workflows: profile.workflows.map((w) => ({
        name: w.name,
        steps: w.steps,
        frequency: w.frequency,
        lastSeen: w.lastSeen.toISOString(),
      })),
      communicationStyle: profile.communicationStyle,
      decisionPatterns: profile.decisionPatterns,
      codePreferences: profile.codePreferences,
      lastUpdated: profile.lastUpdated.toISOString(),
    };
  }

  private deserializeProfile(sp: SerializedUserCapabilityProfile): UserCapabilityProfile {
    return {
      strengths: sp.strengths,
      weaknesses: sp.weaknesses,
      workflows: sp.workflows.map((w) => ({
        name: w.name,
        steps: w.steps,
        frequency: w.frequency,
        lastSeen: new Date(w.lastSeen),
      })),
      communicationStyle: sp.communicationStyle,
      decisionPatterns: sp.decisionPatterns,
      codePreferences: sp.codePreferences,
      lastUpdated: new Date(sp.lastUpdated),
    };
  }
}
