import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkResolved() {
  // Get resolved duplicates
  const { data: resolved } = await supabase
    .from('duplicate_candidates')
    .select('*')
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false });

  console.log(`Found ${resolved?.length || 0} resolved duplicates\n`);

  if (!resolved || resolved.length === 0) {
    console.log('No resolved duplicates yet');
    return;
  }

  for (const dup of resolved) {
    console.log(`Duplicate ${dup.id}:`);
    console.log(`  Resolved at: ${dup.resolved_at}`);
    console.log(`  Resolved by: ${dup.resolved_by}`);
    console.log(`  Merged into: ${dup.merged_into}`);
    console.log(`  Restaurant IDs: ${dup.restaurant_ids.join(', ')}`);

    // Check if loser was properly hidden
    const loserId = dup.restaurant_ids.find((id: string) => id !== dup.merged_into);
    if (loserId) {
      const { data: loser } = await supabase
        .from('restaurants')
        .select('id, name, is_public, status')
        .eq('id', loserId)
        .single();

      console.log(`  Loser restaurant (${loserId}):`);
      console.log(`    - is_public: ${loser?.is_public} (should be false)`);
      console.log(`    - status: ${loser?.status} (should be closed)`);
    }

    console.log('');
  }
}

checkResolved();
