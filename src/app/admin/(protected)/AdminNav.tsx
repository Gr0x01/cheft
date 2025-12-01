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
    <div className="ml-8 flex items-center gap-1">
      {navItems.map((item) => {
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
    </div>
  );
}