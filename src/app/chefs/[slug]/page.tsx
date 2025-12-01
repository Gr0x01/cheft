import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import { ChefHero } from '@/components/chef/ChefHero';
import { TVAppearanceList } from '@/components/chef/TVAppearanceBadge';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PersonSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';

interface ChefPageProps {
  params: Promise<{ slug: string }>;
}

interface ChefData {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  mini_bio: string | null;
  james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
  instagram_handle: string | null;
  current_position: string | null;
  social_links: { instagram?: string; twitter?: string; website?: string } | null;
  chef_shows: Array<{
    id: string;
    season: string | null;
    result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary: boolean;
    show: { name: string; slug: string } | null;
  }>;
  restaurants: Array<{
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string | null;
    price_tier: string | null;
    cuisine_tags: string[] | null;
    status: 'open' | 'closed' | 'unknown';
    google_rating: number | null;
    google_review_count: number | null;
  }>;
}

async function getChef(slug: string): Promise<ChefData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('chefs')
    .select(`
      id,
      name,
      slug,
      photo_url,
      mini_bio,
      james_beard_status,
      instagram_handle,
      current_position,
      social_links,
      chef_shows (
        id,
        season,
        result,
        is_primary,
        show:shows (name, slug)
      ),
      restaurants!restaurants_chef_id_fkey (
        id,
        name,
        slug,
        city,
        state,
        price_tier,
        cuisine_tags,
        status,
        google_rating,
        google_review_count
      )
    `)
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as ChefData;
}

