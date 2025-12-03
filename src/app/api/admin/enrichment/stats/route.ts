import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import {
  verifyAdminAuth,
  createUnauthorizedResponse,
  createServerErrorResponse,
  createSuccessResponse,
} from '@/lib/auth/admin';
import { getBudgetForMonth } from '@/lib/enrichment/budget';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  
  if (!authResult.authorized) {
    return createUnauthorizedResponse(authResult.error);
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createServerErrorResponse('Server configuration error: missing Supabase credentials');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const currentMonth = await getBudgetForMonth(supabase);

    const { count: queuedCount } = await supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    const { count: processingCount } = await supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing');

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: completed24h } = await supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', twentyFourHoursAgo);

    const { count: failed24h } = await supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('updated_at', twentyFourHoursAgo);

    const { data: recentJobs } = await supabase
      .from('enrichment_jobs')
      .select('completed_at, created_at')
      .eq('status', 'completed')
      .gte('completed_at', twentyFourHoursAgo)
      .not('completed_at', 'is', null)
      .limit(100);

    let avgProcessingTime = 0;
    if (recentJobs && recentJobs.length > 0) {
      const processingTimes = recentJobs
        .filter(j => j.completed_at && j.created_at)
        .map(j => {
          const completed = new Date(j.completed_at!).getTime();
          const created = new Date(j.created_at).getTime();
          return (completed - created) / 1000;
        });
      
      if (processingTimes.length > 0) {
        avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      }
    }

    const { data: lastMonthlyRun } = await supabase
      .from('enrichment_jobs')
      .select('created_at')
      .eq('enrichment_type', 'monthly_refresh')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastWeeklyRun } = await supabase
      .from('enrichment_jobs')
      .select('created_at')
      .eq('enrichment_type', 'weekly_status')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 2, 0, 0);
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
    nextSunday.setUTCHours(3, 0, 0, 0);

    return createSuccessResponse({
      currentMonth: currentMonth ? {
        budgetUsd: currentMonth.budget_usd ?? 0,
        spentUsd: currentMonth.spent_usd ?? 0,
        manualSpentUsd: currentMonth.manual_spent_usd ?? 0,
        jobsCompleted: currentMonth.jobs_completed ?? 0,
        jobsFailed: currentMonth.jobs_failed ?? 0,
        percentUsed: currentMonth.spent_usd && currentMonth.budget_usd 
          ? (currentMonth.spent_usd / currentMonth.budget_usd) * 100 
          : 0,
      } : null,
      lastRuns: {
        monthlyRefresh: lastMonthlyRun?.created_at || null,
        weeklyStatus: lastWeeklyRun?.created_at || null,
      },
      nextScheduled: {
        monthlyRefresh: nextMonth.toISOString(),
        weeklyStatus: nextSunday.toISOString(),
      },
      queueStatus: {
        queued: queuedCount || 0,
        processing: processingCount || 0,
        completed24h: completed24h || 0,
        failed24h: failed24h || 0,
        avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
      },
    });
  } catch (error) {
    console.error('[Admin Enrichment] Error fetching stats:', error);
    return createServerErrorResponse(
      'Failed to fetch enrichment stats',
      error instanceof Error ? error.message : String(error)
    );
  }
}
