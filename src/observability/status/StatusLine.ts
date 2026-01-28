/**
 * StatusLine - Real-time status display component
 *
 * Renders a status line showing: [model] Context: X% | Learning: Y | Agents: Z | Tasks: N
 * Supports real-time updates and customizable segments.
 */

import { EventEmitter } from 'events';
import {
  StatusLineData,
  StatusLineConfig,
  StatusSegment,
} from './types';

const DEFAULT_CONFIG: Required<Omit<StatusLineConfig, 'formatter'>> & Pick<StatusLineConfig, 'formatter'> = {
  updateInterval: 1000,
  showModel: true,
  showContext: true,
  showLearning: true,
  showAgents: true,
  showTasks: true,
  formatter: undefined,
};

export class StatusLine extends EventEmitter {
  private config: Required<Omit<StatusLineConfig, 'formatter'>> & Pick<StatusLineConfig, 'formatter'>;
  private data: StatusLineData;
  private updateTimer: NodeJS.Timeout | null = null;
  private running: boolean = false;
  private dataProviders: Map<string, () => Promise<Partial<StatusLineData>>> = new Map();

  constructor(config?: StatusLineConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.data = {
      model: 'unknown',
      contextUsage: 0,
      learningScore: 0,
      activeAgents: 0,
      pendingTasks: 0,
    };
  }

  /**
   * Start automatic status updates
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.scheduleUpdate();
    this.emit('started');
  }

  /**
   * Stop automatic status updates
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.emit('stopped');
  }

  /**
   * Check if the status line is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current status data
   */
  getData(): StatusLineData {
    return { ...this.data };
  }

  /**
   * Update status data manually
   */
  update(data: Partial<StatusLineData>): void {
    const changed = this.hasChanges(data);
    this.data = { ...this.data, ...data };

    if (changed) {
      this.emit('update', this.data);
    }
  }

  /**
   * Set the current model
   */
  setModel(model: string): void {
    this.update({ model });
  }

  /**
   * Set context usage percentage
   */
  setContextUsage(percentage: number): void {
    const clamped = Math.max(0, Math.min(100, percentage));
    this.update({ contextUsage: clamped });
  }

  /**
   * Set learning score
   */
  setLearningScore(score: number): void {
    this.update({ learningScore: score });
  }

  /**
   * Set active agent count
   */
  setActiveAgents(count: number): void {
    this.update({ activeAgents: Math.max(0, count) });
  }

  /**
   * Set pending task count
   */
  setPendingTasks(count: number): void {
    this.update({ pendingTasks: Math.max(0, count) });
  }

  /**
   * Add a custom segment
   */
  addSegment(segment: StatusSegment): void {
    const segments = this.data.customSegments || [];
    const existing = segments.findIndex(s => s.label === segment.label);

    if (existing >= 0) {
      segments[existing] = segment;
    } else {
      segments.push(segment);
    }

    this.update({ customSegments: segments });
  }

  /**
   * Remove a custom segment
   */
  removeSegment(label: string): void {
    const segments = this.data.customSegments || [];
    const filtered = segments.filter(s => s.label !== label);
    this.update({ customSegments: filtered.length > 0 ? filtered : undefined });
  }

  /**
   * Register a data provider for automatic updates
   */
  registerProvider(name: string, provider: () => Promise<Partial<StatusLineData>>): void {
    this.dataProviders.set(name, provider);
  }

  /**
   * Unregister a data provider
   */
  unregisterProvider(name: string): void {
    this.dataProviders.delete(name);
  }

  /**
   * Render the status line as a string
   */
  render(): string {
    if (this.config.formatter) {
      return this.config.formatter(this.data);
    }

    return this.defaultRender();
  }

