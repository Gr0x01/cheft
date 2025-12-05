'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';

interface MultiInputProps {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  values?: string[];
  onChange?: (values: string[]) => void;
  disabled?: boolean;
  maxItems?: number;
  minItems?: number;
}

export function MultiInput({
  label,
  name,
  placeholder = 'Type and press Enter to add',
  required = false,
  error,
  helperText,
  values = [],
  onChange,
  disabled = false,
  maxItems,
  minItems,
}: MultiInputProps) {
  const [inputValue, setInputValue] = useState('');
  const hasError = !!error;
  const canAddMore = !maxItems || values.length < maxItems;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !canAddMore || disabled) return;
    
    if (trimmed.length > 200) {
      alert('Value is too long (max 200 characters)');
      return;
    }
    
    if (/[<>"'\\]/.test(trimmed)) {
      alert('Value contains invalid characters (< > " \' \\)');
      return;
    }
    
    if (!values.includes(trimmed)) {
      onChange?.([...values, trimmed]);
      setInputValue('');
    }
  };

  const removeItem = (index: number) => {
    if (disabled) return;
    const newValues = values.filter((_, i) => i !== index);
    onChange?.(newValues);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="flex items-center gap-2 font-ui text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          {values.map((value, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-sm text-slate-900"
            >
              <span>{value}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={disabled}
                className="p-0.5 hover:bg-slate-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Remove ${value}`}
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={name}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || !canAddMore}
            className={`
              w-full px-4 py-2.5 font-mono text-sm
              bg-white border rounded-lg
              transition-all duration-200
              placeholder:text-slate-400
              disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
              ${
                hasError
                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-slate-300 focus:border-copper-500 focus:ring-2 focus:ring-copper-500/20'
              }
              hover:border-slate-400
              focus:outline-none
            `}
          />
          {hasError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={addItem}
          disabled={disabled || !inputValue.trim() || !canAddMore}
          className="px-4 py-2.5 bg-copper-500 hover:bg-copper-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-ui font-medium"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {hasError && (
        <p className="font-ui text-sm text-red-600 flex items-center gap-1.5">
          {error}
        </p>
      )}

      {helperText && !hasError && (
        <p className="font-ui text-xs text-slate-500">
          {helperText}
        </p>
      )}

      <div className="flex items-center justify-between font-mono text-xs text-slate-400">
        <span>{values.length} {values.length === 1 ? 'item' : 'items'}</span>
        {maxItems && <span>{maxItems - values.length} remaining</span>}
        {minItems && values.length < minItems && (
          <span className="text-amber-600">{minItems - values.length} more needed</span>
        )}
      </div>
    </div>
  );
}
