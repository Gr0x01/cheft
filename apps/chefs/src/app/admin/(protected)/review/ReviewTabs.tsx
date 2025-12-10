'use client';

import { useState } from 'react';

interface ReviewTabsProps {
  discoveriesContent: React.ReactNode;
  duplicatesContent: React.ReactNode;
  feedbackContent: React.ReactNode;
  discoveryCount: number;
  duplicateCount: number;
  feedbackCount: number;
}

export function ReviewTabs({ 
  discoveriesContent, 
  duplicatesContent, 
  feedbackContent, 
  discoveryCount,
  duplicateCount, 
  feedbackCount 
}: ReviewTabsProps) {
  const [activeTab, setActiveTab] = useState<'discoveries' | 'duplicates' | 'feedback'>('discoveries');

  return (
    <div>
      <div className="flex gap-8 mb-8">
        <button
          onClick={() => setActiveTab('discoveries')}
          className={`font-mono text-xs uppercase tracking-[0.15em] pb-2 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'discoveries'
              ? 'text-stone-900 border-copper-600'
              : 'text-stone-400 border-transparent hover:text-stone-600'
          }`}
        >
          Discoveries
          {discoveryCount > 0 && (
            <span className="font-mono text-[10px] bg-purple-600 text-white px-1.5 py-0.5">
              {discoveryCount}
            </span>
          )}
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

      {activeTab === 'discoveries' && discoveriesContent}
      {activeTab === 'duplicates' && duplicatesContent}
      {activeTab === 'feedback' && feedbackContent}
    </div>
  );
}
