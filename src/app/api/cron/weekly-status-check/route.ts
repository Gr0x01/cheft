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

export const maxDuration = 300;

const VERIFICATION_CONFIG = {
  STALE_VERIFICATION_DAYS: 30,
  MIN_VERIFICATION_PRIORITY: 30,
} as const;

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
    console.log('[WeeklyStatus] Starting weekly status check cron job');

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

    if (percentUsed >= 1.0) {
      console.error('[WeeklyStatus] Budget exhausted, skipping status check');
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

    const staleDaysAgo = new Date();
    staleDaysAgo.setDate(staleDaysAgo.getDate() - VERIFICATION_CONFIG.STALE_VERIFICATION_DAYS);

    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, city, chef_id, last_verified_at, verification_priority')
      .eq('status', 'open')
      .or(`last_verified_at.is.null,last_verified_at.lt.${staleDaysAgo.toISOString()}`)
      .gte('verification_priority', VERIFICATION_CONFIG.MIN_VERIFICATION_PRIORITY)
      .order('verification_priority', { ascending: false })
      .limit(ENRICHMENT_CONFIG.WEEKLY_STATUS.TOP_RESTAURANTS_COUNT);

    if (restaurantsError) {
      throw new Error(`Failed to fetch restaurants: ${restaurantsError.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('[WeeklyStatus] No restaurants need status verification');
      return NextResponse.json({
        success: true,
        jobsCreated: 0,
        restaurantsChecked: 0,
        message: 'No restaurants require status verification at this time',
      });
    }

    const restaurantsByChef = new Map<string, { ids: string[]; names: string[]; maxPriority: number }>();
    for (const r of restaurants) {
      if (!r.chef_id || !isValidUUID(r.chef_id)) continue;
      
      const existing = restaurantsByChef.get(r.chef_id);
      if (existing) {
        existing.ids.push(r.id);
        existing.names.push(r.name);
        existing.maxPriority = Math.max(existing.maxPriority, r.verification_priority || 50);
      } else {
        restaurantsByChef.set(r.chef_id, {
          ids: [r.id],
          names: [r.name],
          maxPriority: r.verification_priority || 50,
        });
      }
    }

    if (restaurantsByChef.size === 0) {
      console.warn(`[WeeklyStatus] No valid chef_ids found in ${restaurants.length} restaurants`);
      return NextResponse.json({
        success: true,
        jobsCreated: 0,
        restaurantsQueued: 0,
        chefsQueued: 0,
        message: 'No restaurants with valid chef associations found',
      });
    }

    const remainingBudget = budgetUsd - spentUsd;
    const estimatedCostPerJob = ENRICHMENT_CONFIG.COST_ESTIMATES.STATUS_CHECK;
    const maxJobsByBudget = Math.floor(remainingBudget / estimatedCostPerJob);
    
    const chefEntries = Array.from(restaurantsByChef.entries())
      .sort((a, b) => b[1].maxPriority - a[1].maxPriority)
      .slice(0, Math.min(ENRICHMENT_CONFIG.WEEKLY_STATUS.MAX_BATCH_SIZE, maxJobsByBudget));

    console.log(`[WeeklyStatus] Grouped ${restaurants.length} restaurants into ${chefEntries.length} chef jobs (budget allows ${maxJobsByBudget})`);

    const totalRestaurants = chefEntries.reduce((sum, [, data]) => sum + data.ids.length, 0);
    const results = {
      jobsCreated: 0,
      restaurantsQueued: totalRestaurants,
      chefsQueued: chefEntries.length,
      budgetStatus: {
        budgetUsd,
        spentUsd,
        percentUsed: percentUsed * 100,
        remainingUsd: remainingBudget,
      },
      errors: [] as string[],
    };

    for (const [chefId, data] of chefEntries) {
      try {
        const checkResult = await checkBudgetAvailable(
          supabase, 
          estimatedCostPerJob
        );

        if (!checkResult.allowed) {
          console.warn(`[WeeklyStatus] Budget limit reached, stopping at ${results.jobsCreated} jobs`);
          break;
        }

        const { data: job, error: jobError } = await supabase
          .from('enrichment_jobs')
          .insert({
            chef_id: chefId,
            status: 'queued',
            enrichment_type: ENRICHMENT_TYPE.WEEKLY_STATUS,
            triggered_by: 'cron',
            priority_score: data.maxPriority,
            metadata: { restaurant_ids: data.ids },
          })
          .select('id')
          .single();

        if (jobError || !job) {
          const errorMsg = jobError?.message || 'Unknown error creating job';
          console.error(`[WeeklyStatus] Failed to create job:`, errorMsg);
          results.errors.push(`Chef ${chefId}: ${errorMsg}`);
          continue;
        }

        results.jobsCreated++;
        console.log(`[WeeklyStatus] Queued status check for ${data.ids.length} restaurants: ${data.names.join(', ')}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[WeeklyStatus] Failed to queue chef ${chefId}:`, errorMsg);
        results.errors.push(`Chef ${chefId}: ${errorMsg}`);
      }
    }

    console.log(`[WeeklyStatus] ✅ Created ${results.jobsCreated} status check jobs`);

    return NextResponse.json({
      success: true,
      ...results,
      message: `Weekly status check: created ${results.jobsCreated} jobs for ${results.restaurantsQueued} restaurants`,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[WeeklyStatus] Fatal error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
