'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumbs } from '../seo/Breadcrumbs';
import { getRestaurantStatus, getChefAchievements, validateImageUrl } from '@/lib/utils/restaurant';
import { getStorageUrl } from '@/lib/utils/storage';
import { PhotoGalleryModal } from './PhotoGalleryModal';
import { GoogleMapsLogo } from '@/components/icons/GoogleMapsLogo';
import { ReportIssueButton } from '../feedback/ReportIssueButton';
import { ExternalLinkTracker } from '@/components/analytics/ExternalLinkTracker';

interface ChefInfo {
  name: string;
  slug: string;
  photo_url?: string | null;
  james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
  chef_shows?: Array<{
    show?: { name: string } | null;
    result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary?: boolean;
  }>;
}

interface RestaurantHeroProps {
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  restaurantId?: string;
  restaurantName?: string;
  restaurant: {
    name: string;
    address?: string | null;
    city: string;
    state?: string | null;
    country: string;
    price_tier?: string | null;
    cuisine_tags?: string[] | null;
    status: 'open' | 'closed' | 'unknown';
    google_rating?: number | null;
    google_review_count?: number | null;
    photo_urls?: string[] | null;
    description?: string | null;
    phone?: string | null;
    website_url?: string | null;
    maps_url?: string | null;
    updated_at?: string;
    chef?: ChefInfo | null;
    chefs?: Array<{ chef?: ChefInfo | null; is_primary?: boolean; role?: string | null }>;
  };
}

function getAllChefs(restaurant: RestaurantHeroProps['restaurant']): Array<{ chef: ChefInfo; is_primary: boolean; role?: string | null }> {
  if (restaurant.chefs && restaurant.chefs.length > 0) {
    return restaurant.chefs
      .filter(rc => rc.chef)
      .map(rc => ({ chef: rc.chef!, is_primary: rc.is_primary || false, role: rc.role }))
      .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  }
  if (restaurant.chef) {
    return [{ chef: restaurant.chef, is_primary: true }];
  }
  return [];
}

