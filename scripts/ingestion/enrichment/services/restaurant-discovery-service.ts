import { z } from 'zod';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { enumWithCitationStrip } from '../shared/result-parser';
import { searchRestaurants, combineSearchResultsCompact, SearchResult } from '../shared/search-client';
import { synthesize } from '../shared/synthesis-client';

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

const RESTAURANT_SYSTEM_PROMPT = `You are a restaurant ownership researcher extracting data from search results.

CRITICAL RULES:
1. ONLY include restaurants where the chef is an OWNER or PARTNER (has equity/ownership)
2. DO NOT include restaurants where they merely worked as an employee
3. DO NOT include past employers or places they trained at
4. Only use information from the provided search results

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
- Include CURRENT status if mentioned - verify if open or closed
- Cuisine tags should be specific (e.g., "Japanese", "New American")
- Price range: $ (<$15), $$ ($15-30), $$$ ($30-60), $$$$ ($60+)
- Track Michelin stars and awards if mentioned

CRITICAL: Respond with ONLY valid JSON. No explanatory text.

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
    private tokenTracker: TokenTracker,
    private maxRestaurants: number = 10
  ) {}

  async findRestaurants(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<RestaurantOnlyResult> {
    console.log(`   🍽️  Discovering restaurants for ${chefName}`);

    try {
      const searchResults = await searchRestaurants(chefName, chefId);
      const searchContext = combineSearchResultsCompact(searchResults, 12000);

      if (!searchContext || searchContext.length < 100) {
        console.log(`      ⚠️  Insufficient search results for ${chefName}`);
        return {
          chefId,
          chefName,
          restaurants: [],
          newRestaurants: 0,
          existingRestaurants: 0,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          success: false,
          error: 'Insufficient search results',
        };
      }

      const prompt = `Extract restaurants that chef "${chefName}" OWNS from these search results.

SEARCH RESULTS:
${searchContext}

Based on the search results above, include ONLY restaurants where ${chefName}:
- Founded or opened the restaurant
- Is an owner or partner (has equity)
- Is the chef-owner running their own place

DO NOT include restaurants where they:
- Just worked as an employee for someone else
- Trained early in their career
- Made guest appearances

Return ONLY a JSON object with "restaurants" array.`;

      const result = await synthesize('accuracy', RESTAURANT_SYSTEM_PROMPT, prompt, RestaurantsOnlySchema, {
        maxTokens: 8000,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          chefId,
          chefName,
          restaurants: [],
          newRestaurants: 0,
          existingRestaurants: 0,
          tokensUsed: result.usage,
          success: false,
          error: result.error,
        };
      }

      const restaurants = (result.data.restaurants || []).slice(0, this.maxRestaurants);

      console.log(`      🍽️  Found ${result.data.restaurants?.length || 0} restaurants for ${chefName} (keeping ${restaurants.length})`);
      restaurants.forEach(r => {
        console.log(`         - ${r.name} (${r.city}, ${r.state || r.country}) [${r.status}]`);
      });

      return {
        chefId,
        chefName,
        restaurants: restaurants as z.infer<typeof RestaurantSchema>[],
        newRestaurants: 0,
        existingRestaurants: 0,
        tokensUsed: result.usage,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Restaurant discovery error for "${chefName}": ${msg}`);

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

  async findRestaurantsFromCache(
    chefId: string,
    chefName: string,
    cachedSearches: SearchResult[]
  ): Promise<RestaurantOnlyResult> {
    console.log(`   🍽️  Extracting restaurants for ${chefName} (from cache)`);

    try {
      const searchContext = combineSearchResultsCompact(cachedSearches, 12000);

      if (!searchContext || searchContext.length < 100) {
        return {
          chefId,
          chefName,
          restaurants: [],
          newRestaurants: 0,
          existingRestaurants: 0,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          success: false,
          error: 'Insufficient cached search results',
        };
      }

      const prompt = `Extract restaurants that chef "${chefName}" OWNS from these search results.

SEARCH RESULTS:
${searchContext}

Based on the search results above, include ONLY restaurants where ${chefName}:
- Founded or opened the restaurant
- Is an owner or partner (has equity)
- Is the chef-owner running their own place

DO NOT include restaurants where they:
- Just worked as an employee for someone else
- Trained early in their career
- Made guest appearances

Return ONLY a JSON object with "restaurants" array.`;

      const result = await synthesize('accuracy', RESTAURANT_SYSTEM_PROMPT, prompt, RestaurantsOnlySchema, {
        maxTokens: 8000,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          chefId,
          chefName,
          restaurants: [],
          newRestaurants: 0,
          existingRestaurants: 0,
          tokensUsed: result.usage,
          success: false,
          error: result.error,
        };
      }

      const restaurants = (result.data.restaurants || []).slice(0, this.maxRestaurants);

      console.log(`      🍽️  Found ${result.data.restaurants?.length || 0} restaurants for ${chefName} (keeping ${restaurants.length})`);
      restaurants.forEach(r => {
        console.log(`         - ${r.name} (${r.city}, ${r.state || r.country}) [${r.status}]`);
      });

      return {
        chefId,
        chefName,
        restaurants: restaurants as z.infer<typeof RestaurantSchema>[],
        newRestaurants: 0,
        existingRestaurants: 0,
        tokensUsed: result.usage,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Restaurant extraction error for "${chefName}": ${msg}`);

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
