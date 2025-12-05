import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../src/lib/database.types';
import { stripCitations, enumWithCitationStrip, extractJsonFromText, parseAndValidate } from '../enrichment/shared/result-parser';
import { withRetry } from '../enrichment/shared/retry-handler';
import { LLMClient } from '../enrichment/shared/llm-client';
import { TokenTracker, TokenUsage } from '../enrichment/shared/token-tracker';
import { ChefRepository } from '../enrichment/repositories/chef-repository';
import { RestaurantRepository } from '../enrichment/repositories/restaurant-repository';
import { ShowRepository } from '../enrichment/repositories/show-repository';


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

const RestaurantStatusSchema = z.object({
  status: z.enum(['open', 'closed', 'unknown']),
  confidence: z.number(),
  reason: z.string(),
});


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

export interface RestaurantStatusResult {
  restaurantId: string;
  restaurantName: string;
  status: 'open' | 'closed' | 'unknown';
  confidence: number;
  reason: string;
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}

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



export interface LLMEnricherConfig {
  model?: string;
  maxRestaurantsPerChef?: number;
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

const RESTAURANT_STATUS_SYSTEM_PROMPT = `You are a restaurant industry analyst verifying whether restaurants are currently open.

Your task: Search for current information about the restaurant to determine if it's still operating.

Guidelines:
- Look for recent reviews, social media activity, or news articles
- A restaurant is "closed" if there's clear evidence it shut down
- A restaurant is "open" if there's recent activity (within 6 months)
- Mark as "unknown" if you can't find conclusive information
- Confidence: 0.9+ for clear evidence, 0.7-0.9 for likely, <0.7 for uncertain

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text or anything other than the JSON object itself.

Your response must be a single JSON object matching this exact structure:
{
  "status": "open" or "closed" or "unknown",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation of findings"
}

Do NOT start your response with "I can..." or any other text. Start immediately with the opening brace {.`;


export function createLLMEnricher(
  supabase: SupabaseClient<Database>,
  config: LLMEnricherConfig = {}
) {
  const modelName = config.model ?? 'gpt-5-mini';
  const maxRestaurants = config.maxRestaurantsPerChef ?? 10;
  
  const llmClient = new LLMClient({ model: modelName });
  const chefRepo = new ChefRepository(supabase);
  const restaurantRepo = new RestaurantRepository(supabase);
  const showRepo = new ShowRepository(supabase);
  
  let totalTokensUsed: TokenUsage = { prompt: 0, completion: 0, total: 0 };

  async function enrichChef(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<ChefEnrichmentResult> {
    const prompt = buildChefEnrichmentPrompt(chefName, showName, options);

    try {
      const result = await withRetry(
        () => llmClient.generateWithWebSearch(
          CHEF_ENRICHMENT_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 8000, maxSteps: 50, searchContextSize: 'medium' }
        ),
        `enrich chef ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      if (!result.text || result.text.trim() === '') {
        console.error(`   ❌ Empty response from LLM for "${chefName}"`);
        console.error(`   Steps used: ${result.steps?.length || 0}/20`);
        console.error(`   Finish reason: ${result.finishReason}`);
        throw new Error('LLM returned empty response - likely hit step limit without final answer');
      }

      const validated = parseAndValidate(result.text, ChefEnrichmentSchema);

      const restaurants = (validated.restaurants || []).slice(0, maxRestaurants);

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

  async function verifyRestaurantStatus(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string
  ): Promise<RestaurantStatusResult> {
    const prompt = buildStatusVerificationPrompt(restaurantName, chefName, city, state);

    try {
      const result = await withRetry(
        () => llmClient.generateWithWebSearch(
          RESTAURANT_STATUS_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 4000, searchContextSize: 'low' }
        ),
        `verify status ${restaurantName}`
      );

      const tokensUsed: TokenUsage = result.usage;

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      const validated = parseAndValidate(result.text, RestaurantStatusSchema);

      return {
        restaurantId,
        restaurantName,
        status: validated.status,
        confidence: validated.confidence,
        reason: validated.reason,
        tokensUsed,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Status verification error for "${restaurantName}": ${msg}`);
      
      return {
        restaurantId,
        restaurantName,
        status: 'unknown',
        confidence: 0,
        reason: `Error: ${msg}`,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: msg,
      };
    }
  }


  async function enrichRestaurantsOnly(
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
        () => llmClient.generateWithWebSearch(
          RESTAURANT_ONLY_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 6000, maxSteps: 20, searchContextSize: 'medium' }
        ),
        `find restaurants for ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty response');
      }

      const RestaurantsOnlySchema = z.object({
        restaurants: z.array(RestaurantSchema).default([]),
      });
      const validated = parseAndValidate(result.text, RestaurantsOnlySchema);

      const restaurants = (validated.restaurants || []).slice(0, maxRestaurants);

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

  async function saveDiscoveredRestaurant(
    chefId: string,
    restaurant: z.infer<typeof RestaurantSchema>
  ): Promise<{ success: boolean; restaurantId?: string; isNew: boolean }> {
    return restaurantRepo.createRestaurant(chefId, restaurant);
  }

  async function findShowByName(showName: string): Promise<string | null> {
    return showRepo.findShowByName(showName);
  }

  async function saveChefShows(
    chefId: string,
    tvShows: z.infer<typeof TVShowAppearanceSchema>[]
  ): Promise<{ saved: number; skipped: number }> {
    return showRepo.saveChefShows(chefId, tvShows);
  }

  async function enrichAndSaveChef(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string; dryRun?: boolean } = {}
  ): Promise<ChefEnrichmentResult> {
    const result = await enrichChef(chefId, chefName, showName, options);

    if (!result.success || options.dryRun) {
      return result;
    }

    if (result.miniBio || result.notableAwards) {
      const updateResult = await chefRepo.updateBioAndAwards(
        chefId,
        result.miniBio,
        result.jamesBeardStatus,
        result.notableAwards
      );

      if (!updateResult.success) {
        console.error(`   ❌ Failed to save chef data: ${updateResult.error}`);
      }
    }

    if (result.tvShows && result.tvShows.length > 0) {
      const { saved, skipped } = await saveChefShows(chefId, result.tvShows);
      if (saved > 0) {
        console.log(`      📺 Saved ${saved} TV show appearances (${skipped} already existed or skipped)`);
      }
    }

    if (result.restaurants && result.restaurants.length > 0) {
      let newRestaurants = 0;
      let existingRestaurants = 0;

      for (const restaurant of result.restaurants) {
        if (!restaurant.name || !restaurant.city) {
          console.log(`      ⚠️  Skipping restaurant with missing name or city`);
          continue;
        }

        const saveResult = await saveDiscoveredRestaurant(chefId, restaurant);

        if (saveResult.success) {
          if (saveResult.isNew) {
            newRestaurants++;
            console.log(`      ➕ Added: ${restaurant.name} (${restaurant.city})`);
          } else {
            existingRestaurants++;
          }
        }
      }

      if (newRestaurants > 0) {
        console.log(`      📍 Saved ${newRestaurants} new restaurants (${existingRestaurants} already existed)`);
      }
    }

    return result;
  }

  async function verifyAndUpdateStatus(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string,
    options: { dryRun?: boolean; minConfidence?: number } = {}
  ): Promise<RestaurantStatusResult> {
    const minConfidence = options.minConfidence ?? 0.7;
    const result = await verifyRestaurantStatus(restaurantId, restaurantName, chefName, city, state);

    if (!result.success || options.dryRun) {
      return result;
    }

    if (result.confidence >= minConfidence && result.status !== 'unknown') {
      const updateResult = await restaurantRepo.updateStatus(
        restaurantId,
        result.status,
        result.confidence,
        result.reason
      );

      if (!updateResult.success) {
        console.error(`   ❌ Failed to update restaurant status: ${updateResult.error}`);
      }
    }

    return result;
  }

  async function findAndSaveRestaurants(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string; dryRun?: boolean } = {}
  ): Promise<RestaurantOnlyResult> {
    const result = await enrichRestaurantsOnly(chefId, chefName, showName, options);

    if (!result.success || options.dryRun) {
      return result;
    }

    let newRestaurants = 0;
    let existingRestaurants = 0;

    if (result.restaurants && result.restaurants.length > 0) {
      for (const restaurant of result.restaurants) {
        if (!restaurant.name || !restaurant.city) {
          console.log(`      ⚠️  Skipping restaurant with missing name or city`);
          continue;
        }

        const saveResult = await saveDiscoveredRestaurant(chefId, restaurant);

        if (saveResult.success) {
          if (saveResult.isNew) {
            newRestaurants++;
            console.log(`      ➕ Added: ${restaurant.name} (${restaurant.city})`);
          } else {
            existingRestaurants++;
          }
        }
      }

      if (newRestaurants > 0) {
        console.log(`      📍 Saved ${newRestaurants} new restaurants (${existingRestaurants} already existed)`);
      }
    }

    const timestampResult = await chefRepo.setEnrichmentTimestamp(chefId);
    if (!timestampResult.success) {
      console.error(`      ⚠️  Failed to update last_enriched_at: ${timestampResult.error}`);
    }

    return {
      ...result,
      newRestaurants,
      existingRestaurants,
    };
  }

  function getTotalTokensUsed(): TokenUsage {
    return { ...totalTokensUsed };
  }

  function estimateCost(): number {
    const inputCostPer1M = 0.25;
    const outputCostPer1M = 2.00;
    
    return (totalTokensUsed.prompt / 1_000_000) * inputCostPer1M +
           (totalTokensUsed.completion / 1_000_000) * outputCostPer1M;
  }
  
  function getModelName(): string {
    return modelName;
  }

  function resetTokenCounter(): void {
    totalTokensUsed = { prompt: 0, completion: 0, total: 0 };
  }

  async function enrichChefNarrative(
    chefId: string,
    chefContext: any
  ): Promise<{ success: boolean; narrative: string | null; tokensUsed: TokenUsage; error?: string }> {
    try {
      const { buildChefNarrativePrompt, CHEF_NARRATIVE_SYSTEM_PROMPT } = await import('../../../src/lib/narratives/prompts');
      
      const prompt = buildChefNarrativePrompt(chefContext);
      
      const narrativeClient = new LLMClient({ model: 'gpt-4.1-mini' });
      const result = await withRetry(
        () => narrativeClient.generateWithWebSearch(
          CHEF_NARRATIVE_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 8000, maxSteps: 50, searchContextSize: 'medium' }
        ),
        `generate narrative for chef ${chefContext.name}`
      );

      const tokensUsed: TokenUsage = result.usage;

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty narrative');
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        throw new Error(`Generated narrative too short: ${narrative.length} characters`);
      }

      const updateResult = await chefRepo.updateNarrative(chefId, narrative);
      if (!updateResult.success) {
        throw new Error(`Database update failed: ${updateResult.error}`);
      }

      return {
        success: true,
        narrative,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Narrative generation error: ${msg}`);
      
