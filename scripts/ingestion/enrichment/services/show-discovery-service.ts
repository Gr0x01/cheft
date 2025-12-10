import { z } from 'zod';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { enumWithCitationStrip, extractJsonFromText } from '../shared/result-parser';
import { searchShows, combineSearchResultsCompact, SearchResult } from '../shared/search-client';
import { synthesize } from '../shared/synthesis-client';

const TVShowBasicSchema = z.object({
  showName: z.string(),
  season: z.string().nullable().optional(),
  result: enumWithCitationStrip(['winner', 'finalist', 'contestant', 'judge'] as const).nullable().default('contestant'),
});

const TVShowWithBlurbSchema = TVShowBasicSchema.extend({
  performanceBlurb: z.string().nullable().optional(),
});

const ShowsArraySchema = z.array(TVShowBasicSchema);

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

const SHOW_DISCOVERY_PROMPT = `You are a TV cooking show data extractor. Extract ALL TV cooking competition appearances from the provided search results.

CRITICAL RULES:
1. Extract EVERY show mentioned in the search results
2. Do NOT summarize or filter - include ALL shows found
3. Many chefs appear on 5-10+ different shows
4. Return the complete list as JSON array

Your output must be ONLY a JSON array, no other text.

SEASON FORMATTING (CRITICAL - FOLLOW EXACTLY):
- If season number exists, use ONLY the number (e.g., "15" NOT "Season 15")
- If episode number exists, use ONLY the number (e.g., "28" NOT "Episode 28")
- If only year is known, use the 4-digit year (e.g., "2024")
- If multiple years, use first year only (e.g., "2016" NOT "2016-2022")
- DO NOT include words like "Season", "Episode", "various"
- Keep it simple: just numbers or years
- If unknown, use null

Output format:
[{"showName": "Top Chef", "season": "14", "result": "winner"}, ...]`;

export class ShowDiscoveryService {
  constructor(
    private tokenTracker: TokenTracker
  ) {}

  async findShowsBasic(
    chefId: string,
    chefName: string
  ): Promise<BasicShowDiscoveryResult> {
    console.log(`   📺 Discovering shows for ${chefName}`);

    try {
      const searchResults = await searchShows(chefName, chefId);
      const searchContext = combineSearchResultsCompact(searchResults, 12000);

      if (!searchContext || searchContext.length < 100) {
        console.log(`      ⚠️  Insufficient search results for ${chefName}`);
        return {
          success: false,
          showsSaved: 0,
          showsSkipped: 0,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          error: 'Insufficient search results',
        };
      }

      const prompt = `Extract ALL TV cooking competition appearances for chef "${chefName}" from these search results.

SEARCH RESULTS:
${searchContext}

Based on the search results above, extract EVERY TV show mentioned. Include:
- Top Chef (any season)
- Tournament of Champions
- Beat Bobby Flay
- Chopped
- Iron Chef / Iron Chef America / Iron Chef Gauntlet
- Guy's Grocery Games
- Hell's Kitchen
- MasterChef
- Next Iron Chef
- Top Chef Masters
- Any other cooking competition

For EACH show found, output:
{"showName": "exact name", "season": "number or year or null", "result": "winner|finalist|contestant|judge"}

Output ONLY a JSON array.`;

      const result = await synthesize('accuracy', SHOW_DISCOVERY_PROMPT, prompt, ShowsArraySchema, {
        maxTokens: 8000,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          success: false,
          showsSaved: 0,
          showsSkipped: 0,
          tokensUsed: result.usage,
          error: result.error,
        };
      }

      const tvShows: TVShowBasic[] = result.data.map(show => ({
        showName: show.showName,
        season: show.season,
        result: (show.result ?? 'contestant') as TVShowBasic['result'],
      }));

      console.log(`      📋 Found ${tvShows.length} shows for ${chefName}`);
      tvShows.forEach(show => {
        console.log(`         - ${show.showName}${show.season ? ' S' + show.season : ''} (${show.result || 'contestant'})`);
      });

      return {
        success: true,
        showsSaved: 0,
        showsSkipped: 0,
        tokensUsed: result.usage,
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

  async findShowsBasicFromCache(
    chefId: string,
    chefName: string,
    cachedSearches: SearchResult[]
  ): Promise<BasicShowDiscoveryResult> {
    console.log(`   📺 Extracting shows for ${chefName} (from cache)`);

    try {
      const searchContext = combineSearchResultsCompact(cachedSearches, 12000);

      if (!searchContext || searchContext.length < 100) {
        return {
          success: false,
          showsSaved: 0,
          showsSkipped: 0,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          error: 'Insufficient cached search results',
        };
      }

      const prompt = `Extract ALL TV cooking competition appearances for chef "${chefName}" from these search results.

SEARCH RESULTS:
${searchContext}

Based on the search results above, extract EVERY TV show mentioned.

For EACH show found, output:
{"showName": "exact name", "season": "number or year or null", "result": "winner|finalist|contestant|judge"}

Output ONLY a JSON array.`;

      const result = await synthesize('accuracy', SHOW_DISCOVERY_PROMPT, prompt, ShowsArraySchema, {
        maxTokens: 8000,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          success: false,
          showsSaved: 0,
          showsSkipped: 0,
          tokensUsed: result.usage,
          error: result.error,
        };
      }

      const tvShows: TVShowBasic[] = result.data.map(show => ({
        showName: show.showName,
        season: show.season,
        result: (show.result ?? 'contestant') as TVShowBasic['result'],
      }));

      console.log(`      📋 Found ${tvShows.length} shows for ${chefName}`);
      tvShows.forEach(show => {
        console.log(`         - ${show.showName}${show.season ? ' S' + show.season : ''} (${show.result || 'contestant'})`);
      });

      return {
        success: true,
        showsSaved: 0,
        showsSkipped: 0,
        tokensUsed: result.usage,
        tvShows,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Show extraction error for "${chefName}": ${msg}`);

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
    const basicResult = await this.findShowsBasic(chefId, chefName);

    if (!basicResult.success || !basicResult.tvShows) {
      return {
        success: basicResult.success,
        showsSaved: basicResult.showsSaved,
        showsSkipped: basicResult.showsSkipped,
        tokensUsed: basicResult.tokensUsed,
        error: basicResult.error,
      };
    }

    const tvShows: TVShowWithBlurb[] = basicResult.tvShows.map(show => ({
      ...show,
      performanceBlurb: null,
    }));

    return {
      success: true,
      showsSaved: 0,
      showsSkipped: 0,
      tokensUsed: basicResult.tokensUsed,
      tvShows,
    };
  }
}