  /**
   * Get the rendered status line with ANSI colors (for terminal)
   */
  renderColored(): string {
    const segments: string[] = [];

    if (this.config.showModel) {
      segments.push(`\x1b[36m[${this.data.model}]\x1b[0m`);
    }

    if (this.config.showContext) {
      const color = this.getContextColor(this.data.contextUsage);
      segments.push(`Context: ${color}${this.data.contextUsage.toFixed(1)}%\x1b[0m`);
    }

    if (this.config.showLearning) {
      segments.push(`Learning: \x1b[33m${this.data.learningScore}\x1b[0m`);
    }

    if (this.config.showAgents) {
      const color = this.data.activeAgents > 0 ? '\x1b[32m' : '\x1b[90m';
      segments.push(`Agents: ${color}${this.data.activeAgents}\x1b[0m`);
    }

    if (this.config.showTasks) {
      const color = this.data.pendingTasks > 0 ? '\x1b[35m' : '\x1b[90m';
      segments.push(`Tasks: ${color}${this.data.pendingTasks}\x1b[0m`);
    }

    // Add custom segments
    if (this.data.customSegments) {
      for (const seg of this.data.customSegments) {
        const color = this.getSegmentColor(seg.color);
        segments.push(`${seg.label}: ${color}${seg.value}\x1b[0m`);
      }
    }

    return segments.join(' | ');
  }

  /**
   * Force an immediate update from all providers
   */
  async refresh(): Promise<void> {
    await this.collectProviderData();
    this.emit('refresh', this.data);
  }

  /**
   * Get update interval
   */
  getUpdateInterval(): number {
    return this.config.updateInterval;
  }

  /**
   * Set update interval
   */
  setUpdateInterval(ms: number): void {
    this.config.updateInterval = Math.max(100, ms);

    // Restart timer if running
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  /**
   * Default rendering without colors
   */
  private defaultRender(): string {
    const segments: string[] = [];

    if (this.config.showModel) {
      segments.push(`[${this.data.model}]`);
    }

    if (this.config.showContext) {
      segments.push(`Context: ${this.data.contextUsage.toFixed(1)}%`);
    }

    if (this.config.showLearning) {
      segments.push(`Learning: ${this.data.learningScore}`);
    }

    if (this.config.showAgents) {
      segments.push(`Agents: ${this.data.activeAgents}`);
    }

    if (this.config.showTasks) {
      segments.push(`Tasks: ${this.data.pendingTasks}`);
    }

    // Add custom segments
    if (this.data.customSegments) {
      for (const seg of this.data.customSegments) {
        segments.push(`${seg.label}: ${seg.value}`);
      }
    }

    return segments.join(' | ');
  }

  /**
   * Schedule the next update
   */
  private scheduleUpdate(): void {
    if (!this.running) return;

    this.updateTimer = setTimeout(async () => {
      await this.collectProviderData();
      this.emit('tick', this.data);
      this.scheduleUpdate();
    }, this.config.updateInterval);
  }

  /**
   * Collect data from all registered providers
   */
  private async collectProviderData(): Promise<void> {
    const updates: Partial<StatusLineData> = {};

    for (const [, provider] of this.dataProviders) {
      try {
        const data = await provider();
        Object.assign(updates, data);
      } catch (error) {
        this.emit('error', error);
      }
    }

    if (Object.keys(updates).length > 0) {
      this.update(updates);
    }
  }

  /**
   * Check if data has changes
   */
  private hasChanges(newData: Partial<StatusLineData>): boolean {
    for (const [key, value] of Object.entries(newData)) {
      if (this.data[key as keyof StatusLineData] !== value) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get ANSI color for context usage
   */
  private getContextColor(percentage: number): string {
    if (percentage >= 90) return '\x1b[31m'; // Red
    if (percentage >= 75) return '\x1b[33m'; // Yellow
    return '\x1b[32m'; // Green
  }

  /**
   * Get ANSI color for a segment
   */
  private getSegmentColor(color?: string): string {
    switch (color) {
      case 'success': return '\x1b[32m';
      case 'warning': return '\x1b[33m';
      case 'error': return '\x1b[31m';
      case 'info': return '\x1b[36m';
      default: return '\x1b[37m';
    }
  }
}
