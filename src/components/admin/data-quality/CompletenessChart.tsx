'use client';

import { useState } from 'react';

interface CompletenessChartProps {
  label: string;
  value: number;
  total: number;
  color: 'blue' | 'green' | 'amber' | 'copper';
  icon: React.ComponentType<{ className?: string }>;
  onDrillDown?: () => void;
}

export function CompletenessChart({
  label,
  value,
  total,
  color,
  icon: Icon,
  onDrillDown,
}: CompletenessChartProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const radius = 70;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorConfig = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      stroke: '#3b82f6',
      text: 'text-blue-600',
      hover: 'hover:border-blue-300',
    },
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      stroke: '#10b981',
      text: 'text-emerald-600',
      hover: 'hover:border-emerald-300',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      stroke: '#f59e0b',
      text: 'text-amber-600',
      hover: 'hover:border-amber-300',
    },
    copper: {
      bg: 'bg-copper-50',
      border: 'border-copper-200',
      stroke: '#B87333',
      text: 'text-copper-600',
      hover: 'hover:border-copper-300',
    },
  };

  const config = colorConfig[color];

  return (
    <div
      className={`bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 ${config.border} ${config.hover} p-6 transition-all ${
        onDrillDown ? 'cursor-pointer hover:shadow-lg' : ''
      }`}
      onClick={onDrillDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 ${config.bg} rounded-lg border ${config.border}`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>
        <h3 className="font-mono text-sm font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </h3>
      </div>

      <div className="flex items-center justify-center mb-4">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="#e2e8f0"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={config.stroke}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-mono text-4xl font-black text-slate-900">
            {Math.round(percentage)}
            <span className="text-2xl text-slate-400">%</span>
          </span>
        </div>
      </div>

      <div className="text-center">
        {isHovered && onDrillDown ? (
          <p className="font-ui text-sm font-medium text-copper-600">
            Click to view {total - value} missing →
          </p>
        ) : (
          <p className="font-mono text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{value}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-slate-600">{total}</span>
          </p>
        )}
      </div>
    </div>
  );
}
