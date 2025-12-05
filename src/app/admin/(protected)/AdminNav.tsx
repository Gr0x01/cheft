'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ClipboardList, Users, ChevronDown, Activity, RefreshCw, Database } from 'lucide-react';

const primaryNav = [
  { href: '/admin/review', label: 'Review', icon: ClipboardList },
  { href: '/admin/entities', label: 'Entities', icon: Users },
];

const monitoringNav = [
  { href: '/admin/enrichment-jobs', label: 'Enrichment Jobs', icon: RefreshCw },
  { href: '/admin/activity', label: 'Activity Log', icon: Activity },
  { href: '/admin/data', label: 'Data Stats', icon: Database },
];

export function AdminNav() {
  const pathname = usePathname();
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMonitoringActive = monitoringNav.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMonitoringOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="ml-8 flex items-center gap-1">
      {primaryNav.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all font-ui',
              isActive
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setMonitoringOpen(!monitoringOpen)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all font-ui',
            isMonitoringActive
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          )}
        >
          Monitoring
          <ChevronDown className={clsx('w-4 h-4 transition-transform', monitoringOpen && 'rotate-180')} />
        </button>

        {monitoringOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
            {monitoringNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMonitoringOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors font-ui',
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}