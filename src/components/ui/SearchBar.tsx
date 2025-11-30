'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onSearch?: (query: string) => void;
  onChange?: (value: string) => void;
  suggestions?: string[];
  size?: 'md' | 'lg';
  showSearchButton?: boolean;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ 
    className, 
    onSearch, 
    onChange, 
    suggestions = [], 
    size = 'lg', 
    showSearchButton = true,
    placeholder = "Tell us what you're looking for...",
    ...props 
  }, ref) => {
    const [value, setValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const composedRef = ref || inputRef;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onChange?.(newValue);
      setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim()) {
        onSearch?.(value.trim());
        setShowSuggestions(false);
      }
    };

    const handleSuggestionClick = (suggestion: string) => {
      setValue(suggestion);
      onSearch?.(suggestion);
      setShowSuggestions(false);
      if (typeof composedRef === 'object' && composedRef?.current) {
        composedRef.current.focus();
      }
    };

    const baseClasses = 'w-full rounded-lg focus:outline-none transition-all duration-300';
    
    const sizeClasses = {
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-4 text-lg md:h-14 md:px-6'
    };

    return (
      <div className="relative w-full">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={composedRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(value.length > 0 && suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={placeholder}
            className={cn(
              baseClasses,
              sizeClasses[size],
              showSearchButton && 'pr-20',
              className
            )}
            style={{
              backgroundColor: 'rgba(26, 26, 26, 0.8)',
              borderColor: 'rgba(212, 175, 55, 0.3)',
              borderWidth: '2px',
              borderStyle: 'solid',
              color: '#f8f8f2',
              backdropFilter: 'blur(16px)'
            }}
            {...props}
          />
          
          {showSearchButton && (
            <Button
              type="submit"
              size={size === 'lg' ? 'md' : 'sm'}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              Search
            </Button>
          )}
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-2xl z-10 max-h-48 overflow-y-auto backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(26, 26, 26, 0.95)',
              border: '1px solid rgba(212, 175, 55, 0.3)'
            }}
          >
            {suggestions.slice(0, 5).map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left focus:outline-none first:rounded-t-lg last:rounded-b-lg transition-all duration-200"
                style={{
                  color: 'rgba(248, 248, 242, 0.8)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
                  e.target.style.color = '#d4af37';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'rgba(248, 248, 242, 0.8)';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export { SearchBar };
export type { SearchBarProps };