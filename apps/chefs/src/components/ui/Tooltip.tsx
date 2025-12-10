'use client';

import { useState, useRef, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 500 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const positionStyles = position === 'top' 
    ? { bottom: '100%', marginBottom: '8px' }
    : { top: '100%', marginTop: '8px' };

  return (
    <span 
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <span
        className="absolute left-0 z-50 pointer-events-none font-ui text-xs whitespace-nowrap px-3 py-2"
        style={{
          ...positionStyles,
          background: 'white',
          color: 'var(--text-primary)',
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          border: '1px solid var(--accent-primary)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : (position === 'top' ? 'translateY(4px)' : 'translateY(-4px)'),
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        {content}
      </span>
    </span>
  );
}
