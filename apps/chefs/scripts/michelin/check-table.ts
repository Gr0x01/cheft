import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data, error, count } = await supabase
    .from('michelin_restaurants')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('Table does not exist:', error.message);
    console.log('\nApply migration 030_michelin_reference_table.sql via Supabase Dashboard');
  } else {
    console.log(`✓ michelin_restaurants table exists with ${count} rows`);
  }
}

main();
