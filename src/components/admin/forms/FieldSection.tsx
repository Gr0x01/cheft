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
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-copper-50 rounded-lg">
              <Icon className="w-5 h-5 text-copper-600" />
            </div>
          )}
          <div className="text-left">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              {title}
            </h3>
            {description && (
              <p className="font-ui text-sm text-slate-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-6 py-5 border-t border-slate-200/80 bg-slate-50/30">
          <div className="space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
