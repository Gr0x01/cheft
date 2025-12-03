interface FloatingBadgeProps {
  type: 'winner' | 'james-beard' | 'finalist' | 'judge' | 'show';
  label: string;
  rotation?: number;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  tooltip?: string;
}

export function FloatingBadge({ type, label, rotation = 0, position, tooltip }: FloatingBadgeProps) {
  const getBackgroundStyle = () => {
    switch (type) {
      case 'winner':
        return 'var(--accent-success)';
      case 'james-beard':
        return 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
      case 'finalist':
        return '#f59e0b';
      case 'judge':
        return '#6366f1';
      case 'show':
        return 'rgba(255,255,255,0.9)';
      default:
        return 'var(--accent-primary)';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'james-beard':
        return '#78350f';
      case 'show':
        return 'var(--slate-900)';
      default:
        return 'white';
    }
  };

  return (
    <div
      className="floating-badge group/badge"
      style={{
        position: 'absolute',
        ...position,
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.3s ease',
        zIndex: 10,
      }}
      title={tooltip}
    >
      <span
        className="font-mono text-[10px] font-bold tracking-widest px-3 py-1.5 flex items-center gap-1 shadow-lg"
        style={{
          background: getBackgroundStyle(),
          color: getTextColor(),
          borderRadius: '6px',
          transition: 'all 0.3s ease',
        }}
      >
        {type === 'james-beard' && (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
        {label}
      </span>
      
      {tooltip && (
        <span
          className="absolute left-1/2 -translate-x-1/2 -top-12 opacity-0 group-hover/badge:opacity-100 
                     font-ui text-xs whitespace-nowrap px-3 py-2 pointer-events-none"
          style={{
            background: 'var(--slate-900)',
            color: 'white',
            borderRadius: '6px',
            transition: 'opacity 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {tooltip}
        </span>
      )}
    </div>
  );
}
