import { createClient } from '@/lib/supabase/server';
import { Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnrichmentJob {
  id: string;
  chef_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  chefs: {
    name: string;
    slug: string;
  };
}

export default async function EnrichmentJobsPage() {
  const supabase = await createClient();

  const [
    { data: jobs },
    { count: queuedCount },
    { count: processingCount },
    { count: completedCount },
    { count: failedCount },
  ] = await Promise.all([
    supabase
      .from('enrichment_jobs')
      .select('*, chefs!inner(name, slug)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued'),
    supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing'),
    supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">
          Enrichment Jobs
        </h1>
        <p className="font-ui text-slate-500">
          Background processing status for chef data enrichment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Queued"
          value={queuedCount || 0}
          icon={Clock}
          color="blue"
        />
        <StatCard
          label="Processing"
          value={processingCount || 0}
          icon={RefreshCw}
          color="yellow"
        />
        <StatCard
          label="Completed"
          value={completedCount || 0}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Failed"
          value={failedCount || 0}
          icon={XCircle}
          color="red"
        />
      </div>

      {jobs && jobs.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left font-ui text-sm font-semibold text-slate-700">
                    Chef
                  </th>
                  <th className="px-6 py-4 text-left font-ui text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left font-ui text-sm font-semibold text-slate-700">
                    Error
                  </th>
                  <th className="px-6 py-4 text-left font-ui text-sm font-semibold text-slate-700">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left font-ui text-sm font-semibold text-slate-700">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(jobs as unknown as EnrichmentJob[]).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-display font-medium text-slate-900">
                          {job.chefs.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          /{job.chefs.slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4">
                      {job.error_message ? (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span className="font-ui text-sm text-slate-700 line-clamp-2">
                            {job.error_message}
                          </span>
                        </div>
                      ) : (
                        <span className="font-ui text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-700">
                        {calculateDuration(job)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-ui text-sm text-slate-600">
                        {formatDistanceToNow(new Date(job.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-5 bg-slate-50 rounded-full">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
          </div>
          <h3 className="font-display text-2xl font-semibold text-slate-900 mb-2">
            No Enrichment Jobs
          </h3>
          <p className="font-ui text-slate-500 max-w-md mx-auto">
            Enrichment jobs will appear here when chefs are approved in the review queue.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  color: 'blue' | 'yellow' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    yellow: 'bg-amber-50 border-amber-100 text-amber-600',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    red: 'bg-red-50 border-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="font-mono text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="font-ui text-sm text-slate-500">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    queued: {
      label: 'Queued',
      classes: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Clock,
    },
    processing: {
      label: 'Processing',
      classes: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: RefreshCw,
    },
    completed: {
      label: 'Completed',
      classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
    },
    failed: {
      label: 'Failed',
      classes: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-ui text-sm font-medium ${config.classes}`}
    >
      <Icon className="w-4 h-4" />
      {config.label}
    </div>
  );
}

function calculateDuration(job: EnrichmentJob): string {
  if (job.status === 'queued') return '-';
  
  if (job.started_at && job.completed_at) {
    const start = new Date(job.started_at).getTime();
    const end = new Date(job.completed_at).getTime();
    const durationSec = Math.round((end - start) / 1000);
    return `${durationSec}s`;
  }
  
  if (job.started_at) {
    const start = new Date(job.started_at).getTime();
    const now = Date.now();
    const durationSec = Math.round((now - start) / 1000);
    return `${durationSec}s`;
  }
  
  return '-';
}
