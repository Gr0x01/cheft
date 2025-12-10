import { z } from 'zod';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { enumWithCitationStrip, stripCitations } from '../shared/result-parser';
import { searchBio, combineSearchResultsCompact, SearchResult } from '../shared/search-client';
import { synthesize } from '../shared/synthesis-client';

const ChefBioSchema = z.object({
  miniBio: z.string().transform(val => stripCitations(val) || val),
  jamesBeardStatus: enumWithCitationStrip(['winner', 'nominated', 'semifinalist'] as const),
  notableAwards: z.array(z.string()).nullable().optional(),
}).passthrough();

export interface ChefBioResult {
  chefId: string;
  chefName: string;
  miniBio: string | null;
  jamesBeardStatus: string | null;
  notableAwards: string[] | null;
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}

const BIO_SYSTEM_PROMPT = `You are a culinary industry expert extracting biographical information from search results.

Your task: Extract accurate information about the chef from the provided search data:
1. A brief bio (2-3 sentences about their career and culinary style)
2. James Beard Award status if any (winner, nominated, semifinalist)
3. Notable culinary awards (Michelin Guide recognition, World's 50 Best, AAA Five Diamond, etc.)

IMPORTANT: Only use information from the provided search results. Do NOT make up facts.

Guidelines:
- Be conservative - if unsure about a detail, omit it
- Only include prestigious, verifiable awards mentioned in the search results
- Be specific with award names and years if available

CRITICAL: Respond with ONLY valid JSON. No explanatory text.

Response format:
{
  "miniBio": "2-3 sentence bio",
  "jamesBeardStatus": null or "winner" or "nominated" or "semifinalist",
  "notableAwards": ["Award Name (Year)"] or null
}`;

export class ChefBioService {
  constructor(
    private tokenTracker: TokenTracker
  ) {}

  async enrichBio(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<ChefBioResult> {
    console.log(`   📝 Enriching bio for ${chefName}`);

    try {
      const searchResult = await searchBio(chefName, chefId);
      const searchContext = combineSearchResultsCompact([searchResult], 8000);

      if (!searchContext || searchContext.length < 100) {
        console.log(`      ⚠️  Insufficient search results for ${chefName}`);
        return {
          chefId,
          chefName,
          miniBio: null,
          jamesBeardStatus: null,
          notableAwards: null,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          success: false,
          error: 'Insufficient search results',
        };
      }

      let prompt = `Extract biographical information for chef "${chefName}" who appeared on ${showName}`;
      if (options.season) prompt += ` (${options.season})`;
      if (options.result) prompt += ` as ${options.result}`;
      prompt += `.

SEARCH RESULTS:
${searchContext}

Based on the search results above, extract:
1. A 2-3 sentence bio about their career
2. James Beard Award status (winner/nominated/semifinalist) if mentioned
3. Notable culinary awards if mentioned

Return ONLY JSON.`;

      const result = await synthesize('accuracy', BIO_SYSTEM_PROMPT, prompt, ChefBioSchema);

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          chefId,
          chefName,
          miniBio: null,
          jamesBeardStatus: null,
          notableAwards: null,
          tokensUsed: result.usage,
          success: false,
          error: result.error,
        };
      }

      return {
        chefId,
        chefName,
        miniBio: result.data.miniBio,
        jamesBeardStatus: result.data.jamesBeardStatus ?? null,
        notableAwards: result.data.notableAwards ?? null,
        tokensUsed: result.usage,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Bio enrichment error for "${chefName}": ${msg}`);

      return {
        chefId,
        chefName,
        miniBio: null,
        jamesBeardStatus: null,
        notableAwards: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: msg,
      };
    }
  }

  async enrichBioFromCache(
    chefId: string,
    chefName: string,
    showName: string,
    cachedSearch: SearchResult,
    options: { season?: string; result?: string } = {}
  ): Promise<ChefBioResult> {
    console.log(`   📝 Synthesizing bio for ${chefName} (from cache)`);

    try {
      const searchContext = combineSearchResultsCompact([cachedSearch], 8000);

      if (!searchContext || searchContext.length < 100) {
        return {
          chefId,
          chefName,
          miniBio: null,
          jamesBeardStatus: null,
          notableAwards: null,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          success: false,
          error: 'Insufficient cached search results',
        };
      }

      let prompt = `Extract biographical information for chef "${chefName}" who appeared on ${showName}`;
      if (options.season) prompt += ` (${options.season})`;
      if (options.result) prompt += ` as ${options.result}`;
      prompt += `.

SEARCH RESULTS:
${searchContext}

Based on the search results above, extract:
1. A 2-3 sentence bio about their career
2. James Beard Award status (winner/nominated/semifinalist) if mentioned
3. Notable culinary awards if mentioned

Return ONLY JSON.`;

      const result = await synthesize('accuracy', BIO_SYSTEM_PROMPT, prompt, ChefBioSchema);

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          chefId,
          chefName,
          miniBio: null,
          jamesBeardStatus: null,
          notableAwards: null,
          tokensUsed: result.usage,
          success: false,
          error: result.error,
        };
      }

      return {
        chefId,
        chefName,
        miniBio: result.data.miniBio,
        jamesBeardStatus: result.data.jamesBeardStatus ?? null,
        notableAwards: result.data.notableAwards ?? null,
        tokensUsed: result.usage,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Bio synthesis error for "${chefName}": ${msg}`);

      return {
        chefId,
        chefName,
        miniBio: null,
        jamesBeardStatus: null,
        notableAwards: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: msg,
      };
    }
  }
}
