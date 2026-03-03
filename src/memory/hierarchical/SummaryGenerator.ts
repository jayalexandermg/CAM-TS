/**
 * SummaryGenerator - Generates L0/L1/L2 layers from L3 full content.
 *
 * Works with or without an LLM:
 * - Without LLM (fallback): regex-based extraction of tags, first sentence, first paragraph.
 * - With LLM: delegates to LLM for higher-quality summaries.
 */

export interface GeneratedLayers {
  l0Tags: string[];
  l1Summary: string;
  l2Overview: string;
}

export interface LLMClient {
  generate(prompt: string): Promise<string>;
}

/** Regex patterns for extracting meaningful tokens from content */
const FILE_PATH_PATTERN = /(?:\/[\w.-]+)+(?:\.\w+)?/g;
const ERROR_CODE_PATTERN = /\b(?:ERR_\w+|E\d{4}|[A-Z_]{3,}_ERROR)\b/g;
const CAMEL_CASE_PATTERN = /\b[a-z]+(?:[A-Z][a-z]+)+\b/g;
const PASCAL_CASE_PATTERN = /\b(?:[A-Z][a-z]+){2,}\b/g;

export class SummaryGenerator {
  private readonly llmClient?: LLMClient;

  constructor(llmClient?: LLMClient) {
    this.llmClient = llmClient;
  }

  async generate(content: string): Promise<GeneratedLayers> {
    if (this.llmClient) {
      return this.generateWithLLM(content);
    }
    return this.generateFallback(content);
  }

  private async generateWithLLM(content: string): Promise<GeneratedLayers> {
    const truncated = content.slice(0, 4000);

    const [tagsResponse, summaryResponse, overviewResponse] = await Promise.all([
      this.llmClient!.generate(
        `Extract 5-10 tags from this content. Return ONLY a comma-separated list of keywords, topics, entity names, and file paths. No explanation.\n\nContent:\n${truncated}`
      ),
      this.llmClient!.generate(
        `Write a single imperative sentence (20-30 words max) summarizing this content. No explanation, just the sentence.\n\nContent:\n${truncated}`
      ),
      this.llmClient!.generate(
        `Write a 3-5 sentence overview (100-200 words) of this content with key details. No preamble.\n\nContent:\n${truncated}`
      ),
    ]);

    const l0Tags = tagsResponse
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 10);

    return {
      l0Tags: l0Tags.length > 0 ? l0Tags : this.extractTags(content),
      l1Summary: summaryResponse.trim() || this.extractFirstSentence(content),
      l2Overview: overviewResponse.trim() || this.extractFirstParagraph(content),
    };
  }

  private generateFallback(content: string): GeneratedLayers {
    return {
      l0Tags: this.extractTags(content),
      l1Summary: this.extractFirstSentence(content),
      l2Overview: this.extractFirstParagraph(content),
    };
  }

  private extractTags(content: string): string[] {
    const tags = new Set<string>();

    // Extract file paths
    const filePaths = content.match(FILE_PATH_PATTERN);
    if (filePaths) {
      for (const fp of filePaths.slice(0, 3)) {
        tags.add(fp);
      }
    }

    // Extract error codes
    const errorCodes = content.match(ERROR_CODE_PATTERN);
    if (errorCodes) {
      for (const ec of errorCodes.slice(0, 3)) {
        tags.add(ec);
      }
    }

    // Extract camelCase and PascalCase identifiers
    const camelCaseIds = content.match(CAMEL_CASE_PATTERN);
    if (camelCaseIds) {
      for (const id of camelCaseIds.slice(0, 3)) {
        tags.add(id);
      }
    }
    const pascalCaseIds = content.match(PASCAL_CASE_PATTERN);
    if (pascalCaseIds) {
      for (const id of pascalCaseIds.slice(0, 3)) {
        tags.add(id);
      }
    }

    // Extract unique nouns: capitalized words that are likely proper nouns
    const words = content.split(/\s+/);
    for (const word of words) {
      if (tags.size >= 10) break;
      const cleaned = word.replace(/[^a-zA-Z0-9_/-]/g, '');
      if (cleaned.length >= 3 && /^[A-Z]/.test(cleaned) && !/^(The|This|That|When|Where|What|How|Who|Why|And|But|For|Not|With|From|Into|Over|After|Before|About)$/.test(cleaned)) {
        tags.add(cleaned);
      }
    }

    const result = Array.from(tags).slice(0, 10);
    if (result.length === 0) {
      // Last resort: take first few meaningful words
      const meaningful = words
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((w) => w.length >= 4);
      return [...new Set(meaningful)].slice(0, 5);
    }
    return result;
  }

  private extractFirstSentence(content: string): string {
    const trimmed = content.trim();
    // Find first sentence ending with . ! or ?
    const match = trimmed.match(/^(.+?[.!?])\s/);
    if (match && match[1].length <= 200) {
      return match[1];
    }
    // Fallback: first 30 words
    const words = trimmed.split(/\s+/).slice(0, 30);
    return words.join(' ');
  }

  private extractFirstParagraph(content: string): string {
    const trimmed = content.trim();
    // Find first paragraph (separated by double newline)
    const paragraphs = trimmed.split(/\n\s*\n/);
    const firstPara = paragraphs[0].trim();
    if (firstPara.length <= 1000) {
      return firstPara;
    }
    // Fallback: first 200 words
    const words = trimmed.split(/\s+/).slice(0, 200);
    return words.join(' ');
  }
}