export function RestaurantHero({ restaurant, breadcrumbItems, restaurantId, restaurantName }: RestaurantHeroProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const status = getRestaurantStatus(restaurant.status);
  const allChefs = getAllChefs(restaurant);
  const primaryChef = allChefs.find(c => c.is_primary)?.chef || allChefs[0]?.chef;
  const primaryShow = primaryChef?.chef_shows?.find(cs => cs.is_primary) || primaryChef?.chef_shows?.[0];
  
  
  const photos = (restaurant.photo_urls || []).filter(Boolean);
  const photoCount = photos.length;
  
  const openGallery = (index: number) => {
    setCurrentPhotoIndex(index);
    setGalleryOpen(true);
  };

  const fullAddress = [
    restaurant.address,
    restaurant.city,
    restaurant.state,
  ].filter(Boolean).join(', ');

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'var(--accent-primary)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            {breadcrumbItems && (
              <Breadcrumbs
                items={breadcrumbItems}
                className="[&_a]:text-white/50 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/30"
              />
            )}
          </div>
          {restaurantId && restaurantName && (
            <div className="flex-shrink-0">
              <ReportIssueButton
                entityType="restaurant"
                entityId={restaurantId}
                entityName={restaurantName}
                variant="header"
              />
            </div>
          )}
        </div>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 min-w-0">
            <span 
              className="font-mono text-[10px] font-bold tracking-widest px-3 py-1.5 inline-block mb-3"
              style={{ 
                background: status.isOpen ? 'var(--accent-success)' : 
                           status.isClosed ? '#dc2626' : 'rgba(255,255,255,0.2)',
                color: 'white'
              }}
            >
              {status.displayStatus}
            </span>
            <h1 
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-none tracking-tight"
            >
              {restaurant.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {restaurant.google_rating && (
                <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                  <svg className="w-4 h-4" style={{ color: '#f59e0b' }} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  <span className="font-mono text-sm font-bold text-white">{restaurant.google_rating}</span>
                  {restaurant.google_review_count && (
                    <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      ({restaurant.google_review_count.toLocaleString()} reviews)
                    </span>
                  )}
                </div>
              )}
              {restaurant.price_tier && (
                <span 
                  className="font-mono text-sm font-bold px-3 py-1.5"
                  style={{ background: 'rgba(211, 94, 15, 0.2)', color: 'var(--accent-primary)' }}
                >
                  {restaurant.price_tier}
                </span>
              )}
            </div>

            {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {restaurant.cuisine_tags.map((tag, i) => (
                  <span
                    key={i}
                    className="font-mono text-xs tracking-wide px-3 py-1"
                    style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      color: 'rgba(255,255,255,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {restaurant.description && (
              <p 
                className="mt-6 font-ui text-base leading-relaxed max-w-2xl"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                {restaurant.description}
              </p>
            )}

            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-start gap-2">
                  <svg 
                    className="w-5 h-5 mt-0.5 flex-shrink-0" 
                    style={{ color: 'var(--accent-primary)' }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-ui text-sm text-white">{fullAddress}</p>
                    <div className="flex items-center gap-8 mt-1">
                      {restaurant.maps_url && (
                        <ExternalLinkTracker
                          href={restaurant.maps_url}
                          linkType="google_maps"
                          restaurantName={restaurant.name}
                          chefName={restaurant.chef?.name}
                          className="font-mono text-xs tracking-wide inline-block transition-colors hover:text-white"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          GET DIRECTIONS →
                        </ExternalLinkTracker>
                      )}
                      {restaurant.website_url && (
                        <ExternalLinkTracker
                          href={restaurant.website_url}
                          linkType="website"
                          restaurantName={restaurant.name}
                          chefName={restaurant.chef?.name}
                          className="font-mono text-xs tracking-wide inline-block transition-colors hover:text-white"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          WEBSITE →
                        </ExternalLinkTracker>
                      )}
                    </div>
                  </div>
                </div>

                {restaurant.phone && (
                  <div className="flex items-center gap-2">
                    <svg 
                      className="w-5 h-5 flex-shrink-0" 
                      style={{ color: 'var(--accent-primary)' }}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a 
                      href={`tel:${restaurant.phone}`}
                      className="font-mono text-sm text-white hover:text-[var(--accent-primary)] transition-colors"
                    >
                      {restaurant.phone}
                    </a>
                  </div>
                )}
              </div>
              
            </div>
          </div>

          {photoCount > 0 && (
            <div className="flex-shrink-0 w-full lg:w-[420px] space-y-3">
              <div>
              {photoCount === 1 && (
                <button
                  onClick={() => openGallery(0)}
                  className="w-full h-80 relative overflow-hidden group cursor-pointer"
                  style={{ 
                    border: '4px solid var(--accent-primary)',
                    boxShadow: '8px 8px 0 var(--accent-primary)'
                  }}
                  aria-label="View photo gallery"
                >
                  <Image
                    src={getStorageUrl('restaurant-photos', photos[0])!}
                    alt={restaurant.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 420px"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              )}
              
              {photoCount === 2 && (
                <div className="grid grid-rows-2 gap-2 h-80">
                  {photos.slice(0, 2).map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => openGallery(i)}
                      className="relative overflow-hidden group cursor-pointer"
                      style={{ border: '2px solid var(--accent-primary)' }}
                      aria-label={`View photo ${i + 1}`}
                    >
                      <Image
                        src={getStorageUrl('restaurant-photos', photo)!}
                        alt={`${restaurant.name} - Photo ${i + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 1024px) 100vw, 420px"
                        priority={i === 0}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
              
              {photoCount >= 3 && (
                <div className="space-y-2 h-80">
                  <button
                    onClick={() => openGallery(0)}
                    className="relative overflow-hidden w-full h-48 group cursor-pointer"
                    style={{ border: '2px solid var(--accent-primary)' }}
                    aria-label="View photo 1"
                  >
                    <Image
                      src={getStorageUrl('restaurant-photos', photos[0])!}
                      alt={`${restaurant.name} - Photo 1`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 420px"
                      priority
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                  <div className="grid grid-cols-2 gap-2" style={{ height: 'calc(20rem - 12rem - 0.5rem)' }}>
                    {photos.slice(1, photoCount >= 5 ? 5 : photoCount).map((photo, i) => (
                      <button
                        key={i + 1}
                        onClick={() => openGallery(i + 1)}
                        className="relative overflow-hidden group cursor-pointer"
                        style={{ border: '2px solid var(--accent-primary)' }}
                        aria-label={`View photo ${i + 2}`}
                      >
                        <Image
                          src={getStorageUrl('restaurant-photos', photo)!}
                          alt={`${restaurant.name} - Photo ${i + 2}`}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 1024px) 50vw, 210px"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        {i === 3 && photoCount > 5 && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.7)' }}
                          >
                            <span className="font-mono text-xl font-bold text-white">
                              +{photoCount - 5}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              </div>
              
              <div className="flex items-center justify-between" style={{ opacity: 0.5 }}>
                {restaurant.updated_at && (
                  <span className="font-mono text-[10px] text-white">
                    Updated {new Date(restaurant.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {restaurant.google_rating && (
                  <div className="flex items-center gap-1">
                    <GoogleMapsLogo size={12} className="text-white" />
                    <span className="font-mono text-[10px] text-white">Google Maps</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {allChefs.length > 0 && (
          <div 
            className="mt-10 pt-8 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <p className="font-mono text-[10px] tracking-widest mb-4" style={{ color: 'var(--accent-primary)' }}>
              {allChefs.length > 1 ? 'THE CHEFS' : 'THE CHEF'}
            </p>
            <div className={allChefs.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
              {allChefs.map(({ chef, role }) => {
                const chefAchievements = getChefAchievements(chef);
                const chefPrimaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
                const isMultiChef = allChefs.length > 1;
                return (
                  <Link
                    key={chef.slug}
                    href={`/chefs/${chef.slug}`}
                    className={`group/chef flex items-center gap-4 ${isMultiChef ? 'p-3 -m-3 rounded hover:bg-white/5 transition-colors' : ''}`}
                  >
                    <div 
                      className="w-16 h-16 relative overflow-hidden flex-shrink-0"
                      style={{ border: '2px solid var(--accent-primary)' }}
                    >
                      {getStorageUrl('chef-photos', chef.photo_url) ? (
                        <Image
                          src={getStorageUrl('chef-photos', chef.photo_url)!}
                          alt={`${chef.name} profile photo`}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div 
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'var(--slate-700)' }}
                        >
                          <span className="font-display text-2xl font-bold text-white/30">
                            {chef.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 
                        className="font-display text-xl font-bold text-white group-hover/chef:text-[var(--accent-primary)] transition-colors truncate"
                      >
                        {chef.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {role && !['owner', 'co-owner', 'partner'].includes(role) && (
                          <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                            {role.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                        {chefPrimaryShow?.show?.name && (
                          <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {chefPrimaryShow.show.name}
                          </span>
                        )}
                        {chefAchievements.isShowWinner && (
                          <span 
                            className="font-mono text-[10px] tracking-wider px-2 py-0.5"
                            style={{ background: 'var(--accent-success)', color: 'white' }}
                            aria-label="Show winner"
                          >
                            WINNER
                          </span>
                        )}
                        {chefAchievements.isJBWinner && (
                          <span 
                            className="font-mono text-[10px] tracking-wider px-2 py-0.5 flex items-center gap-1"
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#ffffff' }}
                            aria-label="James Beard Award winner"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#fbbf24" aria-hidden="true">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            JAMES BEARD
                          </span>
                        )}
                      </div>
                    </div>
                    {!isMultiChef && (
                      <span 
                        className="ml-auto font-mono text-xs font-semibold tracking-wide opacity-0 group-hover/chef:opacity-100 transition-opacity"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        VIEW PROFILE →
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div 
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: 'var(--accent-primary)' }}
      />
      
      {photoCount > 0 && (
        <PhotoGalleryModal
          photos={photos}
          currentIndex={currentPhotoIndex}
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          onNavigate={setCurrentPhotoIndex}
          restaurantName={restaurant.name}
        />
      )}
    </section>
  );
}
