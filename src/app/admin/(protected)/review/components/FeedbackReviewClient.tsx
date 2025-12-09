'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flag, ExternalLink, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { FeedbackSummary } from './FeedbackSection';


interface FeedbackReviewClientProps {
  summaries: FeedbackSummary[];
}

const issueTypeLabels: Record<string, { label: string; color: string }> = {
  closed: { label: 'Permanently Closed', color: 'red' },
  incorrect_info: { label: 'Incorrect Information', color: 'amber' },
  wrong_photo: { label: 'Wrong Photo', color: 'orange' },
  other: { label: 'Other Issue', color: 'slate' },
};

export function FeedbackReviewClient({ summaries }: FeedbackReviewClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolvedItems, setResolvedItems] = useState<Set<string>>(new Set());

  const handleResolve = async (summary: FeedbackSummary) => {
    const itemId = `${summary.entity_type}-${summary.entity_id}-${summary.issue_type}`;
    setResolvingId(itemId);

    try {
      const response = await fetch('/api/admin/feedback/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: summary.entity_type,
          entity_id: summary.entity_id,
          issue_type: summary.issue_type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve feedback');
      }

      setResolvedItems(prev => new Set([...prev, itemId]));
    } catch (error) {
      console.error('Error resolving feedback:', error);
      alert('Failed to resolve feedback. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  const visibleSummaries = summaries.filter(s => {
    const itemId = `${s.entity_type}-${s.entity_id}-${s.issue_type}`;
    return !resolvedItems.has(itemId);
  });

  if (visibleSummaries.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <p className="font-ui text-slate-600">All feedback has been resolved!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleSummaries.map((summary) => {
        const itemId = `${summary.entity_type}-${summary.entity_id}-${summary.issue_type}`;
        const isExpanded = expandedId === itemId;
        const isResolving = resolvingId === itemId;
        const issueConfig = issueTypeLabels[summary.issue_type] || issueTypeLabels.other;

        return (
          <div
            key={itemId}
            className="border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 transition-colors"
          >
            <div className="p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold uppercase bg-${issueConfig.color}-100 text-${issueConfig.color}-700`}
                    >
                      <Flag className="w-3 h-3" />
                      {issueConfig.label}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono uppercase bg-slate-200 text-slate-700">
                      {summary.entity_type}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {summary.count} report{summary.count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-display text-base font-semibold text-slate-900">
                      {summary.entity_name || 'Unknown Entity'}
                    </h4>
                    <Link
                      href={`/${summary.entity_type}s/${summary.entity_id}`}
                      target="_blank"
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>

                  {summary.latest_message && (
                    <p className="font-ui text-sm text-slate-600 line-clamp-2">
                      "{summary.latest_message}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : itemId)}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleResolve(summary)}
                    disabled={isResolving}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-mono text-xs font-semibold rounded transition-colors"
                  >
                    {isResolving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        RESOLVING
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        RESOLVE
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="p-4 bg-white border-t border-slate-200">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-ui text-sm text-slate-700">
                        <strong>Entity ID:</strong> <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{summary.entity_id}</code>
                      </p>
                      <p className="font-ui text-sm text-slate-700 mt-1">
                        <strong>Latest Report:</strong> {new Date(summary.latest_created_at).toLocaleString()}
                      </p>
                      {summary.latest_message && (
                        <p className="font-ui text-sm text-slate-700 mt-2">
                          <strong>Message:</strong><br />
                          {summary.latest_message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
