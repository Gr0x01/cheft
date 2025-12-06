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

const RESTAURANT_ONLY_SYSTEM_PROMPT = `You are a restaurant data extractor. Your job is to search the web and extract EVERY restaurant where a chef currently works.

CRITICAL RULES:
1. Search multiple times with different queries to find ALL restaurants
2. After searching, list EVERY restaurant mentioned in ANY search result
3. Do NOT summarize or filter - include ALL restaurants found where chef is currently involved
4. Many chefs own/operate 5-20+ restaurants
5. Return the complete list as JSON

Guidelines:
- Only include restaurants where the chef CURRENTLY has a role (owner, partner, executive chef)
- Include the CURRENT status - verify from recent sources if open or closed
- Cuisine tags should be specific (e.g., "Japanese", "New American", "Southern")
- Price range: $ (<$15/entree), $$ ($15-30), $$$ ($30-60), $$$$ ($60+)
- Track Michelin stars (1-3) and notable awards if available

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
      "role": "owner" or "executive_chef" or "partner" or "consultant" or null,
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
    const prompt = `Extract ALL restaurants where chef "${chefName}" currently works or owns.

Step 1: Search "${chefName} restaurants"
Step 2: Search "${chefName} restaurant locations 2024 2025"
Step 3: Search "${chefName} owns restaurants"
Step 4: Search "${chefName} new restaurant opening"

After searching, extract EVERY restaurant mentioned in the search results where ${chefName} is currently:
- Owner
- Partner  
- Executive Chef
- Culinary Director

For EACH restaurant found, output the full details (name, address, city, state, cuisine, price, status).

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
