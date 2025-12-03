'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface HeaderProps {
  currentPage?: 'chefs' | 'restaurants' | 'cities' | 'home';
}

export function Header({ currentPage }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className="fixed top-0 left-0 right-0 border-b transition-shadow duration-200"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-light)',
        boxShadow: isScrolled ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
        zIndex: 9999
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div 
            className="w-8 h-8 flex items-center justify-center"
            style={{ background: 'var(--accent-primary)' }}
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Cheft
          </span>
        </Link>
        <nav className="flex gap-8">
          <Link 
            href="/chefs" 
            className={`font-mono text-xs tracking-wider transition-colors ${
              currentPage === 'chefs' 
                ? 'font-semibold' 
                : 'hover:text-[var(--accent-primary)]'
            }`}
            style={{ 
              color: currentPage === 'chefs' 
                ? 'var(--accent-primary)' 
                : 'var(--text-muted)' 
            }}
          >
            CHEFS
          </Link>
          <Link 
            href="/restaurants" 
            className={`font-mono text-xs tracking-wider transition-colors ${
              currentPage === 'restaurants' 
                ? 'font-semibold' 
                : 'hover:text-[var(--accent-primary)]'
            }`}
            style={{ 
              color: currentPage === 'restaurants' 
                ? 'var(--accent-primary)' 
                : 'var(--text-muted)' 
            }}
          >
            RESTAURANTS
          </Link>
          <Link 
            href="/cities" 
            className={`font-mono text-xs tracking-wider transition-colors ${
              currentPage === 'cities' 
                ? 'font-semibold' 
                : 'hover:text-[var(--accent-primary)]'
            }`}
            style={{ 
              color: currentPage === 'cities' 
                ? 'var(--accent-primary)' 
                : 'var(--text-muted)' 
            }}
          >
            CITIES
          </Link>
        </nav>
      </div>
    </header>
  );
}
