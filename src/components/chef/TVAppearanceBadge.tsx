import Link from 'next/link';

interface TVAppearanceBadgeProps {
  show: {
    name: string;
    slug?: string;
  };
  season?: string | null;
  result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  isPrimary?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TVAppearanceBadge({
  show,
  season,
  result,
  isPrimary,
}: TVAppearanceBadgeProps) {
  const resultStyles = {
    winner: { bg: 'var(--accent-success)', color: 'white' },
    finalist: { bg: '#f59e0b', color: 'white' },
    contestant: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
    judge: { bg: '#6366f1', color: 'white' },
  };

  const content = (
    <div
      className="relative p-4 transition-all duration-200 group"
      style={{ 
        background: 'var(--bg-secondary)',
        border: isPrimary ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
      }}
    >
      {/* Copper accent for primary */}
      {isPrimary && (
        <div 
          className="absolute top-0 left-0 w-1 h-full"
          style={{ background: 'var(--accent-primary)' }}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p 
            className="font-display text-lg font-bold"
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

      {isPrimary && (
        <span 
          className="inline-block mt-3 font-mono text-[10px] tracking-widest"
          style={{ color: 'var(--accent-primary)' }}
        >
          PRIMARY
        </span>
      )}
    </div>
  );

  return content;
}

interface TVAppearanceListProps {
  appearances: Array<{
    id?: string;
    show?: { name: string; slug?: string } | null;
    season?: string | null;
    result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary?: boolean;
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
        />
      ))}
    </div>
  );
}
