import { EventType, HookEvent } from '../../src/hooks';
import { ContentClassifier, TaskType } from '../../src/routing';

describe('ContentClassifier', () => {
  let classifier: ContentClassifier;

  beforeEach(() => {
    classifier = new ContentClassifier();
  });

  const createEvent = (
    content: string,
    metadata: Record<string, unknown> = {}
  ): HookEvent => ({
    timestamp: new Date().toISOString(),
    type: EventType.CAPTURE_ALL,
    content,
    metadata,
  });

  describe('classify', () => {
    it('should return a Classification object', () => {
      const event = createEvent('Test event');
      const result = classifier.classify(event);

      expect(result).toHaveProperty('projectId');
      expect(result).toHaveProperty('agentId');
      expect(result).toHaveProperty('taskType');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('confidence');
    });

    it('should calculate confidence between 0 and 1', () => {
      const event = createEvent('Test event');
      const result = classifier.classify(event);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('extractProjectId', () => {
    it('should extract projectId from metadata', () => {
      const event = createEvent('Some event', { projectId: 'my-project' });
      const result = classifier.classify(event);

      expect(result.projectId).toBe('my-project');
    });

    it('should extract projectId from content using "project:" pattern', () => {
      const event = createEvent('Working on project: infinite-aura');
      const result = classifier.classify(event);

      expect(result.projectId).toBe('infinite-aura');
    });

    it('should extract projectId from content using "for X project" pattern', () => {
      const event = createEvent('Building feature for test-app project');
      const result = classifier.classify(event);

      expect(result.projectId).toBe('test-app');
    });

    it('should extract projectId from content using "in X project" pattern', () => {
      const event = createEvent('Fixed bug in my-service project');
      const result = classifier.classify(event);

      expect(result.projectId).toBe('my-service');
    });

    it('should sanitize projectId to lowercase', () => {
      const event = createEvent('Some event', { projectId: 'My-Project' });
      const result = classifier.classify(event);

      expect(result.projectId).toBe('my-project');
    });

    it('should sanitize projectId removing special characters', () => {
      const event = createEvent('Some event', { projectId: 'my@project#123!' });
      const result = classifier.classify(event);

      expect(result.projectId).toBe('my-project-123');
    });

    it('should prefer metadata over content extraction', () => {
      const event = createEvent('Working on project: content-project', {
        projectId: 'metadata-project',
      });
      const result = classifier.classify(event);

      expect(result.projectId).toBe('metadata-project');
    });

    it('should return undefined if no project found', () => {
      const event = createEvent('Just a simple event');
      const result = classifier.classify(event);

      expect(result.projectId).toBeUndefined();
    });
  });

  describe('extractAgentId', () => {
    it('should extract agentId from metadata', () => {
      const event = createEvent('Some event', { agentId: 'coder-agent' });
      const result = classifier.classify(event);

      expect(result.agentId).toBe('coder-agent');
    });

    it('should extract agentId from content using "agent:" pattern', () => {
      const event = createEvent('Task completed by agent: researcher');
      const result = classifier.classify(event);

      expect(result.agentId).toBe('researcher');
    });

    it('should extract agentId from content using "by X agent" pattern', () => {
      const event = createEvent('Analysis done by reviewer agent');
      const result = classifier.classify(event);

      expect(result.agentId).toBe('reviewer');
    });

    it('should sanitize agentId', () => {
      const event = createEvent('Some event', { agentId: 'My Agent v2' });
      const result = classifier.classify(event);

      expect(result.agentId).toBe('my-agent-v2');
    });

    it('should return undefined if no agent found', () => {
      const event = createEvent('Simple task');
      const result = classifier.classify(event);

      expect(result.agentId).toBeUndefined();
    });
  });

  describe('inferTaskType', () => {
    it('should infer RESEARCH task type', () => {
      const event = createEvent('Need to research and investigate the API');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.RESEARCH);
    });

    it('should infer CODING task type', () => {
      const event = createEvent('Implementing new feature in the codebase');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.CODING);
    });

    it('should infer ANALYSIS task type', () => {
      const event = createEvent('Analyzing and reviewing the performance metrics');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.ANALYSIS);
    });

    it('should infer WRITING task type', () => {
      const event = createEvent('Writing the blog post draft');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.WRITING);
    });

    it('should infer PLANNING task type', () => {
      const event = createEvent('Planning the architecture design');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.PLANNING);
    });

    it('should infer DEBUGGING task type', () => {
      const event = createEvent('Debugging the authentication issue');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.DEBUGGING);
    });

    it('should infer TESTING task type', () => {
      const event = createEvent('Testing the new endpoints');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.TESTING);
    });

    it('should infer DOCUMENTATION task type', () => {
      const event = createEvent('Updating the README documentation');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.DOCUMENTATION);
    });

    it('should use tags for task type inference', () => {
      const event = createEvent('Some task', { tags: ['testing', 'qa'] });
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.TESTING);
    });

    it('should return OTHER for unclear content', () => {
      const event = createEvent('Just did something');
      const result = classifier.classify(event);

      expect(result.taskType).toBe(TaskType.OTHER);
    });

    it('should handle multiple keywords choosing highest score', () => {
      const event = createEvent('Implementing tests for the code');
      const result = classifier.classify(event);

      // Both CODING and TESTING keywords present, should choose one
      expect([TaskType.CODING, TaskType.TESTING]).toContain(result.taskType);
    });
  });

  describe('extractTags', () => {
    it('should include metadata tags', () => {
      const event = createEvent('Event', { tags: ['important', 'urgent'] });
      const result = classifier.classify(event);

      expect(result.tags).toContain('important');
      expect(result.tags).toContain('urgent');
    });

    it('should add projectId as tag', () => {
      const event = createEvent('Event', { projectId: 'my-project' });
      const result = classifier.classify(event);

      expect(result.tags).toContain('project:my-project');
    });

    it('should add agentId as tag', () => {
      const event = createEvent('Event', { agentId: 'my-agent' });
      const result = classifier.classify(event);

      expect(result.tags).toContain('agent:my-agent');
    });

    it('should add taskType as tag', () => {
      const event = createEvent('Implementing feature');
      const result = classifier.classify(event);

      expect(result.tags).toContain('task:coding');
    });

    it('should add event type as tag', () => {
      const event = createEvent('Event');
      const result = classifier.classify(event);

      expect(result.tags).toContain('type:capture_all');
    });

    it('should extract keywords from content', () => {
      const event = createEvent('Building authentication system for users');
      const result = classifier.classify(event);

      // Should contain some extracted keywords
      expect(result.tags.length).toBeGreaterThan(0);
    });

    it('should sanitize tags', () => {
      const event = createEvent('Event', { tags: ['My Tag!', 'Another@Tag'] });
      const result = classifier.classify(event);

      expect(result.tags).toContain('my-tag');
      expect(result.tags).toContain('another-tag');
    });
  });

  describe('calculateConfidence', () => {
    it('should have higher confidence with metadata present', () => {
      const metadataEvent = createEvent('Event', {
        projectId: 'project',
        agentId: 'agent',
      });
      const noMetadataEvent = createEvent('Working on project: test by agent: worker');

      const metadataResult = classifier.classify(metadataEvent);
      const noMetadataResult = classifier.classify(noMetadataEvent);

      expect(metadataResult.confidence).toBeGreaterThan(noMetadataResult.confidence);
    });

    it('should have higher confidence with clear task type', () => {
      const clearEvent = createEvent('Implementing the authentication module', {
        tags: ['coding', 'feature'],
      });
      const unclearEvent = createEvent('Did something');

      const clearResult = classifier.classify(clearEvent);
      const unclearResult = classifier.classify(unclearEvent);

      expect(clearResult.confidence).toBeGreaterThan(unclearResult.confidence);
    });

    it('should have minimum confidence for empty events', () => {
      const event = createEvent('');
      const result = classifier.classify(event);

      expect(result.confidence).toBeGreaterThanOrEqual(0.1);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should have high confidence with complete metadata', () => {
      const event = createEvent('Implementing feature', {
        projectId: 'my-project',
        agentId: 'coder',
        tags: ['typescript', 'feature'],
      });
      const result = classifier.classify(event);

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('custom options', () => {
    it('should use custom project patterns', () => {
      const customClassifier = new ContentClassifier({
        projectPatterns: [/repo[:\s]+([a-z0-9-]+)/i],
      });

      const event = createEvent('Working in repo: custom-repo');
      const result = customClassifier.classify(event);

      expect(result.projectId).toBe('custom-repo');
    });

    it('should use custom task type keywords', () => {
      const customClassifier = new ContentClassifier({
        taskTypeKeywords: {
          [TaskType.RESEARCH]: ['explore', 'investigate', 'discover'],
        },
      });

      const event = createEvent('Need to discover the issue');
      const result = customClassifier.classify(event);

      expect(result.taskType).toBe(TaskType.RESEARCH);
    });

    it('should use custom keywords when provided', () => {
      const customClassifier = new ContentClassifier({
        taskTypeKeywords: {
          [TaskType.CODING]: ['program', 'implement', 'code'],
        },
      });

      // Should recognize the custom keywords
      const event = createEvent('Programming the new module');
      const result = customClassifier.classify(event);

      expect(result.taskType).toBe(TaskType.CODING);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const event = createEvent('');
      const result = classifier.classify(event);

      expect(result).toBeDefined();
      expect(result.taskType).toBe(TaskType.OTHER);
    });

    it('should handle very long content', () => {
      const longContent = 'Testing '.repeat(1000);
      const event = createEvent(longContent);
      const result = classifier.classify(event);

      expect(result).toBeDefined();
      expect(result.taskType).toBe(TaskType.TESTING);
    });

    it('should handle content with only special characters', () => {
      const event = createEvent('!@#$%^&*()');
      const result = classifier.classify(event);

      expect(result).toBeDefined();
      expect(result.taskType).toBe(TaskType.OTHER);
    });

    it('should handle null metadata values gracefully', () => {
      const event = createEvent('Event', {
        projectId: null,
        agentId: undefined,
        tags: null,
      });
      const result = classifier.classify(event);

      expect(result).toBeDefined();
      expect(result.projectId).toBeUndefined();
      expect(result.agentId).toBeUndefined();
    });

    it('should handle non-array tags in metadata', () => {
      const event = createEvent('Event', {
        tags: 'single-tag',
      });
      const result = classifier.classify(event);

      expect(result.tags).not.toContain('single-tag');
    });
  });

  describe('getOptions', () => {
    it('should return readonly options', () => {
      const options = classifier.getOptions();

      expect(options).toBeDefined();
      expect(options.metadataConfidence).toBe(0.9);
      expect(options.inferredConfidence).toBe(0.6);
    });
  });
});
