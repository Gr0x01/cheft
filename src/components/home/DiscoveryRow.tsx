'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { getRestaurantStatus, getChefAchievements, sanitizeText } from '@/lib/utils/restaurant';
import { getStorageUrl } from '@/lib/utils/storage';
import { MichelinStar } from '@/components/icons/MichelinStar';
import type { RestaurantWithDetails } from '@/lib/types';

interface DiscoveryRowProps {
  title: string;
  restaurants: RestaurantWithDetails[];
  viewAllHref?: string;
}

function DiscoveryCard({ restaurant, index }: { restaurant: RestaurantWithDetails; index: number }) {
  const status = getRestaurantStatus(restaurant.status);
  const chefAchievements = restaurant.chef ? getChefAchievements(restaurant.chef) : { isShowWinner: false, isJBWinner: false };
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.photo_urls?.[0]);
  const sanitizedName = sanitizeText(restaurant.name);
  const sanitizedCity = sanitizeText(restaurant.city);
  const michelinStars = restaurant.michelin_stars || 0;

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="discovery-card"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="discovery-card-image" data-closed={status.isClosed ? "true" : undefined}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={restaurant.name}
            width={160}
            height={120}
            className="discovery-card-img"
            loading="lazy"
            sizes="160px"
          />
        ) : (
          <div className="discovery-card-placeholder">
            <svg className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z" />
            </svg>
          </div>
        )}
        {michelinStars > 0 && (
          <div className="discovery-card-michelin">
            {Array.from({ length: michelinStars }).map((_, i) => (
              <MichelinStar key={i} size={10} className="text-white" />
            ))}
          </div>
        )}
        {status.isClosed && (
          <span className="discovery-card-closed">CLOSED</span>
        )}
      </div>
      <div className="discovery-card-content">
        <h3 className="discovery-card-name">{sanitizedName}</h3>
        <p className="discovery-card-location">{sanitizedCity}</p>
        <div className="discovery-card-badges">
          {restaurant.price_tier && (
            <span className="discovery-card-price">{restaurant.price_tier}</span>
          )}
          {chefAchievements.isShowWinner && (
            <span className="discovery-card-badge winner">
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2l2.5 5.5L18 8.5l-4 4 1 6-5-2.5L5 18.5l1-6-4-4 5.5-1L10 2z"/>
              </svg>
              WIN
            </span>
          )}
          {chefAchievements.isJBWinner && (
            <span className="discovery-card-badge jb">JB</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function DiscoveryRow({ title, restaurants, viewAllHref }: DiscoveryRowProps) {
  if (restaurants.length === 0) return null;

  return (
    <section className="discovery-row">
      <div className="discovery-row-header">
        <div className="discovery-row-title-group">
          <span className="discovery-row-accent" />
          <h2 className="discovery-row-title">{title}</h2>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="discovery-row-link">
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className="discovery-row-scroll">
        {restaurants.map((restaurant, index) => (
          <DiscoveryCard key={restaurant.id} restaurant={restaurant} index={index} />
        ))}
      </div>
    </section>
  );
}
