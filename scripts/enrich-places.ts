import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createGooglePlacesService } from './ingestion/services/google-places';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const placesService = createGooglePlacesService({ apiKey: googleApiKey });

async function enrichPlaces(limit: number = 300) {
  console.log('\n🗺️  Google Places Enrichment\n');
  console.log('='.repeat(60) + '\n');

  // Get restaurants without Google Place ID
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, city, state, country, google_place_id')
    .is('google_place_id', null)
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching restaurants:', error);
    return;
  }

  console.log(`Found ${restaurants.length} restaurants to enrich\n`);

  let successCount = 0;
  let failCount = 0;
  let notFoundCount = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const rest = restaurants[i];
    const progress = `[${i + 1}/${restaurants.length}]`;

    try {
      // Search for place
      const query = `${rest.name} ${rest.city} ${rest.state}`;
      console.log(`${progress} Searching: ${query}`);

      const results = await placesService.textSearch(query, { maxResults: 1 });

      if (!results || results.length === 0) {
        console.log(`  ⚠️  Not found\n`);
        notFoundCount++;
        continue;
      }

      const place = results[0];

      // Get detailed place info with photos
      const details = await placesService.getPlaceDetails(place.placeId, { includePhotos: true });

      // Extract photo URLs
      const photoUrls = await Promise.all(
        (details.photos || []).slice(0, 5).map(photo => 
          placesService.getPhotoUrl(photo.name, 1200)
        )
      );
      const validPhotoUrls = photoUrls.filter(url => url !== null) as string[];

      // Update restaurant
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          google_place_id: details.placeId,
          google_rating: details.rating,
          google_review_count: details.userRatingsTotal,
          google_price_level: details.priceLevel ? parseInt(details.priceLevel.replace('PRICE_LEVEL_', '')) : null,
          photo_urls: validPhotoUrls,
          website_url: details.websiteUri || null,
          maps_url: details.googleMapsUri || null,
          last_enriched_at: new Date().toISOString(),
        })
        .eq('id', rest.id);

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}\n`);
        failCount++;
      } else {
        console.log(`  ✅ ${details.name} - ${details.rating || 'N/A'}⭐ - ${validPhotoUrls.length} photos\n`);
        successCount++;
      }

      // Rate limiting - 100 requests per second
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   Success: ${successCount}`);
  console.log(`   Not found: ${notFoundCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${restaurants.length}\n`);

  const cost = placesService.getCostTracker();
  console.log('💰 Cost:');
  console.log(`   Text searches: ${cost.textSearchCalls}`);
  console.log(`   Details calls: ${cost.detailsCalls}`);
  console.log(`   Estimated: $${cost.estimatedCostUsd.toFixed(2)}\n`);
}

const limit = parseInt(process.argv[2] || '300');
enrichPlaces(limit);
