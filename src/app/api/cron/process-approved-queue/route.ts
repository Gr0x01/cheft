import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';
import { createLLMEnricher } from '../../../../../scripts/ingestion/processors/llm-enricher';
import { extractShowSlugFromWikiUrl } from '@/lib/utils/show-mapping';
import { estimateCostFromTokens, incrementBudgetSpend } from '@/lib/enrichment/budget';
import { ENRICHMENT_TYPE, DEFAULT_MODEL } from '@/lib/enrichment/constants';

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

interface EnrichmentJobWithChef {
  id: string;
  chef_id: string;
  retry_count: number;
  last_retry_at: string | null;
  chefs: ChefWithShows;
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

    const hasApprovedItems = approvedItems && approvedItems.length > 0;
    
    if (hasApprovedItems) {
      console.log(`[Cron] Processing ${approvedItems.length} approved chefs`);
    } else {
      console.log('[Cron] No new chefs to create, checking for enrichment jobs');
    }

    const results = {
      chefsCreated: 0,
      enrichmentJobsQueued: 0,
      enrichmentJobsCompleted: 0,
      enrichmentJobsFailed: 0,
      errors: [] as string[],
    };

    if (hasApprovedItems) {
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
            enrichment_type: ENRICHMENT_TYPE.INITIAL,
            triggered_by: 'cron',
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
    }

    const workerId = `cron-${Date.now()}`;
    const lockTimeout = new Date(Date.now() + 10 * 60 * 1000);

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const { data: queuedJobs, error: jobsError } = await supabase
      .from('enrichment_jobs')
      .select('id, chef_id, retry_count, last_retry_at, chefs!inner(name, chef_shows(shows(name), season, result))')
      .or(
        `and(status.eq.queued,or(locked_until.is.null,locked_until.lt.${now.toISOString()})),` +
        `and(status.eq.failed,retry_count.eq.0,or(last_retry_at.is.null,last_retry_at.lt.${fiveMinutesAgo.toISOString()})),` +
        `and(status.eq.failed,retry_count.eq.1,last_retry_at.lt.${fifteenMinutesAgo.toISOString()}),` +
        `and(status.eq.failed,retry_count.eq.2,last_retry_at.lt.${thirtyMinutesAgo.toISOString()})`
      )
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

      for (const job of queuedJobs as EnrichmentJobWithChef[]) {
        try {
          await supabase
            .from('enrichment_jobs')
            .update({ status: 'processing', started_at: new Date().toISOString() })
            .eq('id', job.id);

          const chef = job.chefs;
          const showInfo = chef.chef_shows?.[0];
          const showName = showInfo?.shows?.name || 'Top Chef';
          const season = showInfo?.season;
          const result = showInfo?.result;

          console.log(`[Cron] Enriching ${chef.name}...`);

          const workflowResult = await llmEnricher.workflows.manualChefAddition({
            chefId: job.chef_id,
            chefName: chef.name,
            initialShowName: showName,
            initialShowSeason: season ?? undefined,
            initialShowResult: result ?? undefined,
            skipNarrative: true,
            dryRun: false,
          });

          if (workflowResult.success) {
            const costUsd = workflowResult.totalCost.estimatedUsd;
            
            await supabase
              .from('enrichment_jobs')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                tokens_used: JSON.parse(JSON.stringify(workflowResult.totalCost.tokens)),
                cost_usd: costUsd,
              })
              .eq('id', job.id);

            await incrementBudgetSpend(supabase, costUsd, false);

            results.enrichmentJobsCompleted++;
            const output = workflowResult.output as { totalRestaurants?: number };
            console.log(`[Cron] ✅ Enriched ${chef.name}: Bio + ${output.totalRestaurants || 0} restaurants (cost: $${costUsd.toFixed(4)})`);
          } else {
            throw new Error(workflowResult.errors?.map(e => e.message).join('; ') || 'Enrichment failed');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Cron] ❌ Failed to enrich job ${job.id}:`, errorMsg);

          const currentRetryCount = job.retry_count;
          const newRetryCount = currentRetryCount + 1;
          const maxRetries = 3;

          if (newRetryCount < maxRetries) {
            await supabase
              .from('enrichment_jobs')
              .update({
                status: 'queued',
                error_message: errorMsg.substring(0, 500),
                retry_count: newRetryCount,
                last_retry_at: new Date().toISOString(),
                locked_until: null,
                locked_by: null,
              })
              .eq('id', job.id)
              .eq('retry_count', currentRetryCount);

            console.log(`[Cron] 🔄 Job ${job.id} will retry (attempt ${newRetryCount}/${maxRetries})`);
          } else {
            await supabase
              .from('enrichment_jobs')
              .update({
                status: 'failed',
                error_message: errorMsg.substring(0, 500),
                completed_at: new Date().toISOString(),
                retry_count: newRetryCount,
                last_retry_at: new Date().toISOString(),
              })
              .eq('id', job.id);

            console.log(`[Cron] ❌ Job ${job.id} permanently failed after ${maxRetries} retries`);
          }

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
