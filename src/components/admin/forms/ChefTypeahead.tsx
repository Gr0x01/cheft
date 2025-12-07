'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChefHat, Loader2, X, Unlink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Chef {
  id: string;
  name: string;
  slug: string;
}

interface ChefTypeaheadProps {
  label?: string;
  value: string | null;
  chefName?: string;
  onChange: (chefId: string | null) => void;
  onUnlink?: () => void;
  showUnlink?: boolean;
  required?: boolean;
  error?: string;
}

export function ChefTypeahead({
  label = 'Chef',
  value,
  chefName,
  onChange,
  onUnlink,
  showUnlink = true,
  required = false,
  error,
}: ChefTypeaheadProps) {
  const [query, setQuery] = useState('');
  const [displayName, setDisplayName] = useState(chefName || '');
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chefName) {
      setDisplayName(chefName);
    }
  }, [chefName]);

  useEffect(() => {
    if (!value && !query) {
      setDisplayName('');
    }
  }, [value, query]);

  const searchChefs = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setChefs([]);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const sanitizedQuery = searchQuery.replace(/[%_\\]/g, '\\$&');

    const { data, error } = await supabase
      .from('chefs')
      .select('id, name, slug')
      .ilike('name', `%${sanitizedQuery}%`)
      .order('name')
      .limit(10);

    if (error) {
      console.error('Chef search error:', error);
    } else if (data) {
      setChefs(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query) {
        searchChefs(query);
      }
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
    onChange(chef.id);
    setDisplayName(chef.name);
    setQuery('');
    setIsOpen(false);
    setChefs([]);
  };

  const handleClear = () => {
    onChange(null);
    setDisplayName('');
    setQuery('');
    setChefs([]);
    inputRef.current?.focus();
  };

  const handleUnlink = () => {
    if (onUnlink) {
      onUnlink();
    } else {
      handleClear();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setDisplayName(newValue);
    setIsOpen(true);
    if (value && newValue !== chefName) {
      onChange(null);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] font-medium text-stone-500">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-stone-400" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={displayName || query}
              onChange={handleInputChange}
              onFocus={() => {
                if (query.length >= 2) setIsOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => setIsOpen(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type to search chefs..."
              className={`
                w-full pl-10 pr-10 py-2 font-ui text-sm
                bg-white border-2 transition-colors
                placeholder:text-stone-300
                hover:border-stone-300
                focus:outline-none
                ${error ? 'border-red-400 focus:border-red-500' : 'border-stone-200 focus:border-amber-600'}
                ${value ? 'bg-amber-50/50' : ''}
              `}
            />

            {(value || displayName) && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showUnlink && value && (
            <button
              type="button"
              onClick={handleUnlink}
              className="px-3 py-2 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
              title="Unlink chef from this restaurant"
            >
              <Unlink className="w-4 h-4" />
            </button>
          )}
        </div>

        {isOpen && chefs.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-stone-200 shadow-lg max-h-64 overflow-y-auto">
            {chefs.map((chef, index) => (
              <button
                key={chef.id}
                type="button"
                onClick={() => handleSelect(chef)}
                className={`w-full px-3 py-2 text-left transition-colors border-b border-stone-100 last:border-b-0 ${
                  index === highlightedIndex
                    ? 'bg-amber-50 border-l-4 border-l-amber-500'
                    : 'hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded ${
                      index === highlightedIndex ? 'bg-amber-100' : 'bg-stone-100'
                    }`}
                  >
                    <ChefHat
                      className={`w-3 h-3 ${
                        index === highlightedIndex ? 'text-amber-600' : 'text-stone-600'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-sm text-stone-900 truncate">
                      {chef.name}
                    </div>
                    <div className="font-mono text-[10px] text-stone-500 truncate">
                      /{chef.slug}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && query.length >= 2 && !isLoading && chefs.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-stone-200 shadow-lg p-3">
            <div className="text-center font-ui text-sm text-stone-500">
              No chefs found matching "{query}"
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="font-mono text-[10px] text-red-600 uppercase tracking-wider">
          {error}
        </p>
      )}
    </div>
  );
}
