import { Metadata } from 'next';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About - What is Cheft? | Cheft',
  description:
    'Learn about Cheft - a curated map of restaurants from Top Chef, Iron Chef, Tournament of Champions, and other chef-driven competitions.',
  openGraph: {
    title: 'About - What is Cheft? | Cheft',
    description:
      'Learn about Cheft - a curated map of restaurants from Top Chef, Iron Chef, Tournament of Champions, and other chef-driven competitions.',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
      <Header currentPage="about" />

      <PageHero
        title="About Cheft"
        subtitle="Connecting TV cooking competitions to real restaurants"
        breadcrumbItems={[{ label: 'About' }]}
      />

      <main className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        <div className="space-y-16">
          <section>
            <h2 className="font-display text-4xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              What is Cheft?
            </h2>
            <p className="font-ui text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A curated map of restaurants from Top Chef, Tournament of Champions, and other shows I like to watch. And probably award winners soon because I want to eat their food too.
            </p>
          </section>

          <section>
            <h2 className="font-display text-4xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Why does this exist?
            </h2>
            <p className="font-ui text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              You finish watching a chef cook something incredible, and then spend 20 minutes googling to figure out where they actually work. This site saves you that hassle. Everything's already organized and kept fresh.
            </p>
          </section>

          <section>
            <h2 className="font-display text-4xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              How does it work?
            </h2>
            <p className="font-ui text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The site pulls from public sources like show rosters, chef bios, and Google Places data, then organizes it all into a searchable database. Each restaurant page includes photos, ratings, and details to help you decide where to eat. Hopefully.
            </p>
          </section>

          <section>
            <h2 className="font-display text-4xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Who made this?
            </h2>
            <p className="font-ui text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Just a side project by someone who loves food, and cooking shows. Not affiliated with any TV network or production company.
            </p>
          </section>

          <section>
            <h2 className="font-display text-4xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              How often is the data updated?
            </h2>
            <p className="font-ui text-lg leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              Restaurant info is checked regularly for new openings, closures, and menu changes. If you see something off, submit a correction, por favor.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-sm font-bold tracking-wide transition-all duration-200 px-6 py-3"
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              EXPLORE RESTAURANTS
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
