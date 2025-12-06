'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

const primaryNav = [
  { href: '/admin/review', label: 'Review' },
  { href: '/admin/entities', label: 'Entities' },
];

const monitoringNav = [
  { href: '/admin/enrichment-jobs', label: 'Enrichment' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/data', label: 'Data' },
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
    <div className="ml-10 flex items-center gap-6">
      {primaryNav.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'font-mono text-xs uppercase tracking-[0.15em] py-1 border-b-2 transition-all',
              isActive
                ? 'text-stone-900 border-copper-600'
                : 'text-stone-400 border-transparent hover:text-stone-600'
            )}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setMonitoringOpen(!monitoringOpen)}
          className={clsx(
            'font-mono text-xs uppercase tracking-[0.15em] py-1 border-b-2 transition-all flex items-center gap-1.5',
            isMonitoringActive
              ? 'text-stone-900 border-copper-600'
              : 'text-stone-400 border-transparent hover:text-stone-600'
          )}
        >
          Monitoring
          <ChevronDown className={clsx('w-3 h-3 transition-transform', monitoringOpen && 'rotate-180')} />
        </button>

        {monitoringOpen && (
          <div className="absolute top-full left-0 mt-3 w-44 bg-white border-2 border-stone-900 py-1 z-50">
            {monitoringNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMonitoringOpen(false)}
                  className={clsx(
                    'block px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors',
                    isActive
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  )}
                >
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