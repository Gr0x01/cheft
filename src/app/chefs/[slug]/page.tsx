import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ReportIssueButton } from '@/components/feedback/ReportIssueButton';
import { ChefCard } from '@/components/chef/ChefCard';
import { PersonSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { sanitizeNarrative } from '@/lib/sanitize';
import { InstagramEmbed } from '@/components/chef/InstagramEmbed';
import { getStorageUrl } from '@/lib/utils/storage';
import { MichelinStar } from '@/components/icons/MichelinStar';
import { RestaurantMiniCard } from '@/components/restaurant/RestaurantMiniCard';
import { ChefPageView } from '@/components/analytics/PostHogPageView';
import { Tooltip } from '@/components/ui/Tooltip';

interface ChefPageProps {
  params: Promise<{ slug: string }>;
}

interface ChefData {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  photo_source: 'wikipedia' | 'manual' | null;
  mini_bio: string | null;
  career_narrative: string | null;
  james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
  instagram_handle: string | null;
  featured_instagram_post: string | null;
  current_position: string | null;
  social_links: { instagram?: string; twitter?: string; website?: string } | null;
  updated_at: string;
  chef_shows: Array<{
    id: string;
    season: string | null;
    result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary: boolean;
    show_id: string;
    performance_blurb: string | null;
    show: { name: string; slug: string; is_public: boolean | null } | null;
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
    photo_urls: string[] | null;
    michelin_stars?: number | null;
  }>;
}

async function getChef(slug: string): Promise<ChefData | null> {
  try {
    const supabase = createStaticClient();

    const { data, error} = await supabase
      .from('chefs')
      .select(`
        id,
        name,
        slug,
        photo_url,
        photo_source,
        mini_bio,
        career_narrative,
        james_beard_status,
        instagram_handle,
        featured_instagram_post,
        current_position,
        social_links,
        updated_at,
        chef_shows (
          id,
          season,
          result,
          is_primary,
          show_id,
          performance_blurb,
          show:shows (name, slug, is_public)
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
          google_review_count,
          photo_urls,
          michelin_stars
        )
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return null;
    }

    return data as unknown as ChefData;
  } catch {
    return null;
  }
}

async function getRelatedChefs(chef: ChefData) {
  const supabase = createStaticClient();
  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  const cities = [...new Set(chef.restaurants.map(r => r.city))];
  const relatedChefs = new Map();

  if (primaryShow?.show_id) {
    const { data: showChefs } = await supabase
      .from('chef_shows')
      .select(`
        chef:chefs (
          id, name, slug, photo_url, james_beard_status,
          chef_shows (result, show:shows(name))
        ),
        season
      `)
      .eq('show_id', primaryShow.show_id)
      .limit(20);

    showChefs?.forEach((item: any) => {
      if (item.chef && item.chef.id !== chef.id) {
        relatedChefs.set(item.chef.id, item.chef);
      }
    });
  }

  if (cities.length > 0 && relatedChefs.size < 8) {
    const { data: cityChefs } = await supabase
      .from('restaurants')
      .select(`
        chef:chefs (
          id, name, slug, photo_url, james_beard_status,
          chef_shows (result, show:shows(name))
        )
      `)
      .in('city', cities)
      .eq('is_public', true)
      .limit(20);

    cityChefs?.forEach((item: any) => {
      if (item.chef && item.chef.id !== chef.id && relatedChefs.size < 8) {
        relatedChefs.set(item.chef.id, item.chef);
      }
    });
  }

  return Array.from(relatedChefs.values()).slice(0, 8);
}

export async function generateMetadata({ params }: ChefPageProps): Promise<Metadata> {
  const { slug } = await params;
  const chef = await getChef(slug);

  if (!chef) {
    return { title: 'Chef Not Found | Cheft' };
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
    title: `${chef.name} - ${showInfo}${resultInfo} | Cheft`,
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
  const chefData = await getChef(slug);

  if (!chefData) {
    notFound();
  }

  const chef = chefData;
  const relatedChefs = await getRelatedChefs(chef);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
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

  const openRestaurants = chef.restaurants
    .filter(r => r.status === 'open')
    .sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0));
  const closedRestaurants = chef.restaurants.filter(r => r.status === 'closed');
  
  const featuredRestaurant = openRestaurants[0];
  const otherRestaurants = openRestaurants.slice(1);

  const sortedShows = [...(chef.chef_shows || [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    const resultOrder = { winner: 0, finalist: 1, judge: 2, contestant: 3 };
    return (resultOrder[a.result || 'contestant'] || 4) - (resultOrder[b.result || 'contestant'] || 4);
  });

  const cuisineTags = [...new Set(chef.restaurants.flatMap(r => r.cuisine_tags || []))].slice(0, 5);
  const hasMichelinStars = chef.restaurants.some(r => r.michelin_stars && r.michelin_stars > 0);

  return (
    <>
      <ChefPageView
        chefName={chef.name}
        chefSlug={chef.slug}
        restaurantCount={chef.restaurants.length}
        jamesBeardStatus={chef.james_beard_status}
        hasMichelinStars={hasMichelinStars}
      />
      <PersonSchema
        name={chef.name}
        description={chef.mini_bio}
        image={chef.photo_url}
        jobTitle="Chef"
        awards={awards}
        worksFor={worksFor}
        sameAs={sameAs}
        url={chefUrl}
        dateModified={chef.updated_at}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header currentPage="chefs" />

        <main>
          {/* Text-Forward Hero - No Photo Dependency */}
          <section className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--accent-primary)' }} />

            <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">
              <div className="flex items-start justify-between gap-4 mb-8">
                <Breadcrumbs
                  items={[
                    { label: 'Chefs', href: '/chefs' },
                    { label: chef.name },
                  ]}
                  className="[&_a]:text-white/50 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/30"
                />
                <ReportIssueButton
                  entityType="chef"
                  entityId={chef.id}
                  entityName={chef.name}
                  variant="header"
                />
              </div>

              {/* James Beard Badge - Above Name */}
              {chef.james_beard_status && (
                <div className="mb-4">
                  {chef.james_beard_status === 'winner' && (
                    <span 
                      className="font-mono text-xs font-bold tracking-widest px-4 py-2 inline-flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: 'white' }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#fbbf24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      JAMES BEARD AWARD
                    </span>
                  )}
                  {chef.james_beard_status === 'nominated' && (
                    <span 
                      className="font-mono text-xs font-bold tracking-widest px-4 py-2"
                      style={{ background: '#1d4ed8', color: 'white' }}
                    >
                      JB NOMINEE
                    </span>
                  )}
                  {chef.james_beard_status === 'semifinalist' && (
                    <span 
                      className="font-mono text-xs tracking-widest px-4 py-2"
                      style={{ background: '#dbeafe', color: '#1e3a8a' }}
                    >
                      JB SEMIFINALIST
                    </span>
                  )}
                </div>
              )}

              {/* Giant Name - The Hero Element */}
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.9] tracking-tight mb-6">
                {chef.name}
              </h1>

              {/* Stats Row */}
              <div className="flex items-center gap-8 mb-8">
                {openRestaurants.length > 0 && (
                  <div>
                    <span className="font-display text-4xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                      {openRestaurants.length}
                    </span>
                    <span className="font-mono text-xs tracking-widest text-white/50 ml-2">
                      RESTAURANT{openRestaurants.length !== 1 ? 'S' : ''}
                    </span>
                  </div>
                )}
                {sortedShows.length > 0 && (
                  <div>
                    <span className="font-display text-4xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                      {sortedShows.length}
                    </span>
                    <span className="font-mono text-xs tracking-widest text-white/50 ml-2">
                      TV SHOW{sortedShows.length !== 1 ? 'S' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Mini Bio */}
              {chef.mini_bio && (
                <p className="font-ui text-lg leading-relaxed max-w-3xl text-white/75">
                  {chef.mini_bio}
                </p>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'var(--accent-primary)' }} />
          </section>


          {/* TV Appearances - Wrapping Layout */}
          {sortedShows.length > 0 && (
            <div 
              className="py-6 border-b"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    TV CREDITS
                  </span>
                  <div className="w-px h-5" style={{ background: 'var(--border-light)' }} />
                  {sortedShows.map((appearance, idx) => {
                    const isPublic = appearance.show?.is_public !== false;
                    const showUrl = isPublic && appearance.show?.slug && appearance.season 
                      ? `/shows/${appearance.show.slug}/${appearance.season}`
                      : isPublic && appearance.show?.slug 
                      ? `/shows/${appearance.show.slug}` 
                      : null;
                    
                    const content = (
                      <>
                        <span 
                          className="font-mono text-sm font-bold"
                          style={{ color: isPublic ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                        >
                          {appearance.show?.name || ''}
                        </span>
                        {appearance.season && (
                          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                            {appearance.season.replace('Season ', 'S')}
                          </span>
                        )}
                        {appearance.result && appearance.result !== 'contestant' && (
                          <span 
                            className="font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 uppercase"
                            style={{ 
                              background: isPublic 
                                ? (appearance.result === 'winner' ? '#f59e0b' : 
                                   appearance.result === 'finalist' ? '#0284C7' : '#7C3AED')
                                : 'var(--text-muted)',
                              color: 'white'
                            }}
                          >
                            {appearance.result === 'winner' ? 'W' : appearance.result === 'finalist' ? 'F' : 'J'}
                          </span>
                        )}
                      </>
                    );
                    
                    return showUrl ? (
                      <Link
                        key={appearance.id || idx}
                        href={showUrl}
                        className="flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-black/5 rounded"
                        style={{ background: 'white', border: '1px solid var(--border-light)' }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <Tooltip key={appearance.id || idx} content="Not yet in our database">
                        <span
                          className="flex items-center gap-2 px-3 py-1.5 rounded cursor-default"
                          style={{ 
                            background: 'var(--bg-tertiary)', 
                            border: '1px dashed var(--border-light)',
                            opacity: 0.6
                          }}
                        >
                          {content}
                        </span>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Featured Restaurant - Hero Treatment */}
          {featuredRestaurant && (
            <section className="py-16" style={{ background: 'var(--bg-primary)' }}>
              <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Restaurants
                  </h2>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    {openRestaurants.length} LOCATION{openRestaurants.length !== 1 ? 'S' : ''}
                  </span>
                </div>

                {/* Featured Restaurant - Large */}
                <Link 
                  href={`/restaurants/${featuredRestaurant.slug}`}
                  className="group block mb-8"
                >
                  <div 
                    className="grid md:grid-cols-2 gap-0 overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
                  >
                    <div className="relative h-64 md:h-80 overflow-hidden">
                      {featuredRestaurant.photo_urls?.[0] ? (
                        <Image
                          src={getStorageUrl('restaurant-photos', featuredRestaurant.photo_urls[0]) || ''}
                          alt={featuredRestaurant.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority
                        />
                      ) : (
                        <div 
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'var(--slate-900)' }}
                        >
                          <svg className="w-20 h-20" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z" />
                          </svg>
                        </div>
                      )}
                      {featuredRestaurant.michelin_stars && featuredRestaurant.michelin_stars > 0 && (
                        <div className="absolute top-4 right-4">
                          <div className="flex items-center gap-1 px-3 py-1.5" style={{ background: '#D3072B' }}>
                            {Array.from({ length: featuredRestaurant.michelin_stars }).map((_, i) => (
                              <MichelinStar key={i} size={14} className="text-white" />
                            ))}
                          </div>
                        </div>
                      )}
                      <div 
                        className="absolute top-0 left-0 w-1.5 h-full"
                        style={{ background: 'var(--accent-primary)' }}
                      />
                    </div>
                    <div className="p-8 flex flex-col justify-center">
                      <span className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--accent-primary)' }}>
                        FEATURED
                      </span>
                      <h3 
                        className="font-display text-3xl font-bold mb-2 group-hover:text-[var(--accent-primary)] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {featuredRestaurant.name}
                      </h3>
                      <p className="font-mono text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                        {featuredRestaurant.city}{featuredRestaurant.state ? `, ${featuredRestaurant.state}` : ''}
                      </p>
                      {featuredRestaurant.google_rating && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                            <span className="font-mono text-lg font-bold">{featuredRestaurant.google_rating}</span>
                          </div>
                          {featuredRestaurant.google_review_count && (
                            <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                              ({featuredRestaurant.google_review_count.toLocaleString()} reviews)
                            </span>
                          )}
                          {featuredRestaurant.price_tier && (
                            <>
                              <span style={{ color: 'var(--text-muted)' }}>•</span>
                              <span className="font-mono text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>
                                {featuredRestaurant.price_tier}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      {featuredRestaurant.cuisine_tags && featuredRestaurant.cuisine_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {featuredRestaurant.cuisine_tags.slice(0, 4).map((tag, i) => (
                            <span
                              key={i}
                              className="font-mono text-[10px] tracking-wide px-2 py-1"
                              style={{ 
                                background: 'var(--bg-tertiary)', 
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-light)'
                              }}
                            >
                              {tag.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-6">
                        <span 
                          className="font-mono text-xs font-semibold tracking-wide group-hover:translate-x-2 inline-block transition-transform"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          VIEW DETAILS →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {otherRestaurants.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {otherRestaurants.map((restaurant) => (
                      <RestaurantMiniCard key={restaurant.id} restaurant={restaurant} bordered />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Two-Column Story + Sidebar */}
          {chef.career_narrative && (
            <article
              className="py-16"
              style={{ background: 'var(--bg-secondary)' }}
              aria-label={`Career narrative for ${chef.name}`}
            >
              <div className="max-w-6xl mx-auto px-4">
                <div className="grid lg:grid-cols-3 gap-12">
                  {/* Main Story Column */}
                  <div className="lg:col-span-2">
                    <div className="prose prose-lg max-w-none">
                      {(() => {
                        try {
                          const sanitized = sanitizeNarrative(chef.career_narrative!);
                          const paragraphs = sanitized.split('\n\n').filter(p => p.trim());
                          if (paragraphs.length === 0) return null;

                          // SEO-optimized headings for 3-part narrative
                          const showName = primaryShow?.show?.name
                            ? sanitizeNarrative(primaryShow.show.name)
                            : null;
                          const headingIds = ['culinary-roots', 'rise-to-fame', 'where-to-dine'];
                          const headings = [
                            'Culinary Roots',
                            showName ? `Rise to Fame on ${showName}` : 'Rise to Fame',
                            'Where to Dine Today'
                          ];

                          return paragraphs.map((paragraph, index) => (
                            <section
                              key={index}
                              className="mb-8 last:mb-0"
                              aria-labelledby={index < headingIds.length ? headingIds[index] : undefined}
                            >
                              {index < headings.length && (
                                <h2
                                  id={headingIds[index]}
                                  className="font-display text-2xl font-bold mb-4"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {headings[index]}
                                </h2>
                              )}
                              <p
                                className="font-ui text-lg leading-relaxed"
                                style={{ color: 'var(--text-primary)', lineHeight: '1.9' }}
                              >
                                {paragraph}
                              </p>
                            </section>
                          ));
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>

                  {/* Sidebar */}
                  <aside className="lg:col-span-1">
                    <div 
                      className="sticky top-24 space-y-6 p-6"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                    >
                      {/* Photo - Only if available */}
                      {chef.photo_url && (
                        <div className="relative w-full aspect-square overflow-hidden mb-4" style={{ border: '2px solid var(--border-light)' }}>
                          <Image
                            src={chef.photo_url}
                            alt={chef.name}
                            fill
                            className="object-cover"
                            sizes="300px"
                          />
                          {chef.photo_source === 'wikipedia' && (
                            <div className="absolute bottom-0 left-0 right-0 py-1 px-2" style={{ background: 'rgba(0,0,0,0.7)' }}>
                              <p className="font-mono text-[9px] text-white/70">
                                Photo: Wikimedia Commons (CC BY-SA)
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <h3 className="font-mono text-[10px] tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                          QUICK FACTS
                        </h3>
                        <dl className="space-y-3">
                          {chef.current_position && (
                            <div>
                              <dt className="font-mono text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>ROLE</dt>
                              <dd className="font-ui text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{chef.current_position}</dd>
                            </div>
                          )}
                          {sortedShows.length > 0 && (
                            <div>
                              <dt className="font-mono text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>KNOWN FOR</dt>
                              <dd className="font-ui text-sm space-y-1" style={{ color: 'var(--text-primary)' }}>
                                {(() => {
                                  const showsToDisplay = [
                                    primaryShow,
                                    ...sortedShows.filter(s => s !== primaryShow && s.result && s.result !== 'contestant')
                                  ].filter(Boolean);
                                  return showsToDisplay.map((show, idx) => (
                                    <div key={show?.id || idx}>
                                      {show?.show?.name}
                                      {show?.result && show.result !== 'contestant' && (
                                        <span 
                                          className="ml-1.5 font-mono text-[9px] font-bold tracking-wider px-1 py-0.5 uppercase"
                                          style={{ 
                                            background: show.result === 'winner' ? '#f59e0b' : 
                                                       show.result === 'finalist' ? '#0284C7' : '#7C3AED',
                                            color: 'white'
                                          }}
                                        >
                                          {show.result === 'winner' ? 'Winner' : show.result === 'finalist' ? 'Finalist' : 'Judge'}
                                        </span>
                                      )}
                                    </div>
                                  ));
                                })()}
                              </dd>
                            </div>
                          )}
                          {cuisineTags.length > 0 && (
                            <div>
                              <dt className="font-mono text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>CUISINE</dt>
                              <dd className="font-ui text-sm" style={{ color: 'var(--text-primary)' }}>{cuisineTags.join(', ')}</dd>
                            </div>
                          )}
                          {openRestaurants.length > 0 && (
                            <div>
                              <dt className="font-mono text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>RESTAURANTS</dt>
                              <dd className="font-ui text-sm" style={{ color: 'var(--text-primary)' }}>{openRestaurants.length} active</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {(chef.james_beard_status || primaryShow?.result === 'winner') && (
                        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                          <h3 className="font-mono text-[10px] tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                            ACCOLADES
                          </h3>
                          <ul className="space-y-2">
                            {primaryShow?.result === 'winner' && primaryShow.show?.name && (
                              <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                                <span className="font-ui text-sm" style={{ color: 'var(--text-primary)' }}>{primaryShow.show.name} Winner</span>
                              </li>
                            )}
                            {chef.james_beard_status === 'winner' && (
                              <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
                                <span className="font-ui text-sm" style={{ color: 'var(--text-primary)' }}>James Beard Award</span>
                              </li>
                            )}
                            {chef.james_beard_status === 'nominated' && (
                              <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                                <span className="font-ui text-sm" style={{ color: 'var(--text-primary)' }}>James Beard Nominee</span>
                              </li>
                            )}
                            {chef.james_beard_status === 'semifinalist' && (
                              <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#93c5fd' }} />
                                <span className="font-ui text-sm" style={{ color: 'var(--text-primary)' }}>JB Semifinalist</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {chef.instagram_handle && (
                        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                          <a 
                            href={`https://instagram.com/${chef.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 font-mono text-sm hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                            @{chef.instagram_handle}
                          </a>
                        </div>
                      )}

                      <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                        <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Updated {new Date(chef.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </article>
          )}

          {/* Cooking Shows Section */}
          {sortedShows.some(s => s.performance_blurb) && (
            <section className="py-16 border-t" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
              <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Cooking Shows
                  </h2>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    {sortedShows.length} APPEARANCE{sortedShows.length !== 1 ? 'S' : ''}
                  </span>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {sortedShows.filter(s => s.performance_blurb).map((appearance, idx) => (
                    <article 
                      key={appearance.id || idx}
                      className="relative bg-white p-6"
                      style={{ border: '1px solid var(--border-light)' }}
                    >
                      <div 
                        className="absolute top-0 left-0 w-1 h-full"
                        style={{ 
                          background: appearance.result === 'winner' ? '#f59e0b' : 
                                     appearance.result === 'finalist' ? '#0284C7' : 
                                     appearance.result === 'judge' ? '#6366f1' : 'var(--accent-primary)'
                        }}
                      />
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <Link
                            href={appearance.show?.slug ? `/shows/${appearance.show.slug}` : '#'}
                            className="font-display text-xl font-bold hover:text-[var(--accent-primary)] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {appearance.show?.name || 'Unknown Show'}
                          </Link>
                          {appearance.season && (
                            <span className="font-mono text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                              {appearance.season}
                            </span>
                          )}
                        </div>
                        {appearance.result && appearance.result !== 'contestant' && (
                          <span 
                            className="font-mono text-[10px] font-bold tracking-wider px-2 py-1 uppercase flex-shrink-0"
                            style={{ 
                              background: appearance.result === 'winner' ? '#f59e0b' : 
                                         appearance.result === 'finalist' ? '#0284C7' : '#7C3AED',
                              color: 'white'
                            }}
                          >
                            {appearance.result}
                          </span>
                        )}
                      </div>
                      <p 
                        className="font-ui text-sm leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {appearance.performance_blurb}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Instagram Feature */}
          {chef.featured_instagram_post && (
            <section 
              className="py-12 border-y"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-xl mx-auto px-4">
                <h3 className="font-mono text-[10px] tracking-widest text-center mb-6" style={{ color: 'var(--text-muted)' }}>
                  FROM INSTAGRAM
                </h3>
                <InstagramEmbed postUrl={chef.featured_instagram_post} />
              </div>
            </section>
          )}

          {/* Closed Restaurants - Compact */}
          {closedRestaurants.length > 0 && (
            <section 
              className="py-8 border-t"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <details className="group">
                  <summary 
                    className="cursor-pointer font-mono text-xs tracking-widest flex items-center gap-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    CLOSED ({closedRestaurants.length})
                  </summary>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {closedRestaurants.map(restaurant => (
                      <span
                        key={restaurant.id}
                        className="font-ui text-sm line-through opacity-60"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {restaurant.name}
                      </span>
                    ))}
                  </div>
                </details>
              </div>
            </section>
          )}

          {/* Related Chefs */}
          {relatedChefs.length > 0 && (
            <section className="py-16" style={{ background: 'var(--bg-primary)' }}>
              <div className="max-w-6xl mx-auto px-4">
                <div className="mb-6">
                  <h2 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Related Chefs
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Other chefs from the same shows or cities
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {relatedChefs.map((relatedChef, idx) => (
                    <ChefCard key={relatedChef.id} chef={relatedChef} index={idx} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
