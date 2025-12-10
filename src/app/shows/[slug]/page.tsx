import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { ShowPageClient } from './ShowPageClient';
import { WinnersSpotlight } from '@/components/show/WinnersSpotlight';
import { ShowRestaurantMap } from '@/components/show/ShowRestaurantMap';
import { Footer } from '@/components/ui/Footer';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';

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
  
  const [seasons, childShows, winners, restaurantLocations, showStats] = await Promise.all([
    db.getShowSeasons(slug),
    isCore ? db.getShowChildren(slug) : Promise.resolve([]),
    db.getShowWinnersWithRestaurants(slug),
    db.getShowRestaurantLocations(slug),
    db.getShowStats(slug),
  ]);

  const allChefs = show.chef_shows?.filter((cs: any) => cs.chef.restaurant_count > 0) || [];
  const totalRestaurants = allChefs.reduce((sum: number, cs: any) => sum + (cs.chef.restaurant_count || 0), 0);

  const chefCitiesMap = new Map<string, string[]>();
  restaurantLocations.forEach(r => {
    const existing = chefCitiesMap.get(r.chef_name) || [];
    if (!existing.includes(r.city)) {
      existing.push(r.city);
      chefCitiesMap.set(r.chef_name, existing);
    }
  });

  const uniqueCities = [...new Set(restaurantLocations.map(r => r.city))].sort();

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
    cities: chefCitiesMap.get(cs.chef.name) || [],
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

  const statsArray = [
    { value: allChefs.length, label: 'CHEFS' },
    { value: showStats.totalRestaurants || totalRestaurants, label: 'RESTAURANTS' },
    { value: showStats.totalCities, label: 'CITIES' },
    ...(showStats.michelinStars > 0 ? [{ value: showStats.michelinStars, label: 'MICHELIN' }] : []),
  ];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const showUrl = `${baseUrl}/shows/${slug}`;

  const schemaBreadcrumbItems = isVariant && show.parent_show_slug
    ? [
        { name: 'Home', url: baseUrl },
        { name: 'Shows', url: `${baseUrl}/shows` },
        { name: show.parent_show_name, url: `${baseUrl}/shows/${show.parent_show_slug}` },
        { name: show.name, url: showUrl },
      ]
    : [
        { name: 'Home', url: baseUrl },
        { name: 'Shows', url: `${baseUrl}/shows` },
        { name: show.name, url: showUrl },
      ];

  return (
    <>
      <BreadcrumbSchema items={schemaBreadcrumbItems} />
      <ItemListSchema
        name={`${show.name} Chefs`}
        description={`${allChefs.length} chefs from ${show.name} and their ${totalRestaurants} restaurants`}
        url={showUrl}
        items={chefData.slice(0, 50).map((chef: { name: string; slug: string }, i: number) => ({
          name: chef.name,
          url: `${baseUrl}/chefs/${chef.slug}`,
          position: i + 1,
        }))}
      />
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
      <Header />
      <PageHero
        title={show.name}
        subtitle={show.network}
        breadcrumbItems={breadcrumbItems}
        stats={statsArray}
      />

      {winners.length > 0 && (
        <WinnersSpotlight winners={winners} showName={show.name} showSlug={slug} />
      )}

      {restaurantLocations.length > 0 && (
        <ShowRestaurantMap 
          restaurants={restaurantLocations} 
          showName={show.name}
          totalCities={showStats.totalCities}
        />
      )}

      <ShowPageClient 
        chefs={chefData} 
        showSlug={slug} 
        seasons={seasons}
        childShows={childShows}
        cities={uniqueCities}
        parentInfo={isVariant && show.parent_show_slug ? {
          slug: show.parent_show_slug,
          name: show.parent_show_name,
        } : undefined}
      />

      <Footer />
    </div>
    </>
  );
}