export async function generateMetadata({ params }: ChefPageProps): Promise<Metadata> {
  const { slug } = await params;
  const chef = await getChef(slug);

  if (!chef) {
    return {
      title: 'Chef Not Found | ChefMap',
    };
  }

  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  const showInfo = primaryShow?.show?.name || 'TV Chef';
  const resultInfo = primaryShow?.result === 'winner' ? ' Winner' : '';
  const restaurantCount = chef.restaurants?.length || 0;

  const description = chef.mini_bio
    ? chef.mini_bio.substring(0, 160)
    : `${chef.name} is a ${showInfo}${resultInfo}. ${
        restaurantCount > 0
          ? `Owner of ${restaurantCount} restaurant${restaurantCount !== 1 ? 's' : ''}.`
          : ''
      }`;

  return {
    title: `${chef.name} - ${showInfo}${resultInfo} | ChefMap`,
    description,
    openGraph: {
      title: `${chef.name} - ${showInfo}${resultInfo}`,
      description,
      type: 'profile',
      images: chef.photo_url ? [chef.photo_url] : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${chef.name} - ${showInfo}${resultInfo}`,
      description,
      images: chef.photo_url ? [chef.photo_url] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  
  const { data: chefs } = await supabase
    .from('chefs')
    .select('slug')
    .limit(200);

  return ((chefs || []) as Array<{ slug: string }>).map(chef => ({
    slug: chef.slug,
  }));
}

export default async function ChefPage({ params }: ChefPageProps) {
  const { slug } = await params;
  const chef = await getChef(slug);

  if (!chef) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chefmap.com';
  const chefUrl = `${baseUrl}/chefs/${chef.slug}`;

  const awards: string[] = [];
  if (chef.james_beard_status === 'winner') awards.push('James Beard Award');
  if (chef.james_beard_status === 'nominated') awards.push('James Beard Nominee');
  
  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  if (primaryShow?.result === 'winner' && primaryShow.show?.name) {
    awards.push(`${primaryShow.show.name} Winner`);
  }

  const worksFor = chef.restaurants.map(r => ({
    name: r.name,
    url: `${baseUrl}/restaurants/${r.slug}`,
  }));

  const sameAs: string[] = [];
  if (chef.instagram_handle) sameAs.push(`https://instagram.com/${chef.instagram_handle}`);
  if (chef.social_links?.twitter) sameAs.push(`https://twitter.com/${chef.social_links.twitter}`);
  if (chef.social_links?.website) sameAs.push(chef.social_links.website);

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Chefs', url: `${baseUrl}/chefs` },
    { name: chef.name, url: chefUrl },
  ];

  const openRestaurants = chef.restaurants.filter(r => r.status === 'open');
  const closedRestaurants = chef.restaurants.filter(r => r.status === 'closed');

  return (
    <>
      <PersonSchema
        name={chef.name}
        description={chef.mini_bio}
        image={chef.photo_url}
        jobTitle="Chef"
        awards={awards}
        worksFor={worksFor}
        sameAs={sameAs}
        url={chefUrl}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
        <header 
          className="sticky top-0 z-50 border-b"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
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
                ChefMap
              </span>
            </Link>
            <nav className="flex gap-8">
              <Link 
                href="/chefs" 
                className="font-mono text-xs tracking-wider font-semibold"
                style={{ color: 'var(--accent-primary)' }}
              >
                CHEFS
              </Link>
              <Link 
                href="/restaurants" 
                className="font-mono text-xs tracking-wider transition-colors hover:text-[var(--accent-primary)]"
                style={{ color: 'var(--text-muted)' }}
              >
                RESTAURANTS
              </Link>
            </nav>
          </div>
        </header>

        <main>
          {/* Breadcrumbs */}
          <div className="max-w-6xl mx-auto px-4 pt-6">
            <Breadcrumbs
              items={[
                { label: 'Chefs', href: '/chefs' },
                { label: chef.name },
              ]}
            />
          </div>

          {/* Hero */}
          <ChefHero chef={chef} />

          {/* TV Appearances */}
          {chef.chef_shows && chef.chef_shows.length > 0 && (
            <section 
              className="border-b py-10"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <h2 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                  TV Appearances
                </h2>
                <TVAppearanceList appearances={chef.chef_shows} />
              </div>
            </section>
          )}

          {/* Open Restaurants */}
          {openRestaurants.length > 0 && (
            <section className="py-12">
              <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Restaurants
                  </h2>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    {openRestaurants.length} LOCATION{openRestaurants.length !== 1 ? 'S' : ''}
                  </span>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {openRestaurants.map(restaurant => (
                    <Link
                      key={restaurant.id}
                      href={`/restaurants/${restaurant.slug}`}
                      className="group relative block bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* Copper accent */}
                      <div 
                        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
                        style={{ background: 'var(--accent-primary)' }}
                      />
                      
                      <div className="p-5 pl-6">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h3 
                              className="font-display text-xl font-bold truncate transition-colors group-hover:text-[var(--accent-primary)]"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {restaurant.name}
                            </h3>
                            <p className="font-mono text-xs tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
                              {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
                            </p>
                          </div>
                          {restaurant.price_tier && (
                            <span 
                              className="font-mono text-sm font-bold flex-shrink-0"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              {restaurant.price_tier}
                            </span>
                          )}
                        </div>
                        
                        {restaurant.google_rating && (
                          <div className="mt-4 flex items-center gap-2">
                            <div className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                              <span className="font-mono text-sm font-bold">{restaurant.google_rating}</span>
                            </div>
                            {restaurant.google_review_count && (
                              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                ({restaurant.google_review_count.toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                        
                        {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {restaurant.cuisine_tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className="font-mono text-[10px] tracking-wide px-2 py-1"
                                style={{ 
                                  background: 'var(--bg-primary)', 
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-light)'
                                }}
                              >
                                {tag.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}

                        <div 
                          className="mt-4 pt-4 flex items-center justify-between border-t"
                          style={{ borderColor: 'var(--border-light)' }}
                        >
                          <span 
                            className="font-mono text-[10px] tracking-widest"
                            style={{ color: 'var(--accent-success)' }}
                          >
                            OPEN
                          </span>
                          <span 
                            className="font-mono text-xs font-semibold tracking-wide transition-transform group-hover:translate-x-1"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            VIEW →
                          </span>
                        </div>
                      </div>

                      {/* Hover border */}
                      <div className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Closed Restaurants */}
          {closedRestaurants.length > 0 && (
            <section 
              className="py-10 border-t"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <h2 
                  className="font-display text-xl font-semibold mb-6"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Closed Restaurants ({closedRestaurants.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {closedRestaurants.map(restaurant => (
                    <div
                      key={restaurant.id}
                      className="p-4 opacity-60"
                      style={{ background: 'white', border: '1px solid var(--border-light)' }}
                    >
                      <h3 
                        className="font-display text-lg line-through"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {restaurant.name}
                      </h3>
                      <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
                      </p>
                      <span 
                        className="inline-block mt-3 font-mono text-[10px] tracking-widest px-2 py-1"
                        style={{ background: '#fef2f2', color: '#dc2626' }}
                      >
                        CLOSED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
