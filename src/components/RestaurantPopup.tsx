'use client';

import type { RestaurantWithDetails } from '@/lib/types';
import Image from 'next/image';
import { getStorageUrl } from '@/lib/utils/storage';
import { getRestaurantStatus, getChefAchievements } from '@/lib/utils/restaurant';

interface RestaurantPopupProps {
  restaurant: RestaurantWithDetails;
}

export default function RestaurantPopup({ restaurant }: RestaurantPopupProps) {
  const chef = restaurant.chef;
  const status = getRestaurantStatus(restaurant.status);
  const chefAchievements = chef ? getChefAchievements(chef) : { isShowWinner: false, isJBWinner: false, isJBNominee: false, isJBSemifinalist: false };
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.photo_urls?.[0]);

  return (
    <div className="popup-enhanced">
      {photoUrl && (
        <div className="popup-image-section">
          <Image
            src={photoUrl}
            alt={restaurant.name}
            width={280}
            height={140}
            className="popup-image"
          />
          <div className="popup-image-overlay" />
        </div>
      )}

      <div className="popup-header-section">
        <div className="popup-title-row">
          <h3 className="popup-restaurant-name">{restaurant.name}</h3>
          {restaurant.price_tier && (
            <span className="popup-price-tier">{restaurant.price_tier}</span>
          )}
        </div>
        
        {chef && (
          <div className="popup-chef-section">
            <span className="popup-chef-name">by {chef.name}</span>
            <div className="popup-badges">
              {chefAchievements.isShowWinner && (
                <span className="popup-badge popup-badge-winner">WINNER</span>
              )}
              {chefAchievements.isJBWinner && (
                <span className="popup-badge popup-badge-jb">
                  <svg className="popup-badge-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  JB
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="popup-meta-section">
        <div className="popup-location-row">
          <svg className="popup-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="popup-text">
            {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
          </span>
        </div>

        {restaurant.google_rating && (
          <div className="popup-rating-row">
            <svg className="popup-star-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="popup-rating">{restaurant.google_rating}</span>
            {restaurant.google_review_count && (
              <span className="popup-review-count">({restaurant.google_review_count.toLocaleString()})</span>
            )}
          </div>
        )}

        {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
          <div className="popup-cuisine-tags">
            {restaurant.cuisine_tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="popup-cuisine-tag">{tag.toUpperCase()}</span>
            ))}
            {restaurant.cuisine_tags.length > 3 && (
              <span className="popup-cuisine-more">+{restaurant.cuisine_tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="popup-footer">
        <span className="popup-status" style={{ color: status.statusColor }}>
          {status.displayStatus}
        </span>
        <a 
          href={`/restaurants/${restaurant.slug}`}
          className="popup-view-link"
        >
          VIEW →
        </a>
      </div>
    </div>
  );
}
