import { ShowBadgeCompact } from './ShowBadgeCompact';
import { sortShowsByImportance } from '@/lib/utils/showBadges';

interface ShowBadgeStripProps {
  shows: Array<{
    show?: { name: string } | null;
    season?: string | null;
    result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary?: boolean;
  }>;
  maxVisible?: number;
  className?: string;
}

export function ShowBadgeStrip({ shows, maxVisible = 3, className = '' }: ShowBadgeStripProps) {
  if (!shows || shows.length === 0) return null;

  const sortedShows = sortShowsByImportance(shows);
  const secondaryShows = sortedShows.filter(s => !s.is_primary);
  
  if (secondaryShows.length === 0) return null;

  const visibleShows = secondaryShows.slice(0, maxVisible);
  const overflowCount = secondaryShows.length - maxVisible;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2 ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {visibleShows.map((show, index) => (
        <ShowBadgeCompact
          key={index}
          show={show.show}
          season={show.season}
          result={show.result}
        />
      ))}
      {overflowCount > 0 && (
        <span
          className="font-mono text-[9px] font-medium tracking-wide uppercase px-2 py-1"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--accent-primary)',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          +{overflowCount} MORE
        </span>
      )}
    </div>
  );
}
