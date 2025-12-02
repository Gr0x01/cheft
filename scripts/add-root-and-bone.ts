import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addRootAndBone() {
  // Get Jeff McInnis chef ID
  const { data: chef } = await supabase
    .from('chefs')
    .select('id')
    .ilike('name', '%Jeff McInnis%')
    .single();

  if (!chef) {
    console.error('❌ Chef not found');
    return;
  }

  console.log(`Found Jeff McInnis: ${chef.id}\n`);

  const locations = [
    { name: 'Root & Bone', city: 'Indianapolis', state: 'IN' },
    { name: 'Root & Bone', city: 'Chesterton', state: 'IN' },
    { name: 'Root & Bone', city: 'Hendersonville', state: 'NC' },
  ];

  for (const loc of locations) {
    const slug = `${loc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${loc.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

    const { error } = await supabase.from('restaurants').insert({
      chef_id: chef.id,
      name: loc.name,
      slug,
      city: loc.city,
      state: loc.state,
      country: 'USA',
      cuisine_tags: ['Southern'],
      google_price_level: 2,
    });

    if (error) {
      console.log(`❌ ${loc.name} (${loc.city}): ${error.message}`);
    } else {
      console.log(`✅ ${loc.name} (${loc.city})`);
    }
  }
}

addRootAndBone();
