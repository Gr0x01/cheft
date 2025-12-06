import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createGooglePlacesService, PlacePhoto } from '@/lib/services/google-places';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { restaurantId } = await request.json();

  if (!restaurantId) {
    return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(restaurantId)) {
    return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
  }

  const { data: restaurant, error: fetchError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (fetchError || !restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
  }

  const placesService = createGooglePlacesService({ apiKey });

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    let placeId = restaurant.google_place_id;
    let confidence = 1.0;
    let matchedName = restaurant.name;

    if (!placeId) {
      const searchResult = await placesService.findPlaceId(
        restaurant.name,
        restaurant.address || '',
        restaurant.city || '',
        restaurant.state || undefined
      );
      placeId = searchResult.placeId;
      confidence = searchResult.confidence;
      matchedName = searchResult.matchedName || restaurant.name;

      if (!placeId) {
        return NextResponse.json(
          { error: 'Could not find a matching place on Google Maps' },
          { status: 404 }
        );
      }
    }

    const details = await placesService.getPlaceDetails(placeId, {
      includeReviews: false,
      includePhotos: true,
    });

    if (!details) {
      return NextResponse.json({ error: 'Could not fetch place details' }, { status: 404 });
    }

    let photoUrls: string[] = [];
    if (details.photos && details.photos.length > 0) {
      const photoPromises = details.photos.slice(0, 5).map((photo: PlacePhoto) =>
        placesService.getPhotoUrl(photo.name, 800)
      );
      const photos = await Promise.all(photoPromises);
      photoUrls = photos.filter((url: string | null): url is string => url !== null);
    }

    const { error: updateError } = await adminClient
      .from('restaurants')
      .update({
        google_place_id: placeId,
        google_rating: details.rating || null,
        google_review_count: details.userRatingsTotal || null,
        website_url: details.websiteUri || restaurant.website_url,
        maps_url: details.googleMapsUri || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : restaurant.photo_urls,
        address: details.formattedAddress || restaurant.address,
        lat: details.lat || restaurant.lat,
        lng: details.lng || restaurant.lng,
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Failed to update restaurant:', updateError);
      return NextResponse.json({ error: 'Failed to update restaurant data' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Successfully updated with place: ${matchedName} (confidence: ${(confidence * 100).toFixed(0)}%)`,
      placeId,
      confidence,
      matchedName,
    });
  } catch (error) {
    console.error('Fresh lookup failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fresh lookup failed' },
      { status: 500 }
    );
  }
}
