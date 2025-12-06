'use client';

import { User, Store, Shield } from 'lucide-react';

interface EntityListItem {
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  completeness: number;
  missingFields: string[];
  protected?: boolean;
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
      <div className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-stone-100 mb-3">
          {type === 'chef' ? (
            <User className="w-6 h-6 text-stone-400" />
          ) : (
            <Store className="w-6 h-6 text-stone-400" />
          )}
        </div>
        <p className="font-mono text-xs text-stone-400 uppercase tracking-wider">No {type}s found</p>
      </div>
    );
  }

  return (
    <div>
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        const isComplete = item.completeness === 1;
        const percentage = Math.round(item.completeness * 100);

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-5 py-4 transition-all border-l-4 border-b border-stone-100 ${
              isSelected
                ? 'bg-copper-50/50 border-l-copper-600'
                : 'border-l-transparent hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-display text-base font-semibold truncate ${isSelected ? 'text-copper-900' : 'text-stone-900'}`}>
                    {item.name}
                  </span>
                  {item.protected && (
                    <Shield className="w-3 h-3 text-copper-600 fill-copper-600 flex-shrink-0" />
                  )}
                </div>
                {item.subtitle && !compact && (
                  <p className="font-ui text-xs text-stone-500 truncate mt-0.5">{item.subtitle}</p>
                )}
                {!isComplete && !compact && item.missingFields.length > 0 && (
                  <p className="font-mono text-[10px] text-amber-600 uppercase tracking-wider mt-1">
                    Missing: {item.missingFields.join(', ')}
                  </p>
                )}
              </div>

              <div className={`font-mono text-sm font-bold tabular-nums ${
                isComplete ? 'text-emerald-600' : percentage >= 67 ? 'text-amber-600' : 'text-stone-400'
              }`}>
                {percentage}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
