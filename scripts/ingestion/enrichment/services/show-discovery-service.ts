import { z } from 'zod';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { enumWithCitationStrip, extractJsonFromText } from '../shared/result-parser';
import { withRetry } from '../shared/retry-handler';

const TVShowBasicSchema = z.object({
  showName: z.string(),
  season: z.string().nullable().optional(),
  result: enumWithCitationStrip(['winner', 'finalist', 'contestant', 'judge'] as const),
}).passthrough();

const TVShowWithBlurbSchema = TVShowBasicSchema.extend({
  performanceBlurb: z.string().optional(),
});

export type TVShowBasic = z.infer<typeof TVShowBasicSchema>;
export type TVShowWithBlurb = z.infer<typeof TVShowWithBlurbSchema>;

export interface ShowDiscoveryResult {
  success: boolean;
  showsSaved: number;
  showsSkipped: number;
  tokensUsed: TokenUsage;
  error?: string;
}

export interface BasicShowDiscoveryResult extends ShowDiscoveryResult {
  tvShows?: TVShowBasic[];
}

export interface FullShowDiscoveryResult extends ShowDiscoveryResult {
  tvShows?: TVShowWithBlurb[];
}

const BASIC_DISCOVERY_PROMPT = `Search the web for this chef's TV cooking competition appearances. Return a JSON array.`;

export class ShowDiscoveryService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker
  ) {}

  async findShowsBasic(
    chefId: string,
    chefName: string
  ): Promise<BasicShowDiscoveryResult> {
    try {
      const prompt = `Find all TV cooking competition shows for "${chefName}".

Return JSON array with:
- showName: Exact show name
- season: Season number or null
- result: "winner", "finalist", "contestant", or "judge"

Example: [{"showName": "Top Chef", "season": "15", "result": "finalist"}]`;

      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          BASIC_DISCOVERY_PROMPT,
          prompt,
          { maxTokens: 16000, searchContextSize: 'medium', useResponseModel: true }
        ),
        `discover shows for ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        console.error(`   ❌ Empty response from LLM for "${chefName}"`);
        throw new Error('LLM returned empty response');
      }

      const jsonText = extractJsonFromText(result.text);
      const parsed = JSON.parse(jsonText);
      const normalized = Array.isArray(parsed) ? parsed : [parsed];
      const tvShows = z.array(TVShowBasicSchema).parse(normalized);

      console.log(`      📋 Found ${tvShows.length} shows for ${chefName}`);
      tvShows.forEach(show => {
        console.log(`         - ${show.showName}${show.season ? ' S' + show.season : ''} (${show.result || 'contestant'})`);
      });

      return {
        success: true,
        showsSaved: 0,
        showsSkipped: 0,
        tokensUsed,
        tvShows,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Show discovery error for "${chefName}": ${msg}`);
      
      return {
        success: false,
        showsSaved: 0,
        showsSkipped: 0,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }

  async findAllShows(
    chefId: string,
    chefName: string
  ): Promise<FullShowDiscoveryResult> {
    return this.findShowsWithBlurbs(chefId, chefName);
  }

  async findShowsWithBlurbs(
    chefId: string,
    chefName: string
  ): Promise<FullShowDiscoveryResult> {
    try {
      const prompt = `Find all TV cooking competition shows for "${chefName}".

For each show, return:
- showName: Exact show name
- season: Season number or null
- result: "winner", "finalist", "contestant", or "judge"
- performanceBlurb: 1-2 sentence summary of their competition performance

Example: [{"showName": "Top Chef", "season": "15", "result": "finalist", "performanceBlurb": "Made it to finale with strong pasta dishes."}]`;

      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          BASIC_DISCOVERY_PROMPT,
          prompt,
          { maxTokens: 16000, searchContextSize: 'medium', useResponseModel: true }
        ),
        `enrich shows for ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        console.error(`   ❌ Empty response from LLM for "${chefName}"`);
        throw new Error('LLM returned empty response');
      }

      const jsonText = extractJsonFromText(result.text);
      const parsed = JSON.parse(jsonText);
      const normalized = Array.isArray(parsed) ? parsed : [parsed];
      const tvShows = z.array(TVShowWithBlurbSchema).parse(normalized);

      console.log(`      📋 Found ${tvShows.length} shows for ${chefName}`);
      tvShows.forEach(show => {
        console.log(`         - ${show.showName}${show.season ? ' S' + show.season : ''} (${show.result || 'contestant'})`);
      });

      return {
        success: true,
        showsSaved: 0,
        showsSkipped: 0,
        tokensUsed,
        tvShows,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Shows enrichment error for "${chefName}": ${msg}`);
      
      return {
        success: false,
        showsSaved: 0,
        showsSkipped: 0,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }
}
