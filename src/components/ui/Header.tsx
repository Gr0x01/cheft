'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface HeaderProps {
  currentPage?: 'chefs' | 'restaurants' | 'cities' | 'states' | 'countries' | 'shows' | 'about' | 'home';
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
            href="/shows"
            className={`font-mono text-xs tracking-wider transition-colors ${
              currentPage === 'shows'
                ? 'font-semibold'
                : 'hover:text-[var(--accent-primary)]'
            }`}
            style={{
              color: currentPage === 'shows'
                ? 'var(--accent-primary)'
                : 'var(--text-muted)'
            }}
            aria-current={currentPage === 'shows' ? 'page' : undefined}
          >
            SHOWS
          </Link>
          <div className="group relative -my-3 flex items-center">
            <button
              type="button"
              className={`flex items-center gap-1 font-mono text-xs tracking-wider transition-colors group-hover:text-[var(--accent-primary)] group-focus-within:text-[var(--accent-primary)] ${
                currentPage === 'cities' || currentPage === 'states' || currentPage === 'countries'
                  ? 'font-semibold'
                  : ''
              }`}
              style={{
                color: currentPage === 'cities' || currentPage === 'states' || currentPage === 'countries'
                  ? 'var(--accent-primary)'
                  : 'var(--text-muted)'
              }}
              aria-haspopup="true"
            >
              LOCATIONS
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              className="invisible absolute right-0 top-full z-50 w-40 translate-y-1 border opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              {[
                { href: '/cities', label: 'CITIES', page: 'cities' },
                { href: '/states', label: 'STATES', page: 'states' },
                { href: '/countries', label: 'COUNTRIES', page: 'countries' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block border-b px-4 py-3 font-mono text-xs tracking-wider transition-colors last:border-b-0 hover:bg-[var(--bg-primary)] hover:text-[var(--accent-primary)] focus-visible:bg-[var(--bg-primary)] focus-visible:text-[var(--accent-primary)] focus-visible:outline-none"
                  style={{
                    color: currentPage === item.page ? 'var(--accent-primary)' : 'var(--text-muted)',
                    borderColor: 'var(--border-light)',
                  }}
                  aria-current={currentPage === item.page ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
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
            isMobileMenuOpen ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
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
                href="/shows"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 font-mono text-sm tracking-wider transition-colors border-b ${
                  currentPage === 'shows' ? 'font-semibold' : ''
                }`}
                style={{
                  color: currentPage === 'shows' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  borderColor: 'var(--border-light)'
                }}
                aria-current={currentPage === 'shows' ? 'page' : undefined}
              >
                SHOWS
              </Link>
              {[
                { href: '/cities', label: 'CITIES', page: 'cities' },
                { href: '/states', label: 'STATES', page: 'states' },
                { href: '/countries', label: 'COUNTRIES', page: 'countries' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-4 font-mono text-sm tracking-wider transition-colors border-b ${
                    currentPage === item.page ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: currentPage === item.page ? 'var(--accent-primary)' : 'var(--text-muted)',
                    borderColor: 'var(--border-light)'
                  }}
                  aria-current={currentPage === item.page ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
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
