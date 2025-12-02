import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../src/lib/database.types';
import { logDataChange } from '../queue/audit-log';
import { createImageStorageService } from '../services/image-storage';
import { createGoogleImageSearchTool } from '../services/google-images';

function stripCitations(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/\s*\(\[.*?\]\(.*?\)\)/g, '')
    .replace(/\s*\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function enumWithCitationStrip<T extends string>(enumValues: readonly [T, ...T[]]) {
  return z.string().nullable().optional().transform((val): T | null => {
    if (!val) return null;
    const cleaned = stripCitations(val);
    if (!cleaned) return null;
    if (enumValues.includes(cleaned as T)) {
      return cleaned as T;
    }
    return null;
  });
}

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
  role: z.string().nullable().optional(),
  opened: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
}).passthrough();

const ChefEnrichmentSchema = z.object({
  miniBio: z.string().transform(val => stripCitations(val) || val),
  restaurants: z.array(RestaurantSchema).optional().default([]),
  jamesBeardStatus: enumWithCitationStrip(['winner', 'nominated', 'semifinalist'] as const),
  photoUrl: z.string().url().nullable().optional(),
  photoConfidence: z.number().min(0).max(1).nullable().optional(),
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
  jamesBeardStatus: string | null;
  photoUrl: string | null;
  photoSource: 'show_website' | 'llm_search' | null;
  photoConfidence: number;
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

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface LLMEnricherConfig {
  model?: string;
  maxRestaurantsPerChef?: number;
}

const CHEF_ENRICHMENT_SYSTEM_PROMPT = `You are a culinary industry expert helping to gather information about TV chef contestants and their restaurants.

Your task: Use web search to find accurate, up-to-date information about the chef, including:
1. A brief bio (2-3 sentences about their career and culinary style)
2. Their current restaurants (owned, partner, or executive chef roles)
3. James Beard Award status if any
4. A high-quality professional headshot photo URL (if available with high confidence)

Guidelines:
- Only include restaurants where the chef has a significant role (owner, partner, executive chef)
- Include closed restaurants but mark them as "closed"
- Verify restaurant status is current (within last year)
- Be conservative - if unsure about a detail, omit it
- Cuisine tags should be specific (e.g., "Japanese", "New American", "Southern")
- Price range: $ (<$15/entree), $$ ($15-30), $$$ ($30-60), $$$$ ($60+)

Photo Guidelines:
- Use the google_image_search tool to find professional headshots
- Search for: "{chef name} chef headshot" or "{chef name} chef professional photo"
- Look through the results and select the BEST professional headshot
- Choose photos that are: clear headshots, professional lighting, recent, solo portraits
- Avoid: group photos, cooking action shots, low-res images, logos, graphics
- Return the direct image URL (not a web page URL)
- Set photoConfidence: 0.9+ for clear professional headshots, 0.7-0.9 for decent photos, omit if <0.7

IMPORTANT: Return your response as valid JSON matching this exact structure:
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
      "role": "owner" or "executive_chef" or "partner" or "consultant" or null
    }
  ],
  "jamesBeardStatus": null or "winner" or "nominated" or "semifinalist",
  "photoUrl": "https://..." or null,
  "photoConfidence": 0.0 to 1.0 or null
}`;

const RESTAURANT_STATUS_SYSTEM_PROMPT = `You are a restaurant industry analyst verifying whether restaurants are currently open.

Your task: Search for current information about the restaurant to determine if it's still operating.

Guidelines:
- Look for recent reviews, social media activity, or news articles
- A restaurant is "closed" if there's clear evidence it shut down
- A restaurant is "open" if there's recent activity (within 6 months)
- Mark as "unknown" if you can't find conclusive information
- Confidence: 0.9+ for clear evidence, 0.7-0.9 for likely, <0.7 for uncertain

IMPORTANT: Return your response as valid JSON matching this exact structure:
{
  "status": "open" or "closed" or "unknown",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation of findings"
}`;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`   ⚠️ Retry ${attempt}/${MAX_RETRIES} for "${context}" after ${Math.round(delay)}ms: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

function extractJsonFromText(text: string): string {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return text;
}

export function createLLMEnricher(
  supabase: SupabaseClient<Database>,
  config: LLMEnricherConfig = {}
) {
  const modelName = config.model ?? 'gpt-5-mini';
  const maxRestaurants = config.maxRestaurantsPerChef ?? 10;
  const imageStorageService = createImageStorageService(supabase);

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
        () => generateText({
          model: openai.responses(modelName),
          tools: {
            web_search_preview: openai.tools.webSearchPreview({
              searchContextSize: 'medium',
            }),
            google_image_search: createGoogleImageSearchTool(),
          },
          system: CHEF_ENRICHMENT_SYSTEM_PROMPT,
          prompt,
          maxTokens: 8000,
        }),
        `enrich chef ${chefName}`
      );

      const tokensUsed: TokenUsage = {
        prompt: result.usage?.promptTokens || 0,
        completion: result.usage?.completionTokens || 0,
        total: result.usage?.totalTokens || 0,
      };

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      const jsonText = extractJsonFromText(result.text);
      const parsed = JSON.parse(jsonText);
      const validated = ChefEnrichmentSchema.parse(parsed);

      const restaurants = validated.restaurants.slice(0, maxRestaurants);

      let photoUrl: string | null = null;
      let photoSource: 'llm_search' | null = null;
      let photoConfidence = 0;

      let sourcePhotoUrl: string | null = null;

      if (validated.photoUrl && (validated.photoConfidence ?? 0) >= 0.7) {
        sourcePhotoUrl = validated.photoUrl;
        photoSource = 'llm_search';
        photoConfidence = validated.photoConfidence ?? 0.7;
      }

      if (sourcePhotoUrl && photoSource) {
        const uploadResult = await imageStorageService.downloadAndUploadChefPhoto(
          chefId,
          chefName,
          sourcePhotoUrl
        );

        if (uploadResult.success) {
          photoUrl = uploadResult.publicUrl;
        } else {
          console.warn(`   ⚠️  Failed to upload photo, storing source URL instead`);
          photoUrl = sourcePhotoUrl;
        }
      }

      return {
        chefId,
        chefName,
        miniBio: validated.miniBio,
        restaurants,
        jamesBeardStatus: validated.jamesBeardStatus ?? null,
        photoUrl,
        photoSource,
        photoConfidence,
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
        jamesBeardStatus: null,
        photoUrl: null,
        photoSource: null,
        photoConfidence: 0,
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
        () => generateText({
          model: openai.responses(modelName),
          tools: {
            web_search_preview: openai.tools.webSearchPreview({
              searchContextSize: 'low',
            }),
          },
          system: RESTAURANT_STATUS_SYSTEM_PROMPT,
          prompt,
          maxTokens: 4000,
        }),
        `verify status ${restaurantName}`
      );

      const tokensUsed: TokenUsage = {
        prompt: result.usage?.promptTokens || 0,
        completion: result.usage?.completionTokens || 0,
        total: result.usage?.totalTokens || 0,
      };

      totalTokensUsed.prompt += tokensUsed.prompt;
      totalTokensUsed.completion += tokensUsed.completion;
      totalTokensUsed.total += tokensUsed.total;

      const jsonText = extractJsonFromText(result.text);
      const parsed = JSON.parse(jsonText);
      const validated = RestaurantStatusSchema.parse(parsed);

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

    if (result.miniBio || result.photoUrl) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (result.miniBio) {
        updateData.mini_bio = result.miniBio;
      }

      if (result.jamesBeardStatus) {
        updateData.james_beard_status = result.jamesBeardStatus;
      }

      if (result.photoUrl && result.photoSource) {
        updateData.photo_url = result.photoUrl;
        updateData.photo_source = result.photoSource;
      }

      const { error } = await (supabase
        .from('chefs') as ReturnType<typeof supabase.from>)
        .update(updateData)
        .eq('id', chefId);

      if (error) {
        console.error(`   ❌ Failed to save chef data: ${error.message}`);
      } else {
        await logDataChange(supabase, {
          table_name: 'chefs',
          record_id: chefId,
          change_type: 'update',
          new_data: { 
            mini_bio: result.miniBio, 
            james_beard_status: result.jamesBeardStatus,
            photo_url: result.photoUrl,
            photo_source: result.photoSource,
          },
          source: 'llm_enricher',
          confidence: result.photoConfidence > 0 ? Math.min(0.85, result.photoConfidence) : 0.85,
        });
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
      const { error } = await (supabase
        .from('restaurants') as ReturnType<typeof supabase.from>)
        .update({
          status: result.status,
          last_verified_at: new Date().toISOString(),
          verification_source: 'llm_web_search',
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId);

      if (error) {
        console.error(`   ❌ Failed to update restaurant status: ${error.message}`);
      } else {
        await logDataChange(supabase, {
          table_name: 'restaurants',
          record_id: restaurantId,
          change_type: 'update',
          new_data: { status: result.status, reason: result.reason },
          source: 'llm_enricher',
          confidence: result.confidence,
        });
      }
    }

    return result;
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

  function resetTokenCounter(): void {
    totalTokensUsed = { prompt: 0, completion: 0, total: 0 };
  }

  return {
    enrichChef,
    enrichAndSaveChef,
    verifyRestaurantStatus,
    verifyAndUpdateStatus,
    getTotalTokensUsed,
    estimateCost,
    resetTokenCounter,
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
