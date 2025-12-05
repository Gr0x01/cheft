'use client';

import { User, Store, AlertCircle, CheckCircle } from 'lucide-react';

interface EntityListItem {
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  completeness: number;
  missingFields: string[];
}

interface EntityListProps {
  type: 'chef' | 'restaurant';
  items: EntityListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
}

export function EntityList({ type, items, selectedId, onSelect, compact }: EntityListProps) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
          {type === 'chef' ? (
            <User className="w-6 h-6 text-slate-400" />
          ) : (
            <Store className="w-6 h-6 text-slate-400" />
          )}
        </div>
        <p className="font-ui text-sm text-slate-500">No {type}s found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        const isComplete = item.completeness === 1;

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-4 py-3 transition-colors ${
              isSelected
                ? 'bg-copper-50 border-l-4 border-copper-500'
                : 'hover:bg-slate-50 border-l-4 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.imageUrl && !compact ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isComplete ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                  {type === 'chef' ? (
                    <User className={`w-5 h-5 ${isComplete ? 'text-emerald-600' : 'text-slate-400'}`} />
                  ) : (
                    <Store className={`w-5 h-5 ${isComplete ? 'text-emerald-600' : 'text-slate-400'}`} />
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-ui text-sm font-medium truncate ${isSelected ? 'text-copper-900' : 'text-slate-900'}`}>
                    {item.name}
                  </span>
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                {item.subtitle && !compact && (
                  <p className="font-ui text-xs text-slate-500 truncate">{item.subtitle}</p>
                )}
                {!isComplete && !compact && (
                  <p className="font-mono text-xs text-amber-600 truncate">
                    Missing: {item.missingFields.join(', ')}
                  </p>
                )}
              </div>

              {!compact && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke={item.completeness === 1 ? '#10b981' : '#f59e0b'}
                        strokeWidth="3"
                        strokeDasharray={`${item.completeness * 88} 88`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-slate-600">
                      {Math.round(item.completeness * 100)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
