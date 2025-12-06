import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const args = process.argv.slice(2);
  const chefSlug = args[0] || 'joe-sasto';

  const { data: chef, error } = await supabase
    .from('chefs')
    .select(`
      id,
      name,
      slug,
      career_narrative,
      chef_shows (
        id,
        season,
        result,
        is_primary,
        show_id,
        performance_blurb,
        show:shows (name, slug)
      )
    `)
    .eq('slug', chefSlug)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!chef) {
    console.log('Chef not found');
    return;
  }

  console.log(`\n${chef.name} (${chef.slug}):`);
  console.log(`  Total shows: ${chef.chef_shows?.length || 0}`);
  console.log(`  Has narrative: ${chef.career_narrative ? 'YES' : 'NO'}${chef.career_narrative ? ` (${chef.career_narrative.length} chars)` : ''}`);
  console.log(`\nShows breakdown:`);
  chef.chef_shows?.forEach((cs: any) => {
    console.log(`  - ${cs.show?.name || 'Unknown'} (Season ${cs.season || 'N/A'}, ${cs.result || 'contestant'}, Primary: ${cs.is_primary})`);
  });

  console.log(`\nUnique shows (deduped):`);
  const uniqueShows = new Map();
  chef.chef_shows?.forEach((cs: any) => {
    if (cs.show?.name) {
      uniqueShows.set(cs.show.name, cs.show);
    }
  });
  console.log(`  Count: ${uniqueShows.size}`);
  Array.from(uniqueShows.values()).forEach((show: any) => {
    console.log(`  - ${show.name}`);
  });
}

main();
