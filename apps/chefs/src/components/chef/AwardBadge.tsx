type AwardType = 
  | 'winner' 
  | 'james_beard_winner' 
  | 'james_beard_nominee' 
  | 'james_beard_semifinalist' 
  | 'finalist'
  | 'judge';

interface AwardBadgeProps {
  type: AwardType;
  size?: 'sm' | 'md';
}

export function AwardBadge({ type, size = 'md' }: AwardBadgeProps) {
  const fontSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  
  const getStyle = () => {
    switch (type) {
      case 'winner':
        return { background: 'var(--accent-success)', color: 'white' };
      case 'james_beard_winner':
        return { background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#ffffff' };
      case 'james_beard_nominee':
        return { background: '#1d4ed8', color: '#ffffff' };
      case 'james_beard_semifinalist':
        return { background: '#dbeafe', color: '#1e3a8a' };
      case 'finalist':
        return { background: '#f59e0b', color: 'white' };
      case 'judge':
        return { background: '#6366f1', color: 'white' };
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'winner':
        return 'WINNER';
      case 'james_beard_winner':
        return 'JAMES BEARD';
      case 'james_beard_nominee':
        return 'JB NOMINEE';
      case 'james_beard_semifinalist':
        return 'JB SEMIFINALIST';
      case 'finalist':
        return 'FINALIST';
      case 'judge':
        return 'JUDGE';
    }
  };

  const hasIcon = type === 'james_beard_winner' || type === 'james_beard_nominee';

  return (
    <span
      className={`font-mono ${fontSize} font-bold tracking-widest px-3 py-1.5 uppercase ${hasIcon ? 'flex items-center gap-1' : ''}`}
      style={getStyle()}
    >
      {hasIcon && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#fbbf24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
      {getLabel()}
    </span>
  );
}
