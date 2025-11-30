'use client';

import { useEffect, useRef, useState } from 'react';
import type { RestaurantWithDetails } from '@/lib/types';

interface RestaurantMapProps {
  restaurants: RestaurantWithDetails[];
  selectedRestaurant?: RestaurantWithDetails | null;
  isLoading?: boolean;
}

export default function RestaurantMap({ 
  restaurants, 
  selectedRestaurant, 
  isLoading 
}: RestaurantMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [hoveredRestaurant, setHoveredRestaurant] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // For now, just show a placeholder map
    // In real implementation, this would use Leaflet.js with dark tiles
    console.log('Map would show restaurants:', restaurants);
    console.log('Selected restaurant:', selectedRestaurant);
  }, [restaurants, selectedRestaurant]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center" 
           style={{ background: 'var(--color-surface)' }}>
        <div className="text-center">
          <div className="shimmer w-32 h-32 rounded-full mx-auto mb-4" 
               style={{ background: 'var(--color-surface-glass)' }}></div>
          <div className="text-text-secondary font-body">Loading premium map experience...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="w-full h-full relative overflow-hidden"
         style={{ 
           background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-elevated) 100%)',
         }}>
      
      {/* Dark Map Background Pattern */}
      <div className="absolute inset-0 opacity-20"
           style={{
             backgroundImage: `
               radial-gradient(circle at 25% 25%, var(--color-accent-gold) 0.5px, transparent 0.5px),
               radial-gradient(circle at 75% 75%, var(--color-bravo) 0.5px, transparent 0.5px),
               radial-gradient(circle at 50% 50%, var(--color-food-network) 0.3px, transparent 0.3px)
             `,
             backgroundSize: '50px 50px, 30px 30px, 20px 20px'
           }}>
      </div>

      {/* Premium Map Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center relative z-10">
          
          {/* Glass Info Panel */}
          <div className="mb-8 p-6 rounded-2xl"
               style={{ 
                 background: 'var(--color-surface-glass)',
                 backdropFilter: 'blur(var(--glass-blur))',
                 border: '1px solid var(--color-glass-border)',
                 boxShadow: '0 8px 25px -5px var(--color-glass-shadow)'
               }}>
            <div className="text-3xl font-heading font-bold text-text-primary mb-2">
              Premium Map Experience
            </div>
            <div className="text-text-secondary font-body mb-3">
              Discovering {restaurants.length} celebrity chef restaurants
            </div>
            <div className="text-sm text-text-muted font-mono">
              Interactive Leaflet.js map with dark luxury styling coming soon
            </div>
          </div>
          
          {/* Premium Mock Markers */}
          <div className="relative w-96 h-64 mx-auto">
            {restaurants.slice(0, 5).map((restaurant, index) => {
              const positions = [
                { x: '20%', y: '30%' },
                { x: '70%', y: '20%' },
                { x: '45%', y: '60%' },
                { x: '15%', y: '75%' },
                { x: '80%', y: '65%' }
              ];
              const position = positions[index] || { x: '50%', y: '50%' };
              
              return (
                <div 
                  key={restaurant.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300"
                  style={{
                    left: position.x,
                    top: position.y,
                    animationDelay: `${index * 0.2}s`
                  }}
                  onMouseEnter={() => setHoveredRestaurant(restaurant.id)}
                  onMouseLeave={() => setHoveredRestaurant(null)}
                >
                  
                  {/* Premium Marker */}
                  <div className={`
                    flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 relative
                    ${selectedRestaurant?.id === restaurant.id ? 'scale-125' : 'scale-100'}
                    ${hoveredRestaurant === restaurant.id ? 'scale-110' : ''}
                  `}
                  style={{ 
                    background: selectedRestaurant?.id === restaurant.id 
                      ? 'var(--color-accent-gold)' 
                      : 'var(--color-surface-glass)',
                    backdropFilter: 'blur(var(--glass-blur))',
                    border: `2px solid ${selectedRestaurant?.id === restaurant.id 
                      ? 'var(--color-accent-gold)' 
                      : 'var(--color-glass-border)'}`,
                    boxShadow: selectedRestaurant?.id === restaurant.id 
                      ? '0 8px 25px -5px var(--color-accent-gold-muted), 0 0 0 4px var(--color-accent-gold-muted)'
                      : '0 4px 12px -2px var(--color-glass-shadow)'
                  }}>
                    <span className="text-xl">
                      {restaurant.chef?.primary_show?.name?.includes('Top Chef') ? '👨‍🍳' : 
                       restaurant.chef?.primary_show?.name?.includes('Iron') ? '⚡' :
                       restaurant.chef?.primary_show?.name?.includes('Hell') ? '🔥' : '🍽️'}
                    </span>
                  </div>

                  {/* Tooltip on Hover */}
                  {hoveredRestaurant === restaurant.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 fade-in"
                         style={{ 
                           background: 'var(--color-surface-glass)',
                           backdropFilter: 'blur(var(--glass-blur-strong))',
                           border: '1px solid var(--color-glass-border-strong)',
                           borderRadius: 'var(--glass-border-radius-small)',
                           boxShadow: '0 8px 25px -5px var(--color-glass-shadow)'
                         }}>
                      <div className="p-3 text-left whitespace-nowrap">
                        <div className="font-heading font-semibold text-text-primary text-sm mb-1">
                          {restaurant.name}
                        </div>
                        <div className="font-body text-text-secondary text-xs mb-1">
                          Chef {restaurant.chef?.name}
                        </div>
                        <div className="font-mono text-text-muted text-xs">
                          {restaurant.city}, {restaurant.state} • {restaurant.price_tier}
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
                           style={{ 
                             borderLeft: '6px solid transparent',
                             borderRight: '6px solid transparent',
                             borderTop: '6px solid var(--color-glass-border-strong)'
                           }}>
                      </div>
                    </div>
                  )}

                  {/* Pulse animation for selected */}
                  {selectedRestaurant?.id === restaurant.id && (
                    <div className="absolute inset-0 rounded-full animate-ping"
                         style={{ 
                           background: 'var(--color-accent-gold)',
                           opacity: '0.3'
                         }}>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Premium Map Features Preview */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
            {['Dark Luxury Tiles', 'Glass Overlays', 'Smart Clustering'].map((feature, index) => (
              <div key={feature} 
                   className="p-3 rounded-lg text-center"
                   style={{ 
                     background: 'var(--color-surface-glass)',
                     border: '1px solid var(--color-glass-border)',
                     backdropFilter: 'blur(var(--glass-blur))',
                     animationDelay: `${index * 0.1}s`
                   }}>
                <div className="text-text-secondary font-mono text-xs">{feature}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}