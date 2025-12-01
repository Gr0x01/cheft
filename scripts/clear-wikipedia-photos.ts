import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/lib/database.types';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function clearWikipediaPhotos() {
  console.log('🧹 Clearing Wikipedia photos...');
  
  const { data: beforeCount } = await supabase
    .from('chefs')
    .select('id', { count: 'exact', head: true })
    .not('photo_url', 'is', null);
  
  console.log(`   Current chefs with photos: ${beforeCount || 0}`);
  
  const { data, error } = await supabase
    .from('chefs')
    .update({
      photo_url: null,
      photo_source: null,
      updated_at: new Date().toISOString(),
    })
    .eq('photo_source', 'wikipedia')
    .select('id');
  
  if (error) {
    console.error('❌ Error clearing photos:', error);
    process.exit(1);
  }
  
  console.log(`✅ Cleared ${data?.length || 0} Wikipedia photos`);
  
  const { data: afterCount } = await supabase
    .from('chefs')
    .select('id', { count: 'exact', head: true })
    .not('photo_url', 'is', null);
  
  console.log(`   Remaining chefs with photos: ${afterCount || 0}`);
}

clearWikipediaPhotos();
