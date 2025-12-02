import Link from 'next/link';
import { ReactNode } from 'react';

interface FilterOption {
  href: string;
  label: string;
  icon?: ReactNode;
  isActive: boolean;
  variant?: 'default' | 'success' | 'warning';
}

interface FilterBarProps {
  searchPlaceholder: string;
  searchDefaultValue?: string;
  filterOptions: FilterOption[];
}

export function FilterBar({ searchPlaceholder, searchDefaultValue, filterOptions }: FilterBarProps) {
  const getVariantStyles = (variant: FilterOption['variant'], isActive: boolean) => {
    if (!isActive) {
      return {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: `2px solid var(--border-light)`
      };
    }

    switch (variant) {
      case 'success':
        return {
          background: 'var(--accent-success)',
          color: 'white',
          border: `2px solid var(--accent-success)`
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100())',
          color: '#78350f',
          border: '2px solid #f59e0b'
        };
      default:
        return {
          background: 'var(--accent-primary)',
          color: 'white',
          border: `2px solid var(--accent-primary)`
        };
    }
  };

  return (
    <section className="border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <form className="w-full lg:w-auto lg:min-w-[300px]">
            <div className="relative">
              <input
                type="search"
                name="q"
                placeholder={searchPlaceholder}
                defaultValue={searchDefaultValue || ''}
                className="w-full h-11 pl-11 pr-4 font-ui text-sm border-2 transition-colors focus:outline-none"
                style={{ 
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option, index) => (
              <Link
                key={index}
                href={option.href}
                className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all flex items-center gap-1.5"
                style={getVariantStyles(option.variant, option.isActive)}
              >
                {option.icon}
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
