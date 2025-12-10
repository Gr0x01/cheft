'use client';

import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface TextFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'url' | 'number';
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  maxLength?: number;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      name,
      type = 'text',
      placeholder,
      required = false,
      error,
      helperText,
      value,
      onChange,
      disabled = false,
      maxLength,
    },
    ref
  ) => {
    const hasError = !!error;

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
          <input
            ref={ref}
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={`
              w-full px-3 py-2 font-ui text-sm
              bg-white border-2
              transition-colors
              placeholder:text-stone-300
              disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="w-4 h-4 text-red-500" />
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

        {maxLength && !hasError && (
          <p className="font-mono text-[10px] text-stone-400 text-right">
            {value?.toString().length || 0} / {maxLength}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';
