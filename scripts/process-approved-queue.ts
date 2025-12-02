import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { Database } from '../src/lib/database.types';
import { createLLMEnricher } from './ingestion/processors/llm-enricher';
import { extractShowSlugFromWikiUrl } from '../src/lib/utils/show-mapping';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

interface QueueItem {
  id: string;
  data: {
    name: string;
    slug: string;
    season?: string | null;
    seasonName?: string | null;
    result?: string | null;
    sourceUrl?: string;
  };
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔄 Processing Approved Queue Items');
  console.log('═'.repeat(60));

  const { data: approvedItems, error: fetchError } = await supabase
    .from('review_queue')
    .select('*')
    .eq('status', 'approved')
    .eq('type', 'new_chef')
    .is('processed_at', null)
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Failed to fetch approved items:', fetchError);
    process.exit(1);
  }

  if (!approvedItems || approvedItems.length === 0) {
    console.log('✅ No approved items to process');
    return;
  }

  console.log(`\nFound ${approvedItems.length} approved chefs to process\n`);

  const results = {
    chefsCreated: 0,
    enrichmentJobsQueued: 0,
    enrichmentJobsCompleted: 0,
    enrichmentJobsFailed: 0,
    errors: [] as string[],
  };

  console.log('Step 1: Creating chef records and queuing enrichment jobs...\n');

  for (const item of approvedItems as unknown as QueueItem[]) {
    try {
      const itemData = item.data;
      const chefName = itemData.name;
      const chefSlug = itemData.slug;

      const { data: existingChef } = await supabase
        .from('chefs')
        .select('id')
        .eq('slug', chefSlug)
        .single();

      if (existingChef) {
        console.log(`⏭️  ${chefName}: Already exists, marking as processed`);
        await supabase
          .from('review_queue')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', item.id);
        continue;
      }

      const { data: newChef, error: insertError } = await supabase
        .from('chefs')
        .insert({
          name: chefName,
          slug: chefSlug,
          mini_bio: null,
        })
        .select('id')
        .single();

      if (insertError || !newChef) {
        throw new Error(`Failed to create chef: ${insertError?.message}`);
      }

      results.chefsCreated++;

      const sourceUrl = itemData.sourceUrl || '';
      const showSlug = extractShowSlugFromWikiUrl(sourceUrl);

      const { data: show } = await supabase
        .from('shows')
        .select('id, name')
        .eq('slug', showSlug)
        .single();

      if (show) {
        await supabase.from('chef_shows').insert({
          chef_id: newChef.id,
          show_id: show.id,
          season: itemData.season,
          season_name: itemData.seasonName,
          result: (itemData.result as 'winner' | 'finalist' | 'contestant' | 'judge' | null) || 'contestant',
          is_primary: true,
        });
      }

      const { data: job, error: jobError } = await supabase
        .from('enrichment_jobs')
        .insert({
          chef_id: newChef.id,
          queue_item_id: item.id,
          status: 'queued',
        })
        .select('id')
        .single();

      if (jobError || !job) {
        throw new Error(`Failed to create enrichment job: ${jobError?.message}`);
      }

      results.enrichmentJobsQueued++;

      await supabase
        .from('review_queue')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', item.id);

      console.log(`✅ ${chefName}: Created chef and queued enrichment`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${item.data.name}: ${errorMsg}`);
      results.errors.push(`${item.data.name}: ${errorMsg}`);
    }
  }

  console.log('\nStep 2: Processing enrichment jobs (may take 2+ minutes each)...\n');

  const llmEnricher = createLLMEnricher(supabase);

  let processed = 0;
  const BATCH_SIZE = 5;

  while (true) {
    const { data: queuedJobs, error: jobsError } = await supabase
      .from('enrichment_jobs')
      .select('id, chef_id, chefs!inner(name, chef_shows(shows(name), season, result))')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (jobsError) {
      console.error('❌ Failed to fetch queued jobs:', jobsError);
      break;
    }

    if (!queuedJobs || queuedJobs.length === 0) {
      break;
    }

    for (const job of queuedJobs) {
      try {
        await supabase
          .from('enrichment_jobs')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', job.id);

        const chef = job.chefs as any;
        const showInfo = chef.chef_shows?.[0];
        const showName = showInfo?.shows?.name || 'Top Chef';
        const season = showInfo?.season;
        const result = showInfo?.result;

        console.log(`🔄 Enriching ${chef.name}...`);

        const enrichResult = await llmEnricher.enrichAndSaveChef(
          job.chef_id,
          chef.name,
          showName,
          { season, result, dryRun: false }
        );

        if (enrichResult.success && enrichResult.miniBio) {
          await supabase
            .from('enrichment_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          results.enrichmentJobsCompleted++;
          console.log(
            `✅ ${chef.name}: Bio (${enrichResult.miniBio.length} chars) + ${enrichResult.restaurants.length} restaurants`
          );
        } else {
          throw new Error(enrichResult.error || 'Enrichment failed');
        }

        processed++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to enrich job ${job.id}:`, errorMsg);

        await supabase
          .from('enrichment_jobs')
          .update({
            status: 'failed',
            error_message: errorMsg.substring(0, 500),
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.enrichmentJobsFailed++;
        results.errors.push(`Enrichment job ${job.id}: ${errorMsg}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Summary');
  console.log('═'.repeat(60));
  console.log(`Chefs created: ${results.chefsCreated}`);
  console.log(`Enrichment jobs queued: ${results.enrichmentJobsQueued}`);
  console.log(`Enrichment jobs completed: ${results.enrichmentJobsCompleted}`);
  console.log(`Enrichment jobs failed: ${results.enrichmentJobsFailed}`);

  if (results.errors.length > 0) {
    console.log(`\nErrors (${results.errors.length}):`);
    results.errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log('\n✅ Processing complete');
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
