import { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { ChefsPageClient } from './ChefsPageClient';
import { Footer } from '@/components/ui/Footer';

export const revalidate = 604800;

export const metadata: Metadata = {
  title: 'Chefs - Top Chef, Iron Chef & More | Cheft',
  description:
    'Browse 230+ chefs from Top Chef, Iron Chef, Tournament of Champions, and other cooking competitions. Filter by show, winners, James Beard awards, and more.',
  openGraph: {
    title: 'Chefs - Top Chef, Iron Chef & More | Cheft',
    description:
      'Browse 230+ chefs from Top Chef, Iron Chef, and other cooking competitions.',
    type: 'website',
  },
};

export default async function ChefsPage() {
  const supabase = createStaticClient();

  const [chefsResult, showsResult, allShowsResult] = await Promise.all([
    supabase
      .from('chefs')
      .select(`
        id,
        name,
        slug,
        photo_url,
        instagram_handle,
        mini_bio,
        james_beard_status,
        cookbook_titles,
        created_at,
        chef_shows (
          id,
          season,
          result,
          is_primary,
          show:shows (name, slug, is_public)
        ),
        restaurants!restaurants_chef_id_fkey (id, michelin_stars, status)
      `)
      .order('name'),
    supabase.from('shows').select(`
      id,
      name,
      slug,
      parent_show_id
    `)
    .eq('is_public', true)
    .is('parent_show_id', null)
    .order('name'),
    supabase.from('shows').select(`
      id,
      slug,
      parent_show_id
    `),
  ]);

  if (chefsResult.error) {
    console.error('Error fetching chefs:', chefsResult.error);
    return <div className="p-8 text-center text-red-600">Failed to load chefs</div>;
  }

  const chefs = (chefsResult.data || []).map(chef => {
    const restaurants = chef.restaurants || [];
    const openRestaurants = restaurants.filter(r => r.status === 'open');
    const hasMichelin = restaurants.some(r => 
      r.michelin_stars && r.michelin_stars > 0 && r.status === 'open'
    );
    
    return {
      id: chef.id,
      name: chef.name,
      slug: chef.slug,
      photo_url: chef.photo_url,
      instagram_handle: chef.instagram_handle,
      mini_bio: chef.mini_bio,
      james_beard_status: chef.james_beard_status as 'semifinalist' | 'nominated' | 'winner' | null,
      cookbook_titles: chef.cookbook_titles,
      created_at: chef.created_at,
      restaurant_count: openRestaurants.length,
      has_michelin: hasMichelin,
      chef_shows: (chef.chef_shows || []).map(cs => ({
        show: cs.show,
        season: cs.season,
        result: cs.result as 'winner' | 'finalist' | 'contestant' | 'judge' | null,
        is_primary: cs.is_primary ?? undefined,
      })),
    };
  });

  const showsData = showsResult.data || [];
  const allShowsData = allShowsResult.data || [];
  
  const childSlugsMap: Record<string, string[]> = {};
  const showById = new Map(allShowsData.map(s => [s.id, s]));
  allShowsData.forEach(show => {
    if (show.parent_show_id) {
      const parentShow = showById.get(show.parent_show_id);
      if (parentShow) {
        if (!childSlugsMap[parentShow.slug]) {
          childSlugsMap[parentShow.slug] = [];
        }
        childSlugsMap[parentShow.slug].push(show.slug);
      }
    }
  });
  
  const shows = showsData.map(show => {
    const familySlugs = [show.slug, ...(childSlugsMap[show.slug] || [])];
    return {
      id: show.id,
      name: show.name,
      slug: show.slug,
      childSlugs: childSlugsMap[show.slug] || [],
      chef_count: chefs.filter(c => 
        c.chef_shows?.some(cs => familySlugs.includes(cs.show?.slug || ''))
      ).length,
    };
  });

  const totalChefs = chefs.length;
  const jbWinnersCount = chefs.filter(c => c.james_beard_status === 'winner').length;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const schemaItems = chefs.slice(0, 100).map((chef, index) => ({
    name: chef.name,
    url: `${baseUrl}/chefs/${chef.slug}`,
    position: index + 1,
  }));

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Chefs', url: `${baseUrl}/chefs` },
  ];

  return (
    <>
      <ItemListSchema
        name="TV Chefs Directory"
        description="Browse all chefs from Top Chef, Iron Chef, and other cooking competitions"
        url={`${baseUrl}/chefs`}
        items={schemaItems}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header currentPage="chefs" />

        <PageHero
          title="Chefs"
          subtitle={`${totalChefs} competition chefs and their restaurants`}
          stats={[
            { value: totalChefs, label: 'CHEFS' },
            { value: jbWinnersCount, label: 'JB WINNERS' },
          ]}
          breadcrumbItems={[{ label: 'Chefs' }]}
        />

        <ChefsPageClient
          initialChefs={chefs}
          shows={shows}
          totalChefs={totalChefs}
        />

        <Footer />
      </div>
    </>
  );
}
