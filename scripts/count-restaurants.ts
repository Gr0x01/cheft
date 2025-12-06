import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { count: totalRestaurants } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true });

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('chef_id, status');

  const chefIds = new Set(restaurants?.map(r => r.chef_id));
  const openCount = restaurants?.filter(r => r.status === 'open').length || 0;
  const closedCount = restaurants?.filter(r => r.status === 'closed').length || 0;
  const unknownCount = restaurants?.filter(r => r.status === 'unknown').length || 0;

  console.log('\n📊 Restaurant Enrichment Results');
  console.log('='.repeat(50));
  console.log(`Total restaurants: ${totalRestaurants}`);
  console.log(`Chefs with restaurants: ${chefIds.size}/238`);
  console.log(`\nStatus breakdown:`);
  console.log(`  Open: ${openCount} (${((openCount / (totalRestaurants || 1)) * 100).toFixed(1)}%)`);
  console.log(`  Closed: ${closedCount} (${((closedCount / (totalRestaurants || 1)) * 100).toFixed(1)}%)`);
  console.log(`  Unknown: ${unknownCount} (${((unknownCount / (totalRestaurants || 1)) * 100).toFixed(1)}%)`);
  console.log('='.repeat(50));
}

main().catch(console.error);
