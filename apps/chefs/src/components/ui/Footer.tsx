import Link from 'next/link';

export function Footer() {
  return (
    <footer 
      className="py-8 border-t"
      style={{ borderColor: 'var(--border-light)' }}
    >
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
        <Link
          href="/about"
          className="font-mono text-[11px] tracking-wider transition-colors hover:text-[var(--accent-primary)]"
          style={{ color: 'var(--text-muted)' }}
        >
          ABOUT
        </Link>
        <Link
          href="/privacy"
          className="font-mono text-[11px] tracking-wider transition-colors hover:text-[var(--accent-primary)]"
          style={{ color: 'var(--text-muted)' }}
        >
          PRIVACY
        </Link>
      </div>
    </footer>
  );
}
