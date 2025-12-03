'use client';

import { useState } from 'react';
import { FileCheck2, Copy, MessageSquare } from 'lucide-react';

interface ReviewTabsProps {
  queueContent: React.ReactNode;
  duplicatesContent: React.ReactNode;
  feedbackContent: React.ReactNode;
  duplicateCount: number;
  feedbackCount: number;
}

export function ReviewTabs({ queueContent, duplicatesContent, feedbackContent, duplicateCount, feedbackCount }: ReviewTabsProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'duplicates' | 'feedback'>('queue');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'queue'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-5 h-5" />
              Review Queue
            </button>
            <button
              onClick={() => setActiveTab('duplicates')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'duplicates'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Copy className="w-5 h-5" />
              Duplicates
              {duplicateCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                  {duplicateCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'feedback'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              Feedback
              {feedbackCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  {feedbackCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'queue' && queueContent}
      {activeTab === 'duplicates' && duplicatesContent}
      {activeTab === 'feedback' && feedbackContent}
    </div>
  );
}
