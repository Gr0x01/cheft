import { z } from 'zod';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { parseAndValidate, enumWithCitationStrip, stripCitations } from '../shared/result-parser';
import { withRetry } from '../shared/retry-handler';

const RestaurantSchema = z.object({
  name: z.string(),
  address: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  cuisine: z.array(z.string()).nullable().optional(),
  priceRange: enumWithCitationStrip(['$', '$$', '$$$', '$$$$'] as const),
  status: enumWithCitationStrip(['open', 'closed', 'unknown'] as const),
  website: z.string().nullable().optional(),
  role: enumWithCitationStrip(['owner', 'executive_chef', 'partner', 'consultant'] as const),
  opened: z.number().nullable().optional(),
  michelinStars: z.number().min(0).max(3).nullable().optional().transform(val => val === null ? null : val),
  awards: z.array(z.string()).nullable().optional(),
  source: z.string().nullable().optional(),
}).passthrough();

const TVShowAppearanceSchema = z.object({
  showName: z.string(),
  season: z.string().nullable().optional(),
  result: enumWithCitationStrip(['winner', 'finalist', 'contestant', 'judge'] as const),
}).passthrough();

const ChefEnrichmentSchema = z.object({
  miniBio: z.string().transform(val => stripCitations(val) || val),
  restaurants: z.array(RestaurantSchema).default([]),
  tvShows: z.array(TVShowAppearanceSchema).default([]),
  jamesBeardStatus: enumWithCitationStrip(['winner', 'nominated', 'semifinalist'] as const),
  notableAwards: z.array(z.string()).nullable().optional(),
}).passthrough();

export interface ChefEnrichmentResult {
  chefId: string;
  chefName: string;
  miniBio: string | null;
  restaurants: z.infer<typeof RestaurantSchema>[];
  tvShows: z.infer<typeof TVShowAppearanceSchema>[];
  jamesBeardStatus: string | null;
  notableAwards: string[] | null;
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}

const CHEF_ENRICHMENT_SYSTEM_PROMPT = `You are a culinary industry expert helping to gather information about TV chef contestants and their restaurants.

Your task: Use web search to find accurate, up-to-date information about the chef, including:
1. A brief bio (2-3 sentences about their career and culinary style)
2. Their current restaurants (owned, partner, or executive chef roles)
3. ALL TV cooking show appearances (Top Chef, Iron Chef, Tournament of Champions, Beat Bobby Flay, Chopped, Hell's Kitchen, MasterChef, Next Level Chef, etc.)
4. James Beard Award status if any
5. Notable awards (e.g., Michelin Guide recognition, World's 50 Best, AAA Five Diamond)

IMPORTANT: After gathering enough information (typically 5-10 searches), YOU MUST return your final JSON response. Do not continue searching indefinitely.

Guidelines:
- Only include restaurants where the chef has a significant role (owner, partner, executive chef)
- Limit to the chef's 5-10 most notable/current restaurants (don't search for every restaurant)
- Include closed restaurants but mark them as "closed"
- Verify restaurant status is current (within last year)
- For TV shows: Include ALL major cooking competition appearances (winner/finalist/contestant/judge roles)
- TV show format: Show name exactly as it appears (e.g., "Top Chef", "Iron Chef America", "Tournament of Champions")
- Be conservative - if unsure about a detail, omit it
- Cuisine tags should be specific (e.g., "Japanese", "New American", "Southern")
- Price range: $ (<$15/entree), $$ ($15-30), $$$ ($30-60), $$$$ ($60+)

Awards Guidelines:
- For restaurants: Track Michelin stars (1-3) and notable awards (James Beard awards, AAA diamonds, Zagat ratings)
- For chefs: Track notable awards beyond James Beard (World's 50 Best Chefs, Michelin Guide recognition, S.Pellegrino awards)
- Be specific with award names and years if available
- Only include prestigious, verifiable awards

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, conversational responses, or anything other than the JSON object itself.

Your response must be a single JSON object matching this exact structure:
{
  "miniBio": "2-3 sentence bio",
  "restaurants": [
    {
      "name": "Restaurant Name",
      "address": "123 Main St" or null,
      "city": "City",
      "state": "ST" or null,
      "country": "US",
      "cuisine": ["Cuisine Type"] or null,
      "priceRange": "$$" or null,
      "status": "open" or "closed" or "unknown",
      "website": "https://..." or null,
      "role": "owner" or "executive_chef" or "partner" or "consultant" or null,
      "michelinStars": 0-3 or null,
      "awards": ["Award Name (Year)"] or null
    }
  ],
  "tvShows": [
    {
      "showName": "Top Chef" or "Iron Chef America" etc.,
      "season": "Season 15" or "15" or null,
      "result": "winner" or "finalist" or "contestant" or "judge" or null
    }
  ],
  "jamesBeardStatus": null or "winner" or "nominated" or "semifinalist",
  "notableAwards": ["Award Name (Year)"] or null
}

Do NOT start your response with "I can..." or any other text. Start immediately with the opening brace {.`;

export class ChefEnrichmentService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker,
    private maxRestaurants: number = 10
  ) {}

  async enrichChef(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<ChefEnrichmentResult> {
    const prompt = this.buildChefEnrichmentPrompt(chefName, showName, options);

    try {
      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          CHEF_ENRICHMENT_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 8000, maxSteps: 50, searchContextSize: 'medium' }
        ),
        `enrich chef ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        console.error(`   ❌ Empty response from LLM for "${chefName}"`);
        console.error(`   Steps used: ${result.steps?.length || 0}/20`);
        console.error(`   Finish reason: ${result.finishReason}`);
        throw new Error('LLM returned empty response - likely hit step limit without final answer');
      }

      const validated = parseAndValidate(result.text, ChefEnrichmentSchema);

      const restaurants = (validated.restaurants || []).slice(0, this.maxRestaurants);

      return {
        chefId,
        chefName,
        miniBio: validated.miniBio,
        restaurants: restaurants as z.infer<typeof RestaurantSchema>[],
        tvShows: validated.tvShows as z.infer<typeof TVShowAppearanceSchema>[],
        jamesBeardStatus: validated.jamesBeardStatus ?? null,
        notableAwards: validated.notableAwards ?? null,
        tokensUsed,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ LLM enrichment error for "${chefName}": ${msg}`);
      
      return {
        chefId,
        chefName,
        miniBio: null,
        restaurants: [],
        tvShows: [],
        jamesBeardStatus: null,
        notableAwards: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: msg,
      };
    }
  }

  private buildChefEnrichmentPrompt(
    chefName: string,
    showName: string,
    options: { season?: string; result?: string }
  ): string {
    let prompt = `Research chef ${chefName} who appeared on ${showName}`;
    
    if (options.season) {
      prompt += ` (${options.season})`;
    }
    if (options.result) {
      prompt += ` as ${options.result}`;
    }
    
    prompt += `.\n\nFind:
1. A brief professional bio (2-3 sentences)
2. All restaurants they currently own, co-own, or serve as executive chef
3. Any James Beard Award recognition

For each restaurant, include the full address if available.`;

    return prompt;
  }
}
