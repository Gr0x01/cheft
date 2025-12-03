import { createClient } from '@/lib/supabase/server';
import { FeedbackReviewClient } from './FeedbackReviewClient';
import { MessageSquare, CheckCircle } from 'lucide-react';

export interface FeedbackSummary {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  issue_type: string;
  count: number;
  latest_message: string | null;
  latest_created_at: string;
  pending_count: number;
}

export async function FeedbackSection() {
  const supabase = await createClient();

  const { data: feedbackData, error } = await supabase
    .rpc('get_feedback_summary');

  if (error) {
    console.error('Error fetching feedback summary:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-900">Failed to load feedback reports</p>
      </div>
    );
  }

  if (!feedbackData || feedbackData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-5 bg-emerald-50 rounded-full">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        <h3 className="font-display text-2xl font-semibold text-slate-900 mb-2">No Feedback Reports</h3>
        <p className="font-ui text-slate-500 max-w-md mx-auto">
          No pending user feedback at this time. Users can report issues directly from chef and restaurant pages.
        </p>
      </div>
    );
  }

  const summaries = feedbackData as unknown as FeedbackSummary[];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-50 rounded-lg">
            <MessageSquare className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">User Feedback Reports</h3>
            <p className="font-ui text-sm text-slate-500">
              {summaries.reduce((sum, s) => sum + s.pending_count, 0)} pending reports from users
            </p>
          </div>
        </div>

        <FeedbackReviewClient summaries={summaries} />
      </div>
    </div>
  );
}
