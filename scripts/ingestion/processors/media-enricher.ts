import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../src/lib/database.types';
import { createWikipediaImageService } from '../services/wikipedia-images';
import { createGooglePlacesService, CostTracker } from '../services/google-places';
import { logDataChange } from '../queue/audit-log';

export interface ChefImageEnrichmentResult {
  chefId: string;
  chefName: string;
  photoUrl: string | null;
  photoSource: 'wikipedia' | 'llm_search' | null;
  success: boolean;
  error?: string;
}

export interface RestaurantEnrichmentResult {
  restaurantId: string;
  restaurantName: string;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googlePriceLevel: number | null;
  photoUrls: string[];
  matchConfidence: number;
  success: boolean;
  error?: string;
}

export interface MediaEnricherConfig {
  googlePlacesApiKey?: string;
  maxPhotosPerRestaurant?: number;
  photoMaxWidth?: number;
}

export interface EnrichmentStats {
  chefsProcessed: number;
  chefsWithPhotos: number;
  restaurantsProcessed: number;
  restaurantsWithPlaceId: number;
  googlePlacesCost: CostTracker;
}

export function createMediaEnricher(
  supabase: SupabaseClient<Database>,
  config: MediaEnricherConfig
) {
  const wikipediaService = createWikipediaImageService();
  const googlePlacesService = config.googlePlacesApiKey
    ? createGooglePlacesService({ apiKey: config.googlePlacesApiKey })
    : null;

  const stats: EnrichmentStats = {
    chefsProcessed: 0,
    chefsWithPhotos: 0,
    restaurantsProcessed: 0,
    restaurantsWithPlaceId: 0,
    googlePlacesCost: {
      textSearchCalls: 0,
      detailsCalls: 0,
      photoCalls: 0,
      estimatedCostUsd: 0,
    },
  };

  async function enrichChefImage(
    chefId: string,
    chefName: string
  ): Promise<ChefImageEnrichmentResult> {
    stats.chefsProcessed++;

    try {
      let photoUrl: string | null = null;
      let photoSource: 'wikipedia' | null = null;

      const wikipediaResult = await wikipediaService.getChefWikipediaImage(chefName);
      if (wikipediaResult) {
        photoUrl = wikipediaResult.url;
        photoSource = 'wikipedia';
      }

      if (photoUrl && photoSource) {
        const { error } = await (supabase
          .from('chefs') as ReturnType<typeof supabase.from>)
          .update({
            photo_url: photoUrl,
            photo_source: photoSource,
            updated_at: new Date().toISOString(),
          })
          .eq('id', chefId);

        if (error) {
          throw new Error(`Failed to update chef: ${error.message}`);
        }

        await logDataChange(supabase, {
          table_name: 'chefs',
          record_id: chefId,
          change_type: 'update',
          old_data: { photo_url: null, photo_source: null },
          new_data: { photo_url: photoUrl, photo_source: photoSource },
          source: 'media_enricher',
          confidence: 0.9,
        });

        stats.chefsWithPhotos++;
      }

      return {
        chefId,
        chefName,
        photoUrl,
        photoSource,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        chefId,
        chefName,
        photoUrl: null,
        photoSource: null,
        success: false,
        error: msg,
      };
    }
  }

  async function enrichRestaurant(
    restaurantId: string,
    restaurantName: string,
    address: string,
    city: string,
    state?: string
  ): Promise<RestaurantEnrichmentResult> {
    stats.restaurantsProcessed++;

    if (!googlePlacesService) {
      return {
        restaurantId,
        restaurantName,
        googlePlaceId: null,
        googleRating: null,
        googleReviewCount: null,
        googlePriceLevel: null,
        photoUrls: [],
        matchConfidence: 0,
        success: false,
        error: 'Google Places API key not configured',
      };
    }

    try {
      const placeMatch = await googlePlacesService.findPlaceId(
        restaurantName,
        address,
        city,
        state
      );

      if (!placeMatch.placeId) {
        return {
          restaurantId,
          restaurantName,
          googlePlaceId: null,
          googleRating: null,
          googleReviewCount: null,
          googlePriceLevel: null,
          photoUrls: [],
          matchConfidence: 0,
          success: true,
        };
      }

      const details = await googlePlacesService.getPlaceDetails(placeMatch.placeId, {
        includeReviews: true,
        includePhotos: true,
      });

      if (!details) {
        return {
          restaurantId,
          restaurantName,
          googlePlaceId: placeMatch.placeId,
          googleRating: null,
          googleReviewCount: null,
          googlePriceLevel: null,
          photoUrls: [],
          matchConfidence: placeMatch.confidence,
          success: true,
        };
      }

      const maxPhotos = config.maxPhotosPerRestaurant ?? 3;
      const photoMaxWidth = config.photoMaxWidth ?? 800;
      const photoUrls: string[] = [];

      if (details.photos && details.photos.length > 0) {
        const photosToFetch = details.photos.slice(0, maxPhotos);
        for (const photo of photosToFetch) {
          const url = await googlePlacesService.getPhotoUrl(photo.name, photoMaxWidth);
          if (url) {
            photoUrls.push(url);
          }
        }
      }

      const priceLevel = parsePriceLevel(details.priceLevel);

      const { error } = await (supabase
        .from('restaurants') as ReturnType<typeof supabase.from>)
        .update({
          google_place_id: details.placeId,
          google_rating: details.rating ?? null,
          google_review_count: details.userRatingsTotal ?? null,
          google_price_level: priceLevel,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
          last_enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId);

      if (error) {
        throw new Error(`Failed to update restaurant: ${error.message}`);
      }

      await logDataChange(supabase, {
        table_name: 'restaurants',
        record_id: restaurantId,
        change_type: 'update',
        new_data: {
          google_place_id: details.placeId,
          google_rating: details.rating,
          google_review_count: details.userRatingsTotal,
          photo_count: photoUrls.length,
        },
        source: 'media_enricher',
        confidence: placeMatch.confidence,
      });

      stats.restaurantsWithPlaceId++;

      return {
        restaurantId,
        restaurantName,
        googlePlaceId: details.placeId,
        googleRating: details.rating ?? null,
        googleReviewCount: details.userRatingsTotal ?? null,
        googlePriceLevel: priceLevel,
        photoUrls,
        matchConfidence: placeMatch.confidence,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        restaurantId,
        restaurantName,
        googlePlaceId: null,
        googleRating: null,
        googleReviewCount: null,
        googlePriceLevel: null,
        photoUrls: [],
        matchConfidence: 0,
        success: false,
        error: msg,
      };
    }
  }

  async function enrichAllChefsWithoutPhotos(
    options: { limit?: number; delayMs?: number } = {}
  ): Promise<ChefImageEnrichmentResult[]> {
    const limit = options.limit ?? 50;
    const delayMs = options.delayMs ?? 500;

    const result = await supabase
      .from('chefs')
      .select('id, name')
      .is('photo_url', null)
      .limit(limit);
    
    const chefs = result.data as { id: string; name: string }[] | null;
    const error = result.error;

    if (error) {
      throw new Error(`Failed to fetch chefs: ${error.message}`);
    }

    if (!chefs || chefs.length === 0) {
      return [];
    }

    const results: ChefImageEnrichmentResult[] = [];

    for (const chef of chefs) {
      const result = await enrichChefImage(chef.id, chef.name);
      results.push(result);

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  async function enrichAllRestaurantsWithoutPlaceId(
    options: { limit?: number; delayMs?: number; minConfidence?: number } = {}
  ): Promise<RestaurantEnrichmentResult[]> {
    const limit = options.limit ?? 50;
    const delayMs = options.delayMs ?? 200;
    const minConfidence = options.minConfidence ?? 0.7;

    const result = await supabase
      .from('restaurants')
      .select('id, name, address, city, state')
      .is('google_place_id', null)
      .eq('status', 'open')
      .limit(limit);
    
    const restaurants = result.data as { id: string; name: string; address: string | null; city: string; state: string | null }[] | null;
    const error = result.error;

    if (error) {
      throw new Error(`Failed to fetch restaurants: ${error.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      return [];
    }

    const results: RestaurantEnrichmentResult[] = [];

    for (const restaurant of restaurants) {
      const result = await enrichRestaurant(
        restaurant.id,
        restaurant.name,
        restaurant.address || '',
        restaurant.city,
        restaurant.state ?? undefined
      );

      if (result.matchConfidence < minConfidence && result.googlePlaceId) {
        console.warn(
          `[media-enricher] Low confidence match for "${restaurant.name}": ${result.matchConfidence.toFixed(2)}`
        );
      }

      results.push(result);

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  function getStats(): EnrichmentStats {
    if (googlePlacesService) {
      stats.googlePlacesCost = googlePlacesService.getCostTracker();
    }
    return { ...stats };
  }

  function resetStats(): void {
    stats.chefsProcessed = 0;
    stats.chefsWithPhotos = 0;
    stats.restaurantsProcessed = 0;
    stats.restaurantsWithPlaceId = 0;
    if (googlePlacesService) {
      googlePlacesService.resetCostTracker();
    }
  }

  return {
    enrichChefImage,
    enrichRestaurant,
    enrichAllChefsWithoutPhotos,
    enrichAllRestaurantsWithoutPlaceId,
    getStats,
    resetStats,
  };
}

function parsePriceLevel(priceLevel?: string): number | null {
  if (!priceLevel) return null;
  
  const mapping: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };

  return mapping[priceLevel] ?? null;
}

export type MediaEnricher = ReturnType<typeof createMediaEnricher>;
