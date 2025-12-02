import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearExternalPhotos() {
  const { data: chefs, error } = await supabase
    .from('chefs')
    .select('id, name, photo_url')
    .not('photo_url', 'is', null)
    .not('photo_url', 'like', '%supabase.co%');

  if (error) {
    console.error('Error fetching chefs:', error);
    return;
  }

  console.log(`Found ${chefs?.length || 0} chefs with external photo URLs:`);
  chefs?.forEach(chef => {
    console.log(`  - ${chef.name}: ${chef.photo_url}`);
  });

  if (chefs && chefs.length > 0) {
    const { error: updateError } = await supabase
      .from('chefs')
      .update({
        photo_url: null,
        photo_source: null,
      })
      .not('photo_url', 'is', null)
      .not('photo_url', 'like', '%supabase.co%');

    if (updateError) {
      console.error('Error clearing photos:', updateError);
      return;
    }

    console.log(`✓ Cleared ${chefs.length} external photo URLs`);
  } else {
    console.log('✓ No external photo URLs found');
  }
}

clearExternalPhotos();
