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
          className="flex items-center gap-2 font-ui text-sm font-medium text-slate-700"
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
              w-full px-4 py-2.5 pr-10 font-mono text-sm
              bg-white border rounded-lg
              appearance-none
              transition-all duration-200
              disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
              ${
                hasError
                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-slate-300 focus:border-copper-500 focus:ring-2 focus:ring-copper-500/20'
              }
              hover:border-slate-400
              focus:outline-none
              ${!value ? 'text-slate-400' : 'text-slate-900'}
            `}
          >
            {allowEmpty && (
              <option value="" disabled={!allowEmpty}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-slate-900">
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
            {hasError && <AlertCircle className="w-5 h-5 text-red-500" />}
            <ChevronDown className={`w-5 h-5 ${hasError ? 'text-red-500' : 'text-slate-400'}`} />
          </div>
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
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
