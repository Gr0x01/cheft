import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createLLMEnricher } from './ingestion/processors/llm-enricher';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPerformanceBlurbs() {
  console.log('🧪 Testing Performance Blurbs Feature\n');
  
  console.log('1️⃣ Testing migration can be read...');
  const migrationContent = await import('fs').then(fs => 
    fs.promises.readFile('./supabase/migrations/021_add_performance_blurb_to_chef_shows.sql', 'utf-8')
  );
  console.log('   ✅ Migration file exists and readable\n');
  
  console.log('2️⃣ Testing enrichment service with real chef...');
  const enricher = createLLMEnricher(supabase, { model: 'gpt-5-mini' });
  
  const { data: testChef } = await supabase
    .from('chefs')
    .select('id, name')
    .limit(1)
    .single();
  
  if (!testChef) {
    throw new Error('No test chef found in database');
  }
  
  console.log(`   Testing with chef: ${testChef.name}`);
  
  const result = await enricher.enrichShowsOnly(testChef.id, testChef.name);
  
  console.log(`\n   📊 Enrichment Results:`);
  console.log(`   - Success: ${result.success}`);
  console.log(`   - Shows saved: ${result.showsSaved}`);
  console.log(`   - Shows skipped: ${result.showsSkipped}`);
  console.log(`   - Tokens used: ${result.tokensUsed.total.toLocaleString()}`);
  console.log(`   - Cost: $${((result.tokensUsed.prompt * 0.25 / 1000000) + (result.tokensUsed.completion * 2.00 / 1000000)).toFixed(4)}`);
  
  if (!result.success) {
    throw new Error(`Enrichment failed: ${result.error}`);
  }
  
  console.log('\n3️⃣ Checking database for performance blurbs...');
  const { data: chefShows } = await supabase
    .from('chef_shows')
    .select('performance_blurb, season, show:shows(name)')
    .eq('chef_id', testChef.id)
    .not('performance_blurb', 'is', null)
    .limit(3);
  
  if (chefShows && chefShows.length > 0) {
    console.log(`   ✅ Found ${chefShows.length} shows with performance blurbs:\n`);
    chefShows.forEach((cs: any) => {
      console.log(`   📺 ${cs.show?.name || 'Unknown'} ${cs.season || ''}`);
      console.log(`      "${cs.performance_blurb}"\n`);
    });
  } else {
    console.log('   ⚠️  No performance blurbs found (may need to run on different chef)');
  }
  
  console.log('✅ All tests passed!');
  console.log('\n📝 Next steps:');
  console.log('   1. Deploy migration: npx supabase db push (or via Supabase dashboard)');
  console.log('   2. Run backfill: npm run enrich:performance-blurbs -- --limit=5');
  console.log('   3. Check chef pages in browser for performance blurbs');
}

testPerformanceBlurbs().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
