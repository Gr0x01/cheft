'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ExternalLink } from 'lucide-react';

interface QuickFixButtonProps {
  label: string;
  count: number;
  estimatedCost?: number;
  onTrigger: () => Promise<void>;
  disabled?: boolean;
}

export function QuickFixButton({
  label,
  count,
  estimatedCost,
  onTrigger,
  disabled = false,
}: QuickFixButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onTrigger();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Quick fix failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (count === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-slate-200 p-5 hover:border-copper-300 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-ui text-sm font-semibold text-slate-900 mb-1">{label}</h4>
          <p className="font-mono text-xs text-slate-500">
            {count} {count === 1 ? 'entity' : 'entities'} need enrichment
          </p>
        </div>
        <div className="p-2 bg-copper-50 rounded-lg border border-copper-200">
          <Sparkles className="w-4 h-4 text-copper-600" />
        </div>
      </div>

      {estimatedCost && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="font-mono text-xs text-amber-700">
            Estimated cost:{' '}
            <span className="font-bold">${estimatedCost.toFixed(2)}</span>
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleClick}
          disabled={disabled || isLoading || showSuccess}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm font-semibold transition-all ${
            showSuccess
              ? 'bg-emerald-500 text-white cursor-default'
              : disabled || isLoading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-copper-500 hover:bg-copper-600 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enriching...
            </>
          ) : showSuccess ? (
            <>
              ✓ Queued
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Enrich {Math.min(count, 10)}
            </>
          )}
        </button>

        {showSuccess && (
          <a
            href="/admin/enrichment-jobs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
