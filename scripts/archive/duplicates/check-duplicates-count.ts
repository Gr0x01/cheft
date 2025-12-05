import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { count } = await supabase
    .from('duplicate_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  console.log(`Pending duplicates in database: ${count}`);
}

main();