      return {
        success: false,
        narrative: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }

  async function enrichRestaurantNarrative(
    restaurantId: string,
    restaurantContext: any
  ): Promise<{ success: boolean; narrative: string | null; tokensUsed: TokenUsage; error?: string }> {
    try {
      const { buildRestaurantNarrativePrompt, RESTAURANT_NARRATIVE_SYSTEM_PROMPT } = await import('../../../src/lib/narratives/prompts');
      
      const prompt = buildRestaurantNarrativePrompt(restaurantContext);
      
      const narrativeClient = new LLMClient({ model: 'gpt-4.1-mini' });
      const result = await withRetry(
        () => narrativeClient.generateWithWebSearch(
          RESTAURANT_NARRATIVE_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 6000, maxSteps: 30, searchContextSize: 'medium' }
        ),
        `generate narrative for restaurant ${restaurantContext.name}`
      );

      const tokensUsed: TokenUsage = result.usage;

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty narrative');
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        throw new Error(`Generated narrative too short: ${narrative.length} characters`);
      }

      const updateResult = await restaurantRepo.updateNarrative(restaurantId, narrative);
      if (!updateResult.success) {
        throw new Error(`Database update failed: ${updateResult.error}`);
      }

      return {
        success: true,
        narrative,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Restaurant narrative error: ${msg}`);
      
      return {
        success: false,
        narrative: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }

  async function enrichShowsOnly(
    chefId: string,
    chefName: string
  ): Promise<{ success: boolean; showsSaved: number; showsSkipped: number; tokensUsed: TokenUsage; error?: string }> {
    try {
      const prompt = `Find ALL TV cooking show competition appearances for chef "${chefName}".

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

      const showsClient = new LLMClient({ model: modelName });
      const result = await withRetry(
        () => showsClient.generateWithWebSearch(
          `You are a TV cooking show expert. Use web search to find ALL TV show appearances for this chef.

IMPORTANT: After gathering enough information (typically 5-10 searches), YOU MUST return your final JSON response. Do not continue searching indefinitely.

Return ONLY a valid JSON array. Do NOT include any explanatory text or anything other than the JSON array itself.

Start immediately with the opening bracket [.`,
          prompt,
          { maxTokens: 4000, maxSteps: 40, searchContextSize: 'medium', useResponseModel: false }
        ),
        `enrich shows for ${chefName}`
      );

      const tokensUsed: TokenUsage = result.usage;

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      if (!result.text || result.text.trim() === '') {
        console.error(`   ❌ Empty response from LLM for "${chefName}"`);
        console.error(`   Steps used: ${result.steps?.length || 0}/30`);
        console.error(`   Finish reason: ${result.finishReason}`);
        throw new Error('LLM returned empty response - likely hit step limit without final answer');
      }

      const jsonText = extractJsonFromText(result.text);
      const parsed = JSON.parse(jsonText);
      
      if (!Array.isArray(parsed)) {
        console.error(`   ❌ LLM returned non-array:`, JSON.stringify(parsed).slice(0, 200));
        throw new Error('LLM did not return an array');
      }

      const tvShows = z.array(TVShowAppearanceSchema).parse(parsed);

      console.log(`      📋 LLM found ${tvShows.length} shows for ${chefName}`);
      if (tvShows.length > 0) {
        tvShows.forEach(show => {
          console.log(`         - ${show.showName}${show.season ? ' ' + show.season : ''} (${show.result || 'contestant'})`);
        });
      }

      const { saved, skipped } = await saveChefShows(chefId, tvShows);

      const { error: timestampError } = await (supabase
        .from('chefs') as ReturnType<typeof supabase.from>)
        .update({
          last_enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chefId);

      if (timestampError) {
        console.error(`      ⚠️  Failed to update last_enriched_at: ${timestampError.message}`);
      }

      return {
        success: true,
        showsSaved: saved,
        showsSkipped: skipped,
        tokensUsed,
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

  async function enrichCityNarrative(
    cityId: string,
    cityContext: any
  ): Promise<{ success: boolean; narrative: string | null; tokensUsed: TokenUsage; error?: string }> {
    try {
      const { buildCityNarrativePrompt, CITY_NARRATIVE_SYSTEM_PROMPT } = await import('../../../src/lib/narratives/prompts');
      
      const prompt = buildCityNarrativePrompt(cityContext);
      
      const narrativeClient = new LLMClient({ model: 'gpt-4.1-mini' });
      const result = await withRetry(
        () => narrativeClient.generateWithWebSearch(
          CITY_NARRATIVE_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 8000, maxSteps: 40, searchContextSize: 'medium' }
        ),
        `generate narrative for city ${cityContext.name}`
      );

      const tokensUsed: TokenUsage = result.usage;

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty narrative');
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        throw new Error(`Generated narrative too short: ${narrative.length} characters`);
      }

      const { error: updateError } = await (supabase.from('cities') as ReturnType<typeof supabase.from>)
        .update({
          city_narrative: narrative,
          narrative_generated_at: new Date().toISOString(),
        })
        .eq('id', cityId);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      return {
        success: true,
        narrative,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ City narrative error: ${msg}`);
      
      return {
        success: false,
        narrative: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }

  return {
    enrichChef,
    enrichAndSaveChef,
    findAndSaveRestaurants,
    verifyRestaurantStatus,
    verifyAndUpdateStatus,
    enrichShowsOnly,
    enrichChefNarrative,
    enrichRestaurantNarrative,
    enrichCityNarrative,
    getTotalTokensUsed,
    estimateCost,
    resetTokenCounter,
    getModelName,
  };
}

function buildChefEnrichmentPrompt(
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

function buildStatusVerificationPrompt(
  restaurantName: string,
  chefName: string,
  city: string,
  state?: string
): string {
  const location = state ? `${city}, ${state}` : city;
  
  return `Verify if "${restaurantName}" by chef ${chefName} in ${location} is currently open.

Search for:
- Recent reviews or social media posts
- News about closure or relocation
- Current operating hours or website status

Determine if the restaurant is open, closed, or unknown.`;
}

export type LLMEnricher = ReturnType<typeof createLLMEnricher>;
