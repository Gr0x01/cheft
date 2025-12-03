import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';
import { 
  ENRICHMENT_CONFIG, 
  ENRICHMENT_TYPE,
} from '@/lib/enrichment/constants';
import { 
  getBudgetForMonth, 
  ensureBudgetExists,
  checkBudgetAvailable 
} from '@/lib/enrichment/budget';

export const maxDuration = 600;

interface ChefPriorityData {
  id: string;
  name: string;
  slug: string;
  restaurant_count: number;
  last_enriched_at: string | null;
  enrichment_priority: number | null;
  manual_priority: boolean | null;
}

function calculatePriority(chef: ChefPriorityData): number {
  const restaurantCount = chef.restaurant_count || 0;
  
  const daysSinceEnriched = chef.last_enriched_at 
    ? Math.floor((Date.now() - new Date(chef.last_enriched_at).getTime()) / (1000 * 60 * 60 * 24))
    : 365;
  
  let score = 0;
  score += restaurantCount * 10;
  score += Math.min(daysSinceEnriched * 0.5, 100);
  score += chef.manual_priority ? 50 : 0;
  score += chef.enrichment_priority || 50;
  
  return Math.min(score, 200);
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
    console.log('[MonthlyRefresh] Starting monthly refresh cron job');

    await ensureBudgetExists(supabase);
    const budget = await getBudgetForMonth(supabase);
    
    if (!budget || budget.budget_usd === null || budget.spent_usd === null) {
      return NextResponse.json({ 
        error: 'Budget not initialized',
        success: false 
      }, { status: 500 });
    }

    const budgetUsd = budget.budget_usd ?? 0;
    const spentUsd = budget.spent_usd ?? 0;
    const percentUsed = budgetUsd > 0 ? (spentUsd / budgetUsd) : 0;

    if (percentUsed > ENRICHMENT_CONFIG.BUDGET_WARNING_THRESHOLD) {
      console.warn(`[MonthlyRefresh] Budget ${(percentUsed * 100).toFixed(1)}% used, limiting batch size`);
    }

    if (percentUsed >= 1.0) {
      console.error('[MonthlyRefresh] Budget exhausted, skipping scheduled refresh');
      return NextResponse.json({ 
        success: false, 
        error: 'Monthly budget exhausted',
        budgetStatus: {
          budgetUsd,
          spentUsd,
          percentUsed: percentUsed * 100
        }
      });
    }

    const { data: chefsData, error: chefsError } = await supabase
      .from('chefs')
      .select('id, name, slug, last_enriched_at, enrichment_priority, manual_priority')
      .order('last_enriched_at', { ascending: true, nullsFirst: true }) as { 
        data: ChefPriorityData[] | null; 
        error: any 
      };

    if (chefsError) {
      throw new Error(`Failed to fetch chefs: ${chefsError.message}`);
    }

    const { data: restaurantCounts, error: countsError} = await supabase
      .from('restaurants')
      .select('chef_id')
      .eq('status', 'open');

    if (countsError) {
      throw new Error(`Failed to fetch restaurant counts: ${countsError.message}`);
    }

    const restaurantCountMap = new Map<string, number>();
    restaurantCounts?.forEach(r => {
      if (r.chef_id) {
        restaurantCountMap.set(r.chef_id, (restaurantCountMap.get(r.chef_id) || 0) + 1);
      }
    });

    const chefsWithPriority = (chefsData || []).map((chef: ChefPriorityData) => ({
      ...chef,
      restaurant_count: restaurantCountMap.get(chef.id) || 0,
      priority: 0
    }));
    
    chefsWithPriority.forEach(chef => {
      chef.priority = calculatePriority(chef);
    });
    
    chefsWithPriority.sort((a, b) => b.priority - a.priority);
    
    let topChefs = chefsWithPriority.slice(0, ENRICHMENT_CONFIG.MONTHLY_REFRESH.TOP_CHEFS_COUNT);

    let batchSize = ENRICHMENT_CONFIG.MONTHLY_REFRESH.MAX_BATCH_SIZE;
    if (percentUsed > ENRICHMENT_CONFIG.BUDGET_WARNING_THRESHOLD) {
      batchSize = Math.max(1, Math.floor(batchSize / 2));
    }

    const remainingBudget = budgetUsd - spentUsd;
    const estimatedCostPerJob = ENRICHMENT_CONFIG.COST_ESTIMATES.FULL_ENRICHMENT;
    const maxJobsByBudget = Math.floor(remainingBudget / estimatedCostPerJob);
    
    const jobsToCreate = Math.min(topChefs.length, batchSize, maxJobsByBudget);
    topChefs = topChefs.slice(0, jobsToCreate);

    console.log(`[MonthlyRefresh] Selected ${topChefs.length} chefs for refresh (budget allows ${maxJobsByBudget})`);

    const results = {
      jobsCreated: 0,
      chefsSelected: topChefs.length,
      budgetStatus: {
        budgetUsd,
        spentUsd,
        percentUsed: percentUsed * 100,
        remainingUsd: remainingBudget,
      },
      errors: [] as string[],
    };

    for (const chef of topChefs) {
      try {
        const checkResult = await checkBudgetAvailable(
          supabase, 
          estimatedCostPerJob
        );

        if (!checkResult.allowed) {
          console.warn(`[MonthlyRefresh] Budget limit reached, stopping at ${results.jobsCreated} jobs`);
          break;
        }

        const { data: job, error: jobError } = await supabase
          .from('enrichment_jobs')
          .insert({
            chef_id: chef.id,
            status: 'queued',
            enrichment_type: ENRICHMENT_TYPE.MONTHLY_REFRESH,
            triggered_by: 'cron',
            priority_score: chef.priority,
          })
          .select('id')
          .single();

        if (jobError || !job) {
          const errorMsg = jobError?.message || 'Unknown error creating job';
          console.error(`[MonthlyRefresh] Failed to create job for ${chef.name}:`, errorMsg);
          results.errors.push(`${chef.name}: ${errorMsg}`);
          continue;
        }

        results.jobsCreated++;
        console.log(`[MonthlyRefresh] Queued job for ${chef.name} (priority: ${chef.priority})`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[MonthlyRefresh] Failed to queue ${chef.name}:`, errorMsg);
        results.errors.push(`${chef.name}: ${errorMsg}`);
      }
    }

    console.log(`[MonthlyRefresh] ✅ Created ${results.jobsCreated} enrichment jobs`);

    return NextResponse.json({
      success: true,
      ...results,
      message: `Monthly refresh: created ${results.jobsCreated} enrichment jobs for top chefs`,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[MonthlyRefresh] Fatal error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
