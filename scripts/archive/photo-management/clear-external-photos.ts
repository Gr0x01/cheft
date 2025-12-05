import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearExternalPhotos() {
  console.log('\n🧹 Clearing external photo URLs\n');
  console.log('='.repeat(60) + '\n');

  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, name, photo_url')
    .not('photo_url', 'is', null);

  const externalChefs = chefs?.filter(c => !c.photo_url?.includes('supabase.co')) || [];

  if (externalChefs.length === 0) {
    console.log('✅ No external photo URLs found\n');
    return;
  }

  console.log(`Found ${externalChefs.length} chefs with external URLs:\n`);

  let successCount = 0;
  let failCount = 0;

  for (const chef of externalChefs) {
    console.log(`📝 ${chef.name}`);
    console.log(`   URL: ${chef.photo_url}`);

    const { error } = await supabase
      .from('chefs')
      .update({ 
        photo_url: null,
        photo_source: null 
      })
      .eq('id', chef.id);

    if (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      failCount++;
    } else {
      console.log(`   ✅ Cleared\n`);
      successCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Cleared: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${externalChefs.length}\n`);
}

clearExternalPhotos();
