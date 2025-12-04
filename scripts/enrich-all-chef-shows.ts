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

  console.log('🔍 Enriching TV show data for all chefs...\n');
  console.log(`   Limit: ${limit === 999999 ? 'all' : limit}`);
  console.log(`   Offset: ${offset}\n`);

  const { data: chefs, error } = await supabase
    .from('chefs')
    .select('id, name')
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch chefs: ${error.message}`);
  }

  if (!chefs || chefs.length === 0) {
    console.log('No chefs found.');
    return;
  }

  console.log(`📊 Found ${chefs.length} chefs to enrich\n`);

  const enricher = createLLMEnricher(supabase, {
    model: 'gpt-5-mini',
  });

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalShowsSaved = 0;

  for (let i = 0; i < chefs.length; i++) {
    const chef = chefs[i];
    console.log(`\n[${i + 1}/${chefs.length}] Enriching shows for: ${chef.name}`);

    const result = await enricher.enrichShowsOnly(chef.id, chef.name);

    if (result.success) {
      totalSuccess++;
      totalShowsSaved += result.showsSaved;
      console.log(`   ✅ Success: ${result.showsSaved} shows saved, ${result.showsSkipped} skipped`);
      console.log(`   📊 Tokens: ${result.tokensUsed.total.toLocaleString()}`);
    } else {
      totalFailed++;
      console.log(`   ❌ Failed: ${result.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const tokens = enricher.getTotalTokensUsed();
  const cost = enricher.estimateCost();

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 Enrichment Summary');
  console.log('='.repeat(80));
  console.log(`Chefs processed: ${chefs.length}`);
  console.log(`Successful: ${totalSuccess}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total shows saved: ${totalShowsSaved}`);
  console.log(`\nTokens used: ${tokens.total.toLocaleString()}`);
  console.log(`Estimated cost: $${cost.toFixed(2)}`);
  console.log(`Model: ${enricher.getModelName()}`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
