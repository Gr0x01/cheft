'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const navItems = [
  { href: '/admin/review', label: 'Review Queue' },
  { href: '/admin/activity', label: 'Activity Log' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="ml-10 flex items-center space-x-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            'px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === item.href || pathname.startsWith(item.href + '/')
              ? 'bg-gray-900 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
