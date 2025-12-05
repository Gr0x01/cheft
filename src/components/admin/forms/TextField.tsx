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
          className="flex items-center gap-2 font-ui text-sm font-medium text-slate-700"
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

        {maxLength && !hasError && (
          <p className="font-mono text-xs text-slate-400 text-right">
            {value?.toString().length || 0} / {maxLength}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';
