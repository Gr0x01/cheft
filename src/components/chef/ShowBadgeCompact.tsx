import { abbreviateShowName, formatSeasonDisplay, getShowType } from '@/lib/utils/showBadges';

interface ShowBadgeCompactProps {
  show?: { name: string } | null;
  season?: string | null;
  result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  hideSeason?: boolean;
}

export function ShowBadgeCompact({ show, season, result, hideSeason = false }: ShowBadgeCompactProps) {
  if (!show) return null;

  const showType = getShowType(show.name, result);
  const abbreviatedName = abbreviateShowName(show.name);
  const seasonDisplay = hideSeason ? null : formatSeasonDisplay(season);

  const getBackgroundColor = () => {
    if (result === 'winner') return 'var(--accent-success)';
    if (result === 'finalist') return '#f59e0b';
    if (result === 'judge') return '#6366f1';
    
    if (showType === 'competition') return 'var(--accent-primary)';
    if (showType === 'series') return 'var(--slate-700)';
    if (showType === 'hosting') return 'linear-gradient(135deg, var(--accent-primary), #d69e2e)';
    
    return 'rgba(255,255,255,0.1)';
  };

  const getTextColor = () => {
    if (result === 'winner' || result === 'finalist' || result === 'judge') return 'white';
    if (showType === 'competition') return '#0f0f0f';
    if (showType === 'series') return 'var(--accent-primary)';
    if (showType === 'hosting') return 'white';
    return 'rgba(255,255,255,0.7)';
  };

  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[9px] font-medium tracking-wide uppercase px-2 py-1 transition-all duration-200 hover:scale-105"
      style={{
        background: getBackgroundColor(),
        color: getTextColor(),
        height: '20px',
        whiteSpace: 'nowrap',
      }}
    >
      <span className="font-bold">{abbreviatedName}</span>
      {seasonDisplay && (
        <>
          <span style={{ opacity: 0.6 }}>•</span>
          <span>{seasonDisplay}</span>
        </>
      )}
    </span>
  );
}
