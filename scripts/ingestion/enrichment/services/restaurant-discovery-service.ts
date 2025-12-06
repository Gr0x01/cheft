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

const RESTAURANT_ONLY_SYSTEM_PROMPT = `You are a restaurant ownership researcher. Your job is to find restaurants that a chef OWNS or has an ownership stake in.

CRITICAL RULES:
1. ONLY include restaurants where the chef is an OWNER or PARTNER (has equity/ownership)
2. DO NOT include restaurants where they merely worked as an employee
3. DO NOT include past employers or places they trained at
4. Search multiple times to find all owned restaurants
5. Return the complete list as JSON

OWNERSHIP means:
- They founded/opened the restaurant
- They are a partner or co-owner
- They have an equity stake in the business

NOT ownership:
- Working as executive chef for someone else's restaurant
- Guest chef appearances
- Consulting without equity
- Training or early career positions

Guidelines:
- Include CURRENT status - verify if open or closed
- Cuisine tags should be specific (e.g., "Japanese", "New American")
- Price range: $ (<$15), $$ ($15-30), $$$ ($30-60), $$$$ ($60+)
- Track Michelin stars and awards if available

Your output must be ONLY a JSON object, no other text.

Response format:
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
      "role": "owner" or "partner" or null,
      "opened": 2020 or null,
      "michelinStars": 0-3 or null,
      "awards": ["Award Name (Year)"] or null
    }
  ]
}`;

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
    const prompt = `Find restaurants that chef "${chefName}" OWNS, opened, or is a PARTNER in.

Step 1: Search "${chefName} restaurant"
Step 2: Search "${chefName} owns restaurant"
Step 3: Search "${chefName} opened restaurant"  
Step 4: Search "${chefName} chef owner"

After searching, include ONLY restaurants where ${chefName}:
- Founded or opened the restaurant
- Is an owner or partner (has equity)
- Is the chef-owner running their own place

DO NOT include restaurants where they:
- Just worked as an employee for someone else
- Trained early in their career (e.g., worked at Quince before opening their own place)
- Made guest appearances

Output ONLY a JSON object with "restaurants" array.`;

    try {
      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          RESTAURANT_ONLY_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 16000, maxSteps: 15 }
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

      console.log(`      🍽️  Found ${validated.restaurants?.length || 0} restaurants for ${chefName} (keeping ${restaurants.length})`);
      restaurants.forEach(r => {
        console.log(`         - ${r.name} (${r.city}, ${r.state || r.country}) [${r.status}]`);
      });

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
