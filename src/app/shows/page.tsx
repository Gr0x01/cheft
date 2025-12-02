import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/supabase';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';

export const revalidate = 604800;

export const metadata: Metadata = {
  title: 'TV Cooking Shows | Chef Restaurants by Show',
  description: 'Browse restaurants by TV cooking shows including Top Chef, Iron Chef, Tournament of Champions, and more. Find where your favorite TV chefs cook.',
  openGraph: {
    title: 'TV Cooking Shows | Find Chef Restaurants',
    description: 'Discover restaurants from Top Chef, Iron Chef, Tournament of Champions, and other popular cooking competitions.',
  },
};

export default async function ShowsPage() {
  const shows = await db.getShowsWithCounts();

  const totalChefs = shows.reduce((sum: number, show: any) => sum + show.chef_count, 0);
  const totalRestaurants = shows.reduce((sum: number, show: any) => sum + show.restaurant_count, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />
      <PageHero
        title="TV Cooking Shows"
        subtitle="Browse restaurants by the TV shows that made these chefs famous. From Top Chef winners to Iron Chef competitors, find where the stars are cooking today."
        stats={[
          { value: shows.length, label: 'SHOWS' },
          { value: totalChefs, label: 'CHEFS' },
          { value: totalRestaurants, label: 'RESTAURANTS' },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shows.map((show: any) => (
            <Link
              key={show.id}
              href={`/shows/${show.slug}`}
              className="group relative bg-white p-6 transition-all duration-300 hover:-translate-y-1"
              style={{
                border: '1px solid var(--border-light)',
              }}
            >
              <div 
                className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
                style={{ background: 'var(--accent-primary)' }}
              />

              <div className="mb-4">
                <h2 
                  className="font-display text-2xl font-bold mb-2 group-hover:text-[var(--accent-primary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {show.name}
                </h2>
                {show.network && (
                  <p 
                    className="font-mono text-xs tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {show.network}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span 
                    className="font-mono text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Chefs
                  </span>
                  <span 
                    className="font-mono text-sm font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {show.chef_count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span 
                    className="font-mono text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Restaurants
                  </span>
                  <span 
                    className="font-mono text-sm font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {show.restaurant_count}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end">
                <span 
                  className="font-mono text-xs font-semibold tracking-wide transition-transform duration-200 group-hover:translate-x-1"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  VIEW SHOW →
                </span>
              </div>

              <div 
                className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
