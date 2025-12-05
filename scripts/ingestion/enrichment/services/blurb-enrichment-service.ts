import { z } from 'zod';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { extractJsonFromText } from '../shared/result-parser';
import { withRetry } from '../shared/retry-handler';
import { TVShowBasic } from './show-discovery-service';

const BlurbResultSchema = z.object({
  showName: z.string(),
  season: z.string().nullable().optional(),
  performanceBlurb: z.string(),
});

export type BlurbResult = z.infer<typeof BlurbResultSchema>;

export interface BlurbEnrichmentResult {
  success: boolean;
  blurbs: BlurbResult[];
  tokensUsed: TokenUsage;
  error?: string;
}

const BLURB_SYSTEM_PROMPT = `You are a TV cooking competition expert. Generate brief performance summaries for chef TV appearances.

Return ONLY a JSON array. No explanatory text.`;

export class BlurbEnrichmentService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker
  ) {}

  async generateBlurbs(
    chefName: string,
    shows: TVShowBasic[]
  ): Promise<BlurbEnrichmentResult> {
    if (!shows || shows.length === 0) {
      return {
        success: true,
        blurbs: [],
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
      };
    }

    try {
      const showList = shows.map(s => 
        `- ${s.showName}${s.season ? ' Season ' + s.season : ''} (${s.result || 'contestant'})`
      ).join('\n');

      const prompt = `Generate 1-2 sentence performance blurbs for ${chefName}'s TV appearances:

${showList}

For each show, search for their specific performance details and return:
- showName: Exact show name
- season: Season number or null
- performanceBlurb: Brief summary of their competition journey/achievement

Example output:
[{"showName": "Top Chef", "season": "15", "performanceBlurb": "Reached the finale with consistently strong pasta dishes, known for fresh handmade noodles."}]`;

      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          BLURB_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 8000, searchContextSize: 'low', useResponseModel: true }
        ),
        `generate blurbs for ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty response');
      }

      const jsonText = extractJsonFromText(result.text);
      const parsed = JSON.parse(jsonText);
      const normalized = Array.isArray(parsed) ? parsed : [parsed];
      const blurbs = z.array(BlurbResultSchema).parse(normalized);

      console.log(`      📝 Generated ${blurbs.length} blurbs for ${chefName}`);

      return {
        success: true,
        blurbs,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Blurb generation error for "${chefName}": ${msg}`);
      
      return {
        success: false,
        blurbs: [],
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }

  async generateBlurbsInBatches(
    chefName: string,
    shows: TVShowBasic[],
    batchSize: number = 5
  ): Promise<BlurbEnrichmentResult> {
    if (!shows || shows.length === 0) {
      return {
        success: true,
        blurbs: [],
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
      };
    }

    const allBlurbs: BlurbResult[] = [];
    const totalTokens: TokenUsage = { prompt: 0, completion: 0, total: 0 };
    let hasError = false;
    let lastError = '';

    for (let i = 0; i < shows.length; i += batchSize) {
      const batch = shows.slice(i, i + batchSize);
      const result = await this.generateBlurbs(chefName, batch);
      
      totalTokens.prompt += result.tokensUsed.prompt;
      totalTokens.completion += result.tokensUsed.completion;
      totalTokens.total += result.tokensUsed.total;

      if (result.success) {
        allBlurbs.push(...result.blurbs);
      } else {
        hasError = true;
        lastError = result.error || 'Unknown error';
      }

      if (i + batchSize < shows.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      success: !hasError || allBlurbs.length > 0,
      blurbs: allBlurbs,
      tokensUsed: totalTokens,
      error: hasError ? lastError : undefined,
    };
  }
}
