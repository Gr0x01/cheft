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
  const args = process.argv.slice(2);
  const limit = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '999999');
  const offset = parseInt(args.find(arg => arg.startsWith('--offset='))?.split('=')[1] || '0');
  const prioritize = args.includes('--prioritize=winners');

  console.log('🔍 Backfilling performance blurbs for chef TV appearances...\n');
  console.log(`   Limit: ${limit === 999999 ? 'all' : limit}`);
  console.log(`   Offset: ${offset}`);
  console.log(`   Prioritize: ${prioritize ? 'Winners first' : 'All chefs'}\n`);

  const query = supabase
    .from('chefs')
    .select(`
      id,
      name,
      chef_shows!inner (
        id,
        performance_blurb,
        result
      )
    `)
    .order(prioritize ? 'chef_shows.result' : 'name');

  const { data: results, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch chefs: ${error.message}`);
  }

  if (!results || results.length === 0) {
    console.log('No chefs found.');
    return;
  }

  const uniqueChefs = results
    .filter((c: any) => 
      c.chef_shows.some((cs: any) => !cs.performance_blurb)
    )
    .filter((c: any) => 
      prioritize ? c.chef_shows.some((cs: any) => ['winner', 'finalist'].includes(cs.result)) : true
    );

  if (uniqueChefs.length === 0) {
    console.log('All chefs already have performance blurbs!');
    return;
  }

  console.log(`📊 Found ${uniqueChefs.length} chefs needing performance blurbs\n`);

  const enricher = createLLMEnricher(supabase, {
    model: 'gpt-5-mini',
  });

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalShowsEnriched = 0;

  for (let i = 0; i < uniqueChefs.length; i++) {
    const chef = uniqueChefs[i];
    const chefId = chef.id;
    const chefName = chef.name;
    
    console.log(`\n[${i + 1}/${uniqueChefs.length}] Enriching performances for: ${chefName}`);

    const result = await enricher.enrichShowsOnly(chefId, chefName);

    if (result.success) {
      totalSuccess++;
      totalShowsEnriched += result.showsSaved;
      console.log(`   ✅ Success: ${result.showsSaved} shows updated`);
      console.log(`   📊 Tokens: ${result.tokensUsed.total.toLocaleString()}`);
      console.log(`   💰 Cost: $${((result.tokensUsed.prompt * 0.25 / 1000000) + (result.tokensUsed.completion * 2.00 / 1000000)).toFixed(4)}`);
    } else {
      totalFailed++;
      console.log(`   ❌ Failed: ${result.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const tokens = enricher.getTotalTokensUsed();
  const cost = enricher.estimateCost();

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 Backfill Summary');
  console.log('='.repeat(80));
  console.log(`Chefs processed: ${uniqueChefs.length}`);
  console.log(`Successful: ${totalSuccess}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total shows enriched: ${totalShowsEnriched}`);
  console.log(`\nTokens used: ${tokens.total.toLocaleString()}`);
  console.log(`Estimated cost: $${cost.toFixed(2)}`);
  console.log(`Model: ${enricher.getModelName()}`);
  console.log('='.repeat(80));
  console.log('\n💡 Next steps:');
  console.log('   1. Review enriched data in database');
  console.log('   2. Check chef pages for performance blurbs');
  console.log('   3. Run again with --prioritize=winners if needed');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
