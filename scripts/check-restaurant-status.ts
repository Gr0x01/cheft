import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data } = await supabase
    .from('restaurants')
    .select('status')
    .limit(1000);

  const counts: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    counts[r.status || 'null'] = (counts[r.status || 'null'] || 0) + 1;
  });

  console.log('Restaurant status distribution:');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
}

main();
