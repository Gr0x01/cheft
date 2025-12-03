import { createClient } from '@/lib/supabase/server';
import { ENRICHMENT_CONFIG } from '@/lib/enrichment/constants';
import { DollarSign, TrendingUp, Activity, AlertTriangle } from 'lucide-react';

interface BudgetData {
  budgetUsd: number;
  spentUsd: number;
  manualSpentUsd: number;
  jobsCompleted: number;
  jobsFailed: number;
}

async function getBudgetData(): Promise<BudgetData> {
  const supabase = await createClient();
  
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  
  const { data: budget } = await supabase
    .from('enrichment_budgets')
    .select('*')
    .eq('month', currentMonth)
    .single();

  if (!budget) {
    return {
      budgetUsd: ENRICHMENT_CONFIG.MONTHLY_BUDGET_USD,
      spentUsd: 0,
      manualSpentUsd: 0,
      jobsCompleted: 0,
      jobsFailed: 0,
    };
  }

  return {
    budgetUsd: Number(budget.budget_usd),
    spentUsd: Number(budget.spent_usd),
    manualSpentUsd: Number(budget.manual_spent_usd),
    jobsCompleted: budget.jobs_completed || 0,
    jobsFailed: budget.jobs_failed || 0,
  };
}

export async function BudgetTracker() {
  const data = await getBudgetData();
  
  const percentUsed = data.budgetUsd > 0 
    ? Math.round((data.spentUsd / data.budgetUsd) * 100) 
    : 0;
  
  const successRate = data.jobsCompleted + data.jobsFailed > 0
    ? Math.round((data.jobsCompleted / (data.jobsCompleted + data.jobsFailed)) * 100)
    : 100;

  const warningLevel = percentUsed >= 100 ? 'critical' : percentUsed >= 80 ? 'warning' : 'normal';

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
      <div className={`h-1 ${
        warningLevel === 'critical' ? 'bg-red-500' : 
        warningLevel === 'warning' ? 'bg-amber-500' : 
        'bg-copper-500'
      }`} />
      
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">
              Budget Status
            </h2>
            <p className="font-ui text-sm text-slate-500 uppercase tracking-wider">
              {month}
            </p>
          </div>
          
          {warningLevel !== 'normal' && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              warningLevel === 'critical' 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <AlertTriangle className="w-4 h-4" />
              <span className="font-mono text-xs font-semibold uppercase">
                {warningLevel === 'critical' ? 'Budget Exhausted' : 'Budget Warning'}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="relative flex items-center justify-center p-8">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-slate-100"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="url(#copperGradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - percentUsed / 100)}`}
                  className={`transition-all duration-1000 ease-out ${
                    warningLevel === 'critical' ? 'stroke-red-500' :
                    warningLevel === 'warning' ? 'stroke-amber-500' : ''
                  }`}
                />
                <defs>
                  <linearGradient id="copperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e67e22" />
                    <stop offset="100%" stopColor="#bf4f0a" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono text-5xl font-black text-copper-500">
                  {percentUsed}%
                </div>
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mt-1">
                  Used
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-copper-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-copper-600" />
                </div>
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900 mb-1">
                ${data.spentUsd.toFixed(2)}
              </div>
              <div className="font-ui text-sm text-slate-500">
                Automated Spend
              </div>
              <div className="font-mono text-xs text-slate-400 mt-2">
                of ${data.budgetUsd.toFixed(2)} limit
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900 mb-1">
                ${data.manualSpentUsd.toFixed(2)}
              </div>
              <div className="font-ui text-sm text-slate-500">
                Manual Spend
              </div>
              <div className="font-mono text-xs text-slate-400 mt-2">
                tracked separately
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-6 border border-emerald-200/60">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Activity className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900 mb-1">
                {data.jobsCompleted}
              </div>
              <div className="font-ui text-sm text-slate-500">
                Jobs Completed
              </div>
              <div className="font-mono text-xs text-emerald-600 mt-2">
                {successRate}% success rate
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-6 border border-red-200/60">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900 mb-1">
                {data.jobsFailed}
              </div>
              <div className="font-ui text-sm text-slate-500">
                Jobs Failed
              </div>
              <div className="font-mono text-xs text-slate-400 mt-2">
                requires review
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-copper-500" />
              <span className="font-ui text-slate-600">
                Remaining: <span className="font-mono font-semibold text-slate-900">
                  ${Math.max(0, data.budgetUsd - data.spentUsd).toFixed(2)}
                </span>
              </span>
            </div>
            <div className="font-mono text-xs text-slate-400 uppercase tracking-wider">
              Budget resets monthly
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
