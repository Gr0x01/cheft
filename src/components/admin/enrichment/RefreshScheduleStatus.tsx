import { createClient } from '@/lib/supabase/server';
import { Calendar, Clock, CheckCircle2, XCircle, Zap, Activity } from 'lucide-react';
import { formatDistanceToNow, addMonths, startOfMonth, nextSunday } from 'date-fns';

interface ScheduleData {
  lastMonthlyRun: string | null;
  lastMonthlyStatus: 'success' | 'failed' | 'none';
  lastMonthlyJobsCreated: number;
  lastWeeklyRun: string | null;
  lastWeeklyStatus: 'success' | 'failed' | 'none';
  lastWeeklyJobsVerified: number;
  avgProcessingTime: number;
  successRate: number;
}

async function getScheduleData(): Promise<ScheduleData> {
  const supabase = await createClient();
  
  const [
    { data: monthlyJobs },
    { data: weeklyJobs },
    { data: recentJobs },
    { data: completedJobs },
    { count: totalJobs },
  ] = await Promise.all([
    supabase
      .from('enrichment_jobs')
      .select('created_at, status')
      .eq('enrichment_type', 'monthly_refresh')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('enrichment_jobs')
      .select('created_at, status')
      .eq('enrichment_type', 'weekly_status')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('enrichment_jobs')
      .select('started_at, completed_at')
      .eq('status', 'completed')
      .not('started_at', 'is', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50),
    supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['completed', 'failed']),
  ]);

  const avgTime = recentJobs && recentJobs.length > 0
    ? recentJobs.reduce((acc, job) => {
        const start = new Date(job.started_at!).getTime();
        const end = new Date(job.completed_at!).getTime();
        return acc + (end - start);
      }, 0) / recentJobs.length / 1000
    : 0;

  const successRate = totalJobs && totalJobs > 0
    ? Math.round((Number(completedJobs || 0) / totalJobs) * 100)
    : 100;

  const lastWeeklyJobTime = weeklyJobs && weeklyJobs.length > 0 ? weeklyJobs[0].created_at : null;
  const weeklyJobsThisRun = weeklyJobs?.filter(j => 
    lastWeeklyJobTime && 
    new Date(j.created_at).getTime() === new Date(lastWeeklyJobTime).getTime()
  ).length || 0;

  return {
    lastMonthlyRun: monthlyJobs && monthlyJobs.length > 0 ? monthlyJobs[0].created_at : null,
    lastMonthlyStatus: monthlyJobs && monthlyJobs.length > 0 
      ? (monthlyJobs[0].status === 'failed' ? 'failed' : 'success')
      : 'none',
    lastMonthlyJobsCreated: monthlyJobs?.length || 0,
    lastWeeklyRun: lastWeeklyJobTime,
    lastWeeklyStatus: weeklyJobs && weeklyJobs.length > 0 
      ? (weeklyJobs.some(j => j.status === 'failed') ? 'failed' : 'success')
      : 'none',
    lastWeeklyJobsVerified: weeklyJobsThisRun,
    avgProcessingTime: Math.round(avgTime),
    successRate,
  };
}

function getNextMonthlyRun(): Date {
  const now = new Date();
  const nextMonth = addMonths(startOfMonth(now), 1);
  nextMonth.setUTCHours(2, 0, 0, 0);
  return nextMonth;
}

function getNextWeeklyRun(): Date {
  const now = new Date();
  const next = nextSunday(now);
  next.setUTCHours(3, 0, 0, 0);
  return next;
}

export async function RefreshScheduleStatus() {
  const data = await getScheduleData();
  const nextMonthly = getNextMonthlyRun();
  const nextWeekly = getNextWeeklyRun();

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
      <div className="bg-gradient-to-r from-copper-500/10 to-transparent p-6 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-copper-500/20 rounded-lg backdrop-blur-sm">
            <Calendar className="w-5 h-5 text-copper-600" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Scheduled Refresh Status
            </h2>
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mt-0.5">
              Automated data maintenance
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="relative bg-white rounded-xl p-6 border border-copper-200/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-copper-400 to-copper-600 rounded-t-xl" />
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-copper-500 animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-wider text-copper-600 font-semibold">
                  Monthly Full Refresh
                </span>
              </div>
              {data.lastMonthlyStatus === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {data.lastMonthlyStatus === 'failed' && (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>

            <div className="mb-4">
              <div className="font-mono text-4xl font-black text-slate-900 mb-1">
                {formatDistanceToNow(nextMonthly, { addSuffix: false })}
              </div>
              <div className="font-ui text-sm text-slate-500">
                until next run
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-mono text-xs text-slate-600">
                  {nextMonthly.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}
                </span>
              </div>
              {data.lastMonthlyRun && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span className="font-ui text-xs text-slate-500">
                    {data.lastMonthlyJobsCreated} jobs last run
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="relative bg-white rounded-xl p-6 border border-blue-200/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-xl" />
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-wider text-blue-600 font-semibold">
                  Weekly Status Check
                </span>
              </div>
              {data.lastWeeklyStatus === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {data.lastWeeklyStatus === 'failed' && (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>

            <div className="mb-4">
              <div className="font-mono text-4xl font-black text-slate-900 mb-1">
                {formatDistanceToNow(nextWeekly, { addSuffix: false })}
              </div>
              <div className="font-ui text-sm text-slate-500">
                until next run
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-mono text-xs text-slate-600">
                  {nextWeekly.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}
                </span>
              </div>
              {data.lastWeeklyRun && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span className="font-ui text-xs text-slate-500">
                    {data.lastWeeklyJobsVerified} verified last run
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-4 border border-emerald-200/40">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="font-mono text-xs uppercase tracking-wider text-slate-600">
                Success Rate
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-600">
              {data.successRate}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200/40">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-mono text-xs uppercase tracking-wider text-slate-600">
                Avg Duration
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-blue-600">
              {data.avgProcessingTime}s
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-4 border border-amber-200/40">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-amber-600" />
              <span className="font-mono text-xs uppercase tracking-wider text-slate-600">
                Status
              </span>
            </div>
            <div className="font-mono text-xl font-bold text-amber-600">
              ACTIVE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
