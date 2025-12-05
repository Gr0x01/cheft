import { z } from 'zod';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { parseAndValidate, enumWithCitationStrip, stripCitations } from '../shared/result-parser';
import { withRetry } from '../shared/retry-handler';

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

const BIO_SYSTEM_PROMPT = `You are a culinary industry expert. Search the web for biographical information about this chef.

Your task: Find accurate, up-to-date information about the chef including:
1. A brief bio (2-3 sentences about their career and culinary style)
2. James Beard Award status if any (winner, nominated, semifinalist)
3. Notable culinary awards (Michelin Guide recognition, World's 50 Best, AAA Five Diamond, etc.)

IMPORTANT: Focus ONLY on biographical info and awards. Do NOT search for restaurants or TV shows.

Guidelines:
- Be conservative - if unsure about a detail, omit it
- Only include prestigious, verifiable awards
- Be specific with award names and years if available

CRITICAL: Respond with ONLY valid JSON. No explanatory text.
CRITICAL: Do NOT include citation numbers or brackets (no [1], [source], etc.)

Response format:
{
  "miniBio": "2-3 sentence bio",
  "jamesBeardStatus": null or "winner" or "nominated" or "semifinalist",
  "notableAwards": ["Award Name (Year)"] or null
}`;

export class ChefBioService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker
  ) {}

  async enrichBio(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<ChefBioResult> {
    let prompt = `Research chef ${chefName} who appeared on ${showName}`;
    
    if (options.season) {
      prompt += ` (${options.season})`;
    }
    if (options.result) {
      prompt += ` as ${options.result}`;
    }
    
    prompt += `.\n\nFind their professional bio (2-3 sentences), James Beard Award status, and notable culinary awards.`;

    try {
      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          BIO_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 4000, searchContextSize: 'low', useResponseModel: true }
        ),
        `enrich bio for ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty response');
      }

      const validated = parseAndValidate(result.text, ChefBioSchema);

      return {
        chefId,
        chefName,
        miniBio: validated.miniBio,
        jamesBeardStatus: validated.jamesBeardStatus ?? null,
        notableAwards: validated.notableAwards ?? null,
        tokensUsed,
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
}
