import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { error } = await supabase
    .from('duplicate_candidates')
    .delete()
    .eq('status', 'pending');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Cleared all pending duplicates');
  }
}

main();
