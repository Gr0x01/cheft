import Link from 'next/link';
import { sanitizeNarrative } from '@/lib/sanitize';

interface TVAppearanceBadgeProps {
  show: {
    name: string;
    slug?: string;
  };
  season?: string | null;
  result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  isPrimary?: boolean;
  performanceBlurb?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export function TVAppearanceBadge({
  show,
  season,
  result,
  isPrimary,
  performanceBlurb,
}: TVAppearanceBadgeProps) {
  const resultStyles = {
    winner: { bg: '#f59e0b', color: 'white' },
    finalist: { bg: '#94a3b8', color: 'white' },
    contestant: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
    judge: { bg: '#6366f1', color: 'white' },
  };

  const showUrl = show.slug && season 
    ? `/shows/${show.slug}/${season}`
    : show.slug 
    ? `/shows/${show.slug}` 
    : null;

  const content = (
    <div
      className="relative p-4 transition-all duration-200 group"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
      }}
    >
      {showUrl && (
        <div 
          className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p 
            className={`font-display text-lg font-bold ${showUrl ? 'group-hover:text-[var(--accent-primary)] transition-colors' : ''}`}
            style={{ color: 'var(--text-primary)' }}
          >
            {show.name}
          </p>
          {season && (
            <p 
              className="font-mono text-xs tracking-wide mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {season}
            </p>
          )}
          {performanceBlurb && (
            <p 
              className="font-ui text-sm leading-relaxed mt-2"
              style={{ color: 'var(--text-secondary)' }}
              aria-label={`Performance summary for ${show.name}`}
            >
              {sanitizeNarrative(performanceBlurb)}
            </p>
          )}
        </div>
        {result && (
          <span
            className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 flex-shrink-0"
            style={{ 
              background: resultStyles[result].bg,
              color: resultStyles[result].color
            }}
          >
            {result}
          </span>
        )}
      </div>
    </div>
  );

  if (showUrl) {
    return (
      <Link href={showUrl} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface TVAppearanceListProps {
  appearances: Array<{
    id?: string;
    show?: { name: string; slug?: string } | null;
    season?: string | null;
    result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary?: boolean;
    performance_blurb?: string | null;
  }>;
  className?: string;
}

export function TVAppearanceList({ appearances, className }: TVAppearanceListProps) {
  if (!appearances || appearances.length === 0) {
    return null;
  }

  const sortedAppearances = [...appearances].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    const resultOrder = { winner: 0, finalist: 1, judge: 2, contestant: 3 };
    const aOrder = a.result ? resultOrder[a.result] : 4;
    const bOrder = b.result ? resultOrder[b.result] : 4;
    return aOrder - bOrder;
  });

  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className || ''}`}>
      {sortedAppearances.map((appearance, index) => (
        <TVAppearanceBadge
          key={appearance.id || index}
          show={appearance.show || { name: 'Unknown Show' }}
          season={appearance.season}
          result={appearance.result}
          isPrimary={appearance.is_primary}
          performanceBlurb={appearance.performance_blurb}
        />
      ))}
    </div>
  );
}
