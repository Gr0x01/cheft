import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixResolvedDuplicates() {
  const { data: resolved } = await supabase
    .from('duplicate_candidates')
    .select('*')
    .eq('status', 'resolved');

  if (!resolved || resolved.length === 0) {
    console.log('No resolved duplicates to fix');
    return;
  }

  console.log(`Found ${resolved.length} resolved duplicates to fix\n`);

  let fixed = 0;
  let alreadyFixed = 0;

  for (const dup of resolved) {
    const loserId = dup.restaurant_ids.find((id: string) => id !== dup.merged_into);
    
    if (!loserId) {
      console.log(`⚠️  Skipping ${dup.id}: couldn't determine loser`);
      continue;
    }

    const { data: loser } = await supabase
      .from('restaurants')
      .select('id, name, is_public, status')
      .eq('id', loserId)
      .single();

    if (!loser) {
      console.log(`⚠️  Skipping ${dup.id}: loser restaurant not found`);
      continue;
    }

    if (loser.is_public === false && loser.status === 'closed') {
      console.log(`✅ Already fixed: ${loser.name}`);
      alreadyFixed++;
      continue;
    }

    console.log(`🔧 Fixing: ${loser.name}`);
    console.log(`   Before: is_public=${loser.is_public}, status=${loser.status}`);

    const { error } = await supabase
      .from('restaurants')
      .update({
        is_public: false,
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', loserId);

    if (error) {
      console.error(`   ❌ Failed: ${error.message}`);
    } else {
      console.log(`   ✅ Fixed: is_public=false, status=closed`);
      fixed++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Fixed: ${fixed}`);
  console.log(`   - Already fixed: ${alreadyFixed}`);
  console.log(`   - Total resolved: ${resolved.length}`);
}

fixResolvedDuplicates();
