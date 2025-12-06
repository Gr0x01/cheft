import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const parentItem = items.length > 0 ? items[items.length - 2] || items[0] : null;
  const hasParent = parentItem && parentItem.href;

  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
      {/* Mobile: Show only parent link with back arrow */}
      {hasParent && (
        <div className="md:hidden">
          <Link
            href={parentItem.href!}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-copper-500 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>{parentItem.label}</span>
          </Link>
        </div>
      )}

      {/* Desktop: Show full breadcrumb trail */}
      <ol className="hidden md:flex items-center gap-2">
        <li>
          <Link
            href="/"
            className="text-slate-500 hover:text-copper-500 transition-colors"
          >
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            {item.href ? (
              <Link
                href={item.href}
                className="text-slate-500 hover:text-copper-500 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
