import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, city, state, michelin_stars')
    .eq('status', 'open')
    .gt('michelin_stars', 0);
  
  if (restaurants && restaurants.length > 0) {
    console.log(`Restaurants with Michelin stars: ${restaurants.length}\n`);
    restaurants.forEach(r => 
      console.log(`  ${'★'.repeat(r.michelin_stars)} ${r.name} - ${r.city}, ${r.state}`)
    );
  } else {
    console.log('No restaurants currently have Michelin stars assigned.');
    console.log('\nTo sync, run: SELECT * FROM sync_all_michelin_stars();');
  }
  
  const { count } = await supabase
    .from('michelin_restaurants')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nMichelin reference table: ${count} restaurants`);
}

main();
