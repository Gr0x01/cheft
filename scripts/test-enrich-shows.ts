import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createLLMEnricher } from './ingestion/processors/llm-enricher';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const chefName = process.argv[2] || 'Joe Sasto';
  
  console.log(`🔍 Looking for chef: "${chefName}"\n`);

  const { data: chef, error } = await supabase
    .from('chefs')
    .select('id, name')
    .ilike('name', `%${chefName}%`)
    .single();

  if (error || !chef) {
    console.error(`❌ Chef not found: ${error?.message || 'No match'}`);
    return;
  }

  console.log(`✅ Found: ${chef.name} (${chef.id})\n`);

  // Check current shows
  const { data: currentShows } = await supabase
    .from('chef_shows')
    .select(`
      id,
      season,
      result,
      is_primary,
      shows (name, slug)
    `)
    .eq('chef_id', chef.id);

  console.log(`📺 Current shows in database: ${currentShows?.length || 0}`);
  if (currentShows && currentShows.length > 0) {
    currentShows.forEach((cs: any) => {
      console.log(`   - ${cs.shows?.name || 'Unknown'}${cs.season ? ' ' + cs.season : ''} (${cs.result || 'contestant'})${cs.is_primary ? ' [PRIMARY]' : ''}`);
    });
  }
  console.log('');

  console.log(`🤖 Running shows-only enrichment...\n`);

  const enricher = createLLMEnricher(supabase, {
    model: 'gpt-5-mini',
  });

  const result = await enricher.enrichShowsOnly(chef.id, chef.name);

  console.log('\n' + '='.repeat(80));
  if (result.success) {
    console.log('✅ Enrichment successful!');
    console.log(`   Shows saved: ${result.showsSaved}`);
    console.log(`   Shows skipped: ${result.showsSkipped}`);
    console.log(`   Tokens used: ${result.tokensUsed.total.toLocaleString()}`);
    console.log(`   Estimated cost: $${enricher.estimateCost().toFixed(4)}`);
  } else {
    console.log('❌ Enrichment failed');
    console.log(`   Error: ${result.error}`);
  }

  // Check shows after enrichment
  const { data: newShows } = await supabase
    .from('chef_shows')
    .select(`
      id,
      season,
      result,
      is_primary,
      shows (name, slug)
    `)
    .eq('chef_id', chef.id);

  console.log(`\n📺 Shows after enrichment: ${newShows?.length || 0}`);
  if (newShows && newShows.length > 0) {
    newShows.forEach((cs: any) => {
      console.log(`   - ${cs.shows?.name || 'Unknown'}${cs.season ? ' ' + cs.season : ''} (${cs.result || 'contestant'})${cs.is_primary ? ' [PRIMARY]' : ''}`);
    });
  }
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
