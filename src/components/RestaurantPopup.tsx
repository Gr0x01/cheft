'use client';

import type { RestaurantWithDetails } from '@/lib/types';

interface RestaurantPopupProps {
  restaurant: RestaurantWithDetails;
}

export default function RestaurantPopup({ restaurant }: RestaurantPopupProps) {
  const chef = restaurant.chef;
  const isOpen = restaurant.status === 'open';
  const isClosed = restaurant.status === 'closed';
  
  const getResultLabel = (result: string | null | undefined) => {
    if (!result) return null;
    const labels: Record<string, string> = {
      winner: 'Winner',
      finalist: 'Finalist',
      contestant: 'Contestant',
      judge: 'Judge'
    };
    return labels[result] || result;
  };

  const getJamesBadgeClass = (status: string | null | undefined) => {
    if (!status) return '';
    const classes: Record<string, string> = {
      winner: 'popup-jb-winner',
      nominated: 'popup-jb-nominated',
      semifinalist: 'popup-jb-semifinalist'
    };
    return classes[status] || '';
  };

  return (
    <div className="popup-enhanced">
      <div className="popup-header-section">
        <div className="popup-title-row">
          <h3 className="popup-restaurant-name">{restaurant.name}</h3>
          <span className="popup-price-tier">{restaurant.price_tier}</span>
        </div>
        <div className="popup-status-row">
          {restaurant.status !== 'unknown' && (
            <span className={`popup-status ${isOpen ? 'status-open' : ''} ${isClosed ? 'status-closed' : ''}`}>
              <span className="status-dot"></span>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          )}
        </div>
      </div>

      <div className="popup-chef-section">
        <span className="popup-chef-name">{chef?.name}</span>
        <div className="popup-chef-meta">
          {chef?.top_chef_result && (
            <span className={`popup-result-badge result-${chef.top_chef_result}`}>
              {getResultLabel(chef.top_chef_result)}
            </span>
          )}
          {chef?.top_chef_season && (
            <span className="popup-season">S{chef.top_chef_season}</span>
          )}
          {chef?.james_beard_status && (
            <span className={`popup-jb-badge ${getJamesBadgeClass(chef.james_beard_status)}`}>
              <svg className="jb-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              JB {chef.james_beard_status === 'winner' ? 'Winner' : chef.james_beard_status === 'nominated' ? 'Nom' : 'Semi'}
            </span>
          )}
        </div>
      </div>

      <div className="popup-location-section">
        <svg className="popup-loc-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <span className="popup-location-text">
          {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
        </span>
      </div>

      {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
        <div className="popup-cuisine-section">
          {restaurant.cuisine_tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="popup-cuisine-tag">{tag}</span>
          ))}
          {restaurant.cuisine_tags.length > 3 && (
            <span className="popup-cuisine-more">+{restaurant.cuisine_tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="popup-actions">
        {restaurant.website_url && (
          <a 
            href={restaurant.website_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="popup-action-btn popup-action-primary"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
            </svg>
            Website
          </a>
        )}
        {restaurant.maps_url && (
          <a 
            href={restaurant.maps_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="popup-action-btn popup-action-secondary"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
            </svg>
            Directions
          </a>
        )}
      </div>
    </div>
  );
}
