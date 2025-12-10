'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChefHat, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Chef {
  id: string;
  name: string;
  slug: string;
}

interface ChefSearchDropdownProps {
  onSelect: (chef: Chef | null) => void;
  selectedChef: Chef | null;
}

export function ChefSearchDropdown({ onSelect, selectedChef }: ChefSearchDropdownProps) {
  const [query, setQuery] = useState('');
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchChefs = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setChefs([]);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('chefs')
      .select('id, name, slug')
      .ilike('name', `%${searchQuery}%`)
      .order('name')
      .limit(10);

    if (!error && data) {
      setChefs(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchChefs(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, searchChefs]);

  useEffect(() => {
    if (isOpen && chefs.length > 0) {
      setHighlightedIndex(0);
    }
  }, [chefs, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < chefs.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (chefs[highlightedIndex]) {
          handleSelect(chefs[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (chef: Chef) => {
    onSelect(chef);
    setQuery('');
    setIsOpen(false);
    setChefs([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>
        
        <input
          type="text"
          value={selectedChef ? selectedChef.name : query}
          onChange={(e) => {
            if (selectedChef) {
              onSelect(null);
            }
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search for a chef..."
          className="w-full pl-11 pr-4 py-3 font-ui text-sm bg-white border-2 border-slate-200 rounded-lg focus:border-copper-500 focus:ring-4 focus:ring-copper-500/10 outline-none transition-all placeholder:text-slate-400"
        />

        {selectedChef && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
            }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && chefs.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-200 rounded-lg shadow-xl shadow-slate-200/50 max-h-64 overflow-y-auto">
          {chefs.map((chef, index) => (
            <button
              key={chef.id}
              type="button"
              onClick={() => handleSelect(chef)}
              className={`w-full px-4 py-3 text-left transition-colors border-b border-slate-100 last:border-b-0 ${
                index === highlightedIndex
                  ? 'bg-copper-50 border-l-4 border-l-copper-500'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  index === highlightedIndex ? 'bg-copper-100' : 'bg-slate-100'
                }`}>
                  <ChefHat className={`w-4 h-4 ${
                    index === highlightedIndex ? 'text-copper-600' : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-slate-900 truncate">
                    {chef.name}
                  </div>
                  <div className="font-mono text-xs text-slate-500 truncate">
                    /{chef.slug}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && !isLoading && chefs.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-200 rounded-lg shadow-xl shadow-slate-200/50 p-4">
          <div className="text-center">
            <div className="font-ui text-sm text-slate-500">
              No chefs found matching "{query}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
