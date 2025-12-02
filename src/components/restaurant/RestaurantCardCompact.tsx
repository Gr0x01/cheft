import Link from 'next/link';
import Image from 'next/image';
import { getRestaurantStatus, getChefAchievements, sanitizeText } from '@/lib/utils/restaurant';
import { getStorageUrl } from '@/lib/utils/storage';

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
            <svg 
              className="compact-icon" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth="1.5"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z"
              />
            </svg>
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
