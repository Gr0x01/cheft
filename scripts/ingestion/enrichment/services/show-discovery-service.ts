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
  performanceBlurb: z.string().nullable().optional(),
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

const BASIC_DISCOVERY_PROMPT = `You are a TV cooking show data extractor. Your job is to search the web and extract EVERY TV cooking competition appearance for a chef.

CRITICAL RULES:
1. Search multiple times with different queries to find all appearances
2. After searching, list EVERY show mentioned in ANY search result
3. Do NOT summarize or filter - include ALL shows found
4. Many chefs appear on 5-10+ different shows
5. Return the complete list as JSON array

Your output must be ONLY a JSON array, no other text.`;

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
      const prompt = `Extract ALL TV cooking competition appearances for chef "${chefName}".

Step 1: Search "${chefName} Top Chef"
Step 2: Search "${chefName} Tournament of Champions" 
Step 3: Search "${chefName} TV cooking shows"
Step 4: Search "${chefName} Food Network appearances"

After searching, extract EVERY show mentioned in the search results. Include:
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
{"showName": "exact name", "season": "Season X, Episode Y, or year", "result": "winner|finalist|contestant|judge"}

SEASON FORMATTING:
- If season number exists, use "Season X" (e.g., "Season 15")
- If episode number exists, use "Episode X" (e.g., "Episode 28")
- If only year is known, use the year (e.g., "2024")
- If multiple appearances, use "various (YYYY-YYYY)" (e.g., "various (2016-2022)")
- If unknown, use null

Output ONLY a JSON array. Example:
[{"showName": "Top Chef", "season": "Season 14", "result": "winner"}, {"showName": "Chopped", "season": "Episode 28", "result": "winner"}, {"showName": "Beat Bobby Flay", "season": "2024", "result": "contestant"}]`;

      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          BASIC_DISCOVERY_PROMPT,
          prompt,
          { maxTokens: 16000, maxSteps: 15 }
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
      const prompt = `Extract ALL TV cooking competition appearances for chef "${chefName}".

Step 1: Search "${chefName} Top Chef"
Step 2: Search "${chefName} Tournament of Champions"
Step 3: Search "${chefName} TV cooking shows"
Step 4: Search "${chefName} Food Network appearances"

After searching, extract EVERY show mentioned in the search results with performance details.

For EACH show found, output:
{"showName": "exact name", "season": "Season X, Episode Y, or year", "result": "winner|finalist|contestant|judge", "performanceBlurb": "1-2 sentence summary"}

SEASON FORMATTING:
- If season number exists, use "Season X" (e.g., "Season 15")
- If episode number exists, use "Episode X" (e.g., "Episode 28")
- If only year is known, use the year (e.g., "2024")
- If multiple appearances, use "various (YYYY-YYYY)" (e.g., "various (2016-2022)")
- If unknown, use null

Output ONLY a JSON array. Example:
[{"showName": "Top Chef", "season": "Season 14", "result": "winner", "performanceBlurb": "Won Season 14 in Charleston."}, {"showName": "Chopped", "season": "Episode 28", "result": "winner", "performanceBlurb": "Dominated with creative dessert in finale."}, {"showName": "Beat Bobby Flay", "season": "2024", "result": "contestant", "performanceBlurb": "Competed in seafood challenge."}]`;

      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          BASIC_DISCOVERY_PROMPT,
          prompt,
          { maxTokens: 16000, maxSteps: 15 }
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
