import Link from 'next/link';
import Image from 'next/image';
import { getRestaurantStatus, getChefAchievements, sanitizeText } from '@/lib/utils/restaurant';
import { getStorageUrl } from '@/lib/utils/storage';
import { Donut } from 'lucide-react';

interface RestaurantCardCompactProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state?: string | null;
    price_tier?: string | null;
    cuisine_tags?: string[] | null;
    status: 'open' | 'closed' | 'unknown';
    google_rating?: number | null;
    google_review_count?: number | null;
    photo_urls?: string[] | null;
    chef?: {
      name: string;
      slug: string;
      james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
      chef_shows?: Array<{
        result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
        is_primary?: boolean;
      }>;
    } | null;
  };
  index?: number;
}

export function RestaurantCardCompact({ restaurant, index = 0 }: RestaurantCardCompactProps) {
  const status = getRestaurantStatus(restaurant.status);
  const chefAchievements = restaurant.chef ? getChefAchievements(restaurant.chef) : { isShowWinner: false, isJBWinner: false, isJBNominee: false, isJBSemifinalist: false };
  
  const sanitizedName = sanitizeText(restaurant.name);
  const sanitizedCity = sanitizeText(restaurant.city);
  const sanitizedState = sanitizeText(restaurant.state);
  const sanitizedChefName = restaurant.chef ? sanitizeText(restaurant.chef.name) : '';
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.photo_urls?.[0]);

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="compact-card group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="compact-image-wrapper">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={restaurant.name}
            width={80}
            height={80}
            className="compact-image"
            loading="lazy"
            sizes="80px"
          />
        ) : (
          <div className="compact-image-placeholder">
            <Donut className="compact-icon" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className={`compact-content ${status.isClosed ? 'opacity-60' : ''}`}>
        <div className="compact-header">
          <h3 
            className={`compact-name ${status.isClosed ? 'line-through' : ''}`}
          >
            {sanitizedName}
          </h3>
          {status.isClosed ? (
            <span className="compact-price-closed">CLOSED</span>
          ) : restaurant.price_tier ? (
            <span className="compact-price">{restaurant.price_tier}</span>
          ) : null}
        </div>

        {restaurant.chef && (
          <div className="compact-chef-row">
            <span className="compact-chef-name">by {sanitizedChefName}</span>
            {chefAchievements.isShowWinner && (
              <span className="compact-badge compact-badge-winner">WIN</span>
            )}
            {chefAchievements.isJBWinner && (
              <span className="compact-badge compact-badge-jb">JB</span>
            )}
          </div>
        )}

        <div className="compact-meta-row">
          <span className="compact-location">
            {sanitizedCity}{sanitizedState ? `, ${sanitizedState}` : ''}
          </span>
          {restaurant.google_rating && (
            <>
              <span className="compact-separator">•</span>
              <div className="compact-rating">
                <svg className="compact-star" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                <span>{restaurant.google_rating}</span>
              </div>
            </>
          )}
        </div>

        {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
          <div className="compact-tags">
            {restaurant.cuisine_tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="compact-tag">
                {tag.toUpperCase()}
              </span>
            ))}
            {restaurant.cuisine_tags.length > 2 && (
              <span className="compact-tag-more">
                +{restaurant.cuisine_tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
