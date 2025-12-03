import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { createStaticClient } from '@/lib/supabase/static';
import { ChefCard } from '@/components/chef/ChefCard';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';

export const revalidate = 604800;

interface ShowPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ShowPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const show = await db.getShow(slug);
    const chefCount = show.chef_shows?.length || 0;
    const restaurantCount = show.chef_shows?.reduce((sum: number, cs: any) => sum + (cs.chef.restaurant_count || 0), 0) || 0;

    return {
      title: `${show.name} Chefs & Restaurants | TV Chef Directory`,
      description: `Discover ${chefCount} chefs from ${show.name} and their ${restaurantCount} restaurants. Find where ${show.name} winners and contestants are cooking today.`,
      openGraph: {
        title: `${show.name} | TV Chef Restaurants`,
        description: `${chefCount} chefs • ${restaurantCount} restaurants`,
      },
    };
  } catch {
    return {
      title: 'Show Not Found',
    };
  }
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  
  const { data: shows } = await supabase
    .from('shows')
    .select('slug');

  return ((shows || []) as Array<{ slug: string }>).map(show => ({
    slug: show.slug,
  }));
}

export default async function ShowPage({ params }: ShowPageProps) {
  const { slug } = await params;
  
  let show;
  try {
    show = await db.getShow(slug);
  } catch {
    notFound();
  }

  const seasons: Array<{ season: string; season_name: string | null }> = await db.getShowSeasons(slug);
  const winners = show.chef_shows?.filter((cs: any) => cs.result === 'winner') || [];
  const finalists = show.chef_shows?.filter((cs: any) => cs.result === 'finalist') || [];
  const allChefs = show.chef_shows?.filter((cs: any) => cs.chef.restaurant_count > 0) || [];

  const totalRestaurants = allChefs.reduce((sum: number, cs: any) => sum + (cs.chef.restaurant_count || 0), 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
      <Header />
      <PageHero
        title={show.name}
        subtitle={show.network}
        breadcrumbItems={[
          { label: 'Shows', href: '/shows' },
          { label: show.name },
        ]}
        stats={[
          { value: allChefs.length, label: 'CHEFS' },
          { value: totalRestaurants, label: 'RESTAURANTS' },
          ...(seasons.length > 0 ? [{ value: seasons.length, label: 'SEASONS' }] : []),
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {seasons.length > 0 && (
          <div className="mb-12">
            <h2
              className="font-display text-2xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Browse by Season
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {seasons.map((season) => (
                <Link
                  key={season.season}
                  href={`/shows/${slug}/${season.season}`}
                  className="group relative bg-white p-4 text-center transition-all duration-300 hover:-translate-y-1"
                  style={{ border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
                    style={{ background: 'var(--accent-primary)' }}
                  />
                  <div
                    className="font-display text-2xl font-bold group-hover:text-[var(--accent-primary)] transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {season.season_name || `Season ${season.season}`}
                  </div>
                  <div
                    className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        {winners.length > 0 && (
          <div className="mb-12">
            <h2
              className="font-display text-2xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Winners
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {winners.map((cs: any, index: number) => (
                <ChefCard key={cs.chef.id} chef={cs.chef} index={index} />
              ))}
            </div>
          </div>
        )}

        {finalists.length > 0 && (
          <div className="mb-12">
            <h2
              className="font-display text-2xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Finalists
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {finalists.map((cs: any, index: number) => (
                <ChefCard key={cs.chef.id} chef={cs.chef} index={index} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-12">
          <h2
            className="font-display text-2xl font-bold mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            All Chefs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allChefs.map((cs: any, index: number) => (
              <ChefCard key={cs.chef.id} chef={cs.chef} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
