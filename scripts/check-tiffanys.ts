import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTiffanys() {
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, google_rating, google_review_count')
    .ilike('name', '%Tiffany%')
    .order('name');

  console.log(JSON.stringify(data, null, 2));
}

checkTiffanys();
