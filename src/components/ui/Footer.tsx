import Link from 'next/link';
import { getFooterData, FooterData } from '@/lib/footer-data';

interface FooterSectionProps {
  title: string;
  items: Array<{ href: string; label: string }>;
  viewAllHref: string;
  viewAllLabel: string;
}

function FooterSection({ title, items, viewAllHref, viewAllLabel }: FooterSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3
        className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase"
        style={{ color: 'var(--accent-primary)' }}
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="font-mono text-[11px] tracking-wide transition-colors hover:text-[var(--accent-primary)]"
              style={{ color: 'var(--text-muted)' }}
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="mt-1">
          <Link
            href={viewAllHref}
            className="font-mono text-[11px] tracking-wide transition-colors hover:text-[var(--accent-primary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {viewAllLabel} →
          </Link>
        </li>
      </ul>
    </div>
  );
}

function FooterContent({ data }: { data: FooterData }) {
  return (
    <footer
      className="py-12 border-t mt-auto"
      style={{ borderColor: 'var(--border-light)', background: 'var(--bg-secondary)' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-10">
          {/* States Section */}
          <FooterSection
            title="Top States"
            items={data.topStates.map((s) => ({
              href: `/states/${s.slug}`,
              label: s.name,
            }))}
            viewAllHref="/states"
            viewAllLabel="All States"
          />

          {/* Cities Section */}
          <FooterSection
            title="Top Cities"
            items={data.topCities.map((c) => ({
              href: `/cities/${c.slug}`,
              label: c.state ? `${c.name}, ${c.state}` : c.name,
            }))}
            viewAllHref="/cities"
            viewAllLabel="All Cities"
          />

          {/* Shows Section */}
          <FooterSection
            title="TV Shows"
            items={data.shows.map((s) => ({
              href: `/shows/${s.slug}`,
              label: s.name,
            }))}
            viewAllHref="/shows"
            viewAllLabel="All Shows"
          />

          {/* Chefs Section */}
          <FooterSection
            title="Featured Chefs"
            items={data.topChefs.map((c) => ({
              href: `/chefs/${c.slug}`,
              label: c.name,
            }))}
            viewAllHref="/chefs"
            viewAllLabel="All Chefs"
          />
        </div>

        {/* Bottom Bar */}
        <div
          className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight transition-colors hover:text-[var(--accent-primary)]"
            style={{ color: 'var(--text-primary)' }}
          >
            Cheft
          </Link>

          <div className="flex gap-6">
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

          <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Cheft
          </span>
        </div>
      </div>
    </footer>
  );
}

/**
 * Client-compatible footer component that receives data as props.
 * Use this in 'use client' components like HomePage.
 */
export function SuperFooterClient({ data }: { data: FooterData }) {
  return <FooterContent data={data} />;
}

/**
 * Server component footer that fetches its own data.
 * Use this in server-rendered pages.
 */
export async function Footer() {
  const data = await getFooterData();
  return <FooterContent data={data} />;
}
