import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Running Michelin sync...\n');

  const { data, error } = await supabase.rpc('sync_all_michelin_stars');

  if (error) {
    console.error('Sync error:', error.message);
  } else if (data && data.length > 0) {
    console.log(`Matched ${data.length} restaurants:\n`);
    data.forEach((m: any) => 
      console.log(`  ${'★'.repeat(m.stars)} ${m.restaurant_name} ← ${m.michelin_name} (${m.city})`)
    );
  } else {
    console.log('No new matches found');
  }
}

main();
