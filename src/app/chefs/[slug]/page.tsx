import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { ChefHero } from '@/components/chef/ChefHero';
import { TVAppearanceList } from '@/components/chef/TVAppearanceBadge';
import { RelatedChefs } from '@/components/chef/RelatedChefs';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { PersonSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { ReportIssueButton } from '@/components/feedback/ReportIssueButton';
import { sanitizeNarrative } from '@/lib/sanitize';
import { InstagramEmbed } from '@/components/chef/InstagramEmbed';

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
  chef_shows: Array<{
    id: string;
    season: string | null;
    result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary: boolean;
    show_id: string;
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
    photo_urls: string[] | null;
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
        chef_shows (
          id,
          season,
          result,
          is_primary,
          show_id,
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
          google_review_count,
          photo_urls
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching chef:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return data as unknown as ChefData;
  } catch (error) {
    console.error('Exception in getChef:', error);
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
          id,
          name,
          slug,
          photo_url,
          james_beard_status,
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
          id,
          name,
          slug,
          photo_url,
          james_beard_status,
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
    return {
      title: 'Chef Not Found | Cheft',
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
  const chef = await getChef(slug);

  if (!chef) {
    notFound();
  }

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

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header currentPage="chefs" />

        <main>
          <ChefHero 
            chef={chef}
            breadcrumbItems={[
              { label: 'Chefs', href: '/chefs' },
              { label: chef.name },
            ]}
          />

          {/* Photo Attribution */}
          {chef.photo_url && chef.photo_source === 'wikipedia' && (
            <div 
              className="border-b py-2"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  Photo:{' '}
                  <a
                    href="https://commons.wikimedia.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-copper-600 transition-colors"
                  >
                    Wikimedia Commons
                  </a>
                  {' '}(CC BY-SA)
                </p>
              </div>
            </div>
          )}

          {/* The Story section - Career Narrative */}
          {false && chef.career_narrative && (
            <section 
              className="py-12 border-b"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <h2 className="font-display text-3xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                  The Story
                </h2>
                <div className="prose prose-lg max-w-none">
                  <p 
                    className="font-ui text-lg leading-relaxed"
                    style={{ color: 'var(--text-primary)', lineHeight: '1.8' }}
                  >
                    {sanitizeNarrative(chef.career_narrative)}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* TV Appearances */}
          {chef.chef_shows && chef.chef_shows.length > 0 && (
            <section 
              className="border-b py-10"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    TV Appearances
                  </h2>
                  <ReportIssueButton 
                    entityType="chef" 
                    entityId={chef.id} 
                    entityName={chef.name}
                  />
                </div>
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
                  {openRestaurants.map((restaurant, index) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      index={index}
                    />
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

          {/* Related Chefs */}
          {relatedChefs.length > 0 && (
            <section className="py-12">
              <div className="max-w-6xl mx-auto px-4">
                <RelatedChefs
                  chefs={relatedChefs}
                  title="Related Chefs"
                  subtitle="Other chefs from the same shows or cities"
                />
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
