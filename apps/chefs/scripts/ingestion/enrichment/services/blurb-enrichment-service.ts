import { z } from 'zod';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { searchBlurbDetails, combineSearchResultsCompact, SearchResult } from '../shared/search-client';
import { synthesize } from '../shared/synthesis-client';
import { TVShowBasic } from './show-discovery-service';

const BlurbResultSchema = z.object({
  showName: z.string(),
  season: z.string().nullable().optional(),
  performanceBlurb: z.string(),
});

const BlurbsArraySchema = z.array(BlurbResultSchema);

export type BlurbResult = z.infer<typeof BlurbResultSchema>;

export interface BlurbEnrichmentResult {
  success: boolean;
  blurbs: BlurbResult[];
  tokensUsed: TokenUsage;
  error?: string;
}

const BLURB_SYSTEM_PROMPT = `You are a TV cooking competition expert. Generate brief performance summaries based on the search results provided.

Guidelines:
- Keep blurbs to 1-2 sentences
- Focus on their journey, memorable moments, or achievements
- Use information from the search results only
- If no specific information is found, write a generic but appropriate blurb

CRITICAL: Return ONLY a JSON array. No explanatory text.

Output format:
[{"showName": "Show Name", "season": "15", "performanceBlurb": "Brief 1-2 sentence summary."}]`;

export class BlurbEnrichmentService {
  constructor(
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

    console.log(`   📝 Generating blurbs for ${shows.length} shows`);

    try {
      const searchResults: SearchResult[] = [];
      for (const show of shows) {
        const result = await searchBlurbDetails(chefName, show.showName, show.season || undefined);
        searchResults.push(result);
        if (!result.fromCache) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      const searchContext = combineSearchResultsCompact(searchResults, 10000);

      const showList = shows.map(s =>
        `- ${s.showName}${s.season ? ' Season ' + s.season : ''} (${s.result || 'contestant'})`
      ).join('\n');

      const prompt = `Generate 1-2 sentence performance blurbs for ${chefName}'s TV appearances:

${showList}

SEARCH RESULTS:
${searchContext}

Based on the search results above, create a brief performance summary for each show appearance.

Return ONLY a JSON array with showName, season, and performanceBlurb for each show.`;

      const result = await synthesize('creative', BLURB_SYSTEM_PROMPT, prompt, BlurbsArraySchema, {
        maxTokens: 4000,
        temperature: 0.5,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          success: false,
          blurbs: [],
          tokensUsed: result.usage,
          error: result.error,
        };
      }

      console.log(`      📝 Generated ${result.data.length} blurbs for ${chefName}`);

      return {
        success: true,
        blurbs: result.data,
        tokensUsed: result.usage,
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

  async generateBlurbsFromCache(
    chefName: string,
    shows: TVShowBasic[],
    cachedSearches: SearchResult[]
  ): Promise<BlurbEnrichmentResult> {
    if (!shows || shows.length === 0) {
      return {
        success: true,
        blurbs: [],
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
      };
    }

    console.log(`   📝 Generating blurbs for ${shows.length} shows (from cache)`);

    try {
      const searchContext = combineSearchResultsCompact(cachedSearches, 10000);

      const showList = shows.map(s =>
        `- ${s.showName}${s.season ? ' Season ' + s.season : ''} (${s.result || 'contestant'})`
      ).join('\n');

      const prompt = `Generate 1-2 sentence performance blurbs for ${chefName}'s TV appearances:

${showList}

SEARCH RESULTS:
${searchContext}

Based on the search results above, create a brief performance summary for each show appearance.

Return ONLY a JSON array with showName, season, and performanceBlurb for each show.`;

      const result = await synthesize('creative', BLURB_SYSTEM_PROMPT, prompt, BlurbsArraySchema, {
        maxTokens: 4000,
        temperature: 0.5,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          success: false,
          blurbs: [],
          tokensUsed: result.usage,
          error: result.error,
        };
      }

      console.log(`      📝 Generated ${result.data.length} blurbs for ${chefName}`);

      return {
        success: true,
        blurbs: result.data,
        tokensUsed: result.usage,
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
