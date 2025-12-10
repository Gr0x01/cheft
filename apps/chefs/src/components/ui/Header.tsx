'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface HeaderProps {
  currentPage?: 'chefs' | 'restaurants' | 'cities' | 'countries' | 'about' | 'home';
}

export function Header({ currentPage }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <a 
        href="#main-content" 
        className="skip-to-content"
      >
        Skip to main content
      </a>
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
        <Link href="/" className="flex items-center gap-3 group">
          <span className="font-display text-2xl font-900 tracking-tight leading-none" 
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Cheft
          </span>
          <span 
            className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase inline-block px-2 py-1 border transition-all duration-300 group-hover:!text-[#d35e0f] group-hover:!border-[#d35e0f]"
            style={{ 
              color: 'var(--text-muted)',
              borderColor: 'var(--border-light)'
            }}
          >
            Beta
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8" aria-label="Main navigation">
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
            aria-current={currentPage === 'chefs' ? 'page' : undefined}
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
            aria-current={currentPage === 'restaurants' ? 'page' : undefined}
          >
            RESTAURANTS
          </Link>
          <Link 
            href="/about" 
            className={`font-mono text-xs tracking-wider transition-colors ${
              currentPage === 'about' 
                ? 'font-semibold' 
                : 'hover:text-[var(--accent-primary)]'
            }`}
            style={{ 
              color: currentPage === 'about' 
                ? 'var(--accent-primary)' 
                : 'var(--text-muted)' 
            }}
            aria-current={currentPage === 'about' ? 'page' : undefined}
          >
            ABOUT
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: 'var(--text-primary)' }}
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        </div>

        {/* Mobile Navigation Menu */}
        <div 
          className={`md:hidden border-t overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
          style={{ 
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-light)'
          }}
        >
          <nav className="flex flex-col" aria-label="Mobile navigation">
              <Link 
                href="/chefs"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 font-mono text-sm tracking-wider transition-colors border-b ${
                  currentPage === 'chefs' ? 'font-semibold' : ''
                }`}
                style={{ 
                  color: currentPage === 'chefs' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  borderColor: 'var(--border-light)'
                }}
                aria-current={currentPage === 'chefs' ? 'page' : undefined}
              >
                CHEFS
              </Link>
              <Link 
                href="/restaurants"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 font-mono text-sm tracking-wider transition-colors border-b ${
                  currentPage === 'restaurants' ? 'font-semibold' : ''
                }`}
                style={{ 
                  color: currentPage === 'restaurants' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  borderColor: 'var(--border-light)'
                }}
                aria-current={currentPage === 'restaurants' ? 'page' : undefined}
              >
                RESTAURANTS
              </Link>
              <Link 
                href="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 font-mono text-sm tracking-wider transition-colors ${
                  currentPage === 'about' ? 'font-semibold' : ''
                }`}
                style={{ 
                  color: currentPage === 'about' ? 'var(--accent-primary)' : 'var(--text-muted)'
                }}
                aria-current={currentPage === 'about' ? 'page' : undefined}
              >
                ABOUT
              </Link>
            </nav>
        </div>
      </header>
    </>
  );
}
