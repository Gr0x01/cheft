import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createGooglePlacesService } from './ingestion/services/google-places';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const placesService = createGooglePlacesService({ apiKey: googleApiKey });

async function refreshPlaces(limit: number = 1500) {
  console.log('\n🔄 Google Places Refresh (coords + status)\n');
  console.log('='.repeat(60) + '\n');

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, city, state, google_place_id, lat, lng, status')
    .not('google_place_id', 'is', null)
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching restaurants:', error);
    return;
  }

  console.log(`Found ${restaurants.length} restaurants with Google Place IDs\n`);

  let successCount = 0;
  let failCount = 0;
  let closedCount = 0;
  let coordsAddedCount = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const rest = restaurants[i];
    const progress = `[${i + 1}/${restaurants.length}]`;

    try {
      console.log(`${progress} Refreshing: ${rest.name}`);

      const details = await placesService.getPlaceDetails(rest.google_place_id, { includePhotos: false });

      if (!details) {
        console.log(`  ⚠️  Place not found (may be deleted)\n`);
        failCount++;
        continue;
      }

      const statusMap: Record<string, 'open' | 'closed' | undefined> = {
        'OPERATIONAL': 'open',
        'CLOSED_PERMANENTLY': 'closed',
        'CLOSED_TEMPORARILY': 'closed',
      };
      const mappedStatus = details.businessStatus ? statusMap[details.businessStatus] : undefined;

      const updateData: Record<string, unknown> = {
        lat: details.lat || null,
        lng: details.lng || null,
        google_rating: details.rating,
        google_review_count: details.userRatingsTotal,
        last_enriched_at: new Date().toISOString(),
      };

      if (mappedStatus) {
        updateData.status = mappedStatus;
      }

      const { error: updateError } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', rest.id);

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}\n`);
        failCount++;
      } else {
        const wasClosedNow = mappedStatus === 'closed' && rest.status !== 'closed';
        const addedCoords = !rest.lat && details.lat;
        
        if (wasClosedNow) closedCount++;
        if (addedCoords) coordsAddedCount++;

        const statusInfo = wasClosedNow ? ' 🚫 NOW CLOSED' : (mappedStatus ? ` [${mappedStatus}]` : '');
        const coordInfo = addedCoords ? ' 📍 coords added' : '';
        console.log(`  ✅ ${details.rating || 'N/A'}⭐${coordInfo}${statusInfo}\n`);
        successCount++;
      }

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
  console.log(`   Coords added: ${coordsAddedCount}`);
  console.log(`   Newly closed: ${closedCount}`);
  console.log(`   Total: ${restaurants.length}\n`);

  const cost = placesService.getCostTracker();
  console.log('💰 Cost:');
  console.log(`   Details calls: ${cost.detailsCalls}`);
  console.log(`   Estimated: $${cost.estimatedCostUsd.toFixed(2)}\n`);
}

const limit = parseInt(process.argv[2] || '1500');
refreshPlaces(limit);
