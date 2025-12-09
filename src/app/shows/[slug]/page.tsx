import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { ShowPageClient } from './ShowPageClient';

export const revalidate = 604800;

interface ShowPageProps {
  params: Promise<{ slug: string }>;
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
    return { title: 'Show Not Found' };
  }
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  
  const { data: shows } = await supabase
    .from('shows')
    .select('slug')
    .eq('is_public', true);

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

  const isVariant = show.parent_show_id !== null;
  const isCore = show.show_type === 'core' || (!show.parent_show_id && !show.show_type);
  
  const [seasons, childShows] = await Promise.all([
    db.getShowSeasons(slug),
    isCore ? db.getShowChildren(slug) : Promise.resolve([]),
  ]);

  const allChefs = show.chef_shows?.filter((cs: any) => cs.chef.restaurant_count > 0) || [];
  const totalRestaurants = allChefs.reduce((sum: number, cs: any) => sum + (cs.chef.restaurant_count || 0), 0);

  const chefData = allChefs.map((cs: any) => ({
    id: cs.chef.id,
    name: cs.chef.name,
    slug: cs.chef.slug,
    photo_url: cs.chef.photo_url,
    mini_bio: cs.chef.mini_bio,
    james_beard_status: cs.chef.james_beard_status,
    restaurant_count: cs.chef.restaurant_count || 0,
    has_michelin: false,
    source_show_slug: cs.source_show_slug,
    source_show_name: cs.source_show_name,
    chef_shows: [{
      show: { name: show.name, slug: show.slug },
      season: cs.season,
      result: cs.result,
      is_primary: cs.is_primary,
    }],
  }));

  const breadcrumbItems = isVariant && show.parent_show_slug
    ? [
        { label: 'Shows', href: '/shows' },
        { label: show.parent_show_name, href: `/shows/${show.parent_show_slug}` },
        { label: show.name },
      ]
    : [
        { label: 'Shows', href: '/shows' },
        { label: show.name },
      ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
      <Header />
      <PageHero
        title={show.name}
        subtitle={show.network}
        breadcrumbItems={breadcrumbItems}
        stats={[
          { value: allChefs.length, label: 'CHEFS' },
          { value: totalRestaurants, label: 'RESTAURANTS' },
          ...(seasons.length > 0 ? [{ value: seasons.length, label: 'SEASONS' }] : []),
        ]}
      />

      <ShowPageClient 
        chefs={chefData} 
        showSlug={slug} 
        seasons={seasons}
        childShows={childShows}
        parentInfo={isVariant && show.parent_show_slug ? {
          slug: show.parent_show_slug,
          name: show.parent_show_name,
        } : undefined}
      />
    </div>
  );
}
