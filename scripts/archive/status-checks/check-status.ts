import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const [chefs, restaurants] = await Promise.all([
    supabase.from('chefs').select('bio, photo_url', { count: 'exact', head: false }),
    supabase.from('restaurants').select('google_place_id, photo_urls', { count: 'exact', head: false })
  ]);

  const chefData = chefs.data || [];
  const restaurantData = restaurants.data || [];

  console.log('=== Chef Stats ===');
  console.log('With bio:', chefData.filter(c => c.bio).length);
  console.log('With photo:', chefData.filter(c => c.photo_url).length);
  console.log('Total:', chefData.length);
  console.log('');
  console.log('=== Restaurant Stats ===');
  console.log('With place_id:', restaurantData.filter(r => r.google_place_id).length);
  console.log('With photos:', restaurantData.filter(r => r.photo_urls && r.photo_urls.length > 0).length);
  console.log('Total:', restaurantData.length);
}

main();
