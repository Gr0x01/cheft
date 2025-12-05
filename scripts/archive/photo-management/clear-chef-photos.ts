import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearChefPhotos() {
  const { data: chefs, error } = await supabase
    .from('chefs')
    .select('id, name, photo_url')
    .not('photo_url', 'is', null);

  if (error) {
    console.error('Error fetching chefs:', error);
    return;
  }

  console.log(`Clearing photos for ${chefs?.length || 0} chefs...`);

  const { error: updateError } = await supabase
    .from('chefs')
    .update({
      photo_url: null,
      photo_source: null,
    })
    .not('photo_url', 'is', null);

  if (updateError) {
    console.error('Error clearing photos:', updateError);
    return;
  }

  console.log(`✓ Cleared ${chefs?.length || 0} chef photos`);
}

clearChefPhotos();
