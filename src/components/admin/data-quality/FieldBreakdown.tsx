'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

export interface FieldStat {
  field: string;
  label: string;
  filled: number;
  total: number;
  percentage: number;
}

interface FieldBreakdownProps {
  title: string;
  fields: FieldStat[];
  onFieldClick?: (field: string) => void;
  onExportCSV?: () => void;
}

export function FieldBreakdown({
  title,
  fields,
  onFieldClick,
  onExportCSV,
}: FieldBreakdownProps) {
  const [sortField, setSortField] = useState<'field' | 'percentage'>('percentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isExpanded, setIsExpanded] = useState(true);

  const sortedFields = [...fields].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'percentage') {
      return (a.percentage - b.percentage) * multiplier;
    }
    return a.label.localeCompare(b.label) * multiplier;
  });

  const toggleSort = (field: 'field' | 'percentage') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-600" />
            )}
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-copper-500 rounded-full" />
              <h2 className="font-display text-xl font-bold text-slate-900">{title}</h2>
            </div>
          </button>
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-copper-500 hover:bg-copper-600 text-white rounded-lg font-mono text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th
                  onClick={() => toggleSort('field')}
                  className="px-6 py-4 text-left font-mono text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Field
                    {sortField === 'field' && (
                      <span className="text-copper-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left font-mono text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Progress
                </th>
                <th
                  onClick={() => toggleSort('percentage')}
                  className="px-6 py-4 text-left font-mono text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Completeness
                    {sortField === 'percentage' && (
                      <span className="text-copper-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left font-mono text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFields.map((field) => (
                <tr
                  key={field.field}
                  onClick={() => onFieldClick?.(field.field)}
                  className={`hover:bg-slate-50/50 transition-colors ${
                    onFieldClick ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="font-ui text-sm font-medium text-slate-900">
                      {field.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full max-w-xs">
                      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            field.percentage >= 80
                              ? 'bg-emerald-500'
                              : field.percentage >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${field.percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-mono text-lg font-bold ${
                        field.percentage >= 80
                          ? 'text-emerald-600'
                          : field.percentage >= 50
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {Math.round(field.percentage)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{field.filled}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      {field.total}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
