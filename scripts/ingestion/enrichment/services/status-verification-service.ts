import { z } from 'zod';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { searchStatus, combineSearchResultsCompact, SearchResult } from '../shared/search-client';
import { synthesize } from '../shared/synthesis-client';
import { createGooglePlacesService } from '../../services/google-places';

const RestaurantStatusSchema = z.object({
  status: z.enum(['open', 'closed', 'unknown']),
  confidence: z.number(),
  reason: z.string(),
});

export interface RestaurantStatusResult {
  restaurantId: string;
  restaurantName: string;
  status: 'open' | 'closed' | 'unknown';
  confidence: number;
  reason: string;
  tokensUsed: TokenUsage;
  success: boolean;
  source: 'google_places' | 'tavily' | 'unknown';
  error?: string;
}

const STATUS_SYSTEM_PROMPT = `You are a restaurant industry analyst verifying whether restaurants are currently open based on search results.

Guidelines:
- A restaurant is "closed" if there's clear evidence it shut down (permanent closure, news articles)
- A restaurant is "open" if there's recent activity (reviews within 6 months, recent social media)
- Mark as "unknown" if you can't find conclusive information in the search results
- Confidence: 0.9+ for clear evidence, 0.7-0.9 for likely, <0.7 for uncertain

CRITICAL: Respond with ONLY valid JSON. No explanatory text.

Response format:
{
  "status": "open" or "closed" or "unknown",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation of findings"
}`;

const GOOGLE_STATUS_MAP: Record<string, 'open' | 'closed' | 'unknown'> = {
  'OPERATIONAL': 'open',
  'CLOSED_PERMANENTLY': 'closed',
  'CLOSED_TEMPORARILY': 'closed',
};

export class StatusVerificationService {
  private placesService: ReturnType<typeof createGooglePlacesService> | null = null;

  constructor(
    private tokenTracker: TokenTracker
  ) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (apiKey) {
      this.placesService = createGooglePlacesService({ apiKey });
    }
  }

  async verifyStatus(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string,
    googlePlaceId?: string | null
  ): Promise<RestaurantStatusResult> {
    const location = state ? `${city}, ${state}` : city;

    if (googlePlaceId && this.placesService) {
      const googleResult = await this.verifyViaGooglePlaces(
        restaurantId,
        restaurantName,
        googlePlaceId
      );
      if (googleResult.status !== 'unknown') {
        return googleResult;
      }
    }

    return this.verifyViaTavily(restaurantId, restaurantName, chefName, city, state);
  }

  private async verifyViaGooglePlaces(
    restaurantId: string,
    restaurantName: string,
    googlePlaceId: string
  ): Promise<RestaurantStatusResult> {
    console.log(`   🗺️  Checking Google Places: ${restaurantName}`);

    try {
      const details = await this.placesService!.getPlaceDetails(googlePlaceId);

      if (!details) {
        return {
          restaurantId,
          restaurantName,
          status: 'unknown',
          confidence: 0.3,
          reason: 'Google Place ID not found',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          success: true,
          source: 'google_places',
        };
      }

      const status = details.businessStatus
        ? GOOGLE_STATUS_MAP[details.businessStatus] || 'unknown'
        : 'unknown';

      const confidence = status !== 'unknown' ? 0.95 : 0.3;
      const reason = details.businessStatus
        ? `Google Places: ${details.businessStatus}`
        : 'No business status from Google';

      console.log(`      ✅ ${status} (${details.businessStatus || 'no status'})`);

      return {
        restaurantId,
        restaurantName,
        status,
        confidence,
        reason,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: true,
        source: 'google_places',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ⚠️  Google Places error: ${msg}`);

      return {
        restaurantId,
        restaurantName,
        status: 'unknown',
        confidence: 0,
        reason: `Google Places error: ${msg}`,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        source: 'google_places',
        error: msg,
      };
    }
  }

  private async verifyViaTavily(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string
  ): Promise<RestaurantStatusResult> {
    const location = state ? `${city}, ${state}` : city;
    console.log(`   🔍 Verifying status via search: ${restaurantName} (${location})`);

    try {
      const searchResult = await searchStatus(restaurantName, city, restaurantId);
      const searchContext = combineSearchResultsCompact([searchResult], 6000);

      if (!searchContext || searchContext.length < 50) {
        console.log(`      ⚠️  No search results for ${restaurantName}`);
        return {
          restaurantId,
          restaurantName,
          status: 'unknown',
          confidence: 0.3,
          reason: 'No search results found',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          success: true,
          source: 'tavily',
        };
      }

      const prompt = `Verify if "${restaurantName}" by chef ${chefName} in ${location} is currently open.

SEARCH RESULTS:
${searchContext}

Based on the search results above, determine:
- Is the restaurant open, closed, or unknown?
- How confident are you? (0.0 to 1.0)
- What evidence supports this?

Return ONLY JSON.`;

      const result = await synthesize('creative', STATUS_SYSTEM_PROMPT, prompt, RestaurantStatusSchema, {
        maxTokens: 1000,
        temperature: 0.2,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          restaurantId,
          restaurantName,
          status: 'unknown',
          confidence: 0,
          reason: `Synthesis error: ${result.error}`,
          tokensUsed: result.usage,
          success: false,
          source: 'tavily',
          error: result.error,
        };
      }

      return {
        restaurantId,
        restaurantName,
        status: result.data.status,
        confidence: result.data.confidence,
        reason: result.data.reason,
        tokensUsed: result.usage,
        success: true,
        source: 'tavily',
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
        source: 'unknown',
        error: msg,
      };
    }
  }

  async verifyStatusFromCache(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    cachedSearch: SearchResult,
    state?: string
  ): Promise<RestaurantStatusResult> {
    const location = state ? `${city}, ${state}` : city;
    console.log(`   🔍 Verifying status: ${restaurantName} (from cache)`);

    try {
      const searchContext = combineSearchResultsCompact([cachedSearch], 6000);

      if (!searchContext || searchContext.length < 50) {
        return {
          restaurantId,
          restaurantName,
          status: 'unknown',
          confidence: 0.3,
          reason: 'Insufficient cached search results',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          success: true,
          source: 'tavily',
        };
      }

      const prompt = `Verify if "${restaurantName}" by chef ${chefName} in ${location} is currently open.

SEARCH RESULTS:
${searchContext}

Based on the search results above, determine:
- Is the restaurant open, closed, or unknown?
- How confident are you? (0.0 to 1.0)
- What evidence supports this?

Return ONLY JSON.`;

      const result = await synthesize('creative', STATUS_SYSTEM_PROMPT, prompt, RestaurantStatusSchema, {
        maxTokens: 1000,
        temperature: 0.2,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success || !result.data) {
        return {
          restaurantId,
          restaurantName,
          status: 'unknown',
          confidence: 0,
          reason: `Synthesis error: ${result.error}`,
          tokensUsed: result.usage,
          success: false,
          source: 'tavily',
          error: result.error,
        };
      }

      return {
        restaurantId,
        restaurantName,
        status: result.data.status,
        confidence: result.data.confidence,
        reason: result.data.reason,
        tokensUsed: result.usage,
        success: true,
        source: 'tavily',
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
        source: 'unknown',
        error: msg,
      };
    }
  }
}
