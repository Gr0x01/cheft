import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhotoStatus() {
  console.log('\n📸 Restaurant Photo Status\n');
  console.log('='.repeat(60) + '\n');

  // Get all restaurants
  const { data: all } = await supabase
    .from('restaurants')
    .select('id, name, google_place_id, photo_urls');

  const total = all?.length || 0;
  const withPlaceId = all?.filter(r => r.google_place_id).length || 0;
  const withPhotos = all?.filter(r => r.photo_urls && (r.photo_urls as string[]).length > 0).length || 0;
  const withPlaceIdNoPhotos = all?.filter(r => r.google_place_id && (!r.photo_urls || (r.photo_urls as string[]).length === 0)).length || 0;
  const noPlaceId = all?.filter(r => !r.google_place_id).length || 0;

  console.log(`Total restaurants: ${total}`);
  console.log(`With Google Place ID: ${withPlaceId}`);
  console.log(`With photos: ${withPhotos}`);
  console.log(`\nBreakdown:`);
  console.log(`  - Has Place ID + Photos: ${withPhotos}`);
  console.log(`  - Has Place ID + NO Photos: ${withPlaceIdNoPhotos}`);
  console.log(`  - No Place ID: ${noPlaceId}`);

  // Sample restaurants with Place IDs but no photos
  const needPhotos = all?.filter(r => r.google_place_id && (!r.photo_urls || (r.photo_urls as string[]).length === 0)).slice(0, 10);

  if (needPhotos && needPhotos.length > 0) {
    console.log(`\n📋 Sample restaurants with Place ID but no photos:\n`);
    needPhotos.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name} (${r.google_place_id})`);
    });
  }

  console.log('\n');
}

checkPhotoStatus();
