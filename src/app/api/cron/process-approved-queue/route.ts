import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';
import { createLLMEnricher } from '@/../../scripts/ingestion/processors/llm-enricher';
import { extractShowSlugFromWikiUrl } from '@/lib/utils/show-mapping';

export const maxDuration = 300;

type QueueItem = {
  id: string;
  data: {
    name: string;
    slug: string;
    season?: string | null;
    seasonName?: string | null;
    result?: string | null;
    sourceUrl?: string;
  };
};

interface ChefWithShows {
  name: string;
  chef_shows: Array<{
    shows: { name: string } | null;
    season: string | null;
    result: string | null;
  }>;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  try {
    const { data: approvedItems, error: fetchError } = await supabase
      .from('review_queue')
      .select('*')
      .eq('status', 'approved')
      .eq('type', 'new_chef')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) throw fetchError;
    if (!approvedItems || approvedItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No approved chefs to process',
        processed: 0,
      });
    }

    console.log(`[Cron] Processing ${approvedItems.length} approved chefs`);

    const results = {
      chefsCreated: 0,
      enrichmentJobsQueued: 0,
      enrichmentJobsCompleted: 0,
      enrichmentJobsFailed: 0,
      errors: [] as string[],
    };

    for (const item of approvedItems as QueueItem[]) {
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
          console.log(`[Cron] Chef ${chefName} already exists, skipping`);
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

        console.log(`[Cron] ✅ Created chef ${chefName} and queued enrichment`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Cron] ❌ Failed to process ${item.data.name}:`, errorMsg);
        results.errors.push(`${item.data.name}: ${errorMsg}`);
      }
    }

    const workerId = `cron-${Date.now()}`;
    const lockTimeout = new Date(Date.now() + 10 * 60 * 1000);

    const { data: queuedJobs, error: jobsError } = await supabase
      .from('enrichment_jobs')
      .select('id, chef_id, chefs!inner(name, chef_shows(shows(name), season, result))')
      .eq('status', 'queued')
      .or('locked_until.is.null,locked_until.lt.' + new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(2);

    if (!jobsError && queuedJobs && queuedJobs.length > 0) {
      await supabase
        .from('enrichment_jobs')
        .update({
          locked_until: lockTimeout.toISOString(),
          locked_by: workerId,
        })
        .in('id', queuedJobs.map(j => j.id));
    }

    if (jobsError) {
      console.error('[Cron] Failed to fetch queued jobs:', jobsError);
    } else if (queuedJobs && queuedJobs.length > 0) {
      console.log(`[Cron] Processing ${queuedJobs.length} enrichment jobs`);

      const llmEnricher = createLLMEnricher(supabase);

      for (const job of queuedJobs) {
        try {
          await supabase
            .from('enrichment_jobs')
            .update({ status: 'processing', started_at: new Date().toISOString() })
            .eq('id', job.id);

          const chef = job.chefs as ChefWithShows;
          const showInfo = chef.chef_shows?.[0];
          const showName = showInfo?.shows?.name || 'Top Chef';
          const season = showInfo?.season;
          const result = showInfo?.result;

          console.log(`[Cron] Enriching ${chef.name}...`);

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
            console.log(`[Cron] ✅ Enriched ${chef.name}: Bio + ${enrichResult.restaurants.length} restaurants`);
          } else {
            throw new Error(enrichResult.error || 'Enrichment failed');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Cron] ❌ Failed to enrich job ${job.id}:`, errorMsg);

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

    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.chefsCreated} chefs, queued ${results.enrichmentJobsQueued} enrichment jobs, completed ${results.enrichmentJobsCompleted}`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Fatal error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
