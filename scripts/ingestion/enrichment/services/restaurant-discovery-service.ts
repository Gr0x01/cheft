import { z } from 'zod';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { parseAndValidate, enumWithCitationStrip } from '../shared/result-parser';
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

const RestaurantsOnlySchema = z.object({
  restaurants: z.array(RestaurantSchema).default([]),
});

export interface RestaurantOnlyResult {
  chefId: string;
  chefName: string;
  restaurants: z.infer<typeof RestaurantSchema>[];
  newRestaurants: number;
  existingRestaurants: number;
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}

const RESTAURANT_ONLY_SYSTEM_PROMPT = `You are a culinary industry expert helping to find CURRENT restaurants where TV chef contestants actively work.

Your task: Use web search to find ONLY restaurants where this chef is CURRENTLY working as of 2025.

Guidelines:
- Only include restaurants where the chef CURRENTLY has a significant role (owner, partner, executive chef)
- DO NOT include past restaurants or positions the chef has left
- DO NOT include closed restaurants
- Verify the restaurant is currently open and operating
- Verify the chef is still actively involved (check recent news, social media, restaurant website)
- Be conservative - if unsure about current status, omit it
- Cuisine tags should be specific (e.g., "Japanese", "New American", "Southern")
- Price range: $ (<$15/entree), $$ ($15-30), $$$ ($30-60), $$$$ ($60+)
- Track Michelin stars (1-3) and notable awards if available

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text or anything other than the JSON object itself.

Your response must be a single JSON object matching this exact structure:
{
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
      "opened": 2020 or null,
      "michelinStars": 0-3 or null,
      "awards": ["Award Name (Year)"] or null
    }
  ]
}

Do NOT start your response with "I can..." or any other text. Start immediately with the opening brace {.`;

export class RestaurantDiscoveryService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker,
    private maxRestaurants: number = 10
  ) {}

  async findRestaurants(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<RestaurantOnlyResult> {
    const seasonInfo = options.season ? ` (${showName} ${options.season})` : ` (${showName})`;
    const resultInfo = options.result ? `, ${options.result}` : '';
    const prompt = `Find ONLY current/active restaurants where chef ${chefName}${seasonInfo}${resultInfo} currently works.

Search for restaurants where ${chefName} is CURRENTLY (as of 2025):
- Owner
- Partner
- Executive Chef
- Culinary Director

IMPORTANT: Only include restaurants where the chef is actively working NOW. Do not include past restaurants or positions they have left. Verify the restaurant is currently open and operating.`;

    try {
      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          RESTAURANT_ONLY_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 6000, maxSteps: 20, searchContextSize: 'medium' }
        ),
        `find restaurants for ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty response');
      }

      const validated = parseAndValidate(result.text, RestaurantsOnlySchema);

      const restaurants = (validated.restaurants || []).slice(0, this.maxRestaurants);

      return {
        chefId,
        chefName,
        restaurants: restaurants as z.infer<typeof RestaurantSchema>[],
        newRestaurants: 0,
        existingRestaurants: 0,
        tokensUsed,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Restaurant enrichment error for "${chefName}": ${msg}`);
      
      return {
        chefId,
        chefName,
        restaurants: [],
        newRestaurants: 0,
        existingRestaurants: 0,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: msg,
      };
    }
  }
}
