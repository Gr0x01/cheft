'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FieldSectionProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function FieldSection({
  title,
  description,
  icon: Icon,
  defaultOpen = true,
  children,
}: FieldSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-2 border-stone-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon className="w-4 h-4 text-stone-400" />
          )}
          <div className="text-left">
            <h3 className="font-mono text-xs uppercase tracking-[0.15em] font-semibold text-stone-900">
              {title}
            </h3>
            {description && (
              <p className="font-ui text-xs text-stone-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="p-1">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-5 py-5 border-t-2 border-stone-200 bg-stone-50">
          <div className="space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
