import { z } from 'zod';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { enumWithCitationStrip, extractJsonFromText } from '../shared/result-parser';
import { withRetry } from '../shared/retry-handler';

const TVShowAppearanceSchema = z.object({
  showName: z.string(),
  season: z.string().nullable().optional(),
  result: enumWithCitationStrip(['winner', 'finalist', 'contestant', 'judge'] as const),
}).passthrough();

export interface ShowDiscoveryResult {
  success: boolean;
  showsSaved: number;
  showsSkipped: number;
  tokensUsed: TokenUsage;
  error?: string;
}

const SHOW_DISCOVERY_SYSTEM_PROMPT = `You are a TV cooking show expert with access to web search.

YOU MUST use the web_search_preview tool to research the chef's TV appearances. DO NOT return a response without searching first.

REQUIRED PROCESS:
1. Search for the chef's Wikipedia page, IMDb profile, or official website
2. Search for their name + specific show names (Top Chef, Tournament of Champions, etc.)
3. Search for news articles about their TV career
4. After gathering information (typically 5-10 searches), return your final JSON response

Return ONLY a valid JSON array. Do NOT include any explanatory text or anything other than the JSON array itself.

Start immediately with the opening bracket [.`;

export class ShowDiscoveryService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker
  ) {}

  async findAllShows(
    chefId: string,
    chefName: string
  ): Promise<ShowDiscoveryResult & { tvShows?: z.infer<typeof TVShowAppearanceSchema>[] }> {
    try {
      const prompt = this.buildShowDiscoveryPrompt(chefName);

      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          SHOW_DISCOVERY_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 8000, searchContextSize: 'medium', useResponseModel: true }
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

      const tvShows = z.array(TVShowAppearanceSchema).parse(normalized);

      console.log(`      📋 LLM found ${tvShows.length} shows for ${chefName}`);
      if (tvShows.length > 0) {
        tvShows.forEach(show => {
          console.log(`         - ${show.showName}${show.season ? ' ' + show.season : ''} (${show.result || 'contestant'})`);
        });
      }

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

  private buildShowDiscoveryPrompt(chefName: string): string {
    return `Find ALL TV cooking show competition appearances for chef "${chefName}".

Search for:
1. Their Wikipedia page, IMDb, or official website
2. Food Network, Bravo, Netflix show contestant lists
3. Social media bios mentioning TV appearances
4. News articles about their TV career

Include appearances on ANY of these shows:
- Top Chef (+ all variants: Masters, Just Desserts, Junior, Duels, Amateurs, Family Style, Canada, VIP, Estrellas)
- Iron Chef / Iron Chef America
- Tournament of Champions
- Beat Bobby Flay
- Chopped (+ variants: Champions, Sweets)
- Hell's Kitchen
- MasterChef
- Next Level Chef
- Guy's Grocery Games
- Cutthroat Kitchen
- Worst Cooks in America
- Great British Bake Off
- Baking Championships (Spring, Holiday, Halloween, Kids)
- Netflix: Final Table, Chef Show, Nailed It!, Is It Cake?
- Any other cooking competition shows

For EACH show they appeared on, include:
- Exact show name
- Season number (if known)
- Their role: "winner", "finalist", "contestant", or "judge"

Return a JSON array. If NO shows found, return empty array [].

Example output:
[
  {"showName": "Top Chef", "season": "15", "result": "finalist"},
  {"showName": "Tournament of Champions", "season": "3", "result": "contestant"}
]`;
  }
}
