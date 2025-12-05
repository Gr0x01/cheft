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
          className="flex items-center gap-2 font-ui text-sm font-medium text-slate-700"
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
              w-full px-4 py-2.5 font-mono text-sm
              bg-white border rounded-lg
              transition-all duration-200
              placeholder:text-slate-400
              disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
              resize-y
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
            <div className="absolute right-3 top-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          )}
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

        {showCharCount && !hasError && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-slate-400">
              {charCount} characters
            </p>
            {maxLength && (
              <p className="font-mono text-xs text-slate-400">
                {maxLength - charCount} remaining
              </p>
            )}
            {minLength && charCount < minLength && (
              <p className="font-mono text-xs text-amber-600">
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
