'use client';

import { useState } from 'react';

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
    <div>
      <div className="flex gap-8 mb-8">
        <button
          onClick={() => setActiveTab('queue')}
          className={`font-mono text-xs uppercase tracking-[0.15em] pb-2 border-b-2 transition-all ${
            activeTab === 'queue'
              ? 'text-stone-900 border-copper-600'
              : 'text-stone-400 border-transparent hover:text-stone-600'
          }`}
        >
          Review Queue
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`font-mono text-xs uppercase tracking-[0.15em] pb-2 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'duplicates'
              ? 'text-stone-900 border-copper-600'
              : 'text-stone-400 border-transparent hover:text-stone-600'
          }`}
        >
          Duplicates
          {duplicateCount > 0 && (
            <span className="font-mono text-[10px] bg-copper-600 text-white px-1.5 py-0.5">
              {duplicateCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`font-mono text-xs uppercase tracking-[0.15em] pb-2 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'feedback'
              ? 'text-stone-900 border-copper-600'
              : 'text-stone-400 border-transparent hover:text-stone-600'
          }`}
        >
          Feedback
          {feedbackCount > 0 && (
            <span className="font-mono text-[10px] bg-amber-500 text-white px-1.5 py-0.5">
              {feedbackCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'queue' && queueContent}
      {activeTab === 'duplicates' && duplicatesContent}
      {activeTab === 'feedback' && feedbackContent}
    </div>
  );
}
