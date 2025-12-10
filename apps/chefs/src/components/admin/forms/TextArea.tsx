'use client';

import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface TextAreaProps {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  minLength?: number;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      name,
      placeholder,
      required = false,
      error,
      helperText,
      value,
      onChange,
      disabled = false,
      rows = 4,
      maxLength,
      minLength,
    },
    ref
  ) => {
    const hasError = !!error;
    const charCount = value?.length || 0;
    const showCharCount = maxLength || minLength;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={name}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] font-medium text-stone-500"
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        
        <div className="relative">
          <textarea
            ref={ref}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={`
              w-full px-3 py-2 font-ui text-sm
              bg-white border-2
              transition-colors
              placeholder:text-stone-300
              disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed
              resize-y
              ${
                hasError
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-stone-200 focus:border-copper-600'
              }
              hover:border-stone-300
              focus:outline-none
            `}
          />
          
          {hasError && (
            <div className="absolute right-3 top-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          )}
        </div>

        {hasError && (
          <p className="font-mono text-[10px] text-red-600 uppercase tracking-wider">
            {error}
          </p>
        )}

        {helperText && !hasError && (
          <p className="font-ui text-xs text-stone-400">
            {helperText}
          </p>
        )}

        {showCharCount && !hasError && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] text-stone-400">
              {charCount} characters
            </p>
            {maxLength && (
              <p className="font-mono text-[10px] text-stone-400">
                {maxLength - charCount} remaining
              </p>
            )}
            {minLength && charCount < minLength && (
              <p className="font-mono text-[10px] text-amber-600">
                {minLength - charCount} more needed
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
