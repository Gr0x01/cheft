import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getStatus() {
  console.log('\n📊 TV Chef Map - Current Status\n');
  console.log('='.repeat(60) + '\n');

  // Chefs data
  const { data: chefs, count: totalChefs } = await supabase
    .from('chefs')
    .select('id, mini_bio, photo_url, last_enriched_at', { count: 'exact' });

  const chefsWithBio = chefs?.filter(c => c.mini_bio).length || 0;
  const chefsWithPhoto = chefs?.filter(c => c.photo_url).length || 0;
  const chefsWithRestaurants = chefs?.filter(c => c.last_enriched_at).length || 0;

  console.log('👨‍🍳 Chefs:');
  console.log(`   Total: ${totalChefs}`);
  console.log(`   With bio: ${chefsWithBio} (${Math.round(chefsWithBio / (totalChefs || 1) * 100)}%)`);
  console.log(`   With photo: ${chefsWithPhoto} (${Math.round(chefsWithPhoto / (totalChefs || 1) * 100)}%)`);
  console.log(`   Enriched (restaurants checked): ${chefsWithRestaurants} (${Math.round(chefsWithRestaurants / (totalChefs || 1) * 100)}%)`);

  // Restaurants data
  const { data: restaurants, count: totalRestaurants } = await supabase
    .from('restaurants')
    .select('id, google_place_id, photo_urls', { count: 'exact' });

  const restaurantsWithPlaceId = restaurants?.filter(r => r.google_place_id).length || 0;
  const restaurantsWithPhotos = restaurants?.filter(r => r.photo_urls && (r.photo_urls as string[]).length > 0).length || 0;

  console.log('\n🍽️  Restaurants:');
  console.log(`   Total: ${totalRestaurants}`);
  console.log(`   With Google Place ID: ${restaurantsWithPlaceId} (${Math.round(restaurantsWithPlaceId / (totalRestaurants || 1) * 100)}%)`);
  console.log(`   With photos: ${restaurantsWithPhotos} (${Math.round(restaurantsWithPhotos / (totalRestaurants || 1) * 100)}%)`);
  console.log(`   Need enrichment: ${(totalRestaurants || 0) - restaurantsWithPlaceId}`);

  // Cities
  const { count: totalCities } = await supabase
    .from('cities')
    .select('id', { count: 'exact' });

  console.log('\n🏙️  Cities:');
  console.log(`   Total: ${totalCities}`);

  console.log('\n' + '='.repeat(60) + '\n');

  // Next steps
  console.log('📋 Next Steps:\n');
  console.log(`1. Run Google Places enrichment on ${(totalRestaurants || 0) - restaurantsWithPlaceId} restaurants`);
  console.log(`2. Chef photos: ${(totalChefs || 0) - chefsWithPhoto} remaining`);
  console.log(`3. Chef bios: ${(totalChefs || 0) - chefsWithBio} remaining\n`);
}

getStatus();
