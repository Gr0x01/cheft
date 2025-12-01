'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ClipboardList, Activity } from 'lucide-react';

const navItems = [
  { href: '/admin/review', label: 'Review Queue', icon: ClipboardList },
  { href: '/admin/activity', label: 'Activity Log', icon: Activity },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="ml-12 flex items-center space-x-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 font-ui',
              isActive
                ? 'bg-copper-100 text-copper-800 border-2 border-copper-200 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}