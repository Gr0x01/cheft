import { withRetry } from '../utils/retry';

const GOOGLE_PLACES_API_BASE = 'https://places.googleapis.com/v1';

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  reviews?: PlaceReview[];
  photos?: PlacePhoto[];
  businessStatus?: string;
  lat?: number;
  lng?: number;
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
}

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
}

export interface GooglePlacesConfig {
  apiKey: string;
}

export interface CostTracker {
  textSearchCalls: number;
  detailsCalls: number;
  photoCalls: number;
  estimatedCostUsd: number;
}

const SKU_COSTS = {
  textSearchBasic: 0.032,
  placeDetailsBasic: 0.017,
  placeDetailsAtmosphere: 0.005,
  placePhoto: 0.007,
};

export function createGooglePlacesService(config: GooglePlacesConfig) {
  const { apiKey } = config;
  
  const costTracker: CostTracker = {
    textSearchCalls: 0,
    detailsCalls: 0,
    photoCalls: 0,
    estimatedCostUsd: 0,
  };

  async function textSearch(
    query: string,
    options: { locationBias?: { lat: number; lng: number }; maxResults?: number } = {}
  ): Promise<PlaceSearchResult[]> {
    const requestBody: Record<string, unknown> = {
      textQuery: query,
      maxResultCount: options.maxResults ?? 5,
    };

    if (options.locationBias) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: options.locationBias.lat,
            longitude: options.locationBias.lng,
          },
          radius: 50000,
        },
      };
    }

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.rating',
      'places.userRatingCount',
      'places.priceLevel',
    ].join(',');

    const response = await withRetry(async () => {
      const res = await fetch(`${GOOGLE_PLACES_API_BASE}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google Places API error ${res.status}: ${errorText}`);
      }

      return res.json();
    });

    costTracker.textSearchCalls++;
    costTracker.estimatedCostUsd += SKU_COSTS.textSearchBasic;

    const places = response.places || [];
    return places.map((place: Record<string, unknown>) => ({
      placeId: place.id as string,
      name: (place.displayName as { text: string })?.text || '',
      formattedAddress: place.formattedAddress as string,
      rating: place.rating as number | undefined,
      userRatingsTotal: place.userRatingCount as number | undefined,
      priceLevel: place.priceLevel as string | undefined,
    }));
  }

  async function findPlaceId(
    restaurantName: string,
    address: string,
    city: string,
    state?: string
  ): Promise<{ placeId: string | null; confidence: number; matchedName?: string }> {
    const query = `${restaurantName} ${city}${state ? ` ${state}` : ''}`;
    
    const results = await textSearch(query, { maxResults: 3 });
    
    if (results.length === 0) {
      return { placeId: null, confidence: 0 };
    }

    const normalizedTarget = normalizeForComparison(restaurantName);
    
    for (const result of results) {
      const normalizedResult = normalizeForComparison(result.name);
      const similarity = calculateSimilarity(normalizedTarget, normalizedResult);
      
      if (similarity >= 0.8) {
        return {
          placeId: result.placeId,
          confidence: similarity,
          matchedName: result.name,
        };
      }
    }

    const bestMatch = results[0];
    const bestSimilarity = calculateSimilarity(normalizedTarget, normalizeForComparison(bestMatch.name));
    
    return {
      placeId: bestMatch.placeId,
      confidence: bestSimilarity,
      matchedName: bestMatch.name,
    };
  }

  async function getPlaceDetails(
    placeId: string,
    options: { includeReviews?: boolean; includePhotos?: boolean } = {}
  ): Promise<PlaceDetails | null> {
    const fields = [
      'id',
      'displayName',
      'formattedAddress',
      'rating',
      'userRatingCount',
      'priceLevel',
      'websiteUri',
      'googleMapsUri',
      'businessStatus',
      'location',
    ];

    if (options.includeReviews) {
      fields.push('reviews');
    }
    if (options.includePhotos) {
      fields.push('photos');
    }

    const fieldMask = fields.join(',');

    const response = await withRetry(async () => {
      const res = await fetch(`${GOOGLE_PLACES_API_BASE}/places/${placeId}`, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        const errorText = await res.text();
        throw new Error(`Google Places API error ${res.status}: ${errorText}`);
      }

      return res.json();
    });

    if (!response) return null;

    costTracker.detailsCalls++;
    costTracker.estimatedCostUsd += SKU_COSTS.placeDetailsBasic;
    if (options.includeReviews) {
      costTracker.estimatedCostUsd += SKU_COSTS.placeDetailsAtmosphere;
    }

    const reviews = (response.reviews || []).map((review: Record<string, unknown>) => ({
      authorName: (review.authorAttribution as { displayName: string })?.displayName || 'Anonymous',
      rating: review.rating as number,
      text: (review.text as { text: string })?.text || '',
      relativePublishTimeDescription: review.relativePublishTimeDescription as string,
    }));

    const photos = (response.photos || []).map((photo: Record<string, unknown>) => ({
      name: photo.name as string,
      widthPx: photo.widthPx as number,
      heightPx: photo.heightPx as number,
    }));

    return {
      placeId: response.id,
      name: response.displayName?.text || '',
      formattedAddress: response.formattedAddress,
      rating: response.rating,
      userRatingsTotal: response.userRatingsTotal,
      priceLevel: response.priceLevel,
      websiteUri: response.websiteUri,
      googleMapsUri: response.googleMapsUri,
      businessStatus: response.businessStatus,
      lat: response.location?.latitude,
      lng: response.location?.longitude,
      reviews,
      photos,
    };
  }

  async function getPhotoUrl(
    photoName: string,
    maxWidth: number = 800
  ): Promise<string | null> {
    const url = `${GOOGLE_PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
    
    try {
      const response = await withRetry(async () => {
        const res = await fetch(url, { method: 'GET', redirect: 'manual' });
        
        if (res.status === 302 || res.status === 301) {
          return res.headers.get('location');
        }
        
        if (!res.ok) {
          throw new Error(`Photo fetch failed: ${res.status}`);
        }
        
        return url;
      });

      costTracker.photoCalls++;
      costTracker.estimatedCostUsd += SKU_COSTS.placePhoto;

      return response;
    } catch {
      return null;
    }
  }

  function getCostTracker(): CostTracker {
    return { ...costTracker };
  }

  function resetCostTracker(): void {
    costTracker.textSearchCalls = 0;
    costTracker.detailsCalls = 0;
    costTracker.photoCalls = 0;
    costTracker.estimatedCostUsd = 0;
  }

  return {
    textSearch,
    findPlaceId,
    getPlaceDetails,
    getPhotoUrl,
    getCostTracker,
    resetCostTracker,
  };
}

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  if (a.includes(b) || b.includes(a)) {
    return 0.9;
  }

  const aWords = new Set(a.split(' '));
  const bWords = new Set(b.split(' '));
  const intersection = [...aWords].filter(w => bWords.has(w));
  const union = new Set([...aWords, ...bWords]);
  
  return intersection.length / union.size;
}

export type GooglePlacesService = ReturnType<typeof createGooglePlacesService>;
