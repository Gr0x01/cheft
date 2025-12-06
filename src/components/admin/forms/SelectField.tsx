'use client';

import { forwardRef } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  name: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      label,
      name,
      options,
      placeholder = 'Select an option',
      required = false,
      error,
      helperText,
      value,
      onChange,
      disabled = false,
      allowEmpty = true,
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
          <select
            ref={ref}
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
            className={`
              w-full px-3 py-2 pr-10 font-ui text-sm
              bg-white border-2
              appearance-none
              transition-colors
              disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed
              ${
                hasError
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-stone-200 focus:border-copper-600'
              }
              hover:border-stone-300
              focus:outline-none
              ${!value ? 'text-stone-400' : 'text-stone-900'}
            `}
          >
            {allowEmpty && (
              <option value="" disabled={!allowEmpty}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-stone-900">
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
            {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
            <ChevronDown className={`w-4 h-4 ${hasError ? 'text-red-500' : 'text-stone-400'}`} />
          </div>
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
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
