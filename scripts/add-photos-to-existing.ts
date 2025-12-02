import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createGooglePlacesService } from './ingestion/services/google-places';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const placesService = createGooglePlacesService({ apiKey: googleApiKey });

async function addPhotos(limit: number = 300) {
  console.log('\n📸 Adding Photos to Restaurants\n');
  console.log('='.repeat(60) + '\n');

  // Get restaurants with Place ID but no photos
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, google_place_id, photo_urls')
    .not('google_place_id', 'is', null)
    .or('photo_urls.is.null,photo_urls.eq.{}')
    .limit(limit);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${restaurants.length} restaurants needing photos\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const rest = restaurants[i];
    const progress = `[${i + 1}/${restaurants.length}]`;

    try {
      console.log(`${progress} ${rest.name}`);

      // Get place details with photos
      const details = await placesService.getPlaceDetails(rest.google_place_id!, { includePhotos: true });

      if (!details || !details.photos || details.photos.length === 0) {
        console.log(`  ⚠️  No photos available\n`);
        continue;
      }

      // Get photo URLs
      const photoUrls = await Promise.all(
        details.photos.slice(0, 5).map(photo => 
          placesService.getPhotoUrl(photo.name, 1200)
        )
      );
      const validPhotoUrls = photoUrls.filter(url => url !== null) as string[];

      if (validPhotoUrls.length === 0) {
        console.log(`  ⚠️  Failed to fetch photo URLs\n`);
        failCount++;
        continue;
      }

      // Update restaurant
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ photo_urls: validPhotoUrls })
        .eq('id', rest.id);

      if (updateError) {
        console.log(`  ❌ Update failed: ${updateError.message}\n`);
        failCount++;
      } else {
        console.log(`  ✅ Added ${validPhotoUrls.length} photos\n`);
        successCount++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${restaurants.length}\n`);

  const cost = placesService.getCostTracker();
  console.log('💰 Cost:');
  console.log(`   Details calls: ${cost.detailsCalls}`);
  console.log(`   Estimated: $${cost.estimatedCostUsd.toFixed(2)}\n`);
}

const limit = parseInt(process.argv[2] || '300');
addPhotos(limit);
