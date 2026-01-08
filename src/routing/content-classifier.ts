/**
 * Infinite Aura - Content Classifier
 *
 * Classifies events based on content and metadata for intelligent routing.
 */

import { HookEvent } from '../hooks/types';
import { Classification, TaskType, ClassifierOptions, DEFAULT_CLASSIFIER_OPTIONS } from './types';

/**
 * Content classifier for intelligent event routing
 *
 * Analyzes events to extract:
 * - Project ID
 * - Agent ID
 * - Task type
 * - Tags
 * - Confidence score
 */
export class ContentClassifier {
  private readonly options: Required<ClassifierOptions>;

  constructor(options: ClassifierOptions = {}) {
    this.options = {
      ...DEFAULT_CLASSIFIER_OPTIONS,
      ...options,
      taskTypeKeywords: {
        ...DEFAULT_CLASSIFIER_OPTIONS.taskTypeKeywords,
        ...options.taskTypeKeywords,
      },
    };
  }

  /**
   * Classify an event based on its content and metadata
   */
  classify(event: HookEvent): Classification {
    const projectId = this.extractProjectId(event);
    const agentId = this.extractAgentId(event);
    const taskType = this.inferTaskType(event);
    const tags = this.extractTags(event, projectId, agentId, taskType);

    const classification: Classification = {
      projectId,
      agentId,
      taskType,
      tags,
      confidence: 0,
    };

    classification.confidence = this.calculateConfidence(event, classification);

    return classification;
  }

  /**
   * Extract project ID from event metadata or content
   */
  private extractProjectId(event: HookEvent): string | undefined {
    // Check metadata first (highest confidence)
    if (event.metadata.projectId && typeof event.metadata.projectId === 'string') {
      return this.sanitizeId(event.metadata.projectId);
    }

    // Look for project mentions in content
    for (const pattern of this.options.projectPatterns) {
      const match = pattern.exec(event.content);
      if (match && match[1]) {
        return this.sanitizeId(match[1]);
      }
    }

    return undefined;
  }

  /**
   * Extract agent ID from event metadata or content
   */
  private extractAgentId(event: HookEvent): string | undefined {
    // Check metadata first (highest confidence)
    if (event.metadata.agentId && typeof event.metadata.agentId === 'string') {
      return this.sanitizeId(event.metadata.agentId);
    }

    // Look for agent mentions in content
    for (const pattern of this.options.agentPatterns) {
      const match = pattern.exec(event.content);
      if (match && match[1]) {
        return this.sanitizeId(match[1]);
      }
    }

    return undefined;
  }

  /**
   * Infer task type from event content and tags
   */
  private inferTaskType(event: HookEvent): TaskType {
    const content = event.content.toLowerCase();
    const metadataTags = Array.isArray(event.metadata.tags) ? event.metadata.tags : [];
    const searchText = `${content} ${metadataTags.join(' ')}`.toLowerCase();

    // Score each task type
    const scores: Map<TaskType, number> = new Map();

    for (const [taskType, keywords] of Object.entries(this.options.taskTypeKeywords)) {
      let score = 0;
      for (const keyword of keywords as string[]) {
        if (searchText.includes(keyword.toLowerCase())) {
          score += 1;
          // Bonus for exact word match
          const wordPattern = new RegExp(`\\b${keyword}\\b`, 'i');
          if (wordPattern.test(searchText)) {
            score += 0.5;
          }
        }
      }
      if (score > 0) {
        scores.set(taskType as TaskType, score);
      }
    }

    // Find highest scoring task type
    let maxScore = 0;
    let bestTaskType: TaskType = TaskType.OTHER;

    for (const [taskType, score] of scores) {
      if (score > maxScore) {
        maxScore = score;
        bestTaskType = taskType;
      }
    }

    return bestTaskType;
  }

  /**
   * Extract and generate tags from event
   */
  private extractTags(
    event: HookEvent,
    projectId?: string,
    agentId?: string,
    taskType?: TaskType
  ): string[] {
    const tags: Set<string> = new Set();

    // Use metadata tags if present
    if (event.metadata.tags && Array.isArray(event.metadata.tags)) {
      for (const tag of event.metadata.tags) {
        if (typeof tag === 'string') {
          tags.add(this.sanitizeTag(tag));
        }
      }
    }

    // Add project ID as tag
    if (projectId) {
      tags.add(`project:${projectId}`);
    }

    // Add agent ID as tag
    if (agentId) {
      tags.add(`agent:${agentId}`);
    }

    // Add task type as tag
    if (taskType && taskType !== TaskType.OTHER) {
      tags.add(`task:${taskType}`);
    }

    // Add event type as tag
    tags.add(`type:${event.type}`);

    // Extract keywords from content (simple keyword extraction)
    const keywords = this.extractKeywords(event.content);
    for (const keyword of keywords.slice(0, 5)) {
      // Limit to 5 keywords
      tags.add(keyword);
    }

    return Array.from(tags);
  }

  /**
   * Calculate confidence score for classification
   */
  private calculateConfidence(event: HookEvent, classification: Classification): number {
    let confidence = 0;
    let factors = 0;

    // Project ID confidence
    if (classification.projectId) {
      factors++;
      // Higher confidence if from metadata
      if (event.metadata.projectId) {
        confidence += this.options.metadataConfidence;
      } else {
        confidence += this.options.inferredConfidence;
      }
    }

    // Agent ID confidence
    if (classification.agentId) {
      factors++;
      if (event.metadata.agentId) {
        confidence += this.options.metadataConfidence;
      } else {
        confidence += this.options.inferredConfidence;
      }
    }

    // Task type confidence
    if (classification.taskType && classification.taskType !== TaskType.OTHER) {
      factors++;
      // Check if tags support the task type
      const taskKeywords = this.options.taskTypeKeywords[classification.taskType] || [];
      const matchCount = taskKeywords.filter((kw) =>
        event.content.toLowerCase().includes(kw.toLowerCase())
      ).length;
      confidence += Math.min(0.3 + matchCount * 0.15, 0.9);
    }

    // Tags confidence
    if (classification.tags.length > 0) {
      factors++;
      // Metadata tags are more reliable
      const metadataTagCount =
        event.metadata.tags && Array.isArray(event.metadata.tags) ? event.metadata.tags.length : 0;
      confidence +=
        metadataTagCount > 0
          ? this.options.metadataConfidence * 0.5
          : this.options.inferredConfidence * 0.5;
    }

    // Base confidence from having content
    if (event.content && event.content.length > 10) {
      factors++;
      confidence += 0.4;
    }

    // Calculate average, default to low confidence if no factors
    if (factors === 0) {
      return 0.2;
    }

    return Math.min(confidence / factors, 1.0);
  }

  /**
   * Sanitize an ID for use in filesystem paths
   */
  private sanitizeId(id: string): string {
    return id
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Sanitize a tag
   */
  private sanitizeTag(tag: string): string {
    return tag
      .toLowerCase()
      .replace(/[^a-z0-9-_:]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Extract keywords from content (simple implementation)
   */
  private extractKeywords(content: string): string[] {
    // Common words to ignore
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
      'i',
      'we',
      'you',
      'he',
      'she',
      'they',
      'them',
      'their',
      'our',
      'your',
      'my',
    ]);

    // Extract words
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    // Count occurrences
    const counts: Map<string, number> = new Map();
    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }

    // Sort by frequency and return top keywords
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  /**
   * Get classifier options
   */
  getOptions(): Readonly<Required<ClassifierOptions>> {
    return { ...this.options };
  }
}
