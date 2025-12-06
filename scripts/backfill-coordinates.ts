import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { createGooglePlacesService } from './ingestion/services/google-places';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const placesService = createGooglePlacesService({
  apiKey: process.env.GOOGLE_PLACES_API_KEY!,
});

async function backfillCoordinates() {
  console.log('Fetching restaurants with google_place_id but no coordinates...');
  
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, google_place_id')
    .not('google_place_id', 'is', null)
    .is('lat', null);

  if (error) {
    console.error('Failed to fetch restaurants:', error);
    return;
  }

  console.log(`Found ${restaurants.length} restaurants to update`);

  let updated = 0;
  let failed = 0;

  for (const restaurant of restaurants) {
    try {
      const details = await placesService.getPlaceDetails(restaurant.google_place_id!);
      
      if (details?.lat && details?.lng) {
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ 
            lat: details.lat, 
            lng: details.lng,
            updated_at: new Date().toISOString()
          })
          .eq('id', restaurant.id);

        if (updateError) {
          console.error(`Failed to update ${restaurant.name}:`, updateError.message);
          failed++;
        } else {
          console.log(`Updated ${restaurant.name}: (${details.lat}, ${details.lng})`);
          updated++;
        }
      } else {
        console.warn(`No coordinates found for ${restaurant.name}`);
        failed++;
      }

      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error(`Error processing ${restaurant.name}:`, err);
      failed++;
    }
  }

  console.log(`\nCompleted: ${updated} updated, ${failed} failed`);
  const costs = placesService.getCostEstimate();
  console.log(`Estimated API cost: $${costs.estimatedCostUsd.toFixed(4)}`);
}

backfillCoordinates();
