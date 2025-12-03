import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyPhotosCleared() {
  const { data: stats, error } = await supabase
    .from('chefs')
    .select('id, photo_url, photo_source');

  if (error) {
    console.error('Error fetching chefs:', error);
    return;
  }

  const totalChefs = stats?.length || 0;
  const chefsWithPhotos = stats?.filter(c => c.photo_url !== null).length || 0;
  const chefsWithSource = stats?.filter(c => c.photo_source !== null).length || 0;

  console.log('\n📊 Chef Photo Status:\n');
  console.log(`Total chefs: ${totalChefs}`);
  console.log(`Chefs with photo_url: ${chefsWithPhotos}`);
  console.log(`Chefs with photo_source: ${chefsWithSource}`);
  
  if (chefsWithPhotos === 0 && chefsWithSource === 0) {
    console.log('\n✅ SUCCESS: All chef photos have been cleared!\n');
  } else {
    console.log('\n⚠️  WARNING: Some chefs still have photo data!\n');
  }
}

verifyPhotosCleared();
